'use client';

import * as MdiIcons from '@mdi/js';
import { BrandIcon, hasBrandIcon } from './BrandIcons';

const MDI_MAP = MdiIcons as unknown as Record<string, string>;

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

export function getMdiPath(name: string): string | null {
  if (!name) return null;
  const key = toMdiKey(name);
  return MDI_MAP[key] ?? null;
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
  const path = getMdiPath(name);
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
  if (!v) return null;

  // 1. BrandIcon — кастомные SVG из PWA (лампы, светильники, переключатели и пр.)
  //    Эти иконки выглядят правдоподобнее чем MDI: «dome-light», «light-strip»,
  //    «pendant-long» имеют свои уникальные силуэты.
  if (hasBrandIcon(v)) {
    return <BrandIcon name={v} size={size} className={className} />;
  }

  // 2. MDI — для общих имён типа «lightbulb», «thermometer», «account».
  const path = getMdiPath(v);
  if (path) {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        width={size}
        height={size}
        className={className}
        fill="currentColor"
      >
        <path d={path} />
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
export function searchMdi(query: string, limit = 60): string[] {
  if (!query.trim()) return [];
  const q = query.trim().toLowerCase();
  const result: string[] = [];
  for (const key of Object.keys(MDI_MAP)) {
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
