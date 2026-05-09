/**
 * Глобальное хранилище подключения к HA — на сервере (через /api/glance/connection).
 * Один URL+token на всю установку панели, общий для всех устройств и профилей.
 */

import type { HAConnection } from './types';
import { apiUrl } from '@/lib/api-url';

interface ApiResponse {
  configured: boolean;
  url?: string;
  token?: string;
}

export async function loadConnection(): Promise<HAConnection | null> {
  try {
    const r = await fetch(apiUrl('/api/glance/connection'), { cache: 'no-store' });
    if (!r.ok) return null;
    const data: ApiResponse = await r.json();
    if (data.configured && data.url && data.token) {
      return { url: data.url, token: data.token };
    }
  } catch {}
  return null;
}

export async function saveConnection(conn: HAConnection): Promise<void> {
  await fetch(apiUrl('/api/glance/connection'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(conn),
  });
}

export async function clearConnection(): Promise<void> {
  await fetch(apiUrl('/api/glance/connection'), { method: 'DELETE' });
}
