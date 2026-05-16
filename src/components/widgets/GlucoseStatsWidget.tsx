'use client';

import { useEntity } from '@/lib/ha/ConnectionProvider';
import { SensorHistoryButton } from '@/components/charts/SensorHistoryButton';

interface Params {
  /** Подпись блока. */
  label?: string;
  /** Период — 24h или 7d. От него зависят дефолтные entity_id и подпись. */
  period?: '24h' | '7d';
  /** sensor.* среднего за период. */
  avgEntity?: string;
  /** sensor.* TIR (% времени в норме). */
  tirEntity?: string;
  /** sensor.* GMI / расчётного HbA1c. */
  gmiEntity?: string;
  /** sensor.* % времени выше нормы. */
  highEntity?: string;
  /** sensor.* % времени ниже нормы. */
  lowEntity?: string;
}

const DEFAULTS_24H = {
  avg: 'sensor.glucose_avg_24h',
  tir: 'sensor.glucose_tir_24h',
  high: 'sensor.glucose_time_above',
  low: 'sensor.glucose_time_below',
  gmi: 'sensor.glucose_gmi',
};

const DEFAULTS_7D = {
  avg: 'sensor.glucose_avg_7d',
  tir: 'sensor.glucose_tir_7d',
  high: 'sensor.glucose_time_above',
  low: 'sensor.glucose_time_below',
  gmi: 'sensor.glucose_gmi',
};

/** Компактный блок статистики глюкозы: TIR с цветным прогресс-баром,
 *  среднее, GMI (только в 7d-режиме имеет смысл, но HA отдаёт его всегда),
 *  % выше/ниже нормы. */
export function GlucoseStatsWidget({ params }: { params: Params }) {
  const period = params.period ?? '24h';
  const defaults = period === '7d' ? DEFAULTS_7D : DEFAULTS_24H;

  const tir = useEntity(params.tirEntity || defaults.tir);
  const avg = useEntity(params.avgEntity || defaults.avg);
  const gmi = useEntity(params.gmiEntity || defaults.gmi);
  const high = useEntity(params.highEntity || defaults.high);
  const low = useEntity(params.lowEntity || defaults.low);

  const tirVal = parseNum(tir?.state);
  const avgVal = parseNum(avg?.state);
  const gmiVal = parseNum(gmi?.state);
  const highVal = parseNum(high?.state);
  const lowVal = parseNum(low?.state);

  const label = params.label || (period === '7d' ? 'За 7 дней' : 'За 24 часа');

  // GMI рассчитывается по среднему за длинный период (рекомендуется ≥14 дней),
  // поэтому показывать его в 24-часовом блоке бессмысленно — он всё равно даст
  // ту же цифру что в 7-дневном. В 24h оставляем 3 тайла (Среднее, Ниже, Выше),
  // в 7d — все 4 включая GMI.
  const showGmi = period === '7d';

  return (
    // overflow-hidden КРИТИЧЕН — без него тайлы на узком виджете могут
    // вылезти за границу и наложиться на соседний (был баг на 4-cols).
    <div className="glass h-full w-full overflow-hidden p-2.5 @[240px]:p-3 @[320px]:p-4 flex flex-col gap-1.5 @[240px]:gap-2 min-h-0">
      <div className="text-xs @[240px]:text-sm font-medium text-text-secondary leading-tight truncate shrink-0">
        {label}
      </div>

      {/* TIR с прогресс-баром — главный показатель (цель 70%+).
          Сокращённый "цель ≥70%" — без дублирования зон, они и так видны
          в графике сверху. */}
      <SensorHistoryButton
        entityId={params.tirEntity || defaults.tir}
        label="Время в норме (TIR)"
        unit="%"
        decimals={0}
        hoursBack={period === '7d' ? 168 : 24}
        color="#10b981"
        className="block w-full shrink-0"
      >
        <div className="w-full min-w-0">
          <div className="flex items-baseline justify-between gap-2 mb-1">
            <div className="text-[10px] @[240px]:text-xs uppercase tracking-wide text-text-tertiary truncate">
              Время в норме · цель ≥70%
            </div>
            <div className={`text-base @[240px]:text-xl @[320px]:text-2xl font-light tabular-nums leading-none shrink-0 ${tirColor(tirVal)}`}>
              {tirVal !== null ? `${Math.round(tirVal)}%` : '—'}
            </div>
          </div>
          <div className="w-full h-1.5 @[240px]:h-2 rounded-full bg-black/15 dark:bg-white/10 overflow-hidden">
            {tirVal !== null && (
              <div
                className={`h-full rounded-full transition-all ${tirBarColor(tirVal)}`}
                style={{ width: `${Math.max(2, Math.min(100, tirVal))}%` }}
              />
            )}
          </div>
        </div>
      </SensorHistoryButton>

      {/* Сетка тайлов. На очень узком (< 240px) — все в одну колонку.
          На среднем (@[240px]+) — все в одну строку (3 или 4 в зависимости от showGmi).
          Это даёт компактный аккуратный ряд без переноса.
          min-h-0 + overflow-hidden на корне гарантирует что тайлы не вылезут. */}
      <div
        className={`grid gap-1.5 @[240px]:gap-2 min-h-0 ${
          showGmi
            ? 'grid-cols-2 @[240px]:grid-cols-4'
            : 'grid-cols-1 @[200px]:grid-cols-3'
        }`}
      >
        <StatTile
          label="Сред."
          fullLabel="Среднее"
          value={avgVal !== null ? avgVal.toFixed(1) : '—'}
          unit="ммоль/л"
          entityId={params.avgEntity || defaults.avg}
          color="#38bdf8"
          hoursBack={period === '7d' ? 168 : 24}
        />
        {showGmi && (
          <StatTile
            label="GMI"
            fullLabel="GMI (HbA1c)"
            value={gmiVal !== null ? gmiVal.toFixed(1) : '—'}
            unit="%"
            entityId={params.gmiEntity || defaults.gmi}
            color="#a78bfa"
            hoursBack={168}
          />
        )}
        <StatTile
          label="Ниже"
          fullLabel="Ниже нормы"
          value={lowVal !== null ? `${Math.round(lowVal)}` : '—'}
          unit="%"
          entityId={params.lowEntity || defaults.low}
          color="#ef4444"
          hoursBack={period === '7d' ? 168 : 24}
          accentClass={lowVal !== null && lowVal > 4 ? 'text-red-500 dark:text-red-300' : ''}
        />
        <StatTile
          label="Выше"
          fullLabel="Выше нормы"
          value={highVal !== null ? `${Math.round(highVal)}` : '—'}
          unit="%"
          entityId={params.highEntity || defaults.high}
          color="#f59e0b"
          hoursBack={period === '7d' ? 168 : 24}
          accentClass={highVal !== null && highVal > 25 ? 'text-amber-600 dark:text-amber-300' : ''}
        />
      </div>
    </div>
  );
}

