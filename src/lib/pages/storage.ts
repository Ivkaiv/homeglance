/**
 * Серверное хранилище страниц per-profile.
 * Раскладки переезжают между устройствами, потому что лежат на сервере.
 */

import type { Page } from './types';
import { apiUrl } from '@/lib/api-url';

export async function loadPages(profileId: string): Promise<Page[]> {
  try {
    const r = await fetch(
      apiUrl(`/api/glance/pages?profileId=${encodeURIComponent(profileId)}`),
      { cache: 'no-store' }
    );
    if (!r.ok) return defaultPages();
    const data = await r.json();
    if (Array.isArray(data?.pages) && data.pages.length > 0) return data.pages;
  } catch {}
  return defaultPages();
}

export async function savePages(profileId: string, pages: Page[]): Promise<void> {
  await fetch(apiUrl('/api/glance/pages'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ profileId, pages }),
  });
}

// Активная страница — локально (в каждом браузере свой выбор)
const ACTIVE_KEY_PREFIX = 'glance:active-page-v1:';

export function loadActivePageId(profileId: string): string | null {
  if (typeof localStorage === 'undefined') return null;
  return localStorage.getItem(ACTIVE_KEY_PREFIX + profileId);
}

export function saveActivePageId(profileId: string, id: string): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(ACTIVE_KEY_PREFIX + profileId, id);
}

function defaultPages(): Page[] {
  return [{ id: 'home', title: 'Главная', icon: '🏠', widgets: [], protected: true }];
}
