'use client';

import { Settings } from 'lucide-react';

/** Шейр-обёртка для пустого виджета (нет привязок).
 *  Показывает иконку шестерёнки и подсказку «настройте через ⚙». */
export function WidgetEmptyState({
  emoji,
  hint,
}: {
  emoji?: string;
  hint?: string;
}) {
  return (
    <div className="glass h-full w-full p-3 flex flex-col items-center justify-center text-text-tertiary gap-1.5 select-none">
      <Settings size={18} className="opacity-50" aria-hidden="true" />
      {emoji && <div className="text-2xl opacity-60">{emoji}</div>}
      <div className="text-[11px] text-center max-w-[80%] leading-tight">
        {hint || 'Откройте настройки виджета'}
      </div>
    </div>
  );
}

/** Skeleton-плейсхолдер с shimmer-анимацией для виджета на стадии connecting/loading. */
export function WidgetSkeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`glass h-full w-full overflow-hidden relative ${className}`}>
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 dark:via-white/3 to-transparent skeleton-shimmer" />
    </div>
  );
}
