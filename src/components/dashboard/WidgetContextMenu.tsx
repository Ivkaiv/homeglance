'use client';

import { useEffect, useRef } from 'react';
import { Settings, Trash2, Copy } from 'lucide-react';
import { useT } from '@/lib/i18n/I18nProvider';

interface MenuItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  variant?: 'default' | 'danger';
  onClick: () => void;
}

/**
 * Контекстное меню для виджета — popup, появляющийся в точке long-press.
 * Закрывается по клику снаружи или по escape.
 */
export function WidgetContextMenu({
  x,
  y,
  onClose,
  onConfigure,
  onDelete,
  onDuplicate,
}: {
  x: number;
  y: number;
  onClose: () => void;
  onConfigure: () => void;
  onDelete: () => void;
  onDuplicate?: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const t = useT();

  useEffect(() => {
    function onDoc(e: MouseEvent | TouchEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('touchstart', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('touchstart', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  // Корректируем позицию, чтобы не вылазило за viewport
  const items: MenuItem[] = [
    {
      id: 'configure',
      label: t('dlg.menu.configure'),
      icon: <Settings size={14} aria-hidden="true" />,
      onClick: onConfigure,
    },
    ...(onDuplicate
      ? [{
          id: 'duplicate',
          label: t('dlg.menu.duplicate'),
          icon: <Copy size={14} aria-hidden="true" />,
          onClick: onDuplicate,
        }]
      : []),
    {
      id: 'delete',
      label: t('common.delete'),
      icon: <Trash2 size={14} aria-hidden="true" />,
      variant: 'danger',
      onClick: onDelete,
    },
  ];

  // Меню должно появиться над пальцем (чтобы не быть закрытым им).
  // Если палец в верхней трети экрана — кладём ниже, иначе выше.
  const W = 220;
  const H = items.length * 44 + 8;
  const FINGER_OFFSET = 18;
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1024;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 768;

  const placeAbove = y > vh / 3;
  let top = placeAbove ? y - H - FINGER_OFFSET : y + FINGER_OFFSET;
  if (top < 8) top = 8;
  if (top + H + 8 > vh) top = vh - H - 8;

  let left = x - W / 2;
  if (left < 8) left = 8;
  if (left + W + 8 > vw) left = vw - W - 8;

  return (
    <>
      {/* Полупрозрачный backdrop — не только перехватывает клики, но и
          визуально гасит остальной интерфейс, чтобы меню сразу бросалось в глаза. */}
      <div
        className="fixed inset-0 z-40 bg-black/30 dark:bg-black/50 page-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={ref}
        role="menu"
        className="fixed z-50 rounded-2xl bg-bg-secondary border border-accent/40 shadow-2xl py-1 page-fade-in"
        style={{ left, top, width: W, boxShadow: '0 0 32px rgba(52,211,153,0.25), 0 8px 24px rgba(0,0,0,0.4)' }}
      >
        {items.map((it) => (
          <button
            key={it.id}
            role="menuitem"
            onClick={() => {
              it.onClick();
              onClose();
            }}
            className={`w-full text-left px-3 py-2.5 flex items-center gap-2.5 text-sm hover:bg-black/5 dark:hover:bg-white/5 ${
              it.variant === 'danger' ? 'text-red-500 dark:text-red-400' : 'text-text-primary'
            }`}
          >
            <span className={it.variant === 'danger' ? 'text-red-500 dark:text-red-400' : 'text-text-secondary'}>
              {it.icon}
            </span>
            <span>{it.label}</span>
          </button>
        ))}
      </div>
    </>
  );
}
