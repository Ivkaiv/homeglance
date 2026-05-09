'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ChevronRight, Key, Globe, ExternalLink } from 'lucide-react';
import { useConnection } from '@/lib/ha/ConnectionProvider';

export default function OnboardingPage() {
  const router = useRouter();
  const { connectTo } = useConnection();
  const [url, setUrl] = useState('');
  const [token, setToken] = useState('');
  const [step, setStep] = useState<'welcome' | 'connect' | 'help'>('welcome');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function tryConnect() {
    setError('');
    setBusy(true);
    try {
      const cleanUrl = url.trim().replace(/\/$/, '');
      if (!cleanUrl.match(/^https?:\/\//)) {
        throw new Error('URL должен начинаться с http:// или https://');
      }
      if (!token.trim()) {
        throw new Error('Введи Long-lived access token');
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
          reject(new Error('Таймаут — HA не отвечает по WebSocket. Проверь URL и доступность.'));
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
              reject(new Error('Токен неверный или истёк'));
            }
          } catch {}
        };

        ws.onerror = () => {
          if (settled) return;
          settled = true;
          clearTimeout(timeout);
          reject(new Error('Не удалось подключиться. Проверь URL и доступность HA.'));
        };
      });

      connectTo(cleanUrl, token.trim());
      router.push('/');
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
            <h1 className="text-3xl font-light mb-2">Glance</h1>
            <p className="text-text-secondary text-sm mb-8">
              Современная dashboard-панель для твоего Home Assistant.
              Без YAML, без сложностей.
            </p>
            <button
              onClick={() => setStep('connect')}
              className="w-full px-5 py-3 rounded-full bg-accent/20 border border-accent/40 text-accent flex items-center justify-center gap-2 hover:bg-accent/30 transition"
            >
              Подключить Home Assistant <ChevronRight size={16} />
            </button>
          </div>
        )}

        {step === 'connect' && (
          <div className="glass p-6">
            <h2 className="text-xl font-medium mb-1">Подключение</h2>
            <p className="text-text-secondary text-xs mb-5">
              Введи адрес твоего HA и долго-живущий токен.
            </p>

            <div className="space-y-4">
              <Field label="URL Home Assistant" icon={<Globe size={14} />}>
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

              <Field label="Long-lived access token" icon={<Key size={14} />}>
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
                  Как создать токен? <ExternalLink size={11} />
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
                {busy ? '⏳ Подключаюсь...' : 'Подключить'}
              </button>
            </div>
          </div>
        )}

        {step === 'help' && (
          <div className="glass p-6">
            <h2 className="text-xl font-medium mb-1">Как создать токен</h2>
            <p className="text-text-secondary text-xs mb-5">
              Токен нужен, чтобы Glance общался с твоим HA.
            </p>

            <ol className="space-y-3 text-sm">
              <li className="flex gap-3">
                <span className="shrink-0 w-6 h-6 rounded-full bg-accent/20 text-accent flex items-center justify-center text-xs font-medium">
                  1
                </span>
                <div>
                  Открой свой <strong>Home Assistant</strong>, кликни на свой
                  аватар внизу слева
                </div>
              </li>
              <li className="flex gap-3">
                <span className="shrink-0 w-6 h-6 rounded-full bg-accent/20 text-accent flex items-center justify-center text-xs font-medium">
                  2
                </span>
                <div>
                  Прокрути до раздела <strong>Long-lived access tokens</strong>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="shrink-0 w-6 h-6 rounded-full bg-accent/20 text-accent flex items-center justify-center text-xs font-medium">
                  3
                </span>
                <div>
                  Нажми <strong>CREATE TOKEN</strong>, назови «Glance», скопируй полученный
                  токен
                </div>
              </li>
              <li className="flex gap-3">
                <span className="shrink-0 w-6 h-6 rounded-full bg-accent/20 text-accent flex items-center justify-center text-xs font-medium">
                  4
                </span>
                <div>Вставь его сюда</div>
              </li>
            </ol>

            <button
              onClick={() => setStep('connect')}
              className="mt-6 w-full px-5 py-3 rounded-full glass text-sm hover:bg-white/10 transition"
            >
              ← Назад к подключению
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
