/**
 * Общая логика виджетов глюкозы (CGM): зоны, цвета, парсинг тренда,
 * форматирование. Используется GlucoseWidget, GlucoseChartWidget и
 * GlucoseStatsWidget.
 *
 * Зоны — стандартные клинические пороги для ммоль/л (Time-In-Range
 * протокол ADA/EASD-2019, общие для всех CGM). По умолчанию 3.9–10.0,
 * пороги «низко/высоко урежно» — 3.0 и 13.9.
 */

export type GlucoseUnit = 'mmol' | 'mgdl';

/** Пороги (в ммоль/л) для разбиения на зоны. Меняются параметрами виджета. */
export interface GlucoseThresholds {
  urgentLow: number;
  low: number;
  high: number;
  urgentHigh: number;
}

export const DEFAULT_THRESHOLDS: GlucoseThresholds = {
  urgentLow: 3.0,
  low: 3.9,
  high: 10.0,
  urgentHigh: 13.9,
};

/** Узкие границы «нормы», в которой стоит держаться. */
export const TARGET_RANGE_MIN = 3.9;
export const TARGET_RANGE_MAX = 7.8;

export type GlucoseZone =
  | 'urgent-low'
  | 'low'
  | 'in-range'
  | 'slightly-high'
  | 'high'
  | 'urgent-high'
  | 'unknown';

export function zoneFor(value: number, t: GlucoseThresholds = DEFAULT_THRESHOLDS): GlucoseZone {
  if (!Number.isFinite(value)) return 'unknown';
  if (value < t.urgentLow) return 'urgent-low';
  if (value < t.low) return 'low';
  if (value <= TARGET_RANGE_MAX) return 'in-range';
  if (value < t.high) return 'slightly-high';
  if (value < t.urgentHigh) return 'high';
  return 'urgent-high';
}

/** Палитра по зонам. Цвета вынесены в одно место — чтобы стили графика,
 *  фона карточки и точек на спарклайне совпадали.
 *
 *  Контраст: текст всегда тёмный в светлой теме и светлый в тёмной, ради
 *  читабельности на сочном цветном фоне (urgent-low/urgent-high — насыщенный
 *  красный). Использовали парные классы `text-rose-900 dark:text-rose-50`,
 *  чтобы и днём, и ночью значение «13.9» было хорошо видно. */
export const ZONE_PALETTE: Record<GlucoseZone, {
  bg: string;            // фон карточки
  border: string;        // акцентная рамка
  text: string;          // текст значения
  textMuted: string;     // приглушённый текст (подпись, единица, метка зоны)
  dot: string;           // точка на графике (полный hex)
  label: string;
}> = {
  'urgent-low': {
    bg: 'bg-red-500/80 dark:bg-red-500/40',
    border: 'border-red-600 dark:border-red-400',
    text: 'text-white dark:text-rose-50',
    textMuted: 'text-rose-50/90 dark:text-rose-100/90',
    dot: '#b91c1c',
    label: 'опасно низко',
  },
  'low': {
    bg: 'bg-red-500/30 dark:bg-red-500/25',
    border: 'border-red-400 dark:border-red-400/60',
    text: 'text-red-900 dark:text-red-100',
    textMuted: 'text-red-800/80 dark:text-red-200/80',
    dot: '#ef4444',
    label: 'низко',
  },
  'in-range': {
    bg: 'bg-emerald-500/20 dark:bg-emerald-500/20',
    border: 'border-emerald-500/60 dark:border-emerald-400/50',
    text: 'text-emerald-900 dark:text-emerald-100',
    textMuted: 'text-emerald-800/75 dark:text-emerald-200/80',
    dot: '#10b981',
    label: 'норма',
  },
  'slightly-high': {
    bg: 'bg-amber-500/25 dark:bg-amber-500/20',
    border: 'border-amber-500/60 dark:border-amber-400/50',
    text: 'text-amber-900 dark:text-amber-100',
    textMuted: 'text-amber-800/80 dark:text-amber-200/80',
    dot: '#f59e0b',
    label: 'выше нормы',
  },
  'high': {
    bg: 'bg-orange-500/30 dark:bg-orange-500/25',
    border: 'border-orange-500/70 dark:border-orange-400/60',
    text: 'text-orange-900 dark:text-orange-100',
    textMuted: 'text-orange-800/80 dark:text-orange-200/80',
    dot: '#f97316',
    label: 'высоко',
  },
  'urgent-high': {
    bg: 'bg-red-500/80 dark:bg-red-500/45',
    border: 'border-red-600 dark:border-red-400',
    text: 'text-white dark:text-rose-50',
    textMuted: 'text-rose-50/90 dark:text-rose-100/90',
    dot: '#b91c1c',
    label: 'опасно высоко',
  },
  'unknown': {
    bg: 'bg-black/5 dark:bg-white/5',
    border: 'border-black/10 dark:border-white/10',
    text: 'text-text-secondary',
    textMuted: 'text-text-tertiary',
    dot: '#6b7280',
    label: 'нет данных',
  },
};

