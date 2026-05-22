'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Lightbulb, Power, Sun, Snowflake, Sparkles } from 'lucide-react';
import { ModalSheet } from '@/components/ui/ModalSheet';
import { useEntity, useCallService } from '@/lib/ha/ConnectionProvider';
import { useT } from '@/lib/i18n/I18nProvider';

interface Props {
  entityId: string;
  open: boolean;
  onClose: () => void;
}

function rgbToHex(rgb: number[] | undefined): string {
  if (!Array.isArray(rgb) || rgb.length < 3) return '#fbbf24';
  return (
    '#' +
    rgb
      .slice(0, 3)
      .map((c) => Math.max(0, Math.min(255, Math.round(c))).toString(16).padStart(2, '0'))
      .join('')
  );
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  s /= 100;
  l /= 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;
  if (h < 60) { r = c; g = x; }
  else if (h < 120) { r = x; g = c; }
  else if (h < 180) { g = c; b = x; }
  else if (h < 240) { g = x; b = c; }
  else if (h < 300) { r = x; b = c; }
  else { r = c; b = x; }
  return [
    Math.round((r + m) * 255),
    Math.round((g + m) * 255),
    Math.round((b + m) * 255),
  ];
}

const PRESETS = [
  { hex: '#fffaf0', rgb: [255, 250, 240] }, // warm white
  { hex: '#ffd9a8', rgb: [255, 217, 168] }, // amber
  { hex: '#ff6b35', rgb: [255, 107, 53] }, // orange
  { hex: '#ff3030', rgb: [255, 48, 48] }, // red
  { hex: '#ff5fb0', rgb: [255, 95, 176] }, // pink
  { hex: '#a855f7', rgb: [168, 85, 247] }, // purple
  { hex: '#4f8fff', rgb: [79, 143, 255] }, // blue
  { hex: '#22d3ee', rgb: [34, 211, 238] }, // cyan
  { hex: '#34d399', rgb: [52, 211, 153] }, // green
  { hex: '#a3e635', rgb: [163, 230, 53] }, // lime
];

/**
 * Полноэкранный sheet управления цветной лампой.
 *
 * Содержимое адаптируется под `supported_color_modes` сущности:
 * - всегда: иконка + название + on/off toggle + brightness slider
 * - если RGB-режим: color wheel (HSL canvas) + presets
 * - если color_temp: слайдер цветовой температуры от тёплого к холодному
 * - если есть effects: список доступных эффектов
 *
 * Color wheel рисуем сами на `<canvas>` через HSL — без зависимостей,
 * ~70 строк, выглядит в стиле панели (фон, тон, скругление).
 */
