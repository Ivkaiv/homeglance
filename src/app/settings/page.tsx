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
import { PinPrompt } from '@/components/security/PinPrompt';
import type { HAConnection } from '@/lib/ha/types';

export default function SettingsPage() {
  const router = useRouter();
  const { mode, setMode, effective } = useTheme();
  const { forget } = useConnection();
  const { enabled: securityEnabled } = useSecurity();
  const [conn, setConn] = useState<HAConnection | null>(null);
  const [pinPromptOpen, setPinPromptOpen] = useState(false);

  useEffect(() => {
    loadConnection().then(setConn).catch(() => setConn(null));
  }, []);

  async function disconnect() {
    if (!confirm('Отключить от Home Assistant? Это сбросит подключение для ВСЕХ устройств. Раскладки сохранятся.')) {
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
        <Link href="/" className="text-text-secondary hover:text-text-primary inline-flex items-center gap-1 text-sm">
          <ChevronLeft size={18} /> Главная
        </Link>
        <h1 className="text-base font-medium ml-2">⚙️ Настройки</h1>
      </header>

      <main className="max-w-xl mx-auto p-4 sm:p-6 flex flex-col gap-5">
        <Section title="Тема">
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
                {m === 'light' && '☀️ Светлая'}
                {m === 'dark' && '🌙 Тёмная'}
                {m === 'auto' && '🌗 Авто'}
              </button>
            ))}
          </div>
          <div className="text-xs text-text-tertiary mt-2">
            Сейчас применена: <strong>{effective}</strong>
            {mode === 'auto' && ' (по системе)'}
          </div>
        </Section>

        <Section title="Защита">
          <SecurityStatus />
        </Section>

        <Section title="Home Assistant">
          {conn ? (
            <>
              <div className="text-sm">
                <div className="text-text-tertiary text-xs">URL</div>
                <div className="font-mono text-xs break-all">{conn.url}</div>
              </div>
              <div className="text-sm mt-3">
                <div className="text-text-tertiary text-xs">Token</div>
                <div className="font-mono text-xs">{conn.token.slice(0, 12)}…{conn.token.slice(-8)}</div>
              </div>
              <button
                onClick={disconnect}
                className="mt-4 w-full px-4 py-2.5 rounded-xl bg-red-500/15 border border-red-300/25 text-red-200 text-sm flex items-center justify-center gap-2"
              >
                <RotateCcw size={14} /> Отключить и настроить заново
                {securityEnabled && <Lock size={12} />}
              </button>
            </>
          ) : (
            <button
              onClick={() => router.push('/onboarding')}
              className="w-full px-4 py-2.5 rounded-xl bg-accent/20 border border-accent/40 text-accent text-sm"
            >
              Подключить Home Assistant
            </button>
          )}
        </Section>

        <Section title="О панели">
          <div className="text-xs text-text-secondary leading-relaxed">
            <p>
              <strong>Glance v0.1.0-alpha.0</strong> — modern, mobile-first dashboard для Home Assistant.
            </p>
            <p className="mt-2">
              Проект open-source, MIT license. Никаких изменений в HA не вносит — общается только
              через стандартный API.
            </p>
            <p className="mt-2 text-text-tertiary">
              На этом этапе доступен только базовый каркас. Виджеты, страницы и редактирование появятся
              в следующих фазах разработки.
            </p>
          </div>
        </Section>
      </main>

      {pinPromptOpen && (
        <PinPrompt
          title="Подтверди отключение"
          description="Введи PIN администратора, чтобы отключить Home Assistant"
          onConfirm={doDisconnect}
          onCancel={() => setPinPromptOpen(false)}
        />
      )}
    </div>
  );
}

function SecurityStatus() {
  const { enabled } = useSecurity();
  const { active } = useProfiles();
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
            ? `Защита включена — действует PIN профиля «${active?.name}». Удаление профиля и отключение HA требуют его ввода.`
            : `Защита выключена. У профиля «${active?.name ?? '—'}» нет PIN, поэтому удаление и отключение работают без подтверждения.`}
        </span>
      </div>
      <div className="text-xs text-text-tertiary mt-3">
        Чтобы задать или сменить PIN, нажми на свой аватар в правом верхнем углу
        → выйди из профиля → выбери профиль на экране входа и в его карточке нажми
        иконку 🔒. PIN — общий для входа в профиль и для подтверждения опасных
        действий.
      </div>
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
