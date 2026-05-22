'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Lock } from 'lucide-react';
import { useProfiles } from '@/lib/profiles/ProfilesProvider';
import type { Profile } from '@/lib/profiles/types';
import { verifyPin } from '@/lib/profiles/storage';
import { ProfileEditor } from './ProfileEditor';
import { useT } from '@/lib/i18n/I18nProvider';

/**
 * Полноэкранный picker профилей. Показывается когда нет активного.
 * Если профилей нет вообще — открывает онбординг (форма создания первого).
 */
export function ProfilePicker() {
  const t = useT();
  const { profiles, setActiveId } = useProfiles();
  const [creating, setCreating] = useState(profiles.length === 0);
  const [pinFor, setPinFor] = useState<Profile | null>(null);

  function pick(p: Profile) {
    if (p.pinHash) {
      setPinFor(p);
    } else {
      setActiveId(p.id);
    }
  }

  if (creating) {
    return (
      <ProfileEditor
        title={profiles.length === 0 ? t('dlg.profilePicker.welcome') : t('dlg.profilePicker.newProfile')}
        subtitle={profiles.length === 0 ? t('dlg.profilePicker.welcomeSub') : ''}
        onCancel={profiles.length === 0 ? undefined : () => setCreating(false)}
      />
    );
  }

  if (pinFor) {
    return (
      <PinPrompt
        profile={pinFor}
        onCancel={() => setPinFor(null)}
        onSuccess={() => setActiveId(pinFor.id)}
      />
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md text-center"
      >
        <div className="text-6xl mb-3">✨</div>
        <h1 className="text-3xl font-light mb-2">Glance</h1>
        <p className="text-text-secondary text-sm mb-8">{t('dlg.profilePicker.choose')}</p>

        <div className="grid grid-cols-2 gap-3">
          {profiles.map((p) => (
            <motion.button
              key={p.id}
              whileTap={{ scale: 0.96 }}
              whileHover={{ scale: 1.02 }}
              onClick={() => pick(p)}
              className="glass p-5 flex flex-col items-center gap-2 hover:bg-black/10 dark:hover:bg-white/10 transition"
            >
              <div className="text-5xl">{p.avatar}</div>
              <div className="font-medium text-sm flex items-center gap-1.5">
                {p.name}
                {p.pinHash && <Lock size={11} className="text-text-tertiary" />}
              </div>
            </motion.button>
          ))}

          <motion.button
            whileTap={{ scale: 0.96 }}
            whileHover={{ scale: 1.02 }}
            onClick={() => setCreating(true)}
            className="glass p-5 flex flex-col items-center justify-center gap-2 hover:bg-black/10 dark:hover:bg-white/10 transition border-dashed border-black/20 dark:border-white/20"
          >
            <Plus size={32} className="text-text-secondary" />
            <div className="text-xs text-text-secondary">{t('dlg.profilePicker.new')}</div>
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}

function PinPrompt({
  profile,
  onCancel,
  onSuccess,
}: {
  profile: Profile;
  onCancel: () => void;
  onSuccess: () => void;
}) {
  const t = useT();
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  async function check() {
    if (!profile.pinHash) {
      onSuccess();
      return;
    }
    const ok = await verifyPin(pin, profile.pinHash);
    if (ok) onSuccess();
    else {
      setError(t('dlg.pin.wrong'));
      setPin('');
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="glass p-8 max-w-sm w-full text-center"
      >
        <div className="text-6xl mb-3">{profile.avatar}</div>
        <div className="text-lg font-medium mb-1">{profile.name}</div>
        <div className="text-xs text-text-secondary mb-5">{t('dlg.profilePicker.enterPin')}</div>

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
          onKeyDown={(e) => e.key === 'Enter' && check()}
          className="w-full px-3 py-3 rounded-md bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-text-primary text-center text-2xl tracking-widest font-mono"
          placeholder="••••"
        />

        {error && <div className="text-xs text-red-300 mt-2">{error}</div>}

        <div className="flex gap-2 mt-5">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-text-secondary text-sm"
          >
            {t('common.back')}
          </button>
          <button
            onClick={check}
            disabled={pin.length < 4}
            className="flex-1 px-4 py-2.5 rounded-xl bg-accent/20 border border-accent/40 text-accent text-sm disabled:opacity-40"
          >
            {t('common.signIn')}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
