/**
 * Синхронизация раскладок и профилей через HA frontend_storage.
 *
 * Идея: HA хранит на сервере произвольный JSON per-user. Любое устройство,
 * авторизованное тем же HA-пользователем, читает/пишет один и тот же ключ.
 * Это даёт «облако» без отдельной инфраструктуры — пока HA онлайн, синк
 * работает на сети без отдельных серверов и аккаунтов.
 *
 * Снапшот хранится одним ключом `homeglance.snapshot` и включает все профили
 * со страницами. Multi-user через профили Homeglance остаётся локальным —
 * sync копирует «весь Homeglance этого HA-пользователя» туда-сюда.
 */

import type { HAClient } from '@/lib/ha/client';
import type { Page } from '@/lib/pages/types';
import type { Profile } from '@/lib/profiles/types';

const SNAPSHOT_KEY = 'homeglance.snapshot';
const SCHEMA = 'homeglance.snapshot/1';

export interface ProfilePagesPair {
  profileId: string;
  pages: Page[];
}

export interface Snapshot {
  schema: typeof SCHEMA;
  syncedAt: string;
  appVersion: string;
  /** Профили с их аватарами и (если задан) PIN-хэшем. */
  profiles: Profile[];
  /** Страницы — отдельным массивом per-profile. */
  pagesByProfile: ProfilePagesPair[];
}

const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? '0.0.0';

/**
 * Push: собирает снапшот из переданных данных и пишет в HA frontend_storage.
 * Бросает исключение если HA не отвечает или возвращает ошибку — UI должен
 * показать тост.
 */
export async function pushSnapshot(
  client: HAClient,
  profiles: Profile[],
  pagesByProfile: ProfilePagesPair[]
): Promise<Snapshot> {
  const snapshot: Snapshot = {
    schema: SCHEMA,
    syncedAt: new Date().toISOString(),
    appVersion: APP_VERSION,
    profiles,
    pagesByProfile,
  };
  await client.setUserData<Snapshot>(SNAPSHOT_KEY, snapshot);
  return snapshot;
}

/**
 * Pull: читает снапшот из HA. Возвращает null если ничего не сохранено
 * (первый запуск sync). Бросает при поломанном формате.
 */
export async function pullSnapshot(client: HAClient): Promise<Snapshot | null> {
  const raw = await client.getUserData<Partial<Snapshot> | null>(SNAPSHOT_KEY);
  if (!raw) return null;
  if (raw.schema !== SCHEMA) {
    throw new Error(`Несовместимая версия снапшота: ${String(raw.schema)}`);
  }
  if (!Array.isArray(raw.profiles) || !Array.isArray(raw.pagesByProfile)) {
    throw new Error('Снапшот в HA повреждён');
  }
  return raw as Snapshot;
}
