'use client';

import { useState } from 'react';
import { Lightbulb, Power } from 'lucide-react';
import { useEntity, useCallService } from '@/lib/ha/ConnectionProvider';
import { useWidgetSize } from '@/lib/widgets/useWidgetSize';
import { LightColorSheet } from './LightColorSheet';

interface Params {
  entity: string;
  label?: string;
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

const QUICK_COLORS = [
  '#fffaf0', '#ffd9a8', '#ff6b35', '#ff3030',
  '#a855f7', '#4f8fff', '#22d3ee', '#34d399',
];

function hexToRgb(hex: string): [number, number, number] {
  const m = hex.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
  if (!m) return [255, 255, 255];
  return [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)];
}

/**
 * Виджет цветной лампы — адаптивный layout по размеру ячейки.
 *
 * - tiny (1×1): только иконка + toggle по тапу
 * - compact (≤2×1): иконка + название + статус, тап → sheet
 * - medium (≥3×1, h≤2): добавляем brightness slider справа
 * - wide-tall (≥3×3): + ряд быстрых preset-цветов внизу
 *
 * Внутри (по тапу на основной body) всегда открывается `LightColorSheet`
 * с полным управлением. Slider и preset'ы в самом виджете — для удобных
 * «быстрых действий» без открытия sheet.
 */
