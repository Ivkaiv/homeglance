'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Lock, Unlock } from 'lucide-react';
import { verifyPin } from '@/lib/profiles/storage';
import { useProfiles } from '@/lib/profiles/ProfilesProvider';
import type { Profile } from '@/lib/profiles/types';

/**
 * Диалог установки / смены / снятия PIN профиля.
 *
 * - Если PIN уже стоит — требуется текущий PIN для подтверждения владения.
 * - Новый PIN можно оставить пустым → значит «снять защиту».
 * - Новый PIN должен повторяться дважды чтобы избежать опечаток.
 */
export function ChangePinDialog({
  profile,
  onClose,
}: {
  profile: Profile;
  onClose: () => void;
}) {
  const { setProfilePin } = useProfiles();
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [removeMode, setRemoveMode] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (typeof document === 'undefined') return null;

  const hasPin = !!profile.pinHash;

  async function save() {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      // 1. Проверяем текущий PIN (если он установлен).
      if (hasPin) {
        const ok = await verifyPin(currentPin, profile.pinHash!);
        if (!ok) {
          setError('Текущий PIN неверный');
          setCurrentPin('');
          setBusy(false);
          return;
        }
      }

      // 2. Если режим «снять защиту» — pin=null.
      if (removeMode) {
        await setProfilePin(profile.id, null);
        onClose();
        return;
      }

      // 3. Проверяем новый PIN: длина, совпадение.
      if (newPin.length < 4) {
        setError('Новый PIN должен быть не короче 4 цифр');
        setBusy(false);
        return;
      }
      if (newPin !== confirmPin) {
        setError('PIN-коды не совпадают');
        setConfirmPin('');
        setBusy(false);
        return;
      }

      await setProfilePin(profile.id, newPin);
      onClose();
    } finally {
      setBusy(false);
    }
  }

  const title = hasPin
    ? removeMode
      ? `Снять PIN с «${profile.name}»`
      : `Сменить PIN для «${profile.name}»`
    : `Установить PIN для «${profile.name}»`;

  const saveDisabled = busy ||
    (hasPin && currentPin.length < 4) ||
    (!removeMode && (newPin.length < 4 || confirmPin.length < 4));

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18 }}
        onClick={onClose}
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
          <div className="flex items-start justify-between mb-4 gap-2">
            <div className="flex items-center gap-2 min-w-0">
              {removeMode ? (
                <Unlock size={16} className="text-amber-400 shrink-0" />
              ) : (
                <Lock size={16} className="text-amber-400 shrink-0" />
              )}
              <div className="text-sm font-medium truncate">{title}</div>
            </div>
            <button
              onClick={onClose}
              aria-label="Закрыть"
              className="w-8 h-8 rounded-full bg-black/20 dark:bg-black/40 border border-black/15 dark:border-white/15 text-text-primary flex items-center justify-center shrink-0"
            >
              <X size={14} />
            </button>
          </div>

          <div className="flex items-center gap-3 mb-5">
            <div className="text-4xl shrink-0">{profile.avatar}</div>
            <div className="text-xs text-text-secondary">
              {hasPin
                ? removeMode
                  ? 'Профиль станет доступен без PIN — любой, кто откроет Glance, попадёт в него.'
                  : 'Введи текущий PIN, чтобы подтвердить владение, и придумай новый.'
                : 'Защити профиль PIN-кодом — без него никто не сможет в него зайти с других устройств.'}
            </div>
          </div>

          <div className="space-y-3">
            {hasPin && (
              <div>
                <div className="text-[11px] uppercase tracking-wider text-text-tertiary mb-1">
                  Текущий PIN
                </div>
                <input
                  autoFocus
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  value={currentPin}
                  onChange={(e) => {
                    setError('');
                    setCurrentPin(e.target.value.replace(/\D/g, ''));
                  }}
                  placeholder="••••"
                  className="w-full px-3 py-2.5 rounded-md bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-text-primary text-center text-xl tracking-widest font-mono"
                />
              </div>
            )}

            {!removeMode && (
              <>
                <div>
                  <div className="text-[11px] uppercase tracking-wider text-text-tertiary mb-1">
                    Новый PIN (4-6 цифр)
                  </div>
                  <input
                    autoFocus={!hasPin}
                    type="password"
                    inputMode="numeric"
                    maxLength={6}
                    value={newPin}
                    onChange={(e) => {
                      setError('');
                      setNewPin(e.target.value.replace(/\D/g, ''));
                    }}
                    placeholder="••••"
                    className="w-full px-3 py-2.5 rounded-md bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-text-primary text-center text-xl tracking-widest font-mono"
                  />
                </div>
                <div>
                  <div className="text-[11px] uppercase tracking-wider text-text-tertiary mb-1">
                    Ещё раз
                  </div>
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={6}
                    value={confirmPin}
                    onChange={(e) => {
                      setError('');
                      setConfirmPin(e.target.value.replace(/\D/g, ''));
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !saveDisabled) save();
                    }}
                    placeholder="••••"
                    className="w-full px-3 py-2.5 rounded-md bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-text-primary text-center text-xl tracking-widest font-mono"
                  />
                </div>
              </>
            )}
          </div>

          {error && <div className="mt-3 text-xs text-red-300 text-center">{error}</div>}

          {hasPin && (
            <button
              onClick={() => {
                setError('');
                setRemoveMode((v) => !v);
              }}
              className="mt-4 text-[11px] text-text-tertiary hover:text-text-secondary underline underline-offset-2"
            >
              {removeMode ? '← Я хочу сменить PIN, а не снять' : 'Снять PIN с профиля'}
            </button>
          )}

          <div className="flex gap-2 mt-5">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-text-secondary text-sm"
            >
              Отмена
            </button>
            <button
              onClick={save}
              disabled={saveDisabled}
              className={`flex-1 px-4 py-2.5 rounded-xl border text-sm disabled:opacity-40 ${
                removeMode
                  ? 'bg-red-500/15 border-red-400/40 text-red-300'
                  : 'bg-accent/20 border-accent/40 text-accent'
              }`}
            >
              {removeMode ? 'Снять' : hasPin ? 'Сменить' : 'Установить'}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}
