'use client';

import clsx from 'clsx';
import type { CSSProperties, ReactNode } from 'react';
import { GlanceIcon } from '@/components/icons/MdiIcon';
import { PressButton } from '@/components/ui/PressButton';

export interface EntityToggleShellProps {
  on: boolean;
  isBad?: boolean;
  label: string;
  iconValue: string;
  color: string;
  statusText: { on: string; off: string; bad?: string };
  onClick: () => void;
  glowOverride?: CSSProperties;
  /**
   * Опциональный slot в правом верхнем углу — обычно маленькая кнопка-точка,
   * открывающая sheet с расширенными настройками (например, выбор цвета у
   * цветной лампы). Корнер-кнопка должна делать `stopPropagation` в onClick,
   * иначе клик «утечёт» в основной toggle.
   */
  cornerButton?: ReactNode;
}

/**
 * Общая основа для виджетов вида «toggle entity вкл/выкл»: лампы,
 * переключатели, розетки. Layout управляется CSS container queries
 * (Tailwind v4) — родительский `.rgl-cell` имеет `@container`.
 *
 * Уровни:
 *  - **< 70px**: только иконка по центру (минимальный 2×2 не помещает текст)
 *  - **≥ 70px**: иконка по центру + подпись маленьким шрифтом снизу
 *  - **≥ 140px**: разворачивается полный layout — подпись сверху,
 *    иконка + статус снизу
 *
 * Индикатор on/off — это сам glow + цвет иконки, отдельная «точка-индикатор»
 * не нужна: на узких клетках она читалась как графический мусор.
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
  cornerButton,
}: EntityToggleShellProps) {
  const glow =
    glowOverride ??
    (on
      ? { boxShadow: `0 0 28px ${color}50, inset 0 0 24px ${color}25` }
      : undefined);

  const ariaLabel = `${label}: ${
    isBad ? statusText.bad ?? 'Нет связи' : on ? statusText.on : statusText.off
  }`;

  const iconColor = on ? color : undefined;

  // Cornerbutton-обёртка: position:relative на внешнем контейнере, чтобы
  // абсолютно позиционированная точка-кнопка прилипала к углу. PressButton
  // занимает всю площадь, но в HTML нельзя вкладывать кнопку в кнопку,
  // поэтому corner живёт sibling-ом, поверх (z-index).
  return (
    <div className="relative h-full w-full">
      <PressButton
        pressedScale={0.97}
        disabled={isBad}
        onClick={onClick}
        title={label}
        ariaLabel={ariaLabel}
        bg="none"
        className={clsx(
          'h-full w-full',
          // compact (default): иконка + подпись по центру, вертикально
          'flex flex-col items-center justify-center gap-1 px-1.5 py-2',
          // large (≥ 140px): полный layout — заголовок сверху, ряд иконка+статус снизу
          '@[140px]:p-3 @[140px]:gap-0 @[140px]:justify-between @[140px]:items-stretch',
          'glass',
          on && '@[140px]:glass-active'
        )}
        style={glow}
      >
        {/* Заголовок — виден только в large (≥ 140px) */}
        <div className="hidden @[140px]:block w-full">
          <div className="text-xs text-text-secondary truncate text-left">{label}</div>
        </div>

        {/* Иконка — по центру в compact, слева внизу в large */}
        <div
          className="flex items-center gap-2 @[140px]:gap-2 justify-center @[140px]:justify-start"
          style={iconColor ? { color: iconColor } : undefined}
        >
          <GlanceIcon value={iconValue} size={28} />
          <div className="hidden @[140px]:block text-sm text-text-primary">
            {isBad ? statusText.bad ?? 'Нет связи' : on ? statusText.on : statusText.off}
          </div>
        </div>

        {/* Подпись под иконкой — только в compact (70-140px), скрыта в tiny и large */}
        <div className="hidden @[70px]:block @[140px]:hidden text-[10px] text-text-secondary text-center truncate w-full px-0.5 leading-tight">
          {label}
        </div>
      </PressButton>
      {cornerButton && (
        <div className="absolute top-1.5 right-1.5 z-10 no-drag">
          {cornerButton}
        </div>
      )}
    </div>
  );
}