export function LightColorWidget({ params }: { params: Params }) {
  const e = useEntity(params.entity);
  const callService = useCallService();
  const [ref, size] = useWidgetSize();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [pendingBrightness, setPendingBrightness] = useState<number | null>(null);

  if (!params.entity) {
    return (
      <div ref={ref} className="glass h-full w-full p-3 flex items-center justify-center text-text-tertiary text-xs text-center">
        ⚙️
      </div>
    );
  }

  if (!size.measured) {
    return <div ref={ref} className="glass h-full w-full" />;
  }

  const on = e?.state === 'on';
  const isBad = !e || e.state === 'unavailable';
  const label = params.label ?? e?.attributes.friendly_name ?? 'Свет';
  const supported: string[] = e?.attributes.supported_color_modes ?? [];
  const hasColor = supported.some((m) => ['rgb', 'rgbw', 'rgbww', 'hs', 'xy'].includes(m));
  const hasBrightness = supported.length > 0 && !supported.every((m) => m === 'onoff');
  const brightnessHa = e?.attributes.brightness as number | undefined;
  const brightnessPct =
    pendingBrightness ?? (brightnessHa ? Math.round((brightnessHa / 255) * 100) : 0);
  const rgbHa = e?.attributes.rgb_color as number[] | undefined;
  const colorHex = rgbToHex(rgbHa);
  const status = isBad ? 'нет связи' : on ? `${brightnessPct}%` : 'выключена';

  const toggle = () => !isBad && callService('light', on ? 'turn_off' : 'turn_on', params.entity);
  const sendBrightness = (pct: number) => {
    if (isBad) return;
    setPendingBrightness(pct);
    callService('light', 'turn_on', params.entity, { brightness_pct: pct });
    setTimeout(() => setPendingBrightness(null), 1500);
  };
  const sendColor = (hex: string) => {
    if (isBad) return;
    callService('light', 'turn_on', params.entity, { rgb_color: hexToRgb(hex) });
  };

  // Tier-определение по ячейке RGL (не по CSS @container, чтобы знать что показывать):
  // tiny = очень маленькая ячейка, только иконка
  // compact = одна строка: иконка + текст
  // medium = есть место под slider справа
  // wide = есть место под presets снизу
  const tier =
    size.w < 90 && size.h < 90
      ? 'tiny'
      : size.w < 200 || size.h < 80
        ? 'compact'
        : size.h < 130
          ? 'medium'
          : 'wide';

  const glow = on
    ? { boxShadow: `inset 0 0 0 1px ${colorHex}33, 0 0 16px ${colorHex}40` }
    : undefined;

  // Tiny: иконка по центру; тап = toggle (без sheet — не хватает места показать
  // даже название, sheet тут лишний)
  if (tier === 'tiny') {
    return (
      <button
        ref={ref as any}
        type="button"
        onClick={toggle}
        disabled={isBad}
        className="glass h-full w-full flex items-center justify-center disabled:opacity-40 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/70"
        style={glow}
        aria-label={`${label}: ${status}, переключить`}
        title={label}
      >
        <div
          className={`w-9 h-9 rounded-full flex items-center justify-center ${
            on ? 'shadow-[0_0_12px_currentColor]' : 'bg-black/5 dark:bg-white/5 text-text-tertiary'
          }`}
          style={on ? { color: colorHex, backgroundColor: `${colorHex}33` } : undefined}
        >
          {on ? <Lightbulb size={16} /> : <Power size={16} />}
        </div>
      </button>
    );
  }

  const IconBlock = (
    <div
      className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center transition ${
        on ? 'shadow-[0_0_12px_currentColor]' : 'bg-black/5 dark:bg-white/5 text-text-tertiary'
      }`}
      style={on ? { color: colorHex, backgroundColor: `${colorHex}33` } : undefined}
    >
      {on ? <Lightbulb size={16} aria-hidden="true" /> : <Power size={16} aria-hidden="true" />}
    </div>
  );

  // Compact: иконка + название + статус. Тап по body → open sheet, тап
  // на иконке (отдельная кнопка) = toggle. Для очень узких видджетов
  // оставляем только body-click → sheet.
  if (tier === 'compact') {
    return (
      <>
        <button
          ref={ref as any}
          type="button"
          onClick={() => setSheetOpen(true)}
          disabled={isBad}
          className="glass h-full w-full p-2.5 flex items-center gap-2 text-left disabled:opacity-40 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/70"
          style={glow}
          aria-label={`Открыть управление: ${label}`}
        >
          {IconBlock}
          <div className="min-w-0 flex-1">
            <div className="text-xs font-medium truncate">{label}</div>
            <div className="text-[10px] text-text-tertiary truncate">{status}</div>
          </div>
        </button>
        <LightColorSheet
          entityId={params.entity}
          open={sheetOpen}
          onClose={() => setSheetOpen(false)}
        />
      </>
    );
  }

  // Medium / Wide: иконка + название + slider яркости, и при wide добавляем
  // ряд preset-цветов внизу.
  return (
    <>
      <div
        ref={ref}
        className="glass h-full w-full p-3 flex flex-col gap-2 overflow-hidden"
        style={glow}
      >
        <div className="flex items-center gap-2 min-w-0">
          {/* Иконка — отдельная кнопка-toggle */}
          <button
            type="button"
            onClick={toggle}
            disabled={isBad}
            className="no-drag shrink-0"
            aria-label={on ? 'Выключить' : 'Включить'}
          >
            {IconBlock}
          </button>
          {/* Текст-зона = тап на sheet */}
          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            disabled={isBad}
            className="no-drag min-w-0 flex-1 text-left disabled:opacity-40 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/70 rounded-md"
            aria-label={`Открыть управление: ${label}`}
          >
            <div className="text-xs font-medium truncate">{label}</div>
            <div className="text-[10px] text-text-tertiary truncate">{status}</div>
          </button>
        </div>

        {hasBrightness && (
          <input
            type="range"
            min={1}
            max={100}
            step={1}
            value={brightnessPct}
            onChange={(ev) => sendBrightness(Number(ev.target.value))}
            disabled={isBad || !on}
            aria-label="Яркость"
            className="no-drag w-full h-2 cursor-pointer shrink-0"
            style={{ accentColor: colorHex }}
          />
        )}

        {tier === 'wide' && hasColor && (
          <div className="flex gap-1 shrink-0 mt-auto">
            {QUICK_COLORS.map((c) => {
              const active = colorHex.toLowerCase() === c.toLowerCase();
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => sendColor(c)}
                  disabled={isBad || !on}
                  className={`no-drag flex-1 aspect-square rounded-full max-w-[28px] disabled:opacity-40 transition ${
                    active
                      ? 'ring-2 ring-white/80 ring-offset-2 ring-offset-bg-secondary'
                      : ''
                  }`}
                  style={{ backgroundColor: c }}
                  aria-label={`Цвет ${c}`}
                />
              );
            })}
          </div>
        )}
      </div>
      <LightColorSheet
        entityId={params.entity}
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
      />
    </>
  );
}
