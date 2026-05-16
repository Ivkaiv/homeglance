'use client';

import { useEffect, useState } from 'react';
import { useEntity } from '@/lib/ha/ConnectionProvider';
import { SensorHistoryButton } from '@/components/charts/SensorHistoryButton';
import {
  zoneFor,
  ZONE_PALETTE,
  trendArrow,
  trendLabel,
  timeAgo,
  lastReadingAt,
  formatDelta,
  DEFAULT_THRESHOLDS,
  type TrendDirection,
} from '@/lib/glucose';

interface Params {
  /** sensor.* с текущим значением глюкозы.
   *  Атрибуты `direction` (Nightscout-стиль), `delta`, `date` — опциональны
   *  но желательны: тогда карточка показывает тренд и время с замера. */
  entity?: string;
  /** Подпись блока. По умолчанию — «Глюкоза». */
  label?: string;
  /** Целевые пороги. По умолчанию 3.0 / 3.9 / 10.0 / 13.9 ммоль/л. */
  urgentLow?: number;
  low?: number;
  high?: number;
  urgentHigh?: number;
}

const DEFAULT_ENTITY = 'sensor.blood_sugar';

export function GlucoseWidget({ params }: { params: Params }) {
  const entityId = params.entity || DEFAULT_ENTITY;
  const e = useEntity(entityId);
  const label = params.label || 'Глюкоза';

  // Тикаем раз в 30 сек чтобы «N мин назад» оставалось свежим.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  const thresholds = {
    urgentLow: params.urgentLow ?? DEFAULT_THRESHOLDS.urgentLow,
    low: params.low ?? DEFAULT_THRESHOLDS.low,
    high: params.high ?? DEFAULT_THRESHOLDS.high,
    urgentHigh: params.urgentHigh ?? DEFAULT_THRESHOLDS.urgentHigh,
  };

  const isBad = !e || e.state === 'unavailable' || e.state === 'unknown';
  const numeric = !isBad ? Number(e!.state) : NaN;
  const zone = zoneFor(numeric, thresholds);
  const palette = ZONE_PALETTE[zone];

  const unit = (e?.attributes.unit_of_measurement as string) || 'ммоль/л';
  const direction = (e?.attributes.direction as TrendDirection) ?? null;
  const delta = e?.attributes.delta as number | undefined;
  const readingTs = lastReadingAt(e?.attributes, e?.last_updated);
  const agoMs = readingTs ? now - readingTs : null;
  // «Несвежий» если > 15 мин — у CGM замер каждые 5 мин.
  const stale = agoMs !== null && agoMs > 15 * 60_000;

  const inner = (
    <div
      className={`
        h-full w-full rounded-2xl border ${palette.border} ${palette.bg}
        backdrop-blur-md
        flex flex-col overflow-hidden
        p-2 @[120px]:p-3 @[180px]:p-4
        ${stale ? 'opacity-70' : ''}
      `}
      title={`${label}: ${isBad ? 'нет данных' : `${numeric.toFixed(1)} ${unit}`}${direction ? ` (${trendLabel(direction)})` : ''}`}
    >
      {/* Заголовок (видим со среднего tier'а) */}
      <div className="hidden @[120px]:flex items-center justify-between gap-2 mb-1 min-w-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <span aria-hidden="true" className="shrink-0">🩸</span>
          <span className={`text-xs @[200px]:text-sm font-medium leading-tight truncate ${palette.textMuted}`}>
            {label}
          </span>
        </div>
        {!isBad && (
          <div className={`text-[10px] uppercase tracking-wider font-semibold ${palette.text} shrink-0 whitespace-nowrap`}>
            {palette.label}
          </div>
        )}
      </div>

      {/* Tiny tier (< 120px): просто число + стрелка в одну строку, всё что влезет */}
      <div className="@[120px]:hidden flex-1 flex items-center justify-center gap-1">
        <div className={`text-2xl font-light tabular-nums leading-none ${palette.text}`}>
          {isBad ? '—' : numeric.toFixed(1)}
        </div>
        {!isBad && direction && (
          <div className={`text-base leading-none ${palette.text}`} aria-label={trendLabel(direction)}>
            {trendArrow(direction)}
          </div>
        )}
      </div>

      {/* Medium / large tier — главный layout.
          flex-1 чтобы блок забрал всё свободное место; min-w-0 на детях
          чтобы не было overflow от длинного числа. */}
      <div className="hidden @[120px]:flex flex-1 items-center gap-2 min-w-0">
        {/* Значение + единица в одну строку, стрелка справа от числа */}
        <div className="flex items-baseline gap-1.5 min-w-0">
          <div className={`
            text-4xl @[180px]:text-5xl @[240px]:text-6xl
            font-light tabular-nums leading-none ${palette.text}
          `}>
            {isBad ? '—' : numeric.toFixed(1)}
          </div>
          <div className={`text-xs @[180px]:text-sm leading-none ${palette.textMuted}`}>
            {unit}
          </div>
        </div>

        {/* Стрелка + дельта — справа, столбиком. ml-auto прижимает к правому краю. */}
        {!isBad && (direction || delta !== undefined) && (
          <div className="ml-auto flex flex-col items-end gap-0.5 shrink-0">
            {direction && (
              <div
                className={`text-3xl @[180px]:text-4xl leading-none ${palette.text}`}
                aria-label={trendLabel(direction)}
                title={trendLabel(direction)}
              >
                {trendArrow(direction)}
              </div>
            )}
            {delta !== undefined && delta !== null && (
              <div className={`text-xs @[180px]:text-sm tabular-nums leading-none font-medium ${palette.textMuted}`}>
                {formatDelta(delta)}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Подвал — время с замера + целевой диапазон. Виден только на средних/больших. */}
      <div className="hidden @[120px]:flex items-center justify-between gap-2 mt-1 @[180px]:mt-2 min-w-0">
        <div className={`text-[10px] @[180px]:text-xs ${palette.textMuted} truncate`}>
          {agoMs === null ? '' : timeAgo(agoMs)}
          {stale && agoMs !== null && <span className="ml-1">· сенсор молчит</span>}
        </div>
        {!isBad && (
          <div className={`text-[10px] @[180px]:text-xs ${palette.textMuted} shrink-0 tabular-nums`}>
            цель {thresholds.low}–{thresholds.high}
          </div>
        )}
      </div>
    </div>
  );

  if (isBad) return inner;
  return (
    <SensorHistoryButton
      entityId={entityId}
      label={label}
      unit={unit}
      decimals={1}
      hoursBack={6}
      color={palette.dot}
      className="block w-full h-full"
    >
      {inner}
    </SensorHistoryButton>
  );
}
