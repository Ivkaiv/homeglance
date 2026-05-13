/**
 * Глобальное хранилище подключения к HA.
 *
 * Источник правды — сервер (`/api/glance/connection`, файл `connection.json`):
 * один URL+token на всю установку панели, общий для всех устройств и профилей.
 *
 * Локальное зеркало в localStorage — кэш для PWA cold-start. Когда телефон
 * только проснулся / сеть ещё не поднялась, fetch к API падает в catch, и
 * пользователь видел onboarding-форму («введи URL+token»), даже если
 * connection давно сохранён. Кэш позволяет считать креды локально и сразу
 * показать дашборд; реальная WS-сессия откроется как только появится сеть.
 *
 * При успешном fetch с сервера localStorage перезаписывается актуальным
 * значением — если кто-то поменял URL/токен на другом устройстве, кэш
 * обновится через одно нормальное соединение.
 */

import type { HAConnection } from './types';
import { apiUrl } from '@/lib/api-url';

interface ApiResponse {
  configured: boolean;
  url?: string;
  token?: string;
}

const LOCAL_KEY = 'hg.connection.v1';

function readLocal(): HAConnection | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<HAConnection>;
    if (parsed?.url && parsed?.token) return { url: parsed.url, token: parsed.token };
  } catch {}
  return null;
}

function writeLocal(conn: HAConnection | null): void {
  if (typeof localStorage === 'undefined') return;
  try {
    if (conn) localStorage.setItem(LOCAL_KEY, JSON.stringify(conn));
    else localStorage.removeItem(LOCAL_KEY);
  } catch {}
}

export async function loadConnection(): Promise<HAConnection | null> {
  try {
    const r = await fetch(apiUrl('/api/glance/connection'), { cache: 'no-store' });
    if (r.ok) {
      const data: ApiResponse = await r.json();
      if (data.configured && data.url && data.token) {
        const conn = { url: data.url, token: data.token };
        writeLocal(conn);
        return conn;
      }
      // Сервер ответил «не сконфигурен» — это явное состояние, чистим кэш,
      // чтобы не показывать «призрак» прошлого подключения после forget().
      writeLocal(null);
      return null;
    }
  } catch {
    // Сеть/сервер недоступны (cold-start PWA, оффлайн, сервер перезапускается)
    // — fallback на localStorage, чтобы не выкидывать пользователя в onboarding.
    // WS-коннект всё равно не поднимется без сети, но интерфейс покажется,
    // и при возврате сети сам реконнектится.
  }
  return readLocal();
}

export async function saveConnection(conn: HAConnection): Promise<void> {
  await fetch(apiUrl('/api/glance/connection'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(conn),
  });
  writeLocal(conn);
}

export async function clearConnection(): Promise<void> {
  await fetch(apiUrl('/api/glance/connection'), { method: 'DELETE' });
  writeLocal(null);
}
