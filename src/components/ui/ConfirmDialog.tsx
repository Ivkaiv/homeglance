'use client';

import { ModalSheet } from './ModalSheet';
import { useT } from '@/lib/i18n/I18nProvider';

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Цветовая схема кнопки подтверждения. По умолчанию accent. Для удалений — danger. */
  variant?: 'accent' | 'danger';
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * In-app замена нативного `confirm()`. Появляется по центру экрана как
 * модалка, кнопки подсвечены в стиле приложения. На iOS PWA выглядит
 * органично, в отличие от системного confirm-диалога.
 */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel,
  variant = 'accent',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const t = useT();
  const confirmText = confirmLabel ?? t('common.yes');
  const cancelText = cancelLabel ?? t('common.cancel');
  // Цвета подобраны контрастными для обеих тем: насыщенный красный текст
  // в светлой теме (был text-red-200 — невидим на белой модалке), приглушённый
  // в тёмной.
  const confirmClass =
    variant === 'danger'
      ? 'bg-red-500/15 dark:bg-red-500/25 border-red-500/40 dark:border-red-400/50 text-red-700 dark:text-red-200 hover:bg-red-500/25 dark:hover:bg-red-500/35'
      : 'bg-accent/15 dark:bg-accent/25 border-accent/50 text-accent hover:bg-accent/25 dark:hover:bg-accent/35';

  return (
    <ModalSheet
      open={open}
      onClose={onCancel}
      position="center"
      zIndex={70}
      className="w-full max-w-sm rounded-2xl bg-bg-secondary border border-black/10 dark:border-white/10 p-5"
    >
      <div className="flex flex-col gap-2">
        <div className="text-base font-medium text-text-primary">{title}</div>
        {message && <div className="text-sm text-text-secondary">{message}</div>}
      </div>
      <div className="flex gap-2 mt-5">
        <button
          onClick={onCancel}
          className="flex-1 px-4 py-2.5 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-text-secondary text-sm hover:bg-black/10 dark:hover:bg-white/10 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-secondary"
        >
          {cancelText}
        </button>
        <button
          onClick={onConfirm}
          className={`flex-1 px-4 py-2.5 rounded-xl border text-sm focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-secondary ${confirmClass} ${
            variant === 'danger'
              ? 'focus-visible:ring-red-300'
              : 'focus-visible:ring-accent/70'
          }`}
        >
          {confirmText}
        </button>
      </div>
    </ModalSheet>
  );
}
