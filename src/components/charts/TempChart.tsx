'use client';

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useHAHistory, HistoryPoint } from '@/lib/ha/ConnectionProvider';

const useIsoLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

interface Props {
  entityId: string;
  hoursBack?: number;
  /** Цвет линии. По умолчанию — амбер для тепла. */
  color?: string;
  /** Подпись над графиком в модалке */
  modalLabel?: string;
}

export function TempChart({
  entityId,
  hoursBack = 24,
  color = '#fbbf24',
  modalLabel = 'Температура',
}: Props) {
  const { points, loading } = useHAHistory(entityId, hoursBack);
  const [open, setOpen] = useState(false);

  if (loading) {
    return (
      <div className="h-14 flex items-center text-xs text-text-tertiary">График загружается…</div>
    );
  }
  if (points.length < 2) {
    return <div className="h-14 flex items-center text-xs text-text-tertiary">Нет истории</div>;
  }

  const vs = points.map((p) => p.v);
  const min = Math.min(...vs);
  const max = Math.max(...vs);

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(true);
        }}
        className="block w-full text-left rounded-md hover:opacity-90 transition active:scale-[0.995]"
      >
        <div className="flex items-baseline justify-end text-sm tabular-nums mb-1.5">
          <span>
            <span className="text-sky-300/90">{min.toFixed(1)}°</span>
            <span className="text-text-tertiary mx-2">·</span>
            <span className="text-amber-300/90">{max.toFixed(1)}°</span>
          </span>
        </div>
        <MiniSpark points={points} color={color} height={90} />
      </button>

      <AnimatePresence>
        {open && (
          <TempChartModal
            points={points}
            color={color}
            label={modalLabel}
            onClose={() => setOpen(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
}

function MiniSpark({
  points,
  color,
  height,
}: {
  points: HistoryPoint[];
  color: string;
  height: number;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState<number | null>(null);

  useIsoLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const measure = () => setWidth(Math.max(120, Math.round(el.clientWidth)));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  if (!width) return <div ref={containerRef} className="w-full" style={{ height }} />;

  const PAD = 6;
  const innerW = width - PAD * 2;
  const innerH = height - PAD * 2;

  const ts = points.map((p) => p.t);
  const vs = points.map((p) => p.v);
  const tMin = Math.min(...ts);
  const tMax = Math.max(...ts);
  const vMin = Math.min(...vs);
  const vMax = Math.max(...vs);
  const range = vMax - vMin || 1;
  const yPad = range * 0.18;
  const yMin = vMin - yPad;
  const yMax = vMax + yPad;

  const xS = (t: number) => PAD + ((t - tMin) / Math.max(1, tMax - tMin)) * innerW;
  const yS = (v: number) =>
    PAD + innerH - ((v - yMin) / Math.max(0.001, yMax - yMin)) * innerH;

  const pts = points.map((p) => ({ x: xS(p.t), y: yS(p.v) }));

  let path = `M ${pts[0].x},${pts[0].y}`;
  const tension = 0.5;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const c1x = p1.x + ((p2.x - p0.x) / 6) * tension * 3;
    const c1y = p1.y + ((p2.y - p0.y) / 6) * tension * 3;
    const c2x = p2.x - ((p3.x - p1.x) / 6) * tension * 3;
    const c2y = p2.y - ((p3.y - p1.y) / 6) * tension * 3;
    path += ` C ${c1x.toFixed(2)},${c1y.toFixed(2)} ${c2x.toFixed(2)},${c2y.toFixed(2)} ${p2.x.toFixed(2)},${p2.y.toFixed(2)}`;
  }
  const fillPath =
    path + ` L ${pts[pts.length - 1].x},${PAD + innerH} L ${pts[0].x},${PAD + innerH} Z`;

  const last = pts[pts.length - 1];
  const gradId = `tc-${color.replace('#', '')}`;

  return (
    <div ref={containerRef} className="w-full">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width={width}
        height={height}
        style={{ display: 'block' }}
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.32" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={fillPath} fill={`url(#${gradId})`} />
        <path
          d={path}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
        <circle cx={last.x} cy={last.y} r="8" fill={color} opacity="0.18" />
        <circle cx={last.x} cy={last.y} r="3" fill={color} />
      </svg>
    </div>
  );
}

const PAD_L = 44;
const PAD_R = 16;
const PAD_T = 16;
const PAD_B = 32;

function TempChartModal({
  points,
  color,
  label,
  onClose,
}: {
  points: HistoryPoint[];
  color: string;
  label: string;
  onClose: () => void;
}) {
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

  const { w, h } = size;
  const innerW = w - PAD_L - PAD_R;
  const innerH = h - PAD_T - PAD_B;

  const { vs, tMin, tMax, yMin, yMax, xScale, yScale, pathD, fillD } = useMemo(() => {
    const ts = points.map((p) => p.t);
    const vs = points.map((p) => p.v);
    const tMin = Math.min(...ts);
    const tMax = Math.max(...ts);
    const vMin = Math.min(...vs);
    const vMax = Math.max(...vs);
    const range = vMax - vMin || 1;
    const yMin = vMin - range * 0.12;
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
    return { vs, tMin, tMax, yMin, yMax, xScale, yScale, pathD, fillD };
  }, [points, innerW, innerH]);

  const yTicks = useMemo(() => {
    const range = yMax - yMin;
    let step = 1;
    if (range > 30) step = 5;
    else if (range > 15) step = 2;
    else if (range > 6) step = 1;
    else if (range > 2) step = 0.5;
    else step = 0.2;
    const out: number[] = [];
    const start = Math.ceil(yMin / step) * step;
    for (let v = start; v <= yMax; v += step) out.push(+v.toFixed(2));
    return out;
  }, [yMin, yMax]);

  const xTicks = useMemo(() => {
    const ticks = 5;
    const out: { x: number; label: string }[] = [];
    for (let i = 0; i <= ticks; i++) {
      const t = tMin + ((tMax - tMin) * i) / ticks;
      const d = new Date(t);
      const lbl = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
      out.push({ x: xScale(t), label: lbl });
    }
    return out;
  }, [tMin, tMax, xScale]);

  function findClosest(clientX: number, rect: DOMRect): HistoryPoint | null {
    if (points.length === 0) return null;
    const ratio = (clientX - rect.left - PAD_L) / Math.max(1, rect.width - PAD_L - PAD_R);
    const t = tMin + Math.max(0, Math.min(1, ratio)) * (tMax - tMin);
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

  const lastPt = points[points.length - 1];
  const showPt = hover ?? lastPt;
  const showX = xScale(showPt.t);
  const showY = yScale(showPt.v);
  const showDate = new Date(showPt.t);
  const showTime = `${String(showDate.getHours()).padStart(2, '0')}:${String(showDate.getMinutes()).padStart(2, '0')}`;

  const vMin = Math.min(...vs);
  const vMax = Math.max(...vs);
  const vAvg = vs.reduce((a, b) => a + b, 0) / vs.length;

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
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
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
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="text-[11px] uppercase tracking-wider text-text-tertiary">{label}</div>
            <div className="flex items-baseline gap-2 mt-1">
              <div className="text-4xl font-light tabular-nums" style={{ color }}>
                {showPt.v.toFixed(1)}°
              </div>
              <div className="text-sm text-text-tertiary tabular-nums">{showTime}</div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-black/20 dark:bg-black/40 border border-black/15 dark:border-white/15 text-text-primary text-lg flex items-center justify-center"
          >
            ×
          </button>
        </div>

        <div ref={containerRef} className="w-full" style={{ height: h }}>
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
            {yTicks.map((v, i) => {
              const y = yScale(v);
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
                    {v}°
                  </text>
                </g>
              );
            })}

            <path d={fillD} fill={color} opacity={0.18} />
            <path
              d={pathD}
              fill="none"
              stroke={color}
              strokeWidth="1.8"
              strokeLinejoin="round"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />

            {xTicks.map((t, i) => (
              <text
                key={i}
                x={t.x}
                y={h - 8}
                fontSize="10"
                fill="currentColor"
                fillOpacity={0.55}
                textAnchor={i === 0 ? 'start' : i === xTicks.length - 1 ? 'end' : 'middle'}
                className="text-text-tertiary"
              >
                {t.label}
              </text>
            ))}

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
            <circle cx={showX} cy={showY} r="6" fill={color} stroke="rgb(var(--bg-secondary))" strokeWidth="2" />
          </svg>
        </div>

        <div className="grid grid-cols-3 gap-2 mt-3">
          <Stat label="минимум" value={`${vMin.toFixed(1)}°`} color="text-sky-600 dark:text-sky-300" />
          <Stat label="средняя" value={`${vAvg.toFixed(1)}°`} color="text-text-primary" />
          <Stat label="максимум" value={`${vMax.toFixed(1)}°`} color="text-amber-600 dark:text-amber-300" />
        </div>
        <div className="mt-2 text-[11px] text-text-tertiary text-center">
          Поведи пальцем по графику — увидишь температуру в нужный момент
        </div>
      </motion.div>
    </motion.div>,
    document.body
  );
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-xl bg-white/5 dark:bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 px-3 py-2 text-center">
      <div className="text-[10px] uppercase tracking-wider text-text-tertiary">{label}</div>
      <div className={`text-lg font-medium tabular-nums ${color}`}>{value}</div>
    </div>
  );
}
