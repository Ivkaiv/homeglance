'use client';

import { useEffect, useState } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Repeat1,
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
  History,
  ChevronRight,
  ArrowLeft,
  Waves,
  Heart,
} from 'lucide-react';
import { PressButton } from '@/components/ui/PressButton';
import { MarqueeText } from '@/components/ui/MarqueeText';
import { useImageAccent } from '@/lib/useImageAccent';
import {
  useMusic,
  useMAConnection,
  useMAPlayers,
  useMAQueue,
} from '@/lib/music/MusicProvider';
import { maImageProxy } from '@/lib/music/config';
import type { MusicPageConfig } from '@/lib/pages/types';
import type { MAMediaItem } from '@/lib/music/types';

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

/** Иконка и подпись по типу медиа-элемента. */
function kindInfo(item: MAMediaItem): { Icon: typeof Music; label: string } {
  switch (item.media_type) {
    case 'album':
      return { Icon: Disc3, label: 'Альбом' };
    case 'artist':
      return { Icon: Mic2, label: 'Артист' };
    case 'playlist':
      return { Icon: ListMusic, label: 'Плейлист' };
    default:
      return { Icon: Music, label: 'Трек' };
  }
}

/**
 * Строка медиа-элемента. Трек — сразу включается; альбом/артист/плейлист —
 * открывается (drill-down). Тип определяет завершающую иконку.
 */
function MediaRow({
  item,
  onActivate,
}: {
  item: MAMediaItem;
  onActivate: (i: MAMediaItem) => void;
}) {
  const { Icon, label } = kindInfo(item);
  const thumb = maImageProxy(item.metadata?.images?.[0]?.path ?? item.image?.path);
  const sub = item.artists?.[0]?.name || label;
  const isTrack = item.media_type === 'track' || !item.media_type;
  return (
    <button
      type="button"
      onClick={() => onActivate(item)}
      aria-label={`${isTrack ? 'Включить' : 'Открыть'} ${item.name ?? ''}`}
      className="flex items-center gap-2.5 py-2 px-2 rounded-lg text-left hover:bg-black/5 dark:hover:bg-white/5 transition focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/70"
    >
      {thumb ? (
        <img
          src={thumb}
          alt=""
          width={40}
          height={40}
          loading="lazy"
          className="w-10 h-10 rounded object-cover shrink-0 bg-black/10 dark:bg-white/10"
        />
      ) : (
        <div className="w-10 h-10 rounded bg-black/10 dark:bg-white/10 flex items-center justify-center shrink-0">
          <Icon size={18} className="text-text-tertiary" aria-hidden="true" />
        </div>
      )}
      <span className="flex-1 min-w-0">
        <span className="block text-sm truncate">{item.name ?? '—'}</span>
        <span className="block text-[11px] text-text-tertiary truncate">{sub}</span>
      </span>
      {isTrack ? (
        <Play size={15} className="text-text-tertiary shrink-0" aria-hidden="true" />
      ) : (
        <ChevronRight size={16} className="text-text-tertiary shrink-0" aria-hidden="true" />
      )}
    </button>
  );
}

/**
 * Полноэкранная страница «Музыка» — плеер Music Assistant: что играет,
 * управление (shuffle/repeat/«Далее»), «волна» и избранное, выбор устройства
 * вывода, поиск с открытием альбомов/артистов, недавно прослушанное.
 */
