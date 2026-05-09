/**
 * Экспорт и импорт страниц Homeglance в виде JSON.
 *
 * Формат файла:
 * {
 *   schema: "homeglance.layout/1",
 *   exportedAt: ISO-timestamp,
 *   appVersion: "0.1.0-...",
 *   pages: Page[]
 * }
 *
 * Версионируем поле schema — будущие миграции читают `schema`, чтобы понять
 * какая трансформация нужна. Сейчас только версия 1.
 */

import type { Page } from './types';

const SCHEMA = 'homeglance.layout/1';

export interface LayoutExport {
  schema: typeof SCHEMA;
  exportedAt: string;
  appVersion: string;
  pages: Page[];
}

export class ImportError extends Error {
  constructor(
    message: string,
    public readonly hint?: string
  ) {
    super(message);
    this.name = 'ImportError';
  }
}

const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? '0.0.0';

/** Сериализует одну или несколько страниц в JSON-строку. */
export function serializeLayout(pages: Page[]): string {
  const payload: LayoutExport = {
    schema: SCHEMA,
    exportedAt: new Date().toISOString(),
    appVersion: APP_VERSION,
    pages,
  };
  return JSON.stringify(payload, null, 2);
}

/** Парсит и валидирует JSON-импорт. Бросает ImportError при проблемах. */
export function parseLayout(raw: string): LayoutExport {
  let json: any;
  try {
    json = JSON.parse(raw);
  } catch {
    throw new ImportError('Файл не является валидным JSON', 'parse');
  }
  if (!json || typeof json !== 'object') {
    throw new ImportError('Файл должен содержать JSON-объект', 'parse');
  }
  if (typeof json.schema !== 'string' || !json.schema.startsWith('homeglance.layout/')) {
    throw new ImportError(
      'Это не файл раскладки Homeglance',
      'wrongSchema'
    );
  }
  if (json.schema !== SCHEMA) {
    // В будущем здесь будет миграция. Пока — отказ.
    throw new ImportError(
      `Неизвестная версия формата: ${json.schema}`,
      'wrongSchema'
    );
  }
  if (!Array.isArray(json.pages) || json.pages.length === 0) {
    throw new ImportError('Файл не содержит страниц', 'noPages');
  }
  for (const p of json.pages) {
    if (!p || typeof p !== 'object' || typeof p.id !== 'string' || typeof p.title !== 'string') {
      throw new ImportError('Одна из страниц повреждена (нет id/title)', 'badPage');
    }
    if (!Array.isArray(p.widgets)) {
      throw new ImportError(`У страницы «${p.title}» нет массива виджетов`, 'badPage');
    }
  }
  return json as LayoutExport;
}

/** Триггерит браузерное скачивание файла. */
export function downloadJson(filename: string, content: string): void {
  if (typeof document === 'undefined') return;
  const blob = new Blob([content], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 100);
}

/** Открывает диалог выбора файла и возвращает текст выбранного файла. */
export function pickJsonFile(): Promise<string | null> {
  return new Promise((resolve) => {
    if (typeof document === 'undefined') {
      resolve(null);
      return;
    }
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json,.json';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return resolve(null);
      try {
        const text = await file.text();
        resolve(text);
      } catch {
        resolve(null);
      }
    };
    // Если пользователь нажал «Отмена» — onchange не сработает, и promise останется
    // незарешённым. Для UI это ОК: форма просто не делает ничего; следующий
    // вызов pickJsonFile() начнёт новую цепочку.
    input.click();
  });
}

/** Удобное имя файла на основе заголовка страницы. */
export function makeFilename(label: string): string {
  const slug = label
    .toLowerCase()
    .replace(/ё/g, 'e')
    .replace(/[а-я]/g, (c) => {
      const map: Record<string, string> = {
        а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ж: 'zh',
        з: 'z', и: 'i', й: 'j', к: 'k', л: 'l', м: 'm', н: 'n',
        о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f',
        х: 'h', ц: 'c', ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y',
        ь: '', э: 'e', ю: 'yu', я: 'ya',
      };
      return map[c] || '';
    })
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'layout';
  const date = new Date().toISOString().slice(0, 10);
  return `homeglance-${slug}-${date}.json`;
}
