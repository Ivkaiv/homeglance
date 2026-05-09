'use client';

import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useHAHistory, useEntity, type HistoryPoint } from '@/lib/ha/ConnectionProvider';

const useIsoLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

const PAD_L = 44;
const PAD_R = 16;
const PAD_T = 16;
const PAD_B = 32;

interface Props {
  entityId: string;
  /** Заголовок над графиком в модалке */
  label?: string;
  /** Цвет линии. Если не задан — пытаемся определить по device_class из HA. */
  color?: string;
  /** Единица измерения — отображается рядом со значениями. Если undefined,
   *  берётся из HA attributes.unit_of_measurement. */
  unit?: string;
  /** Сколько часов истории показывать. */
  hoursBack?: number;
  /** Сколько знаков после запятой. */
  decimals?: number;
  /** Контент-триггер (любой кликабельный элемент: чип, число, иконка). */
  children: ReactNode;
  /** Дополнительные классы для обёртки. */
  className?: string;
}

/**
 * Универсальная обёртка над сенсорным виджетом/чипом — при клике открывает
 * модалку с графиком истории за последние N часов. Если у сущности нет истории
 * (например, новый сенсор) или она недоступна — клик ничего не делает.
 *
 * Используется для температуры, влажности, давления, мощности, напряжения,
 * освещённости — всего, что числовое и имеет историю в HA.
 */
