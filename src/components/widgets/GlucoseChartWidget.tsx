'use client';

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  useEntity,
  useHAHistory,
  useCallService,
  type HistoryPoint,
} from '@/lib/ha/ConnectionProvider';
import {
  zoneFor,
  ZONE_PALETTE,
  TARGET_RANGE_MIN,
  TARGET_RANGE_MAX,
  DEFAULT_THRESHOLDS,
  RANGE_OPTIONS,
} from '@/lib/glucose';

const useIsoLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

interface Params {
  /** sensor.* с текущим значением глюкозы. */
  entity?: string;
  /** input_select.* для переключения диапазона (3ч/6ч/12ч/24ч).
   *  Если не указан — переключатель работает локально (в виджете). */
  rangeEntity?: string;
  /** Стартовый диапазон в часах если rangeEntity не указан. */
  defaultHours?: 3 | 6 | 12 | 24;
  /** Подпись над графиком. */
  label?: string;
  /** Целевые пороги. */
  urgentLow?: number;
  low?: number;
  high?: number;
  urgentHigh?: number;
}

const DEFAULT_ENTITY = 'sensor.blood_sugar';
const DEFAULT_RANGE_ENTITY = 'input_select.glucose_range';

/** Конвертация подписи диапазона из input_select в часы. «24ч» → 24. */
function parseRangeLabel(label: string | undefined): number | null {
  if (!label) return null;
  const m = label.match(/(\d+)/);
  return m ? Number(m[1]) : null;
}

export function GlucoseChartWidget({ params }: { params: Params }) {
  const entityId = params.entity || DEFAULT_ENTITY;
  const rangeEntityId = params.rangeEntity || DEFAULT_RANGE_ENTITY;

  const rangeEntity = useEntity(rangeEntityId);
  const callService = useCallService();

  const [localHours, setLocalHours] = useState<number>(params.defaultHours ?? 6);

  // Если есть input_select — используем его значение как ground truth,
  // иначе — локальный state.
  const haHours = parseRangeLabel(rangeEntity?.state);
  const hoursBack = haHours ?? localHours;

  const { points, loading } = useHAHistory(entityId, hoursBack);

  const thresholds = {
    urgentLow: params.urgentLow ?? DEFAULT_THRESHOLDS.urgentLow,
    low: params.low ?? DEFAULT_THRESHOLDS.low,
    high: params.high ?? DEFAULT_THRESHOLDS.high,
    urgentHigh: params.urgentHigh ?? DEFAULT_THRESHOLDS.urgentHigh,
  };

  const setHours = (h: number) => {
    if (rangeEntity) {
      // Найти подходящую опцию (24 → «24ч»)
      const options = (rangeEntity.attributes.options as string[]) || [];
      const opt = options.find((o) => parseRangeLabel(o) === h);
      if (opt) {
        callService('input_select', 'select_option', rangeEntityId, { option: opt });
        return;
      }
    }
    setLocalHours(h);
  };

  return (
    <div className="glass h-full w-full overflow-hidden p-2.5 @[300px]:p-4 flex flex-col gap-2 min-h-0">
      {/* Шапка: заголовок + переключатель диапазона. На очень узком экране
          переключатель уезжает на следующую строку (flex-wrap) — но при
          этом не наезжает на соседние виджеты, потому что overflow-hidden. */}
      <div className="flex items-center justify-between gap-2 flex-wrap shrink-0">
        <div className="text-sm @[300px]:text-base font-medium leading-tight truncate min-w-0">
          {params.label || 'Глюкоза'}
        </div>
        <div className="flex items-center gap-0.5 rounded-lg bg-black/15 dark:bg-white/5 border border-black/10 dark:border-white/10 p-0.5">
          {RANGE_OPTIONS.map((opt) => {
            const active = opt.value === hoursBack;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setHours(opt.value);
                }}
                className={`
                  px-2 @[300px]:px-2.5 py-1 rounded-md text-[11px] @[300px]:text-xs font-medium
                  transition-colors
                  ${active
                    ? 'bg-accent/25 text-accent shadow-sm'
                    : 'text-text-tertiary hover:text-text-secondary hover:bg-black/5 dark:hover:bg-white/5'}
                `}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* График — занимает всё оставшееся место */}
      <div className="flex-1 min-h-0">
        {loading && points.length === 0 ? (
          <div className="h-full flex items-center justify-center text-xs text-text-tertiary">
            График загружается…
          </div>
        ) : points.length < 2 ? (
          <div className="h-full flex items-center justify-center text-xs text-text-tertiary text-center px-4">
            За последние {hoursBack} ч в HA нет накопленной истории глюкозы
          </div>
        ) : (
          <GlucoseChart points={points} thresholds={thresholds} hoursBack={hoursBack} />
        )}
      </div>
    </div>
  );
}

