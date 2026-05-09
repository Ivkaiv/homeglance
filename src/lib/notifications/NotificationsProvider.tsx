'use client';

/**
 * Уведомления Glance.
 *
 * Минимальный foreground-only MVP: подписываемся на персистентные
 * уведомления HA (`persistent_notification.*` сущности) и показываем
 * их через Web Notification API когда Glance открыт.
 *
 * Полноценный background Web Push — отдельная итерация: требует VAPID
 * keys на сервере, регистрации subscriptions в HA через html5-integration,
 * и инструкций для пользователя по настройке HA. Foreground-вариант
 * закрывает основной кейс «получаю уведомление пока вкладка открыта».
 */

import { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { useConnection } from '@/lib/ha/ConnectionProvider';

const STORAGE_KEY = 'glance:notifications-enabled-v1';
const SEEN_KEY = 'glance:notifications-seen-v1';

type Permission = 'default' | 'granted' | 'denied' | 'unsupported';

interface NotificationsContextValue {
  permission: Permission;
  enabled: boolean;
  /** Запрашивает разрешение и включает поддержку. */
  request: () => Promise<Permission>;
  /** Выключает уведомления локально (permission в браузере не отзывается). */
  disable: () => void;
}

const NotificationsContext = createContext<NotificationsContextValue | null>(null);

function detectPermission(): Permission {
  if (typeof window === 'undefined') return 'unsupported';
  if (!('Notification' in window)) return 'unsupported';
  return Notification.permission as Permission;
}

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { states, isReady } = useConnection();
  const [permission, setPermission] = useState<Permission>('default');
  const [enabled, setEnabled] = useState(false);
  const seenRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    setPermission(detectPermission());
    try {
      setEnabled(localStorage.getItem(STORAGE_KEY) === '1');
      const raw = localStorage.getItem(SEEN_KEY);
      if (raw) {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) seenRef.current = new Set(arr);
      }
    } catch {}
  }, []);

  // Каждый раз когда обновляются states — проверяем persistent_notification.*
  // на новые. «Новое» = либо id не было раньше, либо last_changed обновился.
  useEffect(() => {
    if (!enabled || permission !== 'granted' || !isReady) return;
    if (typeof Notification === 'undefined') return;

    const seen = seenRef.current;
    const next = new Set(seen);
    let dirty = false;

    for (const [entityId, state] of Object.entries(states)) {
      if (!entityId.startsWith('persistent_notification.')) continue;
      const key = `${entityId}@${state.last_changed}`;
      if (seen.has(key)) continue;
      next.add(key);
      dirty = true;

      // На самом первом поллинге (когда seen ещё пустой) НЕ шлём уведомления —
      // иначе при первом включении бахнет десяток старых нотификаций.
      if (seen.size === 0) continue;

      const title = state.attributes.title || state.attributes.friendly_name || 'Home Assistant';
      const body =
        state.attributes.message ||
        (typeof state.state === 'string' ? state.state : '');
      try {
        new Notification(title, {
          body,
          tag: entityId, // одна нотификация на сущность; обновление перезаписывает
          icon: '/icons/icon-192.png',
          badge: '/icons/icon-192.png',
        });
      } catch {
        // ignore — не во всех браузерах поддержка stable
      }
    }

    if (dirty) {
      seenRef.current = next;
      try {
        // Храним последние 200 ключей чтобы localStorage не разрастался.
        const keys = Array.from(next).slice(-200);
        localStorage.setItem(SEEN_KEY, JSON.stringify(keys));
      } catch {}
    }
  }, [states, enabled, permission, isReady]);

  async function request(): Promise<Permission> {
    if (!('Notification' in window)) {
      setPermission('unsupported');
      return 'unsupported';
    }
    const result = (await Notification.requestPermission()) as Permission;
    setPermission(result);
    if (result === 'granted') {
      setEnabled(true);
      try {
        localStorage.setItem(STORAGE_KEY, '1');
      } catch {}
    }
    return result;
  }

  function disable(): void {
    setEnabled(false);
    try {
      localStorage.setItem(STORAGE_KEY, '0');
    } catch {}
  }

  return (
    <NotificationsContext.Provider value={{ permission, enabled, request, disable }}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error('useNotifications must be used inside <NotificationsProvider>');
  return ctx;
}
