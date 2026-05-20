'use client';

import { useEffect, useState } from 'react';
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
} from 'lucide-react';
import { ModalSheet } from '@/components/ui/ModalSheet';
import { PressButton } from '@/components/ui/PressButton';
import { useImageAccent } from '@/lib/useImageAccent';
import { useMusic, useMAPlayers } from '@/lib/music/MusicProvider';
import { maImageProxy } from '@/lib/music/config';

interface Props {
  open: boolean;
  onClose: () => void;
  /** Плеер, которым управляем (он же queue_id). */
  playerId: string | undefined;
  /** Сменить выход — пользователь выбрал другое устройство. */
  onSelectPlayer: (id: string) => void;
}

function fmtTime(sec: number): string {
  if (!isFinite(sec) || sec < 0) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

/**
 * Попап музыкального плеера Music Assistant: большая обложка, прогресс,
 * transport, громкость и выбор выхода (на каком устройстве играть).
 */
export function MusicAssistantSheet({ open, onClose, playerId, onSelectPlayer }: Props) {
  const { client, players } = useMusic();
  const visiblePlayers = useMAPlayers();
  const [now, setNow] = useState(() => Date.now());

  const player = players.find((p) => p.player_id === playerId);
  const playing = player?.playback_state === 'playing';

  // Прогресс «живой»: MA не тикает elapsed_time сам — экстраполируем.
  useEffect(() => {
    if (!open || !playing) return;
    const id = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(id);
  }, [open, playing]);

  const media = player?.current_media ?? null;
  const cover = maImageProxy(media?.image_url);
  const accent = useImageAccent(cover);
  const accentRgb = accent?.match(/\d+/g)?.join(' ') ?? null;
  const accentColor = accentRgb ? `rgb(${accentRgb})` : 'rgb(var(--accent))';
  const accentSoft = (op: number) =>
    accentRgb ? `rgb(${accentRgb} / ${op})` : `rgb(var(--accent) / ${op})`;

  const title = media?.title || 'Ничего не играет';
  const artist = media?.artist || '';
  const album = media?.album || '';
  const duration = media?.duration ?? 0;

  // Прогресс «живой»: берём elapsed_time (MA отдаёт его свежим в players/all)
  // и доводим локально от момента последнего обновления данных. Якорь —
  // client.getLastUpdate() (Date.now() браузера), НЕ серверный
  // elapsed_time_last_updated: часы MA-сервера и браузера расходятся, из-за
  // чего трек стартовал сразу с ~20 сек.
  let position = player?.elapsed_time ?? 0;
  if (playing) {
    position += Math.max(0, (now - client.getLastUpdate()) / 1000);
  }
  if (duration > 0) position = Math.min(position, duration);
  if (position < 0) position = 0;

  const volume = player?.volume_level ?? 0;
  const muted = player?.volume_muted ?? false;

  const cmd = (fn: () => Promise<unknown>) => {
    fn().catch(() => {});
  };

  const friendly = player?.name ?? 'Music Assistant';

  return (
    <ModalSheet
      open={open}
      onClose={onClose}
      title={friendly}
      subtitle="Music Assistant"
      ariaLabel="Музыкальный плеер"
      innerStyle={
        accent
          ? {
              background: `radial-gradient(ellipse 90% 70% at 50% 0%, ${accentSoft(0.42)} 0%, ${accentSoft(0.16)} 32%, ${accentSoft(0.05)} 62%, transparent 92%), rgb(var(--bg-secondary))`,
            }
          : undefined
      }
    >
      {/* Обложка + название */}
      <div className="relative flex flex-col items-center gap-4 mb-5 pt-2">
        {cover ? (
          <img
            src={cover}
            alt=""
            className="w-56 h-56 rounded-2xl object-cover"
            loading="lazy"
            style={{
              boxShadow: accent
                ? `0 12px 32px ${accentSoft(0.35)}, 0 4px 12px rgba(0,0,0,0.25)`
                : '0 16px 40px rgba(0,0,0,0.35)',
            }}
          />
        ) : (
          <div className="w-56 h-56 rounded-2xl bg-black/10 dark:bg-white/10 flex items-center justify-center text-7xl">
            🎵
          </div>
        )}
        <div className="text-center w-full min-w-0 px-2">
          <div className="text-lg font-semibold truncate" title={title}>
            {title}
          </div>
          {artist && (
            <div className="text-sm text-text-secondary truncate mt-0.5" title={artist}>
              {artist}
            </div>
          )}
          {album && album !== artist && (
            <div className="text-xs text-text-tertiary truncate mt-0.5" title={album}>
              {album}
            </div>
          )}
        </div>
      </div>

      {/* Прогресс */}
      {(() => {
        const hasTime = duration > 0;
        const pct = hasTime ? Math.min(100, (position / duration) * 100) : 0;
        const seek = (clientX: number, rect: DOMRect) => {
          if (!hasTime || !playerId) return;
          const p = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
          cmd(() => client.seek(playerId, p * duration));
        };
        return (
          <div className="mb-5">
            <div
              className={`relative h-7 -my-2 flex items-center ${hasTime ? 'cursor-pointer' : ''}`}
              onPointerDown={(ev) => {
                if (!hasTime) return;
                ev.currentTarget.setPointerCapture(ev.pointerId);
                seek(ev.clientX, ev.currentTarget.getBoundingClientRect());
              }}
            >
              <div className="relative h-1.5 w-full rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
                <div
                  className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-500"
                  style={{ width: `${pct}%`, background: hasTime ? accentColor : 'rgb(0 0 0 / 0.2)' }}
                />
              </div>
            </div>
            <div className="flex justify-between text-xs text-text-tertiary tabular-nums mt-1.5">
              <span>{hasTime ? fmtTime(position) : '—:—'}</span>
              <span>{hasTime ? fmtTime(duration) : '—:—'}</span>
            </div>
          </div>
        );
      })()}

      {/* Transport */}
      <div className="flex items-center justify-center gap-3 mb-5">
        <PressButton
          size={48}
          ariaLabel="Предыдущий"
          onClick={() => playerId && cmd(() => client.previous(playerId))}
        >
          <SkipBack size={20} aria-hidden="true" />
        </PressButton>
        <PressButton
          size={64}
          ariaLabel={playing ? 'Пауза' : 'Воспроизвести'}
          bg={accentSoft(0.25)}
          bgPressed={accentSoft(0.45)}
          onClick={() => playerId && cmd(() => client.playPause(playerId))}
        >
          {playing ? <Pause size={26} aria-hidden="true" /> : <Play size={26} aria-hidden="true" />}
        </PressButton>
        <PressButton
          size={48}
          ariaLabel="Следующий"
          onClick={() => playerId && cmd(() => client.next(playerId))}
        >
          <SkipForward size={20} aria-hidden="true" />
        </PressButton>
      </div>

      {/* Громкость */}
      <div className="flex items-center gap-3 mb-5">
        <PressButton
          size={36}
          ariaLabel={muted ? 'Включить звук' : 'Отключить звук'}
          onClick={() => playerId && cmd(() => client.setMute(playerId, !muted))}
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
          onChange={(ev) => playerId && cmd(() => client.setVolume(playerId, Number(ev.target.value)))}
          aria-label="Громкость"
          className="no-drag flex-1 min-w-0"
          style={{ accentColor }}
        />
        <span className="text-xs text-text-tertiary tabular-nums w-10 text-right">
          {Math.round(muted ? 0 : volume)}%
        </span>
      </div>

      {/* Выбор выхода */}
      <div className="border-t border-black/5 dark:border-white/5 pt-3">
        <div className="flex items-center gap-2 text-xs font-medium text-text-secondary mb-2 px-1">
          <Speaker size={14} aria-hidden="true" />
          <span>Где играть</span>
        </div>
        <div className="flex flex-col gap-1">
          {visiblePlayers.map((p) => {
            const selected = p.player_id === playerId;
            const isPlaying = p.playback_state === 'playing';
            return (
              <button
                key={p.player_id}
                type="button"
                onClick={() => onSelectPlayer(p.player_id)}
                aria-label={`Выход: ${p.name}`}
                className={`flex items-center gap-2.5 py-2 px-2.5 rounded-lg text-left transition focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/70 ${
                  selected
                    ? 'bg-black/8 dark:bg-white/10'
                    : 'hover:bg-black/5 dark:hover:bg-white/5'
                }`}
              >
                <Speaker
                  size={16}
                  aria-hidden="true"
                  className="shrink-0"
                  style={selected ? { color: accentColor } : undefined}
                />
                <span className="flex-1 min-w-0 truncate text-sm">{p.name}</span>
                {isPlaying && !selected && (
                  <span className="text-[10px] text-text-tertiary shrink-0">играет</span>
                )}
                {selected && (
                  <Check size={16} aria-hidden="true" style={{ color: accentColor }} className="shrink-0" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </ModalSheet>
  );
}