export function MusicPageView({ config, pageTitle }: Props) {
  useMAConnection();
  const { client, status } = useMusic();
  const players = useMAPlayers();

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
  const queue = useMAQueue(playerId);

  // ── Прогресс ───────────────────────────────────────────────────────────
  const playing = active?.playback_state === 'playing';
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(id);
  }, [playing]);

  const media = active?.current_media ?? null;
  const cover = maImageProxy(media?.image_url);
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
  const shuffle = queue?.shuffle_enabled ?? false;
  const repeatMode = (queue?.repeat_mode ?? 'off') as 'off' | 'one' | 'all';
  const nextName = queue?.next_item?.name || queue?.next_item?.media_item?.name || '';

  const run = (fn: () => Promise<unknown>) => {
    fn().catch(() => {});
  };

  // ── Поиск ──────────────────────────────────────────────────────────────
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<MAMediaItem[] | null>(null);
  const [searching, setSearching] = useState(false);

  const doSearch = () => {
    const q = query.trim();
    if (!q) return;
    setSearching(true);
    client
      .search(q)
      .then((r) => setResults([...r.albums, ...r.artists, ...r.playlists, ...r.tracks]))
      .catch(() => setResults([]))
      .finally(() => setSearching(false));
  };

  // ── Недавнее ───────────────────────────────────────────────────────────
  const [recent, setRecent] = useState<MAMediaItem[]>([]);
  useEffect(() => {
    if (status !== 'connected') return;
    client
      .getRecentlyPlayed(12)
      .then(setRecent)
      .catch(() => setRecent([]));
  }, [status, client]);

  // ── Открытие альбома / артиста / плейлиста ─────────────────────────────
  const [detail, setDetail] = useState<MAMediaItem | null>(null);
  const [detailTracks, setDetailTracks] = useState<MAMediaItem[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  const openDetail = (item: MAMediaItem) => {
    setDetail(item);
    setDetailTracks([]);
    setDetailLoading(true);
    client
      .getItemTracks(item)
      .then(setDetailTracks)
      .catch(() => setDetailTracks([]))
      .finally(() => setDetailLoading(false));
  };

  const playItem = (item: MAMediaItem) => {
    if (!playerId || !item.uri) return;
    run(() => client.playMedia(playerId, item.uri as string));
  };

  // Трек включаем, контейнер (альбом/артист/плейлист) открываем.
  const onActivate = (item: MAMediaItem) => {
    if (item.media_type === 'track' || !item.media_type) playItem(item);
    else openDetail(item);
  };

  const cycleRepeat = () => {
    if (!playerId) return;
    const next = repeatMode === 'off' ? 'all' : repeatMode === 'all' ? 'one' : 'off';
    run(() => client.setRepeat(playerId, next));
  };

  // ── «Волна» и избранное по текущему треку ──────────────────────────────
  const [favUri, setFavUri] = useState<string | null>(null);
  const startWave = () => {
    if (playerId && media?.uri) run(() => client.playRadio(playerId, media.uri as string));
  };
  const favoriteCurrent = () => {
    if (!media?.uri) return;
    client
      .addFavorite(media.uri)
      .then(() => setFavUri(media.uri ?? null))
      .catch(() => {});
  };
  const isFav = !!media?.uri && favUri === media.uri;

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

              {/* Transport + shuffle/repeat */}
              <div className="flex items-center justify-center gap-2">
                <PressButton
                  size={40}
                  ariaLabel={shuffle ? 'Выключить перемешивание' : 'Перемешать'}
                  onClick={() => playerId && run(() => client.setShuffle(playerId, !shuffle))}
                >
                  <Shuffle
                    size={16}
                    aria-hidden="true"
                    style={shuffle ? { color: accentColor } : undefined}
                  />
                </PressButton>
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
                <PressButton size={40} ariaLabel="Режим повтора" onClick={cycleRepeat}>
                  {repeatMode === 'one' ? (
                    <Repeat1 size={16} aria-hidden="true" style={{ color: accentColor }} />
                  ) : (
                    <Repeat
                      size={16}
                      aria-hidden="true"
                      style={repeatMode === 'all' ? { color: accentColor } : undefined}
                    />
                  )}
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

              {/* Волна + избранное по текущему треку */}
              <div className="flex items-center gap-2 w-full">
                <button
                  type="button"
                  onClick={startWave}
                  disabled={!media?.uri}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-sm text-text-secondary disabled:opacity-40 hover:bg-black/10 dark:hover:bg-white/10 transition focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/70"
                >
                  <Waves size={15} aria-hidden="true" />
                  Волна
                </button>
                <button
                  type="button"
                  onClick={favoriteCurrent}
                  disabled={!media?.uri}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-sm text-text-secondary disabled:opacity-40 hover:bg-black/10 dark:hover:bg-white/10 transition focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/70"
                >
                  <Heart
                    size={15}
                    aria-hidden="true"
                    fill={isFav ? accentColor : 'none'}
                    style={isFav ? { color: accentColor } : undefined}
                  />
                  {isFav ? 'В избранном' : 'В избранное'}
                </button>
              </div>

              {nextName && (
                <div className="text-xs text-text-tertiary w-full truncate text-center">
                  Далее: {nextName}
                </div>
              )}
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

            {/* ── Открытый альбом / артист / плейлист ── */}
            {detail && (
              <div className="glass p-4">
                <div className="flex items-center gap-3 mb-3">
                  <button
                    type="button"
                    onClick={() => setDetail(null)}
                    aria-label="Назад"
                    className="w-9 h-9 rounded-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 flex items-center justify-center shrink-0 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/70"
                  >
                    <ArrowLeft size={16} aria-hidden="true" />
                  </button>
                  {(() => {
                    const dThumb = maImageProxy(
                      detail.metadata?.images?.[0]?.path ?? detail.image?.path
                    );
                    return dThumb ? (
                      <img
                        src={dThumb}
                        alt=""
                        className="w-12 h-12 rounded object-cover shrink-0 bg-black/10 dark:bg-white/10"
                      />
                    ) : null;
                  })()}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{detail.name}</div>
                    <div className="text-[11px] text-text-tertiary">
                      {kindInfo(detail).label}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => playItem(detail)}
                    className="px-3 py-1.5 rounded-lg bg-accent/20 border border-accent/40 text-accent text-xs shrink-0 flex items-center gap-1 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/70"
                  >
                    <Play size={13} aria-hidden="true" />
                    Играть всё
                  </button>
                </div>
                {detailLoading ? (
                  <div className="text-sm text-text-tertiary text-center py-4">Загрузка…</div>
                ) : detailTracks.length === 0 ? (
                  <div className="text-sm text-text-tertiary text-center py-4">
                    Треки не загрузились.
                  </div>
                ) : (
                  <div className="flex flex-col gap-1">
                    {detailTracks.map((t, i) => (
                      <MediaRow key={`d-${t.uri ?? i}`} item={t} onActivate={onActivate} />
                    ))}
                  </div>
                )}
              </div>
            )}

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
              {!searching && results && results.length === 0 && (
                <div className="text-sm text-text-tertiary text-center py-4">
                  Ничего не нашлось.
                </div>
              )}
              {!searching && results && results.length > 0 && (
                <div className="flex flex-col gap-1">
                  {results.map((item, i) => (
                    <MediaRow key={`${item.uri ?? i}`} item={item} onActivate={onActivate} />
                  ))}
                </div>
              )}
              {!results && !searching && (
                <div className="text-sm text-text-tertiary text-center py-4">
                  Введи название — найдём в подключённых источниках.
                </div>
              )}
            </div>

            {/* ── Недавнее ── */}
            {recent.length > 0 && (
              <div className="glass p-4">
                <div className="flex items-center gap-2 text-xs font-medium text-text-secondary mb-2">
                  <History size={14} aria-hidden="true" />
                  <span>Недавнее</span>
                </div>
                <div className="flex flex-col gap-1">
                  {recent.map((item, i) => (
                    <MediaRow key={`recent-${item.uri ?? i}`} item={item} onActivate={onActivate} />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
