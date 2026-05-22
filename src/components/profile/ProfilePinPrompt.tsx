'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Lock } from 'lucide-react';
import { verifyPin } from '@/lib/profiles/storage';
import type { Profile } from '@/lib/profiles/types';
import { useT } from '@/lib/i18n/I18nProvider';

/**
 * Модалка ввода PIN конкретного **профиля** (не путать с security/PinPrompt —
 * тот для админ-действий через общий security-PIN). Используется когда нужно
 * подтвердить владение профилем — вход в профиль, переключение между ними.
 *
 * Если у профиля нет pinHash — onSuccess() вызывается сразу, модалка не
 * рендерится (вызывающий код может рассчитывать на это).
 */
export function ProfilePinPrompt({
  profile,
  title,
  onCancel,
  onSuccess,
}: {
  profile: Profile;
  /** Заголовок модалки. По умолчанию — имя профиля. */
  title?: string;
  onCancel: () => void;
  onSuccess: () => void;
}) {
  const t = useT();
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // Профиль без PIN — пускаем сразу. Это для удобства вызывающего:
  // он не должен сам проверять `pinHash` перед рендером.
  if (!profile.pinHash) {
    onSuccess();
    return null;
  }

  if (typeof document === 'undefined') return null;

  const submit = async () => {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const ok = await verifyPin(pin, profile.pinHash!);
      if (ok) {
        onSuccess();
      } else {
        setError(t('dlg.pin.wrong'));
        setPin('');
      }
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
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-sm rounded-3xl bg-bg-secondary border border-black/10 dark:border-white/10 shadow-2xl p-6"
        >
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-2 min-w-0">
              <Lock size={16} className="text-amber-400 shrink-0" />
              <div className="text-sm font-medium truncate">
                {title || t('dlg.profilePin.title', { name: profile.name })}
              </div>
            </div>
            <button
              onClick={onCancel}
              aria-label={t('common.close')}
              className="w-8 h-8 rounded-full bg-black/20 dark:bg-black/40 border border-black/15 dark:border-white/15 text-text-primary flex items-center justify-center shrink-0"
            >
              <X size={14} />
            </button>
          </div>

          <div className="flex items-center gap-3 mb-4">
            <div className="text-4xl shrink-0">{profile.avatar}</div>
            <div className="text-xs text-text-secondary">
              {t('dlg.profilePin.body')}
            </div>
          </div>

          <input
            autoFocus
            type="password"
            inputMode="numeric"
            maxLength={6}
            value={pin}
            onChange={(e) => {
              setError('');
              setPin(e.target.value.replace(/\D/g, ''));
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && pin.length >= 4) submit();
            }}
            className="w-full px-3 py-3 rounded-md bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-text-primary text-center text-2xl tracking-widest font-mono"
            placeholder="••••"
          />

          {error && <div className="text-xs text-red-300 mt-2 text-center">{error}</div>}

          <div className="flex gap-2 mt-5">
            <button
              onClick={onCancel}
              className="flex-1 px-4 py-2.5 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-text-secondary text-sm"
            >
              {t('common.cancel')}
            </button>
            <button
              onClick={submit}
              disabled={pin.length < 4 || busy}
              className="flex-1 px-4 py-2.5 rounded-xl bg-accent/20 border border-accent/40 text-accent text-sm disabled:opacity-40"
            >
              {t('common.signIn')}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}
