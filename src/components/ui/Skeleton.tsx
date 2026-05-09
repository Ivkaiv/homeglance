'use client';

interface SkeletonProps {
  className?: string;
  /** Базовая форма: прямоугольник со скруглением (default), круг, текстовая строка. */
  shape?: 'rect' | 'circle' | 'text';
  width?: number | string;
  height?: number | string;
}

/**
 * Базовый skeleton-плейсхолдер с shimmer-анимацией.
 * Для виджетов используется WidgetSkeleton из widgets/_states.tsx (он на весь grid-cell).
 */
export function Skeleton({ className = '', shape = 'rect', width, height }: SkeletonProps) {
  const shapeCls =
    shape === 'circle'
      ? 'rounded-full'
      : shape === 'text'
        ? 'rounded-md h-3'
        : 'rounded-xl';
  const style: React.CSSProperties = {};
  if (width !== undefined) style.width = typeof width === 'number' ? `${width}px` : width;
  if (height !== undefined) style.height = typeof height === 'number' ? `${height}px` : height;

  return (
    <div
      aria-hidden="true"
      className={`relative overflow-hidden bg-white/5 dark:bg-white/5 ${shapeCls} ${className}`}
      style={style}
    >
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 dark:via-white/8 to-transparent skeleton-shimmer" />
    </div>
  );
}
