'use client';

import { Skeleton } from '@/components/ui/Skeleton';
import { useT } from '@/lib/i18n/I18nProvider';

interface DashboardSkeletonProps {
  /** Опциональная подсказка снизу — «Подключаюсь…», «Загрузка профилей…». */
  hint?: string;
}

/**
 * Полноэкранный skeleton основного дашборда.
 * Имитирует header + сетку плиток + dock-bar, чтобы при первом рендере
 * не было «прыжка макета», когда придут реальные данные.
 */
export function DashboardSkeleton({ hint }: DashboardSkeletonProps) {
  const t = useT();
  return (
    <div className="min-h-screen pb-32" role="status" aria-busy="true" aria-live="polite">
      <span className="sr-only">{hint ?? t('common.loading')}</span>

      <header className="sticky top-0 z-10 backdrop-blur-md bg-bg-primary/80 border-b border-black/5 dark:border-white/5 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5 min-w-0">
          <Skeleton shape="circle" width={32} height={32} />
          <div className="min-w-0 flex flex-col gap-1.5">
            <Skeleton width={130} height={14} />
            <Skeleton width={50} height={9} />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Skeleton width={36} height={32} />
          <Skeleton width={36} height={32} />
          <Skeleton width={104} height={32} />
        </div>
      </header>

      <main className="p-3 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 auto-rows-[80px] gap-3">
        {/* Имитация набора виджетов разного размера, как на типичном дашборде. */}
        {SKELETON_GRID.map((cell, i) => (
          <Skeleton
            key={i}
            className={cell.span}
            height={cell.h ? `${cell.h}px` : '100%'}
          />
        ))}
      </main>

      {hint && (
        <div className="fixed bottom-24 left-0 right-0 flex justify-center pointer-events-none">
          <div className="px-4 py-2 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-xs text-text-secondary">
            {hint}
          </div>
        </div>
      )}
    </div>
  );
}

const SKELETON_GRID: Array<{ span: string; h?: number }> = [
  { span: 'col-span-2 row-span-2', h: 172 },
  { span: 'col-span-1', h: 80 },
  { span: 'col-span-1', h: 80 },
  { span: 'col-span-2', h: 80 },
  { span: 'col-span-1', h: 80 },
  { span: 'col-span-1', h: 80 },
  { span: 'col-span-2 row-span-2', h: 172 },
  { span: 'col-span-2', h: 80 },
];
