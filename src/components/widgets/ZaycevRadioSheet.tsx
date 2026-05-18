'use client';

import { Pause, Play, Square, Volume1, Volume2, VolumeX } from 'lucide-react';
import { ModalSheet } from '@/components/ui/ModalSheet';
import { PressButton } from '@/components/ui/PressButton';
import { useEntity, useCallService } from '@/lib/ha/ConnectionProvider';
import { ZAYCEV_CHANNELS, streamUrl } from './ZaycevRadioWidget';

interface Props {
  entityId: string;
  bitrate: '48k' | '128k' | '256k';
  channels?: string[];
  open: boolean;
  onClose: () => void;
  /** Активный канал, который виджет «помнит» локально (AlexxIT прячет
   *  наш URL за proxy, поэтому media_content_id не указывает на канал). */
  activeChannel?: string | null;
  /** Колбэки в виджет, чтобы виджет тоже знал, что играет какой-то канал. */
  onChannelStart?: (channelId: string) => void;
  onStop?: () => void;
}

/**
 * Sheet с полным управлением Zaycev FM: сетка/список всех 18 каналов,
 * подсветка играющего, transport-кнопки (play/pause/stop) и слайдер
 * громкости. Открывается тапом по компактному ZaycevRadioWidget.
 */
export function ZaycevRadioSheet({
  entityId,
  bitrate,
  channels,
  open,
  onClose,
  activeChannel,
  onChannelStart,
  onStop,
}: Props) {
  const e = useEntity(entityId);
  const callService = useCallService();

  const visible = channels && channels.length > 0
    ? ZAYCEV_CHANNELS.filter((c) => channels.includes(c.id))
    : ZAYCEV_CHANNELS;

  const currentMediaId = e?.attributes.media_content_id as string | undefined;
  const directMatch = currentMediaId?.match(/abs\.zaycev\.fm\/(\w+?)(?:48|128|256)k/)?.[1];
  const playingChannel = directMatch || activeChannel || undefined;
  const isPlaying = e?.state === 'playing';
  const volume = (e?.attributes.volume_level as number | undefined) ?? 0;
  const muted = !!e?.attributes.is_volume_muted;
  const playerName = (e?.attributes.friendly_name as string) || entityId;

  const playChannel = (channelId: string) => {
    onChannelStart?.(channelId);
    callService('media_player', 'play_media', entityId, {
      media_content_id: streamUrl(channelId, bitrate),
      // 'stream.mp3' — нужно AlexxIT/YandexStation, чтобы понять что
      // URL — это прямой стрим, а не идентификатор трека Яндекс.Музыки.
      media_content_type: 'stream.mp3',
    });
  };

  const togglePlay = () =>
    callService('media_player', isPlaying ? 'media_pause' : 'media_play', entityId);
  const stop = () => {
    onStop?.();
    callService('media_player', 'media_stop', entityId);
  };
  const setVolume = (v: number) =>
    callService('media_player', 'volume_set', entityId, { volume_level: v });
  const toggleMute = () =>
    callService('media_player', 'volume_mute', entityId, { is_volume_muted: !muted });

  const currentChannelName = playingChannel
    ? ZAYCEV_CHANNELS.find((c) => c.id === playingChannel)?.name ?? playingChannel
    : null;

  const subtitle = currentChannelName ? (
    <span>
      {currentChannelName} · {bitrate} · {playerName}
    </span>
  ) : (
    <span>{playerName}</span>
  );

  const VolumeIcon = muted ? VolumeX : volume < 0.4 ? Volume1 : Volume2;

  return (
    <ModalSheet
      open={open}
      onClose={onClose}
      title="📻 Zaycev FM"
      subtitle={subtitle}
      ariaLabel="Управление Zaycev FM"
    >
      {/* Сетка каналов */}
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mb-4">
        {visible.map((ch) => {
          const active = playingChannel === ch.id;
          return (
            <button
              key={ch.id}
              type="button"
              onClick={() => playChannel(ch.id)}
              aria-label={`Играть ${ch.name}`}
              className={`flex flex-col items-center justify-center gap-1 py-3 px-1 rounded-lg transition focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/70 ${
                active
                  ? 'bg-accent/15 border border-accent/40 shadow-[0_0_16px_rgb(var(--accent)/0.35)]'
                  : 'bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 hover:bg-black/10 dark:hover:bg-white/10'
              }`}
            >
              <span className="text-2xl leading-none" aria-hidden="true">
                {ch.emoji}
              </span>
              <span
                className={`text-[11px] leading-tight truncate w-full text-center px-0.5 ${
                  active ? 'text-accent font-medium' : 'text-text-primary'
                }`}
              >
                {ch.name}
              </span>
            </button>
          );
        })}
      </div>

      {/* Transport-кнопки */}
      <div className="flex items-center justify-center gap-3 mb-3">
        <PressButton
          onClick={togglePlay}
          disabled={!playingChannel}
          size={48}
          ariaLabel={isPlaying ? 'Пауза' : 'Играть'}
          bg="rgb(var(--accent) / 0.18)"
          bgPressed="rgb(var(--accent) / 0.35)"
        >
          {isPlaying ? (
            <Pause size={20} aria-hidden="true" />
          ) : (
            <Play size={20} aria-hidden="true" />
          )}
        </PressButton>
        <PressButton
          onClick={stop}
          disabled={!playingChannel}
          size={48}
          ariaLabel="Стоп"
        >
          <Square size={18} aria-hidden="true" />
        </PressButton>
      </div>

      {/* Громкость */}
      <div className="flex items-center gap-2.5 px-1">
        <button
          type="button"
          onClick={toggleMute}
          aria-label={muted ? 'Включить звук' : 'Выключить звук'}
          className="shrink-0 text-text-secondary hover:text-text-primary focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/70 rounded p-1"
        >
          <VolumeIcon size={18} aria-hidden="true" />
        </button>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={muted ? 0 : volume}
          onChange={(ev) => setVolume(Number(ev.target.value))}
          aria-label="Громкость"
          className="no-drag flex-1 min-w-0 accent-accent"
        />
        <span className="text-xs text-text-tertiary tabular-nums w-9 text-right shrink-0">
          {Math.round((muted ? 0 : volume) * 100)}%
        </span>
      </div>
    </ModalSheet>
  );
}
