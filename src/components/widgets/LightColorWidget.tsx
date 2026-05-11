'use client';

import { useState } from 'react';
import { Lightbulb, Power } from 'lucide-react';
import { useEntity, useCallService } from '@/lib/ha/ConnectionProvider';

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

function hexToRgb(hex: string): [number, number, number] {
  const m = hex.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
  if (!m) return [255, 255, 255];
  return [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)];
}

/**
 * Виджет управления цветной лампой: on/off + brightness + RGB-picker.
 *
 * UI: иконка-лампа сверху (тап = toggle), снизу — slider яркости и
 * нативный `<input type="color">` для цвета (открывает системный
 * color-picker). Если у лампы нет color-mode, показываем только
 * brightness; если нет brightness — fallback на простой toggle.
 *
 * Native `<input type="color">` выбран сознательно — не тянем в
 * bundle сторонний color-picker (~30-50 kB).
 */
export function LightColorWidget({ params }: { params: Params }) {
  const e = useEntity(params.entity);
  const callService = useCallService();
  // Локальный hex для отзывчивого slider'а — синхронизируется с HA, но
  // не блокируется на каждый change-event (debounce 150ms).
  const [pendingColor, setPendingColor] = useState<string | null>(null);
  const [pendingBrightness, setPendingBrightness] = useState<number | null>(null);

  if (!params.entity) {
    return (
      <div className="glass h-full w-full p-3 flex items-center justify-center text-text-tertiary text-xs text-center">
        ⚙️ Настрой лампу
      </div>
    );
  }

  const on = e?.state === 'on';
  const isBad = !e || e.state === 'unavailable';
  const label = params.label ?? e?.attributes.friendly_name ?? 'Свет';
  const supported: string[] = e?.attributes.supported_color_modes ?? [];
  const supportsColor = supported.some((m) =>
    ['rgb', 'rgbw', 'rgbww', 'hs', 'xy'].includes(m),
  );
  const supportsBrightness = supported.length > 0 && !supported.every((m) => m === 'onoff');

  const brightnessHa = e?.attributes.brightness as number | undefined; // 0-255
  const brightnessPct = pendingBrightness ?? (brightnessHa ? Math.round((brightnessHa / 255) * 100) : 0);
  const rgbHa = e?.attributes.rgb_color as number[] | undefined;
  const colorHex = pendingColor ?? rgbToHex(rgbHa);

  const toggle = () => {
    if (isBad) return;
    callService('light', on ? 'turn_off' : 'turn_on', params.entity);
  };

  const sendBrightness = (pct: number) => {
    if (isBad) return;
    setPendingBrightness(pct);
    callService('light', 'turn_on', params.entity, {
      brightness_pct: pct,
    });
    // Сбрасываем локальный override через короткое время — даём state из HA.
    setTimeout(() => setPendingBrightness(null), 1500);
  };

  const sendColor = (hex: string) => {
    if (isBad) return;
    setPendingColor(hex);
    const rgb = hexToRgb(hex);
    callService('light', 'turn_on', params.entity, { rgb_color: rgb });
    setTimeout(() => setPendingColor(null), 1500);
  };

  return (
    <div
      className="glass h-full w-full p-3 flex flex-col gap-2 overflow-hidden"
      style={{
        // Лёгкое свечение в цвет лампы — приятно когда лампа цветная.
        boxShadow: on
          ? `inset 0 0 0 1px ${colorHex}33, 0 0 16px ${colorHex}33`
          : undefined,
      }}
    >
      <div className="flex items-center gap-2 min-w-0">
        <button
          type="button"
          onClick={toggle}
          disabled={isBad}
          className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center transition disabled:opacity-40 ${
            on
              ? 'shadow-[0_0_12px_currentColor]'
              : 'bg-black/5 dark:bg-white/5 text-text-tertiary'
          }`}
          style={on ? { color: colorHex, backgroundColor: `${colorHex}33` } : undefined}
          aria-label={on ? 'Выключить' : 'Включить'}
        >
          {on ? <Lightbulb size={16} aria-hidden="true" /> : <Power size={16} aria-hidden="true" />}
        </button>
        <div className="min-w-0 flex-1">
          <div className="text-xs font-medium truncate">{label}</div>
          <div className="text-[10px] text-text-tertiary">
            {isBad ? 'нет связи' : on ? `${brightnessPct}%` : 'выключена'}
          </div>
        </div>
      </div>

      {on && supportsBrightness && (
        <div className="flex items-center gap-2 min-w-0">
          <input
            type="range"
            min={1}
            max={100}
            step={1}
            value={brightnessPct}
            onChange={(ev) => sendBrightness(Number(ev.target.value))}
            disabled={isBad}
            aria-label="Яркость"
            className="no-drag flex-1 min-w-0 accent-accent"
            style={{ accentColor: colorHex }}
          />
          {supportsColor && (
            <input
              type="color"
              value={colorHex}
              onChange={(ev) => sendColor(ev.target.value)}
              disabled={isBad}
              aria-label="Цвет"
              className="no-drag w-8 h-8 rounded-md bg-transparent border border-black/10 dark:border-white/15 cursor-pointer"
            />
          )}
        </div>
      )}
    </div>
  );
}