const PAD_L = 32;
const PAD_R = 8;
const PAD_T = 8;
const PAD_B = 22;

/** SVG-чарт с подсветкой целевой зоны (3.9-7.8) и линий-порогов «low/high». */
function GlucoseChart({
  points,
  thresholds,
  hoursBack,
}: {
  points: HistoryPoint[];
  thresholds: { urgentLow: number; low: number; high: number; urgentHigh: number };
  hoursBack: number;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const [hover, setHover] = useState<HistoryPoint | null>(null);

  useIsoLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const measure = () => {
      const w = Math.max(120, Math.round(el.clientWidth));
      const h = Math.max(80, Math.round(el.clientHeight));
      setSize((prev) => (prev && prev.w === w && prev.h === h ? prev : { w, h }));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const data = useMemo(() => {
    if (!size || points.length < 2) return null;
    const { w, h } = size;
    const innerW = w - PAD_L - PAD_R;
    const innerH = h - PAD_T - PAD_B;

    const ts = points.map((p) => p.t);
    const vs = points.map((p) => p.v);
    const tMin = Math.min(...ts);
    const tMax = Math.max(...ts);

    // Y-ось: фиксируем границы 2-20 ммоль/л чтобы зона нормы и пороги были
    // всегда на одном и том же месте — иначе глаз теряется при росте значений.
    const vMin = Math.min(...vs, 2);
    const vMax = Math.max(...vs, 14);
    const yMin = Math.floor(Math.min(vMin, thresholds.urgentLow - 0.5));
    const yMax = Math.ceil(Math.max(vMax, thresholds.high + 1));

    const xScale = (t: number) => PAD_L + ((t - tMin) / Math.max(1, tMax - tMin)) * innerW;
    const yScale = (v: number) => PAD_T + innerH - ((v - yMin) / (yMax - yMin)) * innerH;

    let pathD = '';
    for (let i = 0; i < points.length; i++) {
      const x = xScale(points[i].t);
      const y = yScale(points[i].v);
      pathD += i === 0 ? `M ${x.toFixed(1)},${y.toFixed(1)}` : ` L ${x.toFixed(1)},${y.toFixed(1)}`;
    }

    // Y-ticks: целые числа от yMin до yMax с шагом 2.
    const yTicks: number[] = [];
    for (let v = Math.ceil(yMin); v <= yMax; v += 2) yTicks.push(v);

    // X-ticks: 3-4 равномерных метки времени.
    const tickCount = hoursBack <= 6 ? 4 : 4;
    const xTicks: Array<{ x: number; label: string }> = [];
    for (let i = 0; i <= tickCount; i++) {
      const t = tMin + ((tMax - tMin) * i) / tickCount;
      const d = new Date(t);
      const lbl = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
      xTicks.push({ x: xScale(t), label: lbl });
    }

    return { w, h, innerW, innerH, tMin, tMax, yMin, yMax, xScale, yScale, pathD, yTicks, xTicks };
  }, [size, points, thresholds, hoursBack]);

  function findClosest(clientX: number, rect: DOMRect): HistoryPoint | null {
    if (!data || points.length === 0) return null;
    const ratio = (clientX - rect.left - PAD_L) / Math.max(1, rect.width - PAD_L - PAD_R);
    const t = data.tMin + Math.max(0, Math.min(1, ratio)) * (data.tMax - data.tMin);
    let best = points[0];
    let bestDiff = Math.abs(best.t - t);
    for (const p of points) {
      const d = Math.abs(p.t - t);
      if (d < bestDiff) {
        best = p;
        bestDiff = d;
      }
    }
    return best;
  }

  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setHover(findClosest(e.clientX, rect));
  };
  const onLeave = () => setHover(null);

  return (
    <div ref={containerRef} className="w-full h-full">
      {data && (
        <svg
          viewBox={`0 0 ${data.w} ${data.h}`}
          width={data.w}
          height={data.h}
          style={{ display: 'block', touchAction: 'none' }}
          onPointerDown={onMove}
          onPointerMove={onMove}
          onPointerUp={onLeave}
          onPointerLeave={onLeave}
        >
          {/* Подсветка целевой зоны нормы (3.9-7.8) — мягкий зелёный фон */}
          <rect
            x={PAD_L}
            y={data.yScale(TARGET_RANGE_MAX)}
            width={data.innerW}
            height={data.yScale(TARGET_RANGE_MIN) - data.yScale(TARGET_RANGE_MAX)}
            fill="#10b981"
            fillOpacity={0.12}
          />

          {/* Линия high (10.0) — пунктир янтарный */}
          <line
            x1={PAD_L}
            x2={PAD_L + data.innerW}
            y1={data.yScale(thresholds.high)}
            y2={data.yScale(thresholds.high)}
            stroke="#f59e0b"
            strokeOpacity={0.45}
            strokeWidth="1"
            strokeDasharray="4 3"
          />
          {/* Линия low (3.9) — пунктир красный */}
          <line
            x1={PAD_L}
            x2={PAD_L + data.innerW}
            y1={data.yScale(thresholds.low)}
            y2={data.yScale(thresholds.low)}
            stroke="#ef4444"
            strokeOpacity={0.5}
            strokeWidth="1"
            strokeDasharray="4 3"
          />

          {/* Y-ticks с подписями ммоль */}
          {data.yTicks.map((v) => {
            const y = data.yScale(v);
            return (
              <g key={v}>
                <line
                  x1={PAD_L}
                  x2={PAD_L + data.innerW}
                  y1={y}
                  y2={y}
                  stroke="currentColor"
                  strokeOpacity={0.08}
                  strokeWidth="1"
                  className="text-text-tertiary"
                />
                <text
                  x={PAD_L - 4}
                  y={y + 3}
                  fontSize="9"
                  fill="currentColor"
                  fillOpacity={0.55}
                  textAnchor="end"
                  className="text-text-tertiary tabular-nums"
                >
                  {v}
                </text>
              </g>
            );
          })}

          {/* Линия глюкозы — нейтральная серая, точки красятся по зоне */}
          <path
            d={data.pathD}
            fill="none"
            stroke="currentColor"
            strokeOpacity={0.85}
            strokeWidth="1.6"
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
            className="text-text-secondary"
          />

          {/* Точки по последним замерам — окрашены по зоне (только если их не
              слишком много, иначе превратится в кашу) */}
          {points.length <= 60 &&
            points.map((p, i) => {
              const zone = zoneFor(p.v, thresholds);
              return (
                <circle
                  key={i}
                  cx={data.xScale(p.t)}
                  cy={data.yScale(p.v)}
                  r={1.6}
                  fill={ZONE_PALETTE[zone].dot}
                  opacity={0.85}
                />
              );
            })}

          {/* X-ticks */}
          {data.xTicks.map((t, i) => (
            <text
              key={i}
              x={t.x}
              y={data.h - 6}
              fontSize="9"
              fill="currentColor"
              fillOpacity={0.55}
              textAnchor={i === 0 ? 'start' : i === data.xTicks.length - 1 ? 'end' : 'middle'}
              className="text-text-tertiary tabular-nums"
            >
              {t.label}
            </text>
          ))}

          {/* Crosshair + последняя/наведённая точка крупно */}
          {(() => {
            const showPt = hover ?? points[points.length - 1];
            const showX = data.xScale(showPt.t);
            const showY = data.yScale(showPt.v);
            const zone = zoneFor(showPt.v, thresholds);
            const dot = ZONE_PALETTE[zone].dot;
            return (
              <g>
                <line
                  x1={showX}
                  x2={showX}
                  y1={PAD_T}
                  y2={PAD_T + data.innerH}
                  stroke="currentColor"
                  strokeOpacity={0.35}
                  strokeWidth="1"
                  strokeDasharray="2 3"
                  className="text-text-secondary"
                />
                <circle cx={showX} cy={showY} r={5} fill={dot} fillOpacity={0.25} />
                <circle cx={showX} cy={showY} r={3} fill={dot} stroke="rgb(var(--bg-secondary))" strokeWidth="1.5" />
                {/* Подпись над точкой */}
                <text
                  x={showX}
                  y={Math.max(12, showY - 8)}
                  fontSize="10"
                  fill={dot}
                  fontWeight="600"
                  textAnchor={showX < data.w / 2 ? 'start' : 'end'}
                  className="tabular-nums"
                >
                  {showPt.v.toFixed(1)}
                </text>
              </g>
            );
          })()}
        </svg>
      )}
    </div>
  );
}
