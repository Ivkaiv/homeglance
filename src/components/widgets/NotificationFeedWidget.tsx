'use client';

import { useEffect, useState } from 'react';
import { Bell, X } from 'lucide-react';
import { useConnection } from '@/lib/ha/ConnectionProvider';

interface Params {
  label?: string;
  /** Максимум показываемых уведомлений. По умолчанию 10. */
  max?: number;
}

interface HaNotification {
  notification_id: string;
  title?: string;
  message: string;
  created_at?: string;
}

/**
 * Лента persistent-уведомлений HA.
 *
 * HA WS-команда `persistent_notification/get` возвращает массив активных
 * уведомлений. Подписываемся также на `persistent_notifications_updated`,
 * чтобы перечитывать список — реалтайм без поллинга.
 *
 * Тап на крестик → `persistent_notification.dismiss` (через REST/WS service).
 */
export function NotificationFeedWidget({ params }: { params: Params }) {
  const { client, isReady } = useConnection();
  const [items, setItems] = useState<HaNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const max = Math.max(1, params.max ?? 10);
  const label = params.label || 'Уведомления';

  useEffect(() => {
    if (!isReady) return;
    let cancelled = false;
    const fetchList = async () => {
      try {
        const list = await (client as any).callWS({
          type: 'persistent_notification/get',
        });
        if (cancelled) return;
        // Серверная схема: { notification_id, message, title, created_at }
        setItems(Array.isArray(list) ? list : []);
      } catch {
        if (!cancelled) setItems([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchList();
    // Polling раз в 15 секунд — для виджета панели достаточно.
    // (WS subscribe_events на persistent_notifications_updated даёт realtime,
    // но возвращает id подписки в свойстве result, а не функцию — обработка
    // отписки усложнила бы код. Polling-вариант проще и предсказуемее.)
    const interval = setInterval(fetchList, 15_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [client, isReady]);

  const dismiss = (id: string) => {
    (client as any)
      .callService('persistent_notification', 'dismiss', undefined, {
        notification_id: id,
      })
      .catch(() => {});
    setItems((prev) => prev.filter((n) => n.notification_id !== id));
  };

  const visible = items.slice(0, max);

  return (
    <div className="glass h-full w-full p-3 flex flex-col overflow-hidden">
      <header className="flex items-center justify-between gap-2 mb-2 shrink-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <Bell size={14} className="text-text-tertiary shrink-0" aria-hidden="true" />
          <span className="text-xs font-medium truncate">{label}</span>
        </div>
        {items.length > 0 && (
          <span className="text-[10px] text-text-tertiary tabular-nums shrink-0">
            {items.length}
          </span>
        )}
      </header>

      {loading ? (
        <div className="flex-1 flex items-center justify-center text-[11px] text-text-tertiary">
          Загрузка…
        </div>
      ) : visible.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-[11px] text-text-tertiary text-center px-2">
          Нет активных уведомлений
        </div>
      ) : (
        <ul className="flex-1 min-h-0 overflow-y-auto space-y-1.5 pr-1">
          {visible.map((n) => (
            <li
              key={n.notification_id}
              className="text-xs rounded-md px-2 py-1.5 bg-black/5 dark:bg-white/5 flex items-start gap-2"
            >
              <div className="flex-1 min-w-0">
                {n.title && (
                  <div className="font-medium truncate" title={n.title}>
                    {n.title}
                  </div>
                )}
                <div
                  className="text-text-secondary line-clamp-2 whitespace-pre-wrap"
                  title={n.message}
                >
                  {n.message}
                </div>
                {n.created_at && (
                  <div className="text-[9px] text-text-tertiary mt-0.5">
                    {new Date(n.created_at).toLocaleString('ru-RU', {
                      hour: '2-digit',
                      minute: '2-digit',
                      day: 'numeric',
                      month: 'short',
                    })}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => dismiss(n.notification_id)}
                aria-label="Закрыть уведомление"
                className="no-drag shrink-0 w-5 h-5 rounded-full bg-black/10 dark:bg-white/10 text-text-tertiary hover:text-text-primary flex items-center justify-center"
              >
                <X size={10} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
