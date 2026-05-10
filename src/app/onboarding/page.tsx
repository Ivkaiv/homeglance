'use client';

import { useEffect, useState } from 'react';
import { nav } from '@/lib/ingress/nav';
import { motion } from 'framer-motion';
import { ChevronRight, Key, Globe, ExternalLink } from 'lucide-react';
import { useConnection } from '@/lib/ha/ConnectionProvider';
import { useT } from '@/lib/i18n/I18nProvider';

export default function OnboardingPage() {
  const t = useT();
  const { connectTo } = useConnection();
  const [url, setUrl] = useState('');
  const [token, setToken] = useState('');

  // Под HA Ingress URL уже известен — это origin, на котором работает сам
  // HA. Подставляем автоматически, чтобы пользователю не пришлось искать
  // и копировать. Под прямым доступом поле остаётся пустым.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const isIngress = window.location.pathname.includes('/api/hassio_ingress/');
    if (isIngress) setUrl(window.location.origin);
  }, []);
  const [step, setStep] = useState<'welcome' | 'connect' | 'help'>('welcome');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function tryConnect() {
    setError('');
    setBusy(true);
    try {
      const cleanUrl = url.trim().replace(/\/$/, '');
      if (!cleanUrl.match(/^https?:\/\//)) {
        throw new Error(t('onboarding.error.invalidUrlScheme'));
      }
      if (!token.trim()) {
        throw new Error(t('onboarding.error.tokenRequired'));
      }

      // Проверяем подключение через WebSocket (CORS не применяется к WS-handshake).
      // Это позволяет подключаться к HA из standalone-инсталляции без CORS-настроек.
      const wsUrl = cleanUrl.replace(/^http/, 'ws') + '/api/websocket';
      await new Promise<void>((resolve, reject) => {
        let settled = false;
        const ws = new WebSocket(wsUrl);
        const timeout = setTimeout(() => {
          if (settled) return;
          settled = true;
          try { ws.close(); } catch {}
          reject(new Error(t('onboarding.error.timeout')));
        }, 8000);

        ws.onmessage = (ev) => {
          if (settled) return;
          try {
            const msg = JSON.parse(ev.data);
            if (msg.type === 'auth_required') {
              ws.send(JSON.stringify({ type: 'auth', access_token: token.trim() }));
            } else if (msg.type === 'auth_ok') {
              settled = true;
              clearTimeout(timeout);
              try { ws.close(); } catch {}
              resolve();
            } else if (msg.type === 'auth_invalid') {
              settled = true;
              clearTimeout(timeout);
              try { ws.close(); } catch {}
              reject(new Error(t('onboarding.error.invalidToken')));
            }
          } catch {}
        };

        ws.onerror = () => {
          if (settled) return;
          settled = true;
          clearTimeout(timeout);
          reject(new Error(t('onboarding.error.connect')));
        };
      });

      connectTo(cleanUrl, token.trim());
      nav('/');
    } catch (e: any) {
      setError(e.message || String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-md"
      >
        {step === 'welcome' && (
          <div className="glass p-8 text-center">
            <div className="text-6xl mb-4">✨</div>
            <h1 className="text-3xl font-light mb-2">{t('common.appName')}</h1>
            <p className="text-text-secondary text-sm mb-8">
              {t('onboarding.welcome.subtitle')}
            </p>
            <button
              onClick={() => setStep('connect')}
              className="w-full px-5 py-3 rounded-full bg-accent/20 border border-accent/40 text-accent flex items-center justify-center gap-2 hover:bg-accent/30 transition"
            >
              {t('onboarding.welcome.connectButton')} <ChevronRight size={16} />
            </button>
          </div>
        )}

        {step === 'connect' && (
          <div className="glass p-6">
            <h2 className="text-xl font-medium mb-1">{t('onboarding.connect.title')}</h2>
            <p className="text-text-secondary text-xs mb-5">
              {t('onboarding.connect.subtitle')}
            </p>

            <div className="space-y-4">
              <Field label={t('onboarding.haUrl.label')} icon={<Globe size={14} />}>
                <input
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="http://homeassistant.local:8123"
                  className="w-full px-3 py-2.5 rounded-md bg-white/5 border border-white/10 text-text-primary text-sm"
                  autoCorrect="off"
                  autoCapitalize="off"
                />
              </Field>

              <Field label={t('onboarding.token.label')} icon={<Key size={14} />}>
                <input
                  type="password"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="eyJ0eXAiOiJKV1QiLC..."
                  className="w-full px-3 py-2.5 rounded-md bg-white/5 border border-white/10 text-text-primary text-sm font-mono"
                />
                <button
                  type="button"
                  onClick={() => setStep('help')}
                  className="text-xs text-text-tertiary mt-1.5 underline hover:text-text-secondary inline-flex items-center gap-1"
                >
                  {t('onboarding.token.howTo')} <ExternalLink size={11} />
                </button>
              </Field>

              {error && (
                <div className="text-xs text-red-300 bg-red-500/10 border border-red-300/20 rounded-md px-3 py-2">
                  {error}
                </div>
              )}

              <button
                onClick={tryConnect}
                disabled={busy}
                className="w-full px-5 py-3 rounded-full bg-accent/20 border border-accent/40 text-accent flex items-center justify-center gap-2 hover:bg-accent/30 transition disabled:opacity-40"
              >
                {busy ? t('onboarding.connect.busy') : t('onboarding.connect.button')}
              </button>
            </div>
          </div>
        )}

        {step === 'help' && (
          <div className="glass p-6">
            <h2 className="text-xl font-medium mb-1">{t('onboarding.help.title')}</h2>
            <p className="text-text-secondary text-xs mb-5">
              {t('onboarding.help.subtitle')}
            </p>

            <ol className="space-y-3 text-sm">
              {[1, 2, 3, 4].map((n) => (
                <li key={n} className="flex gap-3">
                  <span className="shrink-0 w-6 h-6 rounded-full bg-accent/20 text-accent flex items-center justify-center text-xs font-medium">
                    {n}
                  </span>
                  <div>{t(`onboarding.help.step${n}`)}</div>
                </li>
              ))}
            </ol>

            <button
              onClick={() => setStep('connect')}
              className="mt-6 w-full px-5 py-3 rounded-full glass text-sm hover:bg-white/10 transition"
            >
              {t('onboarding.help.back')}
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}

function Field({
  label,
  icon,
  children,
}: {
  label: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="text-xs text-text-secondary mb-1.5 inline-flex items-center gap-1.5">
        {icon} {label}
      </div>
      {children}
    </label>
  );
}
