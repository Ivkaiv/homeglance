/**
 * Серверное хранилище профилей.
 * Один список профилей на инсталляцию, общий для всех устройств.
 * Активный профиль — локальный (per-device, в localStorage).
 */

import type { Profile } from './types';
import { apiUrl } from '@/lib/api-url';

const ACTIVE_KEY = 'glance:active-profile-v1';

export async function loadProfiles(): Promise<Profile[]> {
  try {
    const r = await fetch(apiUrl('/api/glance/profiles'), { cache: 'no-store' });
    if (!r.ok) return [];
    const data = await r.json();
    return Array.isArray(data?.profiles) ? data.profiles : [];
  } catch {
    return [];
  }
}

export async function saveProfiles(profiles: Profile[]): Promise<void> {
  await fetch(apiUrl('/api/glance/profiles'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ profiles }),
  });
}

// Активный профиль — локально (выбор на каждом устройстве свой)
export function loadActiveProfileId(): string | null {
  if (typeof localStorage === 'undefined') return null;
  return localStorage.getItem(ACTIVE_KEY);
}

export function saveActiveProfileId(id: string): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(ACTIVE_KEY, id);
}

export function clearActiveProfile(): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.removeItem(ACTIVE_KEY);
}

/** Удалить локальные данные профиля (раскладки, настройки) на ЭТОМ устройстве */
export function deleteProfileData(profileId: string): void {
  if (typeof localStorage === 'undefined') return;
  const prefix = `glance:profile:${profileId}:`;
  const keys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith(prefix)) keys.push(k);
  }
  for (const k of keys) localStorage.removeItem(k);
}

/** Хэшируем PIN. SubtleCrypto в secure context, fallback в insecure. */
export async function hashPin(pin: string): Promise<string> {
  const sha = await hashPinSha256(pin);
  if (sha) return sha;
  return hashPinSimple(pin);
}

async function hashPinSha256(pin: string): Promise<string | null> {
  try {
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      const enc = new TextEncoder();
      const buf = await crypto.subtle.digest('SHA-256', enc.encode(pin));
      return (
        'sha256:' +
        Array.from(new Uint8Array(buf))
          .map((b) => b.toString(16).padStart(2, '0'))
          .join('')
      );
    }
  } catch {}
  return null;
}

function hashPinSimple(pin: string): string {
  let h = 0;
  for (let i = 0; i < pin.length; i++) h = (h * 31 + pin.charCodeAt(i)) | 0;
  return 'simple:' + h.toString(36);
}

/**
 * Проверка PIN — пересчитывает хэш ТЕМ ЖЕ алгоритмом, что был использован
 * при установке (по префиксу `sha256:` / `simple:`). Без этого PIN, установленный
 * в HTTP-контексте (simple-fallback), невозможно было бы ввести с HTTPS-устройства,
 * где crypto.subtle доступен и `hashPin` всегда выдаёт sha256-хэш.
 */
export async function verifyPin(pin: string, hash: string): Promise<boolean> {
  if (hash.startsWith('sha256:')) {
    const sha = await hashPinSha256(pin);
    return sha === hash;
  }
  if (hash.startsWith('simple:')) {
    return hashPinSimple(pin) === hash;
  }
  // Хэш без префикса (legacy / битый) — пытаемся оба варианта.
  const sha = await hashPinSha256(pin);
  if (sha === hash) return true;
  return hashPinSimple(pin) === hash;
}
