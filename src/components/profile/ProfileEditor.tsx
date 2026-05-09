'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useProfiles } from '@/lib/profiles/ProfilesProvider';

const DEFAULT_AVATARS = ['👤', '🧑', '👨', '👩', '🧒', '👶', '👴', '👵', '🐱', '🐶', '🦊', '🐼', '🤖', '👾', '🦄', '🌟'];

export function ProfileEditor({
  title,
  subtitle,
  onCancel,
}: {
  title: string;
  subtitle?: string;
  onCancel?: () => void;
}) {
  const { addProfile } = useProfiles();
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState('👤');
  const [pin, setPin] = useState('');
  const [usePin, setUsePin] = useState(false);
  const [busy, setBusy] = useState(false);

  async function create() {
    if (!name.trim()) return;
    setBusy(true);
    try {
      await addProfile({
        name: name.trim(),
        avatar,
        pin: usePin && pin.length >= 4 ? pin : undefined,
      });
      // Активный профиль выставится автоматически
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="glass p-6 sm:p-8 max-w-md w-full"
      >
        <div className="text-center mb-6">
          <div className="text-5xl mb-2">{avatar}</div>
          <h1 className="text-xl font-medium">{title}</h1>
          {subtitle && <p className="text-text-secondary text-xs mt-1">{subtitle}</p>}
        </div>

        <div className="space-y-4">
          <div>
            <div className="text-xs text-text-secondary mb-1">Имя</div>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Юра, Аня, Гость..."
              className="w-full px-3 py-2.5 rounded-md bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-text-primary"
              autoFocus
            />
          </div>

          <div>
            <div className="text-xs text-text-secondary mb-2">Аватар</div>
            <div className="flex flex-wrap gap-2">
              {DEFAULT_AVATARS.map((a) => (
                <button
                  key={a}
                  onClick={() => setAvatar(a)}
                  className={`w-10 h-10 rounded-full text-2xl flex items-center justify-center transition border ${
                    avatar === a
                      ? 'bg-accent/20 border-accent/40'
                      : 'bg-black/5 dark:bg-white/5 border-black/10 dark:border-white/10 hover:bg-black/10 dark:hover:bg-white/10'
                  }`}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={usePin}
                onChange={(e) => setUsePin(e.target.checked)}
                className="w-4 h-4 accent-emerald-500"
              />
              <span>Защитить PIN-кодом</span>
            </label>
            {usePin && (
              <input
                type="password"
                inputMode="numeric"
                maxLength={6}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                placeholder="4-6 цифр"
                className="w-full mt-2 px-3 py-2.5 rounded-md bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-text-primary text-center text-lg tracking-widest font-mono"
              />
            )}
          </div>
        </div>

        <div className="flex gap-2 mt-6">
          {onCancel && (
            <button
              onClick={onCancel}
              className="flex-1 px-4 py-2.5 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-text-secondary text-sm"
            >
              Отмена
            </button>
          )}
          <button
            onClick={create}
            disabled={!name.trim() || busy || (usePin && pin.length < 4)}
            className="flex-1 px-4 py-2.5 rounded-xl bg-accent/20 border border-accent/40 text-accent text-sm disabled:opacity-40"
          >
            {busy ? '⏳' : 'Создать'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
