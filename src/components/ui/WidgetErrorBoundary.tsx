'use client';

import { AlertTriangle } from 'lucide-react';
import { ErrorBoundary } from './ErrorBoundary';
import { useT } from '@/lib/i18n/I18nProvider';

interface WidgetErrorBoundaryProps {
  children: React.ReactNode;
  /** Тип виджета — для дев-логов и автоматического сброса при смене типа. */
  widgetType: string;
  /** Параметры виджета — при их смене boundary пересбрасывается, чтобы виджет мог переотрендериться. */
  resetKey?: unknown;
}

export function WidgetErrorBoundary({ children, widgetType, resetKey }: WidgetErrorBoundaryProps) {
  const t = useT();
  return (
    <ErrorBoundary
      resetKey={resetKey}
      onError={(err) => {
        if (process.env.NODE_ENV !== 'production') {
          console.error(`[Widget:${widgetType}]`, err);
        }
      }}
      fallback={(err, reset) => (
        <div className="glass h-full w-full p-3 flex flex-col items-center justify-center text-center gap-1.5 select-none">
          <AlertTriangle size={18} className="text-amber-400/80" aria-hidden="true" />
          <div className="text-[11px] text-text-secondary leading-tight max-w-[90%]">
            {t('error.widget.title', { type: widgetType })}
          </div>
          <div
            className="text-[10px] text-text-tertiary leading-tight max-w-[90%] line-clamp-2"
            title={err.message}
          >
            {err.message}
          </div>
          <button
            onClick={reset}
            className="mt-1 px-2 py-0.5 rounded-full bg-white/10 border border-white/15 text-[10px] text-text-secondary hover:text-text-primary"
          >
            {t('error.widget.restart')}
          </button>
        </div>
      )}
    >
      {children}
    </ErrorBoundary>
  );
}
