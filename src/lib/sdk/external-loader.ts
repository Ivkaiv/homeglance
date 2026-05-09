'use client';

/**
 * Лоадер внешних виджет-скриптов.
 *
 * Список URL'ов хранится в localStorage. На запуске Glance пробегает по
 * списку и для каждого URL append'ит <script src=...> в head. Скрипт
 * сам зовёт window.Homeglance.registerWidget(...).
 *
 * Лоадер не валидирует содержимое скрипта — это произвольный JS,
 * выполняется в контексте страницы. Пользователь предупреждается в UI.
 */

const STORAGE_KEY = 'glance:external-widgets-v1';

export interface LoadResult {
  url: string;
  ok: boolean;
  error?: string;
}

export function loadExternalWidgetUrls(): string[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.filter((s) => typeof s === 'string');
  } catch {}
  return [];
}

export function saveExternalWidgetUrls(urls: string[]): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(urls));
}

/**
 * Загружает один скрипт. Возвращает promise, который резолвится при load
 * или error. Если скрипт уже подгружен раньше — резолвится сразу ok.
 */
function loadScript(url: string): Promise<LoadResult> {
  return new Promise((resolve) => {
    if (typeof document === 'undefined') {
      resolve({ url, ok: false, error: 'no document' });
      return;
    }
    // Если такой <script> уже есть — пропускаем.
    const existing = document.querySelector(
      `script[data-homeglance-external="${cssEscape(url)}"]`
    );
    if (existing) {
      resolve({ url, ok: true });
      return;
    }
    const s = document.createElement('script');
    s.src = url;
    s.async = true;
    s.dataset.homeglanceExternal = url;
    s.onload = () => resolve({ url, ok: true });
    s.onerror = () =>
      resolve({ url, ok: false, error: 'failed to load (network error or 4xx/5xx)' });
    document.head.appendChild(s);
  });
}

function cssEscape(s: string): string {
  // Минимальный escape для атрибутного селектора.
  return s.replace(/(["\\])/g, '\\$1');
}

/** Загружает все сохранённые внешние скрипты. */
export async function loadAllExternalWidgets(): Promise<LoadResult[]> {
  const urls = loadExternalWidgetUrls();
  if (urls.length === 0) return [];
  return Promise.all(urls.map(loadScript));
}