/** Стрелка тренда Nightscout/Dexcom. */
export type TrendDirection =
  | 'DoubleUp'
  | 'SingleUp'
  | 'FortyFiveUp'
  | 'Flat'
  | 'FortyFiveDown'
  | 'SingleDown'
  | 'DoubleDown'
  | 'NONE'
  | 'NOT_COMPUTABLE'
  | 'RATE_OUT_OF_RANGE'
  | null;

/** Юникод-символ для отображения. Падает на «—» если тренд неизвестен. */
export function trendArrow(d: TrendDirection): string {
  switch (d) {
    case 'DoubleUp':      return '⇈';
    case 'SingleUp':      return '↑';
    case 'FortyFiveUp':   return '↗';
    case 'Flat':          return '→';
    case 'FortyFiveDown': return '↘';
    case 'SingleDown':    return '↓';
    case 'DoubleDown':    return '⇊';
    default:              return '·';
  }
}

/** Человеческое описание тренда — для accessibility/title. */
export function trendLabel(d: TrendDirection): string {
  switch (d) {
    case 'DoubleUp':      return 'быстро растёт';
    case 'SingleUp':      return 'растёт';
    case 'FortyFiveUp':   return 'медленно растёт';
    case 'Flat':          return 'стабильно';
    case 'FortyFiveDown': return 'медленно падает';
    case 'SingleDown':    return 'падает';
    case 'DoubleDown':    return 'быстро падает';
    default:              return 'тренд неизвестен';
  }
}

/** «3 мин назад» / «1 ч 12 мин назад». */
export function timeAgo(ms: number): string {
  const sec = Math.max(0, Math.round(ms / 1000));
  if (sec < 30) return 'только что';
  if (sec < 90) return '1 мин назад';
  const min = Math.round(sec / 60);
  if (min < 60) return `${min} мин назад`;
  const hours = Math.floor(min / 60);
  const restMin = min % 60;
  if (hours < 6) {
    return restMin > 0 ? `${hours} ч ${restMin} мин назад` : `${hours} ч назад`;
  }
  if (hours < 24) return `${hours} ч назад`;
  const days = Math.floor(hours / 24);
  return `${days} дн назад`;
}

/** Парсинг даты последнего замера из HA state. Возвращает timestamp (ms)
 *  или null. Учитываем `attributes.date` (Nightscout-стиль) и `last_updated`. */
export function lastReadingAt(attrs: Record<string, unknown> | undefined, lastUpdated?: string): number | null {
  const dateAttr = (attrs?.['date'] as string) ?? undefined;
  if (dateAttr) {
    const t = Date.parse(dateAttr);
    if (!Number.isNaN(t)) return t;
  }
  if (lastUpdated) {
    const t = Date.parse(lastUpdated);
    if (!Number.isNaN(t)) return t;
  }
  return null;
}

/** Формат знака для дельты: «+0.7», «−0.4», «0.0». */
export function formatDelta(d: number | null | undefined, decimals = 1): string {
  if (d === null || d === undefined || !Number.isFinite(d)) return '';
  const v = Number(d);
  if (Math.abs(v) < 0.05) return '0.0';
  const sign = v > 0 ? '+' : '−';
  return `${sign}${Math.abs(v).toFixed(decimals)}`;
}

/** Список диапазонов истории для UI-переключателя графика. */
export const RANGE_OPTIONS: Array<{ value: 3 | 6 | 12 | 24; label: string }> = [
  { value: 3,  label: '3 ч' },
  { value: 6,  label: '6 ч' },
  { value: 12, label: '12 ч' },
  { value: 24, label: '24 ч' },
];
