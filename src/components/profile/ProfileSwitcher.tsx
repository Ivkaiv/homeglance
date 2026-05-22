'use client';

import { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { LogOut, Trash2, Lock, KeyRound } from 'lucide-react';
import { useProfiles } from '@/lib/profiles/ProfilesProvider';
import { useSecurity } from '@/lib/security/SecurityProvider';
import { PinPrompt } from '@/components/security/PinPrompt';
import { ProfilePinPrompt } from './ProfilePinPrompt';
import { ChangePinDialog } from './ChangePinDialog';
import type { Profile } from '@/lib/profiles/types';
import { useT } from '@/lib/i18n/I18nProvider';

export function ProfileSwitcher() {
  const t = useT();
  const { active, profiles, signOut, deleteProfile, setActiveId } = useProfiles();
  const { enabled: securityEnabled } = useSecurity();
  const [open, setOpen] = useState(false);
  const [pinPromptOpen, setPinPromptOpen] = useState(false);
  /** Целевой профиль для переключения — требует ввода его PIN. */
  const [switchTarget, setSwitchTarget] = useState<Profile | null>(null);
  /** Открыт диалог смены PIN активного профиля. */
  const [changePinOpen, setChangePinOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);

  if (!active) return null;

  const handleDelete = () => {
    if (
      !confirm(t('dlg.profileSwitcher.deleteConfirm', { name: active.name }))
    ) {
      return;
    }
    setOpen(false);
    if (securityEnabled) {
      setPinPromptOpen(true);
    } else {
      deleteProfile(active.id);
    }
  };

  return (
    <>
      <motion.button
        ref={btnRef}
        whileTap={{ scale: 0.95 }}
        onClick={() => setOpen((v) => !v)}
        className="w-9 h-9 rounded-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 flex items-center justify-center text-lg hover:bg-black/10 dark:hover:bg-white/10 transition"
        title={active.name}
      >
        {active.avatar}
      </motion.button>

      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {open && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
                {/* Привязываем меню к ВЕРХНЕМУ ПРАВОМУ углу viewport через top+right.
                    Никаких вычислений по позиции кнопки — меньше шансов уехать. */}
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.96 }}
                  transition={{ duration: 0.15 }}
                  className="rounded-2xl bg-bg-secondary border border-black/10 dark:border-white/10 shadow-2xl p-2"
                  style={{
                    position: 'fixed',
                    top: 'calc(env(safe-area-inset-top, 0px) + 60px)',
                    right: '8px',
                    left: 'auto',
                    width: 'min(16rem, calc(100vw - 16px))',
                    maxWidth: 'calc(100vw - 16px)',
                    zIndex: 50,
                  }}
                >
                  <div className="px-3 py-2 mb-1 border-b border-black/5 dark:border-white/5">
                    <div className="text-xs text-text-tertiary uppercase tracking-wider">
                      {t('dlg.profileSwitcher.heading')}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-2xl">{active.avatar}</span>
                      <span className="font-medium text-sm">{active.name}</span>
                    </div>
                  </div>

                  {profiles.filter((p) => p.id !== active.id).length > 0 && (
                    <>
                      <div className="text-[10px] uppercase tracking-wider text-text-tertiary px-3 py-1.5">
                        {t('dlg.profileSwitcher.switch')}
                      </div>
                      {profiles
                        .filter((p) => p.id !== active.id)
                        .map((p) => (
                          <button
                            key={p.id}
                            onClick={() => {
                              setOpen(false);
                              if (p.pinHash) {
                                // У целевого профиля есть PIN — спрашиваем его
                                // перед переключением, иначе любой, кто залогинен
                                // в один профиль, мог бы зайти в любой другой
                                // без знания его пароля.
                                setSwitchTarget(p);
                              } else {
                                setActiveId(p.id);
                              }
                            }}
                            className="w-full px-3 py-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 flex items-center gap-2 text-sm"
                          >
                            <span className="text-xl">{p.avatar}</span>
                            <span className="flex-1 text-left">{p.name}</span>
                            {p.pinHash && (
                              <Lock size={11} className="text-text-tertiary" />
                            )}
                          </button>
                        ))}
                    </>
                  )}

                  <div className="border-t border-black/5 dark:border-white/5 mt-1 pt-1">
                    <button
                      onClick={() => {
                        setOpen(false);
                        setChangePinOpen(true);
                      }}
                      className="w-full px-3 py-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 flex items-center gap-2 text-sm text-text-secondary"
                    >
                      <KeyRound size={14} />
                      {active.pinHash ? t('dlg.profileSwitcher.changePin') : t('dlg.profileSwitcher.setPin')}
                      {active.pinHash && (
                        <Lock size={11} className="ml-auto opacity-60" />
                      )}
                    </button>
                    <button
                      onClick={() => {
                        setOpen(false);
                        signOut();
                      }}
                      className="w-full px-3 py-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 flex items-center gap-2 text-sm text-text-secondary"
                    >
                      <LogOut size={14} /> {t('dlg.profileSwitcher.signOut')}
                    </button>
                    <button
                      onClick={handleDelete}
                      className="w-full px-3 py-2 rounded-lg hover:bg-red-500/10 flex items-center gap-2 text-sm text-red-300/85"
                    >
                      <Trash2 size={14} /> {t('dlg.profileSwitcher.delete')}
                      {securityEnabled && (
                        <Lock size={11} className="ml-auto opacity-60" />
                      )}
                    </button>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>,
          document.body
        )}

      {pinPromptOpen && (
        <PinPrompt
          title={t('dlg.profileSwitcher.deleteTitle')}
          description={t('dlg.profileSwitcher.deletePinDesc', { name: active.name })}
          onConfirm={() => deleteProfile(active.id)}
          onCancel={() => setPinPromptOpen(false)}
        />
      )}

      {switchTarget && (
        <ProfilePinPrompt
          profile={switchTarget}
          title={t('dlg.profileSwitcher.switchTitle', { name: switchTarget.name })}
          onCancel={() => setSwitchTarget(null)}
          onSuccess={() => {
            const targetId = switchTarget.id;
            setSwitchTarget(null);
            setActiveId(targetId);
          }}
        />
      )}

      {changePinOpen && (
        <ChangePinDialog profile={active} onClose={() => setChangePinOpen(false)} />
      )}
    </>
  );
}
