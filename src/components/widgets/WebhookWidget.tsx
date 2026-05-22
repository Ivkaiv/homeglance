'use client';

import { useState } from 'react';
import { Webhook, Check, AlertCircle } from 'lucide-react';
import { useConnection } from '@/lib/ha/ConnectionProvider';
import { useT } from '@/lib/i18n/I18nProvider';

interface Params {
  /** ID HA webhook'а (без префикса). Например `my-button` для
   *  `/api/webhook/my-button`. */
  webhookId: string;
  /** Метод запроса. По умолчанию POST. */
  method?: 'GET' | 'POST' | 'PUT';
  /** JSON-тело для POST/PUT. */
  body?: string;
  label?: string;
  /** Подпись на кнопке (по умолчанию = label). */
  buttonText?: string;
}

/**
 * Виджет-кнопка, дёргает HA webhook.
 *
 * Кнопка триггерит `/api/webhook/<webhookId>` методом POST (по умолчанию).
 * Под HA Ingress запрос идёт через тот же origin — same-origin без CORS.
 * Под прямой Docker — нужно чтобы у HA был доступ из браузера.
 *
 * Опционально можно отправить JSON-body — например для запуска webhook'а
 * с параметрами `{ "scene": "movie" }`. Сразу показываем результат
 * (✓ успех / × ошибка) на 1.5 секунды.
 */
export function WebhookWidget({ params }: { params: Params }) {
  const t = useT();
  const { client } = useConnection();
  const [status, setStatus] = useState<'idle' | 'busy' | 'ok' | 'fail'>('idle');

  if (!params.webhookId) {
    return (
      <div className="glass h-full w-full p-3 flex items-center justify-center text-text-tertiary text-xs text-center">
        {t('w.webhook.configure')}
      </div>
    );
  }

  const label = params.label || t('w.webhook.label');
  const buttonText = params.buttonText || label;

  const trigger = async () => {
    if (status === 'busy') return;
    setStatus('busy');
    try {
      // HA URL берём у клиента — под proxy-mode это origin, под прямым — full URL
      const haUrl = (client as any).url as string;
      const url = `${haUrl.replace(/\/$/, '')}/api/webhook/${encodeURIComponent(params.webhookId)}`;
      const method = params.method || 'POST';
      const init: RequestInit = { method };
      if (method !== 'GET' && params.body) {
        init.body = params.body;
        init.headers = { 'Content-Type': 'application/json' };
      }
      const r = await fetch(url, init);
      setStatus(r.ok ? 'ok' : 'fail');
    } catch {
      setStatus('fail');
    } finally {
      setTimeout(() => setStatus('idle'), 1500);
    }
  };

  const tone =
    status === 'ok'
      ? 'bg-emerald-500/20 border-emerald-300/40 text-emerald-700 dark:text-emerald-200'
      : status === 'fail'
        ? 'bg-rose-500/20 border-rose-300/40 text-rose-700 dark:text-rose-200'
        : 'bg-black/5 dark:bg-white/5 border-black/10 dark:border-white/10 text-text-primary';

  const icon =
    status === 'ok' ? (
      <Check size={16} aria-hidden="true" />
    ) : status === 'fail' ? (
      <AlertCircle size={16} aria-hidden="true" />
    ) : (
      <Webhook size={16} aria-hidden="true" />
    );

  return (
    <button
      type="button"
      onClick={trigger}
      disabled={status === 'busy'}
      className={`glass h-full w-full p-3 flex flex-col items-center justify-center gap-1.5 transition border disabled:opacity-60 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/70 ${tone}`}
      aria-label={label}
    >
      <div className="w-9 h-9 rounded-full bg-black/10 dark:bg-white/10 flex items-center justify-center">
        {icon}
      </div>
      <span className="text-xs font-medium truncate max-w-full px-1">{buttonText}</span>
      {status === 'busy' && (
        <span className="text-[9px] text-text-tertiary">{t('w.webhook.sending')}</span>
      )}
    </button>
  );
}
