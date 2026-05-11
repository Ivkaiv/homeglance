'use client';

import { useState } from 'react';
import { ExternalLink, Globe } from 'lucide-react';

interface Params {
  /** Полный URL — может быть http(s) или относительный (для same-origin). */
  url?: string;
  label?: string;
  /** Если true — отключаем sandbox-ограничения и разрешаем скрипты из iframe. */
  allowScripts?: boolean;
}

/**
 * Виджет-iframe: показывает произвольный URL в виджете.
 *
 * Безопасность: по умолчанию iframe запускается под жёстким sandbox без
 * скриптов и popup'ов. Это ограничивает доступ для «недоверенных»
 * сайтов. Если нужны интерактивные данжборды (Grafana, отдельная
 * админка) — включить `allowScripts` в параметрах.
 *
 * Внешние iframe могут не загрузиться из-за CSP/X-Frame-Options
 * хост-сайта (`SAMEORIGIN`/`DENY`). В этом случае показываем fallback
 * с прямой ссылкой «Открыть в новой вкладке».
 */
export function IframeWidget({ params }: { params: Params }) {
  const [failed, setFailed] = useState(false);
  const url = params.url?.trim();

  if (!url) {
    return (
      <div className="glass h-full w-full p-3 flex items-center justify-center text-text-tertiary text-xs text-center">
        ⚙️ Укажите URL в настройках
      </div>
    );
  }

  if (failed) {
    return (
      <div className="glass h-full w-full p-3 flex flex-col items-center justify-center gap-2 text-text-tertiary">
        <Globe size={18} aria-hidden="true" />
        <div className="text-[11px] text-center">Сайт запретил встраивание</div>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[10px] inline-flex items-center gap-1 text-accent hover:underline"
        >
          Открыть в новой вкладке <ExternalLink size={10} aria-hidden="true" />
        </a>
      </div>
    );
  }

  const sandbox = params.allowScripts
    ? 'allow-scripts allow-same-origin allow-popups allow-forms'
    : 'allow-same-origin';

  return (
    <div className="glass h-full w-full overflow-hidden flex flex-col">
      {params.label && (
        <div className="px-3 py-1.5 text-[11px] text-text-tertiary border-b border-black/5 dark:border-white/5 shrink-0 truncate">
          {params.label}
        </div>
      )}
      <iframe
        src={url}
        title={params.label || 'Встроенный сайт'}
        sandbox={sandbox}
        loading="lazy"
        referrerPolicy="no-referrer"
        className="flex-1 min-h-0 w-full border-0 bg-white dark:bg-black"
        onError={() => setFailed(true)}
      />
    </div>
  );
}
