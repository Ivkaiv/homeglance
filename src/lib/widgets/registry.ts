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
  lights: { label: 'wcat.lights', emoji: '💡' },
  switches: { label: 'wcat.switches', emoji: '🔌' },
  sensors: { label: 'wcat.sensors', emoji: '📊' },
  climate: { label: 'wcat.climate', emoji: '🌡' },
  media: { label: 'wcat.media', emoji: '🎵' },
  cameras: { label: 'wcat.cameras', emoji: '📷' },
  rooms: { label: 'wcat.rooms', emoji: '🏠' },
  health: { label: 'wcat.health', emoji: '🩸' },
  misc: { label: 'wcat.misc', emoji: '✨' },
};
