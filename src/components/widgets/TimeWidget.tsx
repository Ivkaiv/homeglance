'use client';

import { useEffect, useState } from 'react';

interface Params {
  showSeconds?: boolean;
  showDate?: boolean;
  format24h?: boolean;
}

export function TimeWidget({ params }: { params: Params }) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const tick = params.showSeconds ? 1000 : 30_000;
    let id: ReturnType<typeof setInterval> | null = null;
    const start = () => {
      if (id !== null) return;
      id = setInterval(() => setNow(new Date()), tick);
    };
    const stop = () => {
      if (id !== null) {
        clearInterval(id);
        id = null;
      }
    };
    // Не тикаем когда страница свёрнута/в фоне — экономит батарею телефона
    // и снимает ненужную нагрузку на остальные виджеты (всё равно никто не видит).
    const onVis = () => {
      if (document.visibilityState === 'visible') {
        setNow(new Date()); // обновить сразу при возврате
        start();
      } else {
        stop();
      }
    };
    onVis();
    document.addEventListener('visibilitychange', onVis);
    return () => {
      stop();
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [params.showSeconds]);

  const hh = String(params.format24h !== false ? now.getHours() : now.getHours() % 12 || 12).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');
  const time = params.showSeconds ? `${hh}:${mm}:${ss}` : `${hh}:${mm}`;
  const dateStr = now.toLocaleDateString('ru-RU', {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
  });

  // Один layout, размер шрифта и паддинги — через container queries.
  // tiny (<80): text-sm; small (80-140): text-2xl; medium (140-220): text-4xl;
  // large (>=220): text-6xl. Дата видна только начиная со 140.
  return (
    <div className="glass h-full w-full flex flex-col items-center justify-center gap-1 @[80px]:p-2 @[140px]:p-4">
      <div className="text-sm @[80px]:text-2xl @[140px]:text-4xl @[220px]:text-6xl font-light tabular-nums">
        {time}
      </div>
      {params.showDate !== false && (
        <div className="hidden @[140px]:block text-xs text-text-secondary capitalize">
          {dateStr}
        </div>
      )}
    </div>
  );
}
