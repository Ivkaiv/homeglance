'use client';

import clsx from 'clsx';
import type { CSSProperties } from 'react';
import { GlanceIcon } from '@/components/icons/MdiIcon';
import { PressButton } from '@/components/ui/PressButton';

export interface EntityToggleShellProps {
  /** Включено ли (для подсветки и индикатора). */
  on: boolean;
  /** Не отвечает / unavailable. */
  isBad?: boolean;
  /** Подпись виджета. */
  label: string;
  /** Иконка (mdi-имя или эмодзи). */
  iconValue: string;
  /** Цвет точки-индикатора и подсветки в "on" состоянии. */
  color: string;
  /** Текст в medium+/large состоянии: «Включён» / «Выключен» / «Нет связи». */
  statusText: { on: string; off: string; bad?: string };
  /** Клик по виджету. */
  onClick: () => void;
  /** Дополнительный inline-style для glow-эффекта (если нужен «мягкий» свет). */
  glowOverride?: CSSProperties;
}

/**
 * Общая основа для виджетов вида «toggle entity вкл/выкл»: лампы, переключатели,
 * розетки. Использует CSS container queries (Tailwind v4): родительский
 * `.rgl-cell` имеет `@container`, и внутри мы:
 *  - **до 80px**: видна только иконка по центру
 *  - **80-140px**: добавляется точка-индикатор снизу
 *  - **140px+**: разворачивается полный layout с подписью, индикатором, иконкой
 *    и статусным текстом
 *
 * Все три варианта присутствуют в DOM одновременно, но CQ скрывают лишние —
 * никаких JS-измерений и ререндеров на ResizeObserver-event'ах.
 */
export function EntityToggleShell({
  on,
  isBad = false,
  label,
  iconValue,
  color,
  statusText,
  onClick,
  glowOverride,
}: EntityToggleShellProps) {
  const glow =
    glowOverride ??
    (on
      ? { boxShadow: `0 0 28px ${color}50, inset 0 0 24px ${color}25` }
      : undefined);

  const ariaLabel = `${label}: ${
    isBad ? statusText.bad ?? 'Нет связи' : on ? statusText.on : statusText.off
  }`;
  const dotColor = on ? color : 'rgba(255,255,255,0.18)';

  return (
    <PressButton
      pressedScale={0.97}
      disabled={isBad}
      onClick={onClick}
      title={label}
      ariaLabel={ariaLabel}
      bg="none"
      className={clsx(
        'h-full w-full',
        // tiny (default, < 140px): центрированная иконка
        'flex flex-col items-center justify-center',
        // medium+ (>= 140px): паддинги и колонка с распределением
        '@[140px]:p-3 @[140px]:justify-between',
        // glass всегда. glass-active — только когда «включено» И достаточно
        // места для развёрнутого вида (≥ 140px), иначе background-mix не виден.
        'glass',
        on && '@[140px]:glass-active'
      )}
      style={glow}
    >
      {/* Верхний ряд: подпись + точка. Виден только в medium+ */}
      <div className="hidden @[140px]:flex items-center justify-between w-full">
        <div className="text-xs text-text-secondary truncate text-left">{label}</div>
        <div
          className="w-3 h-3 rounded-full shrink-0"
          style={{ background: dotColor }}
          aria-hidden="true"
        />
      </div>

      {/* Точка-индикатор для small (80-140): под иконкой по центру */}
      <div
        className="hidden @[80px]:block @[140px]:hidden w-2 h-2 rounded-full mt-1"
        style={{ background: dotColor }}
        aria-hidden="true"
      />

      {/* Нижний ряд: иконка + статусный текст в medium+, либо просто иконка в tiny */}
      <div className="flex items-center gap-2 @[140px]:gap-2">
        <GlanceIcon value={iconValue} size={28} />
        <div className="hidden @[140px]:block text-sm">
          {isBad
            ? statusText.bad ?? 'Нет связи'
            : on
            ? statusText.on
            : statusText.off}
        </div>
      </div>
    </PressButton>
  );
}