export function LightColorSheet({ entityId, open, onClose }: Props) {
  const t = useT();
  const e = useEntity(entityId);
  const callService = useCallService();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Локальные значения — чтобы UI не «дёргался» от HA обратной связи во
  // время удержания slider'а. Сбрасываем через 1.5 сек.
  const [localBrightness, setLocalBrightness] = useState<number | null>(null);
  const [localColor, setLocalColor] = useState<string | null>(null);
  const [localCT, setLocalCT] = useState<number | null>(null);

  const on = e?.state === 'on';
  const isBad = !e || e.state === 'unavailable';
  const friendly = e?.attributes.friendly_name ?? t('w.lightSheet.label');
  const supported: string[] = e?.attributes.supported_color_modes ?? [];
  const hasColor = supported.some((m) => ['rgb', 'rgbw', 'rgbww', 'hs', 'xy'].includes(m));
  const hasCT = supported.includes('color_temp');
  const hasBrightness = supported.length > 0 && !supported.every((m) => m === 'onoff');
  const effects: string[] = e?.attributes.effect_list ?? [];
  const currentEffect = e?.attributes.effect as string | undefined;
  const minMireds = (e?.attributes.min_mireds as number | undefined) ?? 153;
  const maxMireds = (e?.attributes.max_mireds as number | undefined) ?? 500;

  const brightnessHa = e?.attributes.brightness as number | undefined;
  const brightnessPct =
    localBrightness ?? (brightnessHa ? Math.round((brightnessHa / 255) * 100) : 0);
  const rgbHa = e?.attributes.rgb_color as number[] | undefined;
  const colorHex = localColor ?? rgbToHex(rgbHa);
  const ctHa = e?.attributes.color_temp as number | undefined;
  const ctValue = localCT ?? ctHa ?? Math.round((minMireds + maxMireds) / 2);

  // Рисуем color wheel один раз при открытии (или resize)
  useEffect(() => {
    if (!open || !hasColor) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const size = canvas.width;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const cx = size / 2;
    const cy = size / 2;
    const radius = size / 2;
    const img = ctx.createImageData(size, size);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const dx = x - cx;
        const dy = y - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const i = (y * size + x) * 4;
        if (dist > radius) {
          img.data[i + 3] = 0;
          continue;
        }
        const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
        const hue = (angle + 360) % 360;
        const sat = Math.min(1, dist / radius) * 100;
        const [r, g, b] = hslToRgb(hue, sat, 50);
        img.data[i] = r;
        img.data[i + 1] = g;
        img.data[i + 2] = b;
        img.data[i + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
  }, [open, hasColor]);

  const sendBrightness = (pct: number) => {
    if (isBad) return;
    setLocalBrightness(pct);
    callService('light', 'turn_on', entityId, { brightness_pct: pct });
    setTimeout(() => setLocalBrightness(null), 1500);
  };

  const sendColor = (rgb: number[], hex: string) => {
    if (isBad) return;
    setLocalColor(hex);
    callService('light', 'turn_on', entityId, { rgb_color: rgb });
    setTimeout(() => setLocalColor(null), 1500);
  };

  const sendCT = (mired: number) => {
    if (isBad) return;
    setLocalCT(mired);
    callService('light', 'turn_on', entityId, { color_temp: mired });
    setTimeout(() => setLocalCT(null), 1500);
  };

  const sendEffect = (effect: string) => {
    if (isBad) return;
    callService('light', 'turn_on', entityId, { effect });
  };

  const toggle = () => {
    if (isBad) return;
    callService('light', on ? 'turn_off' : 'turn_on', entityId);
  };

  const onCanvasInteract = (ev: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = ev.clientX - rect.left;
    const y = ev.clientY - rect.top;
    const size = rect.width;
    const cx = size / 2;
    const cy = size / 2;
    const radius = size / 2;
    const dx = x - cx;
    const dy = y - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > radius) return;
    const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
    const hue = (angle + 360) % 360;
    const sat = Math.min(1, dist / radius) * 100;
    const [r, g, b] = hslToRgb(hue, sat, 50);
    const hex = rgbToHex([r, g, b]);
    sendColor([r, g, b], hex);
  };

  // Accent для фона sheet — текущий цвет лампы (с alpha) или accent-цвет темы.
  const accentSoft = useMemo(() => {
    const hex = colorHex.replace('#', '');
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    return (op: number) => `rgba(${r}, ${g}, ${b}, ${op})`;
  }, [colorHex]);

  return (
    <ModalSheet
      open={open}
      onClose={onClose}
      title={friendly}
      subtitle={on ? `${brightnessPct}%` : t('w.lightSheet.off')}
      ariaLabel={t('w.lightSheet.ariaLabel')}
      innerStyle={
        on
          ? {
              background: `radial-gradient(ellipse 90% 60% at 50% 0%, ${accentSoft(
                0.32,
              )} 0%, ${accentSoft(0.12)} 35%, ${accentSoft(0.04)} 65%, transparent 95%), rgb(var(--bg-secondary))`,
            }
          : undefined
      }
    >
      {/* Toggle + brightness */}
      <div className="flex flex-col items-center gap-4 mb-5">
        <button
          type="button"
          onClick={toggle}
          disabled={isBad}
          className={`w-20 h-20 rounded-full flex items-center justify-center transition disabled:opacity-40 ${
            on ? 'shadow-[0_0_36px_currentColor]' : 'bg-black/10 dark:bg-white/10 text-text-tertiary'
          }`}
          style={on ? { color: colorHex, backgroundColor: `${colorHex}44` } : undefined}
          aria-label={on ? t('w.lightSheet.turnOff') : t('w.lightSheet.turnOn')}
        >
          {on ? <Lightbulb size={34} /> : <Power size={30} />}
        </button>

        {hasBrightness && (
          <div className="w-full flex items-center gap-3 px-1">
            <Sun size={14} className="shrink-0 text-text-tertiary" aria-hidden="true" />
            <input
              type="range"
              min={1}
              max={100}
              step={1}
              value={brightnessPct}
              onChange={(ev) => sendBrightness(Number(ev.target.value))}
              disabled={isBad || !on}
              aria-label={t('w.lightSheet.brightness')}
              className="no-drag flex-1 min-w-0 h-2 cursor-pointer"
              style={{ accentColor: colorHex }}
            />
            <span className="shrink-0 text-xs tabular-nums w-10 text-right text-text-secondary">
              {brightnessPct}%
            </span>
          </div>
        )}
      </div>

      {/* Color wheel + presets */}
      {hasColor && (
        <section className="mb-5">
          <div className="flex justify-center mb-3">
            <canvas
              ref={canvasRef}
              width={240}
              height={240}
              onPointerDown={(ev) => {
                (ev.target as HTMLCanvasElement).setPointerCapture(ev.pointerId);
                onCanvasInteract(ev);
              }}
              onPointerMove={(ev) => {
                if (ev.buttons === 1) onCanvasInteract(ev);
              }}
              className="no-drag rounded-full cursor-crosshair touch-none"
              style={{
                width: 240,
                height: 240,
                boxShadow: `0 8px 24px ${accentSoft(0.35)}`,
              }}
              aria-label={t('w.lightSheet.colorWheel')}
            />
          </div>
          <div className="grid grid-cols-10 gap-1.5">
            {PRESETS.map((p) => {
              const active = colorHex.toLowerCase() === p.hex.toLowerCase();
              return (
                <button
                  key={p.hex}
                  type="button"
                  onClick={() => sendColor(p.rgb, p.hex)}
                  disabled={isBad || !on}
                  className={`no-drag aspect-square rounded-full transition disabled:opacity-40 ${
                    active ? 'ring-2 ring-white/80 ring-offset-2 ring-offset-bg-secondary' : ''
                  }`}
                  style={{ backgroundColor: p.hex }}
                  aria-label={t('w.lightSheet.colorSwatch', { hex: p.hex })}
                />
              );
            })}
          </div>
        </section>
      )}

      {/* Color temperature */}
      {hasCT && (
        <section className="mb-5">
          <div className="flex items-center gap-3 px-1">
            <Sun size={14} className="shrink-0 text-amber-400" aria-hidden="true" />
            <input
              type="range"
              min={minMireds}
              max={maxMireds}
              step={1}
              value={ctValue}
              onChange={(ev) => sendCT(Number(ev.target.value))}
              disabled={isBad || !on}
              aria-label={t('w.lightSheet.colorTemp')}
              className="no-drag flex-1 min-w-0 h-2 cursor-pointer"
              style={{
                background: 'linear-gradient(to right, #ffd9a8, #ffffff, #b9d2ff)',
                borderRadius: 8,
              }}
            />
            <Snowflake size={14} className="shrink-0 text-blue-300" aria-hidden="true" />
          </div>
          <div className="text-[10px] text-text-tertiary text-center mt-1">
            {t('w.lightSheet.colorTempValue', { value: ctValue })}
          </div>
        </section>
      )}

      {/* Effects */}
      {effects.length > 0 && (
        <section>
          <div className="flex items-center gap-1.5 mb-2 text-xs text-text-tertiary">
            <Sparkles size={12} aria-hidden="true" />
            {t('w.lightSheet.effects')}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {effects.map((eff) => {
              const active = currentEffect === eff;
              return (
                <button
                  key={eff}
                  type="button"
                  onClick={() => sendEffect(eff)}
                  disabled={isBad || !on}
                  className={`no-drag text-xs px-3 py-1.5 rounded-full transition disabled:opacity-40 ${
                    active
                      ? 'bg-accent/25 border border-accent/50 text-accent'
                      : 'bg-black/10 dark:bg-white/10 border border-transparent text-text-secondary hover:text-text-primary'
                  }`}
                >
                  {eff}
                </button>
              );
            })}
          </div>
        </section>
      )}
    </ModalSheet>
  );
}
