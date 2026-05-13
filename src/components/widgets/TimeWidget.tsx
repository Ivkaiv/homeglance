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

  // Шрифт цифр и паддинг — через @container queries (по ширине ячейки).
  // Ранее на широких виджетах (>=220px) шло text-6xl ≈ 60px — на высоте 96px
  // (defaultSize 4×3 при ROW_HEIGHT=32) цифры физически не помещались с
  // padding p-4 и второй строкой даты: контент торчал за нижнюю/верхнюю
  // границу карточки. Уменьшил шкалу до 2xl/3xl/4xl и зафиксировал
  // leading-none — цифры всегда сидят в одну строку без overflow.
  return (
    <div className="glass h-full w-full flex flex-col items-center justify-center gap-1 overflow-hidden p-2 @[140px]:p-3">
      <div className="text-xl @[80px]:text-2xl @[140px]:text-3xl @[220px]:text-4xl font-light tabular-nums leading-none">
        {time}
      </div>
      {params.showDate !== false && (
        <div className="hidden @[140px]:block text-xs text-text-secondary capitalize leading-tight truncate max-w-full">
          {dateStr}
        </div>
      )}
    </div>
  );
}
