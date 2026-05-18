'use client';

import clsx from 'clsx';
import { Pause, Play, Square } from 'lucide-react';
import { useEntity, useCallService } from '@/lib/ha/ConnectionProvider';
import { PressButton } from '@/components/ui/PressButton';

interface Params {
  /** На каком media_player играть. Должен поддерживать play_media с произвольным
   *  HTTP-mp3 URL (Yandex.Station через AlexxIT, DLNA, AirPlay, Cast, etc). */
  mediaPlayerEntity?: string;
  /** Битрейт стрима — 48, 128 или 256 kbps. По умолчанию 128. */
  bitrate?: '48k' | '128k' | '256k';
  /** Какие каналы показывать в сетке. Пусто = все. */
  channels?: string[];
  /** Подпись над сеткой. Если не задана — «Zaycev FM». */
  label?: string;
}

interface Channel {
  id: string;
  name: string;
  emoji: string;
}

export const ZAYCEV_CHANNELS: Channel[] = [
  { id: 'pop', name: 'Pop', emoji: '🎤' },
  { id: 'rock', name: 'Rock', emoji: '🎸' },
  { id: 'club', name: 'Club', emoji: '🪩' },
  { id: 'disco', name: 'Disco', emoji: '🕺' },
  { id: 'rurock', name: 'РуРок', emoji: '🎸' },
  { id: 'shanson', name: 'Шансон', emoji: '🚬' },
  { id: 'rus', name: 'Русское', emoji: '🇷🇺' },
  { id: 'rnb', name: 'R&B', emoji: '🎵' },
  { id: 'relax', name: 'Relax', emoji: '🌊' },
  { id: 'zaychata', name: 'Зайчата', emoji: '🐰' },
  { id: 'kpop', name: 'K-Pop', emoji: '🎎' },
  { id: 'rap', name: 'Рэп', emoji: '🎤' },
  { id: 'metal', name: 'Metal', emoji: '🤘' },
  { id: 'bass', name: 'Bass', emoji: '🔊' },
  { id: 'love', name: 'Love', emoji: '❤️' },
  { id: 'folk', name: 'Folk', emoji: '🪕' },
  { id: 'classic', name: 'Classic', emoji: '🎻' },
];

const STREAM_BASE = 'https://abs.zaycev.fm';

export function streamUrl(channelId: string, bitrate: '48k' | '128k' | '256k' = '128k'): string {
  return `${STREAM_BASE}/${channelId}${bitrate}`;
}

export function ZaycevRadioWidget({ params }: { params: Params }) {
  const bitrate = params.bitrate ?? '128k';
  const playerEntity = params.mediaPlayerEntity;
  const e = useEntity(playerEntity || '');
  const callService = useCallService();

  const visible = params.channels && params.channels.length > 0
    ? ZAYCEV_CHANNELS.filter((c) => params.channels!.includes(c.id))
    : ZAYCEV_CHANNELS;

  // Текущий играющий канал определяется по media_content_id: если он совпадает
  // с одним из наших URL — подсвечиваем эту кнопку. Так пользователь видит,
  // что именно слушает прямо сейчас.
  const currentMediaId = e?.attributes.media_content_id as string | undefined;
  const playingChannel = currentMediaId?.match(/abs\.zaycev\.fm\/(\w+?)(48|128|256)k/)?.[1];
  const isPlaying = e?.state === 'playing';
  const isAnyZaycevPlaying = !!playingChannel;

  const playChannel = (channelId: string) => {
    if (!playerEntity) return;
    callService('media_player', 'play_media', playerEntity, {
      media_content_id: streamUrl(channelId, bitrate),
      media_content_type: 'music',
    });
  };

  const stop = () => {
    if (!playerEntity) return;
    callService('media_player', 'media_stop', playerEntity);
  };

  const pause = () => {
    if (!playerEntity) return;
    callService('media_player', isPlaying ? 'media_pause' : 'media_play', playerEntity);
  };

  if (!playerEntity) {
    return (
      <div className="glass h-full w-full p-3 flex items-center justify-center text-text-tertiary text-xs text-center">
        ⚙️ Выбери media_player в настройках
      </div>
    );
  }

  const label = params.label ?? 'Zaycev FM';
  const playerName = e?.attributes.friendly_name ?? playerEntity;

  return (
    <div className="glass h-full w-full p-3 flex flex-col gap-2 overflow-hidden">
      {/* Заголовок: название + индикатор играющего канала + transport controls */}
      <div className="flex items-center gap-2 shrink-0 min-w-0">
        <div className="text-sm font-medium truncate flex-1 min-w-0">
          {label}
          {isAnyZaycevPlaying && (
            <span className="ml-1.5 text-[10px] text-text-tertiary">
              · {ZAYCEV_CHANNELS.find((c) => c.id === playingChannel)?.name ?? playingChannel}
            </span>
          )}
        </div>
        {isAnyZaycevPlaying && (
          <>
            <PressButton onClick={pause} size={28} ariaLabel={isPlaying ? 'Пауза' : 'Играть'}>
              {isPlaying ? <Pause size={12} aria-hidden="true" /> : <Play size={12} aria-hidden="true" />}
            </PressButton>
            <PressButton onClick={stop} size={28} ariaLabel="Стоп">
              <Square size={12} aria-hidden="true" />
            </PressButton>
          </>
        )}
      </div>
      <div className="text-[10px] text-text-tertiary truncate shrink-0">
        → {playerName} · {bitrate}
      </div>

      {/* Сетка каналов */}
      <div className="flex-1 min-h-0 overflow-auto">
        <div className="grid grid-cols-3 @[280px]:grid-cols-4 @[400px]:grid-cols-5 @[520px]:grid-cols-6 gap-1.5">
          {visible.map((ch) => {
            const active = playingChannel === ch.id;
            return (
              <PressButton
                key={ch.id}
                onClick={() => playChannel(ch.id)}
                ariaLabel={`Играть ${ch.name}`}
                bg={active ? 'rgb(var(--accent) / 0.18)' : 'none'}
                className={clsx(
                  'flex flex-col items-center justify-center gap-0.5 py-2 px-1 rounded-lg',
                  active
                    ? 'border border-accent/40 shadow-[0_0_12px_rgb(var(--accent)/0.4)]'
                    : 'ctrl-btn'
                )}
              >
                <span className="text-lg leading-none" aria-hidden="true">{ch.emoji}</span>
                <span className={clsx(
                  'text-[10px] leading-tight truncate w-full text-center px-0.5',
                  active ? 'text-accent font-medium' : 'text-text-secondary'
                )}>
                  {ch.name}
                </span>
              </PressButton>
            );
          })}
        </div>
      </div>
    </div>
  );
}
