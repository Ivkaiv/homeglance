'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Lock } from 'lucide-react';
import { useSecurity } from '@/lib/security/SecurityProvider';

/**
 * Модалка ввода PIN перед опасным действием. Если защита выключена —
 * onConfirm() вызывается сразу, модалка не показывается.
 *
 * Используется так:
 *   const ask = useAdminConfirm();
 *   await ask('Удалить профиль?', () => deleteProfile());
 */
export function PinPrompt({
  title,
  description,
  onConfirm,
  onCancel,
}: {
  title: string;
  description?: string;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}) {
  const { verifyPin } = useSecurity();
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (typeof document === 'undefined') return null;

  const submit = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const ok = await verifyPin(pin);
      if (!ok) {
        setError('Неверный PIN');
        setPin('');
        setBusy(false);
        return;
      }
      await onConfirm();
      onCancel();
    } finally {
      setBusy(false);
    }
  };

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18 }}
        onClick={onCancel}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 90,
          background: 'rgba(0,0,0,0.7)',
          display: 'grid',
          placeItems: 'center',
          padding: '1rem',
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: 10, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.96 }}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-sm rounded-3xl bg-bg-secondary border border-black/10 dark:border-white/10 shadow-2xl p-6"
        >
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <Lock size={18} className="text-amber-400" />
              <div className="text-base font-medium">{title}</div>
            </div>
            <button
              onClick={onCancel}
              className="w-8 h-8 rounded-full bg-black/20 dark:bg-black/40 border border-black/15 dark:border-white/15 text-text-primary text-lg flex items-center justify-center"
            >
              <X size={14} />
            </button>
          </div>

          {description && (
            <div className="text-xs text-text-secondary mb-4">{description}</div>
          )}

          <input
            autoFocus
            type="password"
            inputMode="numeric"
            pattern="[0-9]*"
            placeholder="PIN"
            value={pin}
            onChange={(e) => {
              setPin(e.target.value.replace(/\D/g, '').slice(0, 6));
              setError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && pin.length >= 4) submit();
            }}
            className="w-full px-3 py-2.5 rounded-md bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-text-primary text-center tracking-widest text-xl"
          />

          {error && (
            <div className="mt-2 text-xs text-red-400 text-center">{error}</div>
          )}

          <div className="flex gap-2 mt-5">
            <button
              onClick={onCancel}
              className="flex-1 px-4 py-2.5 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-text-secondary text-sm"
            >
              Отмена
            </button>
            <button
              disabled={pin.length < 4 || busy}
              onClick={submit}
              className="flex-1 px-4 py-2.5 rounded-xl bg-accent/20 border border-accent/40 text-accent text-sm disabled:opacity-40"
            >
              Подтвердить
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}
