'use client';

import { useEffect, useState } from 'react';
import { BrandIcon, hasBrandIcon } from './BrandIcons';

/**
 * MDI icon-set весит ~2.8 MB (все 7000 иконок). Если импортировать
 * `import * as MdiIcons from '@mdi/js'`, весь пакет попадает в initial
 * bundle — нагрузка на старт страницы огромная.
 *
 * `MDI_MAP[key]` с динамическими именами иконок не tree-shake'ится,
 * поэтому единственный путь срезать вес — **lazy-load `@mdi/js`**
 * через `import('@mdi/js')` после монтирования. Бандл с иконками
 * становится отдельным async-чанком, который Next.js подгружает только
 * когда первый MDI-компонент маунтится.
 *
 * Загруженный модуль кэшируется в module-scope, чтобы все последующие
 * `<MdiIcon>` использовали уже распарсенную мапу синхронно.
 */
let mdiCache: Record<string, string> | null = null;
let mdiLoading: Promise<Record<string, string>> | null = null;

function loadMdi(): Promise<Record<string, string>> {
  if (mdiCache) return Promise.resolve(mdiCache);
  if (!mdiLoading) {
    mdiLoading = import('@mdi/js').then((m) => {
      mdiCache = m as unknown as Record<string, string>;
      return mdiCache;
    });
  }
  return mdiLoading;
}

/** Конвертация "lightbulb-on" → "mdiLightbulbOn" */
function toMdiKey(name: string): string {
  const cleaned = name.replace(/^mdi[:-]?/, '');
  return (
    'mdi' +
    cleaned
      .split('-')
      .filter(Boolean)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join('')
  );
}

/**
 * Синхронная версия: возвращает path только если @mdi/js уже загружен.
 * Используется в местах, где значение нужно сразу (например, для условного
 * рендера). До первой загрузки возвращает null.
 */
export function getMdiPath(name: string): string | null {
  if (!name || !mdiCache) return null;
  const key = toMdiKey(name);
  return mdiCache[key] ?? null;
}

/** React-хук: lazy-load @mdi/js и резолв path по имени. */
function useMdiPath(name: string): string | null {
  const [path, setPath] = useState<string | null>(() => getMdiPath(name));
  useEffect(() => {
    if (!name) {
      setPath(null);
      return;
    }
    let cancelled = false;
    loadMdi().then((map) => {
      if (cancelled) return;
      const key = toMdiKey(name);
      setPath(map[key] ?? null);
    });
    return () => {
      cancelled = true;
    };
  }, [name]);
  return path;
}

export function MdiIcon({
  name,
  size = 24,
  className,
  style,
}: {
  name: string;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  const path = useMdiPath(name);
  if (!path) return null;
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      style={style}
      fill="currentColor"
    >
      <path d={path} />
    </svg>
  );
}

/**
 * Универсальный рендерер: если name похож на MDI — рендерит иконку,
 * иначе считает это эмодзи и выводит как текст.
 */
export function GlanceIcon({
  value,
  size = 24,
  className,
  fallback,
}: {
  value: string | undefined;
  size?: number;
  className?: string;
  fallback?: string;
}) {
  const v = value || fallback || '';
  const mdiPath = useMdiPath(v);
  if (!v) return null;

  // 1. BrandIcon — кастомные SVG из PWA (лампы, светильники, переключатели и пр.)
  //    Эти иконки выглядят правдоподобнее чем MDI: «dome-light», «light-strip»,
  //    «pendant-long» имеют свои уникальные силуэты.
  if (hasBrandIcon(v)) {
    return <BrandIcon name={v} size={size} className={className} />;
  }

  // 2. MDI — для общих имён типа «lightbulb», «thermometer», «account».
  if (mdiPath) {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        width={size}
        height={size}
        className={className}
        fill="currentColor"
      >
        <path d={mdiPath} />
      </svg>
    );
  }

  // 3. Fallback — рендерим как эмодзи (если value содержит unicode-эмодзи).
  return (
    <span style={{ fontSize: Math.round(size * 0.95), lineHeight: 1 }} className={className}>
      {v}
    </span>
  );
}

/** Вернёт первые `limit` иконок MDI, чьё имя содержит `query`. */
export async function searchMdi(query: string, limit = 60): Promise<string[]> {
  if (!query.trim()) return [];
  const map = await loadMdi();
  const q = query.trim().toLowerCase();
  const result: string[] = [];
  for (const key of Object.keys(map)) {
    // Конвертим mdiLightbulbOn → "lightbulb-on" для поиска по нативному формату
    const name = key
      .replace(/^mdi/, '')
      .replace(/([A-Z])/g, '-$1')
      .toLowerCase()
      .replace(/^-/, '');
    if (name.includes(q)) {
      result.push(name);
      if (result.length >= limit) break;
    }
  }
  return result;
}
