/**
 * Реестр виджетов.
 * Виджеты регистрируются здесь, ConfigSheet/AddWidgetSheet берут отсюда метаданные.
 */

import type { WidgetEntry, WidgetCategory } from './types';

// Реестр гетерогенный — конкретный тип параметров известен только по
// meta.type (рантайм-диспатч), поэтому здесь храним `WidgetEntry<any>`.
type AnyEntry = WidgetEntry<any>;

const REGISTRY: Map<string, AnyEntry> = new Map();

export function register<P>(entry: WidgetEntry<P>): void {
  if (REGISTRY.has(entry.meta.type)) {
    console.warn(`Widget type "${entry.meta.type}" already registered, overriding`);
  }
  REGISTRY.set(entry.meta.type, entry as AnyEntry);
}

export function getWidget(type: string): AnyEntry | undefined {
  return REGISTRY.get(type);
}

export function listWidgets(): AnyEntry[] {
  return Array.from(REGISTRY.values());
}

export function listByCategory(category: WidgetCategory): AnyEntry[] {
  return listWidgets().filter((w) => w.meta.category === category);
}

export const CATEGORY_LABELS: Record<WidgetCategory, { label: string; emoji: string }> = {
  lights: { label: 'Свет', emoji: '💡' },
  switches: { label: 'Переключатели', emoji: '🔌' },
  sensors: { label: 'Сенсоры', emoji: '📊' },
  climate: { label: 'Климат', emoji: '🌡' },
  media: { label: 'Медиа', emoji: '🎵' },
  cameras: { label: 'Камеры', emoji: '📷' },
  rooms: { label: 'Комнаты', emoji: '🏠' },
  health: { label: 'Здоровье', emoji: '🩸' },
  misc: { label: 'Прочее', emoji: '✨' },
};
