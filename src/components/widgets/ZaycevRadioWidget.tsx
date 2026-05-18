'use client';

import { useEffect, useState } from 'react';
import { Pause, Play, Radio, Square } from 'lucide-react';
import { useEntity, useCallService } from '@/lib/ha/ConnectionProvider';
import { useWidgetSize, sizeTier } from '@/lib/widgets/useWidgetSize';
import { PressButton } from '@/components/ui/PressButton';
import { MarqueeText } from '@/components/ui/MarqueeText';
import { ZaycevRadioSheet } from './ZaycevRadioSheet';

interface Params {
  /** На каком media_player играть. Должен поддерживать play_media с произвольным
   *  HTTP-mp3 URL (Yandex.Station через AlexxIT, DLNA, AirPlay, Cast, etc). */
  mediaPlayerEntity?: string;
  /** Битрейт стрима — 48, 128 или 256 kbps. По умолчанию 128. */
  bitrate?: '48k' | '128k' | '256k';
  /** Какие каналы показывать в sheet. Пусто = все. */
  channels?: string[];
  /** Подпись над сеткой. Если не задана — «Zaycev FM». */
  label?: string;
}

export interface Channel {
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

/**
 * Компактный радио-виджет в стиле MediaPlayerWidget — небольшая карточка с
 * текущим каналом и transport-кнопками. Полный список каналов и громкость
 * — в sheet (открывается тапом). Уникальность относительно обычного плеера:
 *  - вместо обложки трека — крупная иконка-радио на цветной плашке
 *  - в подзаголовке всегда «📻 РАДИО» — сразу видно, что это не TTS/трек
 *  - акцентный цвет тёплый (orange/amber) — отличает от media_player'a
 */
export function ZaycevRadioWidget({ params }: { params: Params }) {
  const bitrate = params.bitrate ?? '128k';
  const playerEntity = params.mediaPlayerEntity;
  const e = useEntity(playerEntity || '');
  const callService = useCallService();
  const [ref, size] = useWidgetSize();
  const tier = sizeTier(size);
  const [sheetOpen, setSheetOpen] = useState(false);

  if (!playerEntity) {
    return (
      <div className="glass h-full w-full p-3 flex items-center justify-center text-text-tertiary text-xs text-center">
        ⚙️ Выбери media_player в настройках
      </div>
    );
  }

  // Локальный override: пользователь нажал канал — запомнили какой,
  // потому что AlexxIT/YandexStation оборачивает наш URL в proxy
  // (`/api/yandex_station/<token>.mp3`) и media_content_id перестаёт
  // указывать на abs.zaycev.fm. Без этого виджет не понимал, что играет,
  // и кнопка play не превращалась в «пауза».
  const [lastRequested, setLastRequested] = useState<string | null>(null);
  const currentMediaId = e?.attributes.media_content_id as string | undefined;
  const directMatch = currentMediaId?.match(/abs\.zaycev\.fm\/(\w+?)(?:48|128|256)k/)?.[1];
  const stateStr = e?.state;
  // Сбрасываем override, когда плеер ушёл в terminal state (off/idle/unavail) —
  // значит юзер сам выключил или Станция переключилась на что-то другое.
  useEffect(() => {
    if (lastRequested && stateStr && ['off', 'idle', 'unavailable'].includes(stateStr)) {
      setLastRequested(null);
    }
  }, [stateStr, lastRequested]);
  const playingChannel = directMatch || lastRequested || undefined;
  const isPlaying = e?.state === 'playing';
  const currentChannel = playingChannel
    ? ZAYCEV_CHANNELS.find((c) => c.id === playingChannel)
    : null;
  const playerName = (e?.attributes.friendly_name as string) || playerEntity;
  const label = params.label ?? 'Zaycev FM';

  // Подзаголовок — что играет прямо сейчас. Приоритет:
  //  1. media_title + media_artist из ICY-метаданных стрима (если плеер их
  //     парсит — например, DLNA-колонки или AlexxIT/YandexStation иногда).
  //  2. Название канала + битрейт (если стрим Zaycev запущен).
  //  3. Подсказка «Тап — выбрать канал» (ничего не играет).
  // Защита от случая, когда плеер пихает URL в media_title как fallback —
  // фильтруем по характерным паттернам «zaycev» / «128k» / «.mp3» / «.fm».
  const rawTitle = (e?.attributes.media_title as string | undefined)?.trim();
  const rawArtist = (e?.attributes.media_artist as string | undefined)?.trim();
  const isPlaceholderTitle = rawTitle
    ? /zaycev|abs\.|^\w+\d{2,3}k$|\.mp3$|^https?:/i.test(rawTitle)
    : true;
  const trackTitle = rawTitle && !isPlaceholderTitle ? rawTitle : '';
  const trackArtist = rawArtist && !/zaycev/i.test(rawArtist) ? rawArtist : '';
  const nowPlaying = trackTitle
    ? trackArtist
      ? `${trackArtist} — ${trackTitle}`
      : trackTitle
    : currentChannel
      ? `Zaycev FM · ${bitrate}`
      : 'Тап — выбрать канал';


  const togglePlay = () => {
    if (playingChannel) {
      callService('media_player', isPlaying ? 'media_pause' : 'media_play', playerEntity);
    } else {
      const first = params.channels?.[0] ?? ZAYCEV_CHANNELS[0].id;
      setLastRequested(first);
      callService('media_player', 'play_media', playerEntity, {
        media_content_id: streamUrl(first, bitrate),
        // 'stream.mp3' — AlexxIT/YandexStation требует именно такой content_type,
        // чтобы понять что media_id — это прямой HTTP-MP3 стрим (URL без
        // расширения .mp3, как у Zaycev: abs.zaycev.fm/pop128k). С 'music'
        // AlexxIT пытался искать трек в Яндекс.Музыке и команда молча падала.
        media_content_type: 'stream.mp3',
      });
    }
  };
  const stop = () => {
    setLastRequested(null);
    callService('media_player', 'media_stop', playerEntity);
  };

  const openSheet = () => setSheetOpen(true);

  const sheet = (
    <ZaycevRadioSheet
      entityId={playerEntity}
      bitrate={bitrate}
      channels={params.channels}
      open={sheetOpen}
      onClose={() => setSheetOpen(false)}
      activeChannel={lastRequested}
      onChannelStart={(id) => setLastRequested(id)}
      onStop={() => setLastRequested(null)}
    />
  );

  // Цветовой акцент радио — тёплый янтарь (отличает от обычного плеера,
  // у которого accent зависит от обложки или дефолтный синий).
  const radioAccent = 'rgb(251 191 36)'; // amber-400
  const radioAccentGlow = playingChannel
    ? {
        borderColor: 'rgba(251, 191, 36, 0.35)',
        boxShadow: '0 0 18px rgba(251, 191, 36, 0.18)',
      }
    : undefined;

  if (!size.measured) {
    return <div ref={ref} className="glass h-full w-full" />;
  }

  // Tiny: только play/pause (минимальный 2×1 виджет)
  if (tier === 'tiny') {
    return (
      <>
        <button
          ref={ref}
          onClick={togglePlay}
          title={label}
          aria-label={isPlaying ? 'Пауза' : 'Играть'}
          className="glass h-full w-full flex items-center justify-center focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/70"
        >
          {isPlaying ? (
            <Pause size={18} className="text-amber-400" aria-hidden="true" />
          ) : (
            <Radio size={18} className="text-amber-400" aria-hidden="true" />
          )}
        </button>
        {sheet}
      </>
    );
  }

  // Small (≥80px по обеим сторонам): иконка-радио + play под ней
  if (tier === 'small') {
    return (
      <>
        <div
          ref={ref}
          className="glass h-full w-full p-2 flex flex-col items-center justify-center gap-1"
          style={radioAccentGlow}
        >
          <button
            type="button"
            onClick={openSheet}
            aria-label="Открыть Zaycev FM"
            className="w-10 h-10 rounded-md bg-amber-500/15 flex items-center justify-center focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/70"
          >
            {currentChannel ? (
              <span className="text-xl leading-none" aria-hidden="true">
                {currentChannel.emoji}
              </span>
            ) : (
              <Radio size={20} className="text-amber-400" aria-hidden="true" />
            )}
          </button>
          <PressButton
            onClick={togglePlay}
            size={32}
            ariaLabel={isPlaying ? 'Пауза' : 'Играть'}
          >
            {isPlaying ? (
              <Pause size={14} aria-hidden="true" />
            ) : (
              <Play size={14} aria-hidden="true" />
            )}
          </PressButton>
        </div>
        {sheet}
      </>
    );
  }

  // Medium / large: горизонтальная карточка с иконкой-радио, заголовком и
  // transport-кнопками — компоновка как у MediaPlayerWidget, чтобы было
  // привычно. Уникальность: квадратная плашка с эмодзи канала вместо
  // обложки, и постоянный бейдж «📻 РАДИО» в подзаголовке.
  const isShort = size.h < 130;
  const showStop = size.w >= 200;
  const coverPx = isShort ? Math.min(size.h - 16, 60) : 48;

  if (isShort) {
    return (
      <>
        <div
          ref={ref}
          className="glass h-full w-full p-2 flex items-center gap-2 overflow-hidden"
          style={radioAccentGlow}
        >
          <button
            type="button"
            onClick={openSheet}
            aria-label="Открыть Zaycev FM"
            className="flex items-center gap-2 min-w-0 flex-1 text-left rounded-md overflow-hidden focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/70"
          >
            <div
              className="rounded-md bg-amber-500/15 flex items-center justify-center shrink-0"
              style={{ width: coverPx, height: coverPx }}
            >
              {currentChannel ? (
                <span style={{ fontSize: coverPx * 0.55 }} aria-hidden="true">
                  {currentChannel.emoji}
                </span>
              ) : (
                <Radio size={Math.round(coverPx * 0.5)} className="text-amber-400" aria-hidden="true" />
              )}
            </div>
            <div className="min-w-0 flex-1 overflow-hidden">
              <MarqueeText className="text-sm font-medium block w-full">
                {currentChannel ? currentChannel.name : label}
              </MarqueeText>
              <MarqueeText className="text-[10px] text-text-tertiary block w-full">
                📻 {nowPlaying}
              </MarqueeText>
            </div>
          </button>
          <div className="flex items-center gap-1 shrink-0">
            <PressButton
              onClick={togglePlay}
              size={36}
              ariaLabel={isPlaying ? 'Пауза' : 'Играть'}
              bg="rgba(251, 191, 36, 0.25)"
              bgPressed="rgba(251, 191, 36, 0.45)"
            >
              {isPlaying ? (
                <Pause size={14} aria-hidden="true" />
              ) : (
                <Play size={14} aria-hidden="true" />
              )}
            </PressButton>
            {showStop && playingChannel && (
              <PressButton onClick={stop} size={32} ariaLabel="Стоп">
                <Square size={12} aria-hidden="true" />
              </PressButton>
            )}
          </div>
        </div>
        {sheet}
      </>
    );
  }

  // Вертикальный layout (h ≥ 130)
  return (
    <>
      <div
        ref={ref}
        className="glass h-full w-full p-3 flex flex-col gap-2 overflow-hidden"
        style={radioAccentGlow}
      >
        <button
          type="button"
          onClick={openSheet}
          aria-label="Открыть Zaycev FM"
          className="flex gap-3 items-center min-w-0 w-full shrink-0 text-left rounded-md overflow-hidden focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/70"
        >
          <div className="w-12 h-12 rounded-md bg-amber-500/15 flex items-center justify-center shrink-0">
            {currentChannel ? (
              <span className="text-2xl leading-none" aria-hidden="true">
                {currentChannel.emoji}
              </span>
            ) : (
              <Radio size={24} className="text-amber-400" aria-hidden="true" />
            )}
          </div>
          <div className="min-w-0 flex-1 overflow-hidden">
            <div className="text-[10px] uppercase tracking-wider text-amber-500 dark:text-amber-300 font-semibold flex items-center gap-1">
              <Radio size={10} aria-hidden="true" />
              <span>радио</span>
            </div>
            <MarqueeText className="text-sm font-medium block w-full">
              {currentChannel ? currentChannel.name : label}
            </MarqueeText>
            <MarqueeText className="text-[10px] text-text-tertiary block w-full">
              {nowPlaying}
            </MarqueeText>
          </div>
        </button>

        <div className="flex items-center justify-center gap-1.5 my-auto shrink-0">
          <PressButton
            onClick={togglePlay}
            size={44}
            ariaLabel={isPlaying ? 'Пауза' : 'Играть'}
            bg="rgba(251, 191, 36, 0.25)"
            bgPressed="rgba(251, 191, 36, 0.45)"
          >
            {isPlaying ? (
              <Pause size={18} aria-hidden="true" />
            ) : (
              <Play size={18} aria-hidden="true" />
            )}
          </PressButton>
          {playingChannel && (
            <PressButton onClick={stop} size={36} ariaLabel="Стоп">
              <Square size={14} aria-hidden="true" />
            </PressButton>
          )}
        </div>
      </div>
      {sheet}
    </>
  );
}
