'use client';

import {
  forwardRef,
  useState,
  type ReactNode,
  type CSSProperties,
} from 'react';

export interface PressButtonProps {
  onClick?: () => void;
  size?: number;
  children?: ReactNode;
  className?: string;
  ariaLabel?: string;
  title?: string;
  disabled?: boolean;
  pressedScale?: number;
  bg?: string;
  bgPressed?: string;
  style?: CSSProperties;
}

/**
 * Кнопка с тактильным «вдавливанием» при нажатии.
 *
 * Состояние «нажато» управляется через pointerdown/pointerup/pointerleave/
 * pointercancel — это надёжнее `:active` (которое на iOS Safari иногда
 * «прилипает» после тапа) и framer-motion `whileTap` (который может
 * пропустить отпускание).
 *
 * - `pressedScale` — насколько уменьшать на нажатие (по умолчанию 0.88)
 * - `bg` / `bgPressed` — фон через inline-style. Если не задан — используются
 *   дефолтные `bg-black/8 dark:bg-white/8` и `bg-black/22 dark:bg-white/22`.
 *   Передавай `bg="none"` чтобы отдать управление фоном внешнему className.
 * - `size` — для квадратных круглых кнопок (rounded-full).
 *   Для прямоугольных — задавай размер через className (h-9 flex-1 и т.п.)
 */
export const PressButton = forwardRef<HTMLButtonElement, PressButtonProps>(
  function PressButton(
    {
      onClick,
      size,
      children,
      className = '',
      ariaLabel,
      title,
      disabled,
      pressedScale = 0.88,
      bg,
      bgPressed,
      style,
    },
    ref
  ) {
    const [pressed, setPressed] = useState(false);
    const release = () => setPressed(false);

    const useDefaultBg = bg !== 'none';
    const defaultBg = bg ?? 'rgba(255,255,255,0.08)';
    const pressedBgValue = bgPressed ?? 'rgba(255,255,255,0.22)';

    const styleObj: CSSProperties = {
      transform: pressed ? `scale(${pressedScale})` : 'scale(1)',
      transition: 'transform 80ms ease-out, background 120ms ease-out',
      ...(size !== undefined ? { width: size, height: size } : null),
      ...(useDefaultBg ? { background: pressed ? pressedBgValue : defaultBg } : null),
      ...style,
    };

    // rounded-full добавляем по умолчанию только когда задан size (квадрат)
    const baseClass = size !== undefined ? 'rounded-full' : '';

    return (
      <button
        ref={ref}
        type="button"
        disabled={disabled}
        aria-label={ariaLabel}
        title={title}
        onPointerDown={() => !disabled && setPressed(true)}
        onPointerUp={release}
        onPointerLeave={release}
        onPointerCancel={release}
        onClick={(e) => {
          (e.currentTarget as HTMLElement).blur();
          if (!disabled && onClick) onClick();
        }}
        style={styleObj}
        className={`no-drag ${baseClass} flex items-center justify-center focus:outline-hidden focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/70 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary disabled:opacity-30 ${className}`}
      >
        {children}
      </button>
    );
  }
);