export function SensorHistoryButton({
  entityId,
  label,
  color: colorProp,
  unit: unitProp,
  hoursBack = 24,
  decimals = 1,
  children,
  className = '',
}: Props) {
  const e = useEntity(entityId);
  const [open, setOpen] = useState(false);

  // Авто-определяем цвет и единицу
  const deviceClass = e?.attributes.device_class as string | undefined;
  const haUnit = e?.attributes.unit_of_measurement as string | undefined;
  const friendly = e?.attributes.friendly_name as string | undefined;

  const unit = unitProp ?? haUnit ?? '';
  const color = colorProp ?? colorByDeviceClass(deviceClass);
  const modalLabel = label ?? friendly ?? entityId;

  return (
    <>
      <button
        type="button"
        onClick={(ev) => {
          ev.preventDefault();
          ev.stopPropagation();
          setOpen(true);
        }}
        className={`text-left ${className}`}
      >
        {children}
      </button>
      <AnimatePresence>
        {open && (
          <SensorHistoryModal
            entityId={entityId}
            color={color}
            unit={unit}
            decimals={decimals}
            label={modalLabel}
            hoursBack={hoursBack}
            onClose={() => setOpen(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
}

function colorByDeviceClass(dc?: string): string {
  switch (dc) {
    case 'temperature':
      return '#fbbf24';
    case 'humidity':
      return '#38bdf8';
    case 'pressure':
    case 'atmospheric_pressure':
      return '#a78bfa';
    case 'power':
    case 'energy':
      return '#f472b6';
    case 'voltage':
      return '#fb923c';
    case 'current':
      return '#facc15';
    case 'illuminance':
      return '#fde047';
    case 'co2':
      return '#34d399';
    case 'gas':
      return '#fb7185';
    default:
      return '#34d399';
  }
}

function SensorHistoryModal({
  entityId,
  color,
  unit,
  decimals,
  label,
  hoursBack,
  onClose,
}: {
  entityId: string;
  color: string;
  unit: string;
  decimals: number;
  label: string;
  hoursBack: number;
  onClose: () => void;
}) {
  const { points, loading } = useHAHistory(entityId, hoursBack);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState<{ w: number; h: number }>(() => {
    if (typeof window === 'undefined') return { w: 600, h: 280 };
    const w = Math.max(240, Math.min(680, window.innerWidth - 80));
    const h = Math.min(340, Math.max(200, Math.round(w * 0.55)));
    return { w, h };
  });
  const [hover, setHover] = useState<HistoryPoint | null>(null);

  useIsoLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const measure = () => {
      const w = Math.max(240, Math.round(el.clientWidth));
      const h = Math.min(340, Math.max(200, Math.round(w * 0.55)));
      setSize((prev) => (prev.w === w && prev.h === h ? prev : { w, h }));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const fmt = (v: number) => `${v.toFixed(decimals)}${unit ? ` ${unit}` : ''}`;

  const { w, h } = size;
  const innerW = w - PAD_L - PAD_R;
  const innerH = h - PAD_T - PAD_B;

  const data = useMemo(() => {
    if (points.length < 2) return null;
    const ts = points.map((p) => p.t);
    const vs = points.map((p) => p.v);
    const tMin = Math.min(...ts);
    const tMax = Math.max(...ts);
    const vMin = Math.min(...vs);
    const vMax = Math.max(...vs);
    const range = vMax - vMin || 1;
    // Если все значения неотрицательные (свет, мощность, СО₂ и т.п.) —
    // не уходим в минус: yMin = 0. Иначе паддим обе стороны.
    const allNonNeg = vMin >= 0;
    const yMin = allNonNeg ? 0 : vMin - range * 0.12;
    const yMax = vMax + range * 0.12;
    const xScale = (t: number) =>
      PAD_L + ((t - tMin) / Math.max(1, tMax - tMin)) * innerW;
    const yScale = (v: number) =>
      PAD_T + innerH - ((v - yMin) / Math.max(0.001, yMax - yMin)) * innerH;
    let pathD = '';
    for (let i = 0; i < points.length; i++) {
      const x = xScale(points[i].t);
      const y = yScale(points[i].v);
      pathD += i === 0 ? `M ${x},${y}` : ` L ${x},${y}`;
    }
    const fillD =
      pathD + ` L ${PAD_L + innerW},${PAD_T + innerH} L ${PAD_L},${PAD_T + innerH} Z`;

    const vAvg = vs.reduce((a, b) => a + b, 0) / vs.length;

    // Y-ticks: целимся примерно в 5-6 рисок, шаг — округлённое «красивое» число.
    const yRange = yMax - yMin;
    const targetTicks = 5;
    const rawStep = yRange / targetTicks;
    const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep || 1)));
    // Берём ближайший «приятный» множитель: 1, 2, 2.5, 5
    const niceMultipliers = [1, 2, 2.5, 5, 10];
    let step = magnitude;
    for (const m of niceMultipliers) {
      if (m * magnitude >= rawStep) {
        step = m * magnitude;
        break;
      }
    }
    const yTicks: number[] = [];
    const start = Math.ceil(yMin / step) * step;
    for (let v = start; v <= yMax + 0.0001; v += step) yTicks.push(+v.toFixed(4));

    // X-ticks
    const xTicks: { x: number; label: string }[] = [];
    const tickCount = 5;
    for (let i = 0; i <= tickCount; i++) {
      const t = tMin + ((tMax - tMin) * i) / tickCount;
      const d = new Date(t);
      const lbl = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
      xTicks.push({ x: xScale(t), label: lbl });
    }

    return { tMin, tMax, vMin, vMax, vAvg, xScale, yScale, pathD, fillD, yTicks, xTicks };
  }, [points, innerW, innerH]);

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
    const p = findClosest(e.clientX, rect);
    setHover(p);
  };
  const onLeave = () => setHover(null);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 80,
        background: 'rgba(0,0,0,0.8)',
        display: 'grid',
        placeItems: 'center',
        padding: '1rem',
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 16 }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        className="rounded-3xl bg-bg-secondary border border-black/10 dark:border-white/10 shadow-2xl p-5"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '720px',
          maxHeight: 'calc(100dvh - 2rem)',
          overflow: 'auto',
          willChange: 'transform, opacity',
        }}
      >
        <div className="flex items-start justify-between mb-3 gap-3">
          <div className="min-w-0 flex-1">
            <div className="text-[11px] uppercase tracking-wider text-text-tertiary">{label}</div>
            <div className="flex items-baseline gap-2 mt-1">
              {hover ? (
                <>
                  <div className="text-4xl font-light tabular-nums" style={{ color }}>
                    {hover.v.toFixed(decimals)}
                  </div>
                  {unit && <div className="text-base text-text-secondary">{unit}</div>}
                  <div className="text-sm text-text-tertiary tabular-nums ml-2">
                    {timeAt(hover.t)}
                  </div>
                </>
              ) : data ? (
                <>
                  <div className="text-4xl font-light tabular-nums" style={{ color }}>
                    {points[points.length - 1].v.toFixed(decimals)}
                  </div>
                  {unit && <div className="text-base text-text-secondary">{unit}</div>}
                  <div className="text-sm text-text-tertiary tabular-nums ml-2">сейчас</div>
                </>
              ) : null}
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-black/20 dark:bg-black/40 border border-black/15 dark:border-white/15 text-text-primary text-lg flex items-center justify-center shrink-0"
            aria-label="Закрыть"
          >
            ×
          </button>
        </div>

        <div ref={containerRef} className="w-full" style={{ height: h }}>
          {loading ? (
            <div className="h-full flex items-center justify-center text-text-tertiary text-sm">
              График загружается…
            </div>
          ) : !data ? (
            <div className="h-full flex items-center justify-center text-text-tertiary text-sm">
              За последние {hoursBack} ч нет накопленной истории
            </div>
          ) : (
            <svg
              viewBox={`0 0 ${w} ${h}`}
              width={w}
              height={h}
              style={{ display: 'block', touchAction: 'none' }}
              onPointerDown={onMove}
              onPointerMove={onMove}
              onPointerUp={onLeave}
              onPointerLeave={onLeave}
            >
              {data.yTicks.map((v, i) => {
                const y = data.yScale(v);
                return (
                  <g key={i}>
                    <line
                      x1={PAD_L}
                      x2={PAD_L + innerW}
                      y1={y}
                      y2={y}
                      stroke="currentColor"
                      strokeOpacity={0.12}
                      strokeWidth="1"
                      strokeDasharray="2 4"
                      className="text-text-tertiary"
                    />
                    <text
                      x={PAD_L - 6}
                      y={y + 3}
                      fontSize="11"
                      fill="currentColor"
                      fillOpacity={0.55}
                      textAnchor="end"
                      className="text-text-tertiary"
                    >
                      {v}
                    </text>
                  </g>
                );
              })}

              <path d={data.fillD} fill={color} opacity={0.18} />
              <path
                d={data.pathD}
                fill="none"
                stroke={color}
                strokeWidth="1.8"
                strokeLinejoin="round"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
              />

              {data.xTicks.map((t, i) => (
                <text
                  key={i}
                  x={t.x}
                  y={h - 8}
                  fontSize="10"
                  fill="currentColor"
                  fillOpacity={0.55}
                  textAnchor={i === 0 ? 'start' : i === data.xTicks.length - 1 ? 'end' : 'middle'}
                  className="text-text-tertiary"
                >
                  {t.label}
                </text>
              ))}

              {(() => {
                const showPt = hover ?? points[points.length - 1];
                const showX = data.xScale(showPt.t);
                const showY = data.yScale(showPt.v);
                return (
                  <>
                    <line
                      x1={showX}
                      x2={showX}
                      y1={PAD_T}
                      y2={PAD_T + innerH}
                      stroke="currentColor"
                      strokeOpacity={0.45}
                      strokeWidth="1"
                      strokeDasharray="3 3"
                      className="text-text-secondary"
                    />
                    <circle
                      cx={showX}
                      cy={showY}
                      r="6"
                      fill={color}
                      stroke="rgb(var(--bg-secondary))"
                      strokeWidth="2"
                    />
                  </>
                );
              })()}
            </svg>
          )}
        </div>

        {data && (
          <>
            <div className="grid grid-cols-3 gap-2 mt-3">
              <Stat label="минимум" value={fmt(data.vMin)} colorClass="text-sky-600 dark:text-sky-300" />
              <Stat label="средняя" value={fmt(data.vAvg)} colorClass="text-text-primary" />
              <Stat label="максимум" value={fmt(data.vMax)} colorClass="text-amber-600 dark:text-amber-300" />
            </div>
            <div className="mt-2 text-[11px] text-text-tertiary text-center">
              Поведи пальцем по графику — увидишь значение в нужный момент
            </div>
          </>
        )}
      </motion.div>
    </motion.div>,
    document.body
  );
}

function Stat({ label, value, colorClass }: { label: string; value: string; colorClass: string }) {
  return (
    <div className="rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 px-3 py-2 text-center">
      <div className="text-[10px] uppercase tracking-wider text-text-tertiary">{label}</div>
      <div className={`text-lg font-medium tabular-nums ${colorClass}`}>{value}</div>
    </div>
  );
}

function timeAt(t: number): string {
  const d = new Date(t);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