function StatTile({
  label,
  fullLabel,
  value,
  unit,
  entityId,
  color,
  hoursBack,
  accentClass = '',
}: {
  label: string;       // короткая подпись на самой плашке (Сред./GMI/Ниже/Выше)
  fullLabel: string;   // полная подпись для title + модалки графика
  value: string;
  unit?: string;
  entityId: string;
  color: string;
  hoursBack: number;
  accentClass?: string;
}) {
  return (
    <SensorHistoryButton
      entityId={entityId}
      label={fullLabel}
      unit={unit}
      decimals={1}
      hoursBack={hoursBack}
      color={color}
      className="block w-full min-w-0"
    >
      <div
        title={fullLabel}
        className="rounded-lg bg-black/8 dark:bg-white/5 border border-black/10 dark:border-white/10 px-2 py-1.5 hover:bg-black/12 dark:hover:bg-white/10 transition-colors overflow-hidden"
      >
        {/* Короткие подписи (Сред./GMI/Ниже/Выше) — фиксированно, не зависят
            от ширины контейнера. Полные подписи живут в title + модалке. */}
        <div className="text-[10px] uppercase tracking-wide text-text-tertiary leading-tight truncate">
          {label}
        </div>
        {/* Вертикальный layout: значение крупно, единица мельче под ним.
            whitespace-nowrap + min-w-0 — чтобы «6.5» не разбивалось на «6\n.5». */}
        <div className={`text-lg font-medium tabular-nums leading-tight whitespace-nowrap ${accentClass || 'text-text-primary'}`}>
          {value}
        </div>
        {unit && (
          <div className="text-[9px] text-text-tertiary leading-tight truncate">{unit}</div>
        )}
      </div>
    </SensorHistoryButton>
  );
}

function parseNum(s: string | undefined): number | null {
  if (s === undefined || s === null) return null;
  if (s === 'unavailable' || s === 'unknown') return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function tirColor(tir: number | null): string {
  if (tir === null) return 'text-text-tertiary';
  if (tir >= 70) return 'text-emerald-600 dark:text-emerald-300';
  if (tir >= 50) return 'text-amber-600 dark:text-amber-300';
  return 'text-red-600 dark:text-red-300';
}

function tirBarColor(tir: number): string {
  if (tir >= 70) return 'bg-emerald-500 dark:bg-emerald-400';
  if (tir >= 50) return 'bg-amber-500 dark:bg-amber-400';
  return 'bg-red-500 dark:bg-red-400';
}
