'use client';

import { useEffect, useState } from 'react';
import { Cloud, CloudDownload, CloudUpload, AlertTriangle, Check } from 'lucide-react';
import { useConnection } from '@/lib/ha/ConnectionProvider';
import { useT } from '@/lib/i18n/I18nProvider';
import {
  loadProfiles,
  saveProfiles,
} from '@/lib/profiles/storage';
import { loadPages, savePages } from '@/lib/pages/storage';
import {
  pushSnapshot,
  pullSnapshot,
  type ProfilePagesPair,
} from '@/lib/sync/ha-sync';

const LAST_SYNC_KEY = 'glance:sync:lastSyncedAt';

type State =
  | { kind: 'idle' }
  | { kind: 'busy' }
  | { kind: 'success'; text: string }
  | { kind: 'error'; text: string };

export function SyncSection() {
  const t = useT();
  const { client, isReady } = useConnection();
  const [state, setState] = useState<State>({ kind: 'idle' });
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);

  useEffect(() => {
    if (typeof localStorage === 'undefined') return;
    setLastSyncedAt(localStorage.getItem(LAST_SYNC_KEY));
  }, []);

  function markSynced() {
    const now = new Date().toISOString();
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(LAST_SYNC_KEY, now);
    }
    setLastSyncedAt(now);
  }

  async function doPush() {
    if (!isReady) {
      setState({ kind: 'error', text: t('settings.sync.error.notConnected') });
      return;
    }
    setState({ kind: 'busy' });
    try {
      // Тащим текущее состояние с локального API: сначала профили, потом
      // их страницы. Если профилей много — параллелим запросы.
      const profiles = await loadProfiles();
      const pagesByProfile: ProfilePagesPair[] = await Promise.all(
        profiles.map(async (p) => ({ profileId: p.id, pages: await loadPages(p.id) }))
      );
      await pushSnapshot(client, profiles, pagesByProfile);
      markSynced();
      setState({ kind: 'success', text: t('settings.sync.success.push') });
    } catch (e) {
      setState({
        kind: 'error',
        text: t('settings.sync.error.generic', { message: errorMessage(e) }),
      });
    }
  }

  async function doPull() {
    if (!isReady) {
      setState({ kind: 'error', text: t('settings.sync.error.notConnected') });
      return;
    }
    if (!confirm(t('settings.sync.confirmPull'))) return;
    setState({ kind: 'busy' });
    try {
      const snap = await pullSnapshot(client);
      if (!snap) {
        setState({ kind: 'error', text: t('settings.sync.error.empty') });
        return;
      }
      // Сохраняем профили целиком, потом — страницы для каждого профиля.
      await saveProfiles(snap.profiles);
      for (const pair of snap.pagesByProfile) {
        await savePages(pair.profileId, pair.pages);
      }
      markSynced();
      setState({ kind: 'success', text: t('settings.sync.success.pull') });
    } catch (e) {
      setState({
        kind: 'error',
        text: t('settings.sync.error.generic', { message: errorMessage(e) }),
      });
    }
  }

  return (
    <div className="text-sm">
      <p className="text-xs text-text-tertiary leading-relaxed mb-3">
        {t('settings.sync.description')}
      </p>

      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={doPush}
          disabled={!isReady || state.kind === 'busy'}
          className="px-3 py-2.5 rounded-xl bg-accent/20 border border-accent/40 text-accent text-sm flex items-center justify-center gap-1.5 hover:bg-accent/30 disabled:opacity-40 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/70"
        >
          <CloudUpload size={14} aria-hidden="true" /> {t('settings.sync.push')}
        </button>
        <button
          onClick={doPull}
          disabled={!isReady || state.kind === 'busy'}
          className="px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-text-secondary text-sm flex items-center justify-center gap-1.5 hover:bg-white/10 disabled:opacity-40 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/70"
        >
          <CloudDownload size={14} aria-hidden="true" /> {t('settings.sync.pull')}
        </button>
      </div>

      <div className="text-xs text-text-tertiary mt-3 flex items-center gap-1.5">
        <Cloud size={12} aria-hidden="true" />
        {t('settings.sync.lastSynced', { time: formatRelative(lastSyncedAt, t) })}
      </div>

      {state.kind !== 'idle' && (
        <div
          role="status"
          className={`mt-3 text-xs px-3 py-2 rounded-lg border flex items-center gap-2 ${
            state.kind === 'success'
              ? 'text-emerald-300 bg-emerald-500/10 border-emerald-300/20'
              : state.kind === 'error'
                ? 'text-red-300 bg-red-500/10 border-red-300/20'
                : 'text-text-secondary bg-white/5 border-white/10'
          }`}
        >
          {state.kind === 'success' && <Check size={12} aria-hidden="true" />}
          {state.kind === 'error' && <AlertTriangle size={12} aria-hidden="true" />}
          <span>{state.kind === 'busy' ? t('settings.sync.busy') : state.text}</span>
        </div>
      )}
    </div>
  );
}

function errorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  return String(e);
}

function formatRelative(iso: string | null, t: ReturnType<typeof useT>): string {
  if (!iso) return t('settings.sync.never');
  const ts = Date.parse(iso);
  if (!Number.isFinite(ts)) return t('settings.sync.never');
  const diffMin = Math.floor((Date.now() - ts) / 60000);
  if (diffMin < 1) return t('settings.sync.justNow');
  if (diffMin < 60) return t('settings.sync.minutesAgo', { n: diffMin });
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return t('settings.sync.hoursAgo', { n: diffH });
  return t('settings.sync.daysAgo', { n: Math.floor(diffH / 24) });
}
