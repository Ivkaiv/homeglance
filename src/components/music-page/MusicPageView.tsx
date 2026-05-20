'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  Volume1,
  VolumeX,
  Speaker,
  Check,
  Search,
  Music,
  Disc3,
  Mic2,
  ListMusic,
} from 'lucide-react';
import { PressButton } from '@/components/ui/PressButton';
import { MarqueeText } from '@/components/ui/MarqueeText';
import { useImageAccent } from '@/lib/useImageAccent';
import {
  useMusic,
  useMAConnection,
  useMAPlayers,
} from '@/lib/music/MusicProvider';
import type { MusicPageConfig } from '@/lib/pages/types';
import type { MAMediaItem, MASearchResults } from '@/lib/music/types';

interface Props {
  config: MusicPageConfig;
  pageTitle: string;
}

const OUTPUT_KEY = 'glance:ma:output';

function fmtTime(sec: number): string {
  if (!isFinite(sec) || sec < 0) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

/**
 * Полноэкранная страница «Музыка» — плеер Music Assistant: что играет,
 * управление, выбор устройства вывода и поиск музыки по медиатеке.
 * Рендерится Dashboard'ом для страниц с kind='music' (как WeatherPageView).
 */
export function MusicPageView({ config, pageTitle }: Props) {
  useMAConnection();
  const { client, status } = useMusic();
  const players = useMAPlayers();

  // Выбранное устройство вывода. Ключ общий с виджетом — настройки совпадают.
  const [savedId, setSavedId] = useState<string | null>(() => {
    if (typeof window === 'undefined') return config.defaultPlayerId ?? null;
    return window.localStorage.getItem(OUTPUT_KEY) ?? config.defaultPlayerId ?? null;
  });
  const selectPlayer = (id: string) => {
    setSavedId(id);
    try {
      window.localStorage.setItem(OUTPUT_KEY, id);
    } catch {
      /* приватный режим */
    }
  };

  const active =
    players.find((p) => p.player_id === savedId) ??
    players.find((p) => p.playback_state === 'playing') ??
    players[0];
  const playerId = active?.player_id;

  // ── Прогресс ───────────────────────────────────────────────────────────
  const playing = active?.playback_state === 'playing';
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(id);
  }, [playing]);

  const media = active?.current_media ?? null;
  const cover = media?.image_url && media.image_url.startsWith('http') ? media.image_url : null;
  const accent = useImageAccent(cover);
  const accentRgb = accent?.match(/\d+/g)?.join(' ') ?? null;
  const accentColor = accentRgb ? `rgb(${accentRgb})` : 'rgb(var(--accent))';
  const accentSoft = (op: number) =>
    accentRgb ? `rgb(${accentRgb} / ${op})` : `rgb(var(--accent) / ${op})`;

  const title = media?.title || 'Ничего не играет';
  const artist = media?.artist || '';
  const duration = media?.duration ?? 0;
  let position = active?.elapsed_time ?? 0;
  if (playing) position += Math.max(0, (now - client.getLastUpdate()) / 1000);
  if (duration > 0) position = Math.min(position, duration);

  const volume = active?.volume_level ?? 0;
  const muted = active?.volume_muted ?? false;
  const run = (fn: () => Promise<unknown>) => {
    fn().catch(() => {});
  };

  // ── Поиск ──────────────────────────────────────────────────────────────
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<MASearchResults | null>(null);
  const [searching, setSearching] = useState(false);

  const doSearch = () => {
    const q = query.trim();
    if (!q) return;
    setSearching(true);
    client
      .search(q)
      .then((r) => setResults(r))
      .catch(() => setResults({ tracks: [], artists: [], albums: [], playlists: [] }))
      .finally(() => setSearching(false));
  };

  const playItem = (item: MAMediaItem) => {
    if (!playerId || !item.uri) return;
    run(() => client.playMedia(playerId, item.uri as string));
  };

  // Плоский список результатов: альбомы и треки — то, что можно сразу включить.
  const flatResults = useMemo(() => {
    if (!results) return [];
    return [
      ...results.albums.map((i) => ({ item: i, kind: 'album' as const })),
      ...results.tracks.map((i) => ({ item: i, kind: 'track' as const })),
      ...results.playlists.map((i) => ({ item: i, kind: 'playlist' as const })),
      ...results.artists.map((i) => ({ item: i, kind: 'artist' as const })),
    ];
  }, [results]);

  return (
    <main key="music-page" className="page-fade-in">
      <div className="max-w-(--breakpoint-md) mx-auto p-4 sm:p-6 flex flex-col gap-5">
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <Music size={24} aria-hidden="true" />
          {pageTitle}
        </h1>

        {players.length === 0 ? (
          <div className="glass p-6 text-center text-text-tertiary text-sm">
            {status === 'connected'
              ? 'Music Assistant не отдаёт устройства.'
              : 'Подключение к Music Assistant…'}
          </div>
        ) : (
          <>
            {/* ── Плеер ── */}
            <div
              className="glass p-5 flex flex-col items-center gap-4"
              style={
                accent
                  ? {
                      background: `radial-gradient(ellipse 80% 60% at 50% 0%, ${accentSoft(0.3)} 0%, transparent 70%), rgb(var(--bg-secondary))`,
                    }
                  : undefined
              }
            >
              {cover ? (
                <img
                  src={cover}
                  alt=""
                  className="w-48 h-48 rounded-2xl object-cover"
                  loading="lazy"
                  style={{ boxShadow: `0 12px 32px ${accentSoft(0.3)}` }}
                />
              ) : (
                <div className="w-48 h-48 rounded-2xl bg-black/10 dark:bg-white/10 flex items-center justify-center text-6xl">
                  🎵
                </div>
              )}
              <div className="text-center w-full min-w-0">
                <MarqueeText className="text-lg font-semibold block w-full">{title}</MarqueeText>
                {artist && (
                  <div className="text-sm text-text-secondary truncate mt-0.5">{artist}</div>
                )}
              </div>

              {/* Прогресс */}
              <div className="w-full">
                <div className="relative h-1.5 w-full rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
                  <div
                    className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-500"
                    style={{
                      width: duration > 0 ? `${Math.min(100, (position / duration) * 100)}%` : '0%',
                      background: accentColor,
                    }}
                  />
                </div>
                <div className="flex justify-between text-xs text-text-tertiary tabular-nums mt-1.5">
                  <span>{duration > 0 ? fmtTime(position) : '—:—'}</span>
                  <span>{duration > 0 ? fmtTime(duration) : '—:—'}</span>
                </div>
              </div>

              {/* Transport */}
              <div className="flex items-center justify-center gap-3">
                <PressButton
                  size={48}
                  ariaLabel="Предыдущий"
                  onClick={() => playerId && run(() => client.previous(playerId))}
                >
                  <SkipBack size={20} aria-hidden="true" />
                </PressButton>
                <PressButton
                  size={64}
                  ariaLabel={playing ? 'Пауза' : 'Воспроизвести'}
                  bg={accentSoft(0.25)}
                  bgPressed={accentSoft(0.45)}
                  onClick={() => playerId && run(() => client.playPause(playerId))}
                >
                  {playing ? (
                    <Pause size={26} aria-hidden="true" />
                  ) : (
                    <Play size={26} aria-hidden="true" />
                  )}
                </PressButton>
                <PressButton
                  size={48}
                  ariaLabel="Следующий"
                  onClick={() => playerId && run(() => client.next(playerId))}
                >
                  <SkipForward size={20} aria-hidden="true" />
                </PressButton>
              </div>

              {/* Громкость */}
              <div className="flex items-center gap-3 w-full">
                <PressButton
                  size={36}
                  ariaLabel={muted ? 'Включить звук' : 'Отключить звук'}
                  onClick={() => playerId && run(() => client.setMute(playerId, !muted))}
                >
                  {muted ? (
                    <VolumeX size={14} aria-hidden="true" />
                  ) : volume < 40 ? (
                    <Volume1 size={14} aria-hidden="true" />
                  ) : (
                    <Volume2 size={14} aria-hidden="true" />
                  )}
                </PressButton>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  value={muted ? 0 : volume}
                  onChange={(ev) =>
                    playerId && run(() => client.setVolume(playerId, Number(ev.target.value)))
                  }
                  aria-label="Громкость"
                  className="no-drag flex-1 min-w-0"
                  style={{ accentColor }}
                />
                <span className="text-xs text-text-tertiary tabular-nums w-10 text-right">
                  {Math.round(muted ? 0 : volume)}%
                </span>
              </div>
            </div>

            {/* ── Выбор выхода ── */}
            <div className="glass p-4">
              <div className="flex items-center gap-2 text-xs font-medium text-text-secondary mb-2">
                <Speaker size={14} aria-hidden="true" />
                <span>Где играть</span>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {players.map((p) => {
                  const selected = p.player_id === playerId;
                  return (
                    <button
                      key={p.player_id}
                      type="button"
                      onClick={() => selectPlayer(p.player_id)}
                      aria-label={`Выход: ${p.name}`}
                      className={`flex items-center gap-2 py-2 px-2.5 rounded-lg text-left transition focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/70 ${
                        selected
                          ? 'bg-black/8 dark:bg-white/10'
                          : 'hover:bg-black/5 dark:hover:bg-white/5'
                      }`}
                    >
                      <Speaker
                        size={15}
                        aria-hidden="true"
                        className="shrink-0"
                        style={selected ? { color: accentColor } : undefined}
                      />
                      <span className="flex-1 min-w-0 truncate text-sm">{p.name}</span>
                      {p.playback_state === 'playing' && !selected && (
                        <span className="text-[10px] text-text-tertiary shrink-0">играет</span>
                      )}
                      {selected && (
                        <Check
                          size={15}
                          aria-hidden="true"
                          className="shrink-0"
                          style={{ color: accentColor }}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ── Поиск музыки ── */}
            <div className="glass p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="flex items-center gap-2 flex-1 min-w-0 px-3 py-2 rounded-lg bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10">
                  <Search size={16} className="text-text-tertiary shrink-0" aria-hidden="true" />
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && doSearch()}
                    placeholder="Найти артиста, альбом, трек…"
                    className="flex-1 min-w-0 bg-transparent text-sm text-text-primary outline-hidden"
                  />
                </div>
                <button
                  type="button"
                  onClick={doSearch}
                  className="px-4 py-2 rounded-lg bg-accent/20 border border-accent/40 text-accent text-sm shrink-0 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/70"
                >
                  Поиск
                </button>
              </div>

              {searching && (
                <div className="text-sm text-text-tertiary text-center py-4">Ищу…</div>
              )}
              {!searching && results && flatResults.length === 0 && (
                <div className="text-sm text-text-tertiary text-center py-4">
                  Ничего не нашлось.
                </div>
              )}
              {!searching && flatResults.length > 0 && (
                <div className="flex flex-col gap-1">
                  {flatResults.map(({ item, kind }, i) => {
                    const Icon =
                      kind === 'album'
                        ? Disc3
                        : kind === 'artist'
                          ? Mic2
                          : kind === 'playlist'
                            ? ListMusic
                            : Music;
                    const sub =
                      kind === 'album'
                        ? item.artists?.[0]?.name || 'Альбом'
                        : kind === 'artist'
                          ? 'Артист'
                          : kind === 'playlist'
                            ? 'Плейлист'
                            : item.artists?.[0]?.name || 'Трек';
                    return (
                      <button
                        key={`${item.uri ?? i}-${kind}`}
                        type="button"
                        onClick={() => playItem(item)}
                        aria-label={`Включить ${item.name ?? ''}`}
                        className="flex items-center gap-2.5 py-2 px-2 rounded-lg text-left hover:bg-black/5 dark:hover:bg-white/5 transition focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/70"
                      >
                        <Icon size={18} className="text-text-tertiary shrink-0" aria-hidden="true" />
                        <span className="flex-1 min-w-0">
                          <span className="block text-sm truncate">{item.name ?? '—'}</span>
                          <span className="block text-[11px] text-text-tertiary truncate">{sub}</span>
                        </span>
                        <Play size={15} className="text-text-tertiary shrink-0" aria-hidden="true" />
                      </button>
                    );
                  })}
                </div>
              )}
              {!results && !searching && (
                <div className="text-sm text-text-tertiary text-center py-4">
                  Введи название — найдём в подключённых источниках.
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
