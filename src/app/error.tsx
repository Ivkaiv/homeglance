'use client';

import { useEffect } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import { useT } from '@/lib/i18n/I18nProvider';

export default function PageError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useT();

  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[PageError]', error);
    }
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="glass p-6 max-w-md w-full text-center flex flex-col items-center gap-3">
        <AlertTriangle size={32} className="text-amber-400" aria-hidden="true" />
        <div className="text-base font-medium text-text-primary">{t('error.page.title')}</div>
        <div className="text-sm text-text-secondary">{t('error.page.body')}</div>
        {error.message && (
          <div className="text-xs text-text-tertiary font-mono break-words max-w-full px-3 py-2 rounded-lg bg-black/20 dark:bg-white/5 border border-black/10 dark:border-white/10">
            {error.message}
          </div>
        )}
        <button
          onClick={reset}
          className="mt-1 px-4 py-2 rounded-full bg-accent/20 border border-accent/40 text-accent text-sm flex items-center gap-2 hover:bg-accent/30"
        >
          <RotateCcw size={14} aria-hidden="true" /> {t('common.retry')}
        </button>
      </div>
    </div>
  );
}
