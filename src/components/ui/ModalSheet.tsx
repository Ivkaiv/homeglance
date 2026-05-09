'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

export interface ModalSheetProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  subtitle?: ReactNode;
  /** Когда true — клик по подложке не закрывает (например если в модалке есть несохранённые изменения и нужен confirm). */
  preventBackdropClose?: boolean;
  /** Подключить ESC-обработчик. По умолчанию true. */
  closeOnEsc?: boolean;
  /** ARIA-имя для скрин-ридера если title не строка. */
  ariaLabel?: string;
  /** Стили внутреннего контейнера — sm:max-w-2xl и т.п. */
  className?: string;
  /** Шапка кастомная — если переданa, title/subtitle игнорируются. */
  header?: ReactNode;
  /** Футер прижат к низу. */
  footer?: ReactNode;
  /** Z-index подложки (для вложенных модалок). По умолчанию 50. */
  zIndex?: number;
  /** Позиция: bottom-sheet (по умолчанию) или центр экрана. */
  position?: 'bottom' | 'center';
  children: ReactNode;
}

/**
 * Доступная нижняя модалка (bottom sheet) с:
 * - role="dialog" + aria-modal="true"
 * - ESC-обработчиком
 * - focus-trap по Tab/Shift+Tab
 * - возвратом фокуса на элемент-открыватель при закрытии
 * - блокировкой скролла body
 *
 * Заменяет стандартную пару motion.div/createPortal во всех модалках.
 */
export function ModalSheet({
  open,
  onClose,
  title,
  subtitle,
  preventBackdropClose,
  closeOnEsc = true,
  ariaLabel,
  className = 'w-full max-w-2xl rounded-t-3xl bg-bg-secondary border-t border-x border-black/10 dark:border-white/10 p-5 max-h-[85vh] overflow-auto',
  header,
  footer,
  zIndex = 50,
  position = 'bottom',
  children,
}: ModalSheetProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  // Сохраняем фокус-элемент при открытии и возвращаем при закрытии
  useEffect(() => {
    if (!open) return;
    previouslyFocused.current = document.activeElement as HTMLElement;
    // Стартовый автофокус — на первый focusable внутри
    const t = setTimeout(() => {
      const focusable = dialogRef.current?.querySelector<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      focusable?.focus();
    }, 30);
    return () => {
      clearTimeout(t);
      previouslyFocused.current?.focus?.();
    };
  }, [open]);

  // ESC-обработчик
  useEffect(() => {
    if (!open || !closeOnEsc) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, closeOnEsc, onClose]);

  // Блокируем скролл body пока модалка открыта
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Focus-trap: при Tab/Shift+Tab держим фокус в модалке
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const root = dialogRef.current;
      if (!root) return;
      const focusables = root.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement as HTMLElement;
      if (e.shiftKey) {
        if (active === first || !root.contains(active)) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (active === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={() => {
            if (!preventBackdropClose) onClose();
          }}
          className={`fixed inset-0 bg-black/70 flex justify-center ${
            position === 'center' ? 'items-center p-4' : 'items-end'
          }`}
          style={{ zIndex }}
        >
          <motion.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-label={
              typeof title === 'string' ? title : ariaLabel
            }
            initial={position === 'center' ? { y: 20, opacity: 0 } : { y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={position === 'center' ? { y: 20, opacity: 0 } : { y: 40, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
            className={className}
          >
            {header ?? (
              (title || subtitle) && (
                <div className="flex items-center justify-between mb-4">
                  <div>
                    {subtitle && (
                      <div className="text-xs text-text-tertiary uppercase tracking-wider">
                        {subtitle}
                      </div>
                    )}
                    {title && <div className="text-lg font-medium">{title}</div>}
                  </div>
                  <button
                    onClick={onClose}
                    aria-label="Закрыть"
                    title="Закрыть"
                    className="w-9 h-9 rounded-full bg-black/40 border border-black/15 dark:border-white/15 text-text-primary flex items-center justify-center focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/70 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-secondary"
                  >
                    <X size={16} aria-hidden="true" />
                  </button>
                </div>
              )
            )}
            {children}
            {footer}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
