'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ChevronLeft, RotateCcw, Lock, ShieldCheck, ShieldOff } from 'lucide-react';
import { useTheme, ThemeMode } from '@/lib/theme/ThemeProvider';
import { loadConnection } from '@/lib/ha/connection-storage';
import { useConnection } from '@/lib/ha/ConnectionProvider';
import { useProfiles } from '@/lib/profiles/ProfilesProvider';
import { useSecurity } from '@/lib/security/SecurityProvider';
import { useI18n, useT } from '@/lib/i18n/I18nProvider';
import { LOCALES, LOCALE_NAMES, type Locale } from '@/lib/i18n/types';
import { PinPrompt } from '@/components/security/PinPrompt';
import type { HAConnection } from '@/lib/ha/types';

const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? '0.0.0';

export default function SettingsPage() {
  const router = useRouter();
  const t = useT();
  const { mode, setMode, effective } = useTheme();
  const { forget } = useConnection();
  const { enabled: securityEnabled } = useSecurity();
  const [conn, setConn] = useState<HAConnection | null>(null);
  const [pinPromptOpen, setPinPromptOpen] = useState(false);

  useEffect(() => {
    loadConnection().then(setConn).catch(() => setConn(null));
  }, []);

  async function disconnect() {
    if (!confirm(t('settings.connection.confirmDisconnect'))) {
      return;
    }
    if (securityEnabled) {
      setPinPromptOpen(true);
      return;
    }
    await doDisconnect();
  }

  async function doDisconnect() {
    await forget();
    router.push('/onboarding');
  }

  return (
    <div className="min-h-screen pb-12">
      <header className="sticky top-0 z-20 backdrop-blur-md bg-bg-primary/80 border-b border-white/5 px-4 py-3 flex items-center gap-3">
        <Link
          href="/"
          className="text-text-secondary hover:text-text-primary inline-flex items-center gap-1 text-sm"
        >
          <ChevronLeft size={18} /> {t('settings.home')}
        </Link>
        <h1 className="text-base font-medium ml-2">⚙️ {t('settings.title')}</h1>
      </header>

      <main className="max-w-xl mx-auto p-4 sm:p-6 flex flex-col gap-5">
        <Section title={t('settings.theme.title')}>
          <div className="grid grid-cols-3 gap-2">
            {(['light', 'dark', 'auto'] as ThemeMode[]).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`px-4 py-3 rounded-xl text-sm transition border ${
                  mode === m
                    ? 'bg-accent/20 border-accent/40 text-accent'
                    : 'bg-white/5 border-white/10 text-text-secondary hover:bg-white/10'
                }`}
              >
                {t(`settings.theme.${m}`)}
              </button>
            ))}
          </div>
          <div className="text-xs text-text-tertiary mt-2">
            {t('settings.theme.currentlyApplied')}: <strong>{effective}</strong>
            {mode === 'auto' && ` ${t('settings.theme.bySystem')}`}
          </div>
        </Section>

        <Section title={t('settings.language.title')}>
          <LanguageSwitcher />
        </Section>

        <Section title={t('settings.security.title')}>
          <SecurityStatus />
        </Section>

        <Section title={t('settings.connection.title')}>
          {conn ? (
            <>
              <div className="text-sm">
                <div className="text-text-tertiary text-xs">{t('settings.connection.url')}</div>
                <div className="font-mono text-xs break-all">{conn.url}</div>
              </div>
              <div className="text-sm mt-3">
                <div className="text-text-tertiary text-xs">{t('settings.connection.token')}</div>
                <div className="font-mono text-xs">
                  {conn.token.slice(0, 12)}…{conn.token.slice(-8)}
                </div>
              </div>
              <button
                onClick={disconnect}
                className="mt-4 w-full px-4 py-2.5 rounded-xl bg-red-500/15 border border-red-300/25 text-red-200 text-sm flex items-center justify-center gap-2"
              >
                <RotateCcw size={14} /> {t('settings.connection.disconnectAndReconfigure')}
                {securityEnabled && <Lock size={12} />}
              </button>
            </>
          ) : (
            <button
              onClick={() => router.push('/onboarding')}
              className="w-full px-4 py-2.5 rounded-xl bg-accent/20 border border-accent/40 text-accent text-sm"
            >
              {t('settings.connection.connectButton')}
            </button>
          )}
        </Section>

        <Section title={t('settings.about.title')}>
          <div className="text-xs text-text-secondary leading-relaxed">
            <p>{t('settings.about.body1', { version: APP_VERSION })}</p>
            <p className="mt-2">{t('settings.about.body2')}</p>
            <p className="mt-2 text-text-tertiary">{t('settings.about.body3')}</p>
          </div>
        </Section>
      </main>

      {pinPromptOpen && (
        <PinPrompt
          title={t('settings.connection.pinTitle')}
          description={t('settings.connection.pinDescription')}
          onConfirm={doDisconnect}
          onCancel={() => setPinPromptOpen(false)}
        />
      )}
    </div>
  );
}

function LanguageSwitcher() {
  const { locale, setLocale } = useI18n();
  return (
    <div className="grid grid-cols-2 gap-2">
      {LOCALES.map((code) => (
        <button
          key={code}
          onClick={() => setLocale(code as Locale)}
          className={`px-4 py-3 rounded-xl text-sm transition border ${
            locale === code
              ? 'bg-accent/20 border-accent/40 text-accent'
              : 'bg-white/5 border-white/10 text-text-secondary hover:bg-white/10'
          }`}
        >
          {LOCALE_NAMES[code]}
        </button>
      ))}
    </div>
  );
}

function SecurityStatus() {
  const t = useT();
  const { enabled } = useSecurity();
  const { active } = useProfiles();
  const name = active?.name ?? '—';
  return (
    <div className="text-sm">
      <div
        className={`flex items-center gap-2 ${
          enabled ? 'text-emerald-400' : 'text-text-tertiary'
        }`}
      >
        {enabled ? <ShieldCheck size={16} /> : <ShieldOff size={16} />}
        <span>
          {enabled
            ? t('settings.security.enabled', { name })
            : t('settings.security.disabled', { name })}
        </span>
      </div>
      <div className="text-xs text-text-tertiary mt-3">{t('settings.security.changePinHint')}</div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="glass p-5">
      <h2 className="text-xs uppercase tracking-wider text-text-secondary mb-3">{title}</h2>
      {children}
    </section>
  );
}
