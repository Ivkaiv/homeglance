/**
 * Хранение раскладки страницы в localStorage.
 * MVP: одна страница «default». Многостраничность в Phase 2.
 */

import type { WidgetConfig } from '@/lib/widgets/types';

const KEY_PREFIX = 'glance:layout:v1:';

export interface PageLayout {
  pageId: string;
  widgets: WidgetConfig[];
  updatedAt: number;
}

export function loadLayout(pageId = 'default'): PageLayout {
  if (typeof localStorage === 'undefined') {
    return { pageId, widgets: [], updatedAt: 0 };
  }
  try {
    const raw = localStorage.getItem(KEY_PREFIX + pageId);
    if (!raw) return { pageId, widgets: [], updatedAt: 0 };
    const parsed = JSON.parse(raw);
    if (parsed && Array.isArray(parsed.widgets)) return parsed;
  } catch {}
  return { pageId, widgets: [], updatedAt: 0 };
}

export function saveLayout(widgets: WidgetConfig[], pageId = 'default'): void {
  if (typeof localStorage === 'undefined') return;
  const data: PageLayout = { pageId, widgets, updatedAt: Date.now() };
  localStorage.setItem(KEY_PREFIX + pageId, JSON.stringify(data));
}

export function resetLayout(pageId = 'default'): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.removeItem(KEY_PREFIX + pageId);
}
