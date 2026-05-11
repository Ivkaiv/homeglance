'use client';

import { useState } from 'react';
import { Lightbulb, Power } from 'lucide-react';
import { useEntity } from '@/lib/ha/ConnectionProvider';
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

/**
 * Виджет цветной лампы — компактный: иконка + название + текущее
 * состояние. Тап открывает `LightColorSheet` с полным управлением
 * (toggle, brightness, color wheel, color temperature, effects).
 *
 * Это паттерн «лёгкий виджет + полноценный sheet», который уже работает
 * для MediaPlayerWidget. Контролы внутри маленькой ячейки RGL были
 * нечитаемыми — sheet даёт нормальные тач-цели и UX в стиле панели.
 */
export function LightColorWidget({ params }: { params: Params }) {
  const e = useEntity(params.entity);
  const [sheetOpen, setSheetOpen] = useState(false);

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
  const brightnessHa = e?.attributes.brightness as number | undefined;
  const brightnessPct = brightnessHa ? Math.round((brightnessHa / 255) * 100) : 0;
  const rgbHa = e?.attributes.rgb_color as number[] | undefined;
  const colorHex = rgbToHex(rgbHa);
  const status = isBad ? 'нет связи' : on ? `${brightnessPct}%` : 'выключена';

  return (
    <>
      <button
        type="button"
        onClick={() => setSheetOpen(true)}
        disabled={isBad}
        className="glass h-full w-full p-3 flex items-center gap-2.5 text-left disabled:opacity-40 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/70"
        style={{
          boxShadow: on
            ? `inset 0 0 0 1px ${colorHex}33, 0 0 16px ${colorHex}40`
            : undefined,
        }}
        aria-label={`Открыть управление: ${label}`}
      >
        <div
          className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center transition ${
            on ? 'shadow-[0_0_12px_currentColor]' : 'bg-black/5 dark:bg-white/5 text-text-tertiary'
          }`}
          style={on ? { color: colorHex, backgroundColor: `${colorHex}33` } : undefined}
        >
          {on ? <Lightbulb size={16} aria-hidden="true" /> : <Power size={16} aria-hidden="true" />}
        </div>
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
