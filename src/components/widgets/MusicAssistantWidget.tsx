'use client';

import { useState } from 'react';
import { Play, Pause, Music } from 'lucide-react';
import { useWidgetSize, sizeTier } from '@/lib/widgets/useWidgetSize';
import { GlanceIcon } from '@/components/icons/MdiIcon';
import { MarqueeText } from '@/components/ui/MarqueeText';
import { PressButton } from '@/components/ui/PressButton';
import { useImageAccent } from '@/lib/useImageAccent';
import {
  useMusic,
  useMAConnection,
  useMAPlayers,
} from '@/lib/music/MusicProvider';
import { maImageProxy } from '@/lib/music/config';
import type { MAPlayer } from '@/lib/music/types';
import { MusicAssistantSheet } from './MusicAssistantSheet';
import { useT } from '@/lib/i18n/I18nProvider';

interface Params {
  label?: string;
}

const OUTPUT_KEY = 'glance:ma:output';

/** Выбрать плеер для показа: сохранённый → играющий → первый доступный. */
function pickActive(players: MAPlayer[], savedId: string | null): MAPlayer | undefined {
  if (savedId) {
    const saved = players.find((p) => p.player_id === savedId);
    if (saved) return saved;
  }
  return players.find((p) => p.playback_state === 'playing') ?? players[0];
}

/**
 * Виджет музыкального плеера на базе Music Assistant. Компактная карточка
 * показывает, что играет на выбранном устройстве; тап открывает попап с
 * полным управлением и выбором выхода.
 */
export function MusicAssistantWidget({ params }: { params: Params }) {
  const t = useT();
  useMAConnection();
  const { status } = useMusic();
  const players = useMAPlayers();
  const [ref, size] = useWidgetSize();
  const tier = sizeTier(size);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    return window.localStorage.getItem(OUTPUT_KEY);
  });

  const selectPlayer = (id: string) => {
    setSavedId(id);
    try {
      window.localStorage.setItem(OUTPUT_KEY, id);
    } catch {
      /* приватный режим — переживём */
    }
  };

  const active = pickActive(players, savedId);
  const label = params.label ?? t('w.ma.label');

  const media = active?.current_media ?? null;
  const playing = active?.playback_state === 'playing';
  const title = media?.title || (active ? t('w.ma.nothingPlaying') : '—');
  const artist = media?.artist || '';
  const cover = maImageProxy(media?.image_url);
  const accent = useImageAccent(cover);
  const accentRgb = accent?.match(/\d+/g)?.join(' ') ?? null;
  const playBg = accentRgb ? `rgb(${accentRgb} / 0.25)` : 'rgb(var(--accent) / 0.25)';
  const playBgPressed = accentRgb ? `rgb(${accentRgb} / 0.45)` : 'rgb(var(--accent) / 0.45)';

  const { client } = useMusic();
  const togglePlay = () => {
    if (active) client.playPause(active.player_id).catch(() => {});
  };

  const sheet = (
    <MusicAssistantSheet
      open={sheetOpen}
      onClose={() => setSheetOpen(false)}
      playerId={active?.player_id}
      onSelectPlayer={selectPlayer}
    />
  );

  if (!size.measured) {
    return <div ref={ref} className="glass h-full w-full" />;
  }

  // Music Assistant ещё не отдал плееры — спокойное «загрузка/недоступно».
  if (players.length === 0) {
    return (
      <>
        <button
          ref={ref}
          type="button"
          onClick={() => setSheetOpen(true)}
          className="glass h-full w-full flex flex-col items-center justify-center gap-1 text-text-tertiary text-xs text-center px-2 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/70"
        >
          <Music size={22} aria-hidden="true" />
          <span>
            {status === 'connecting' || status === 'disconnected'
              ? t('w.ma.connecting')
              : t('w.ma.unavailable')}
          </span>
        </button>
        {sheet}
      </>
    );
  }

  if (tier === 'tiny') {
    return (
      <>
        <button
          ref={ref}
          type="button"
          onClick={togglePlay}
          title={label}
          aria-label={playing ? t('w.player.pause') : t('w.player.play')}
          className="glass h-full w-full flex items-center justify-center focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/70"
        >
          {playing ? <Pause size={18} aria-hidden="true" /> : <Play size={18} aria-hidden="true" />}
        </button>
        {sheet}
      </>
    );
  }

  // Карточка: обложка/иконка + название + transport-кнопка
  return (
    <>
      <div
        ref={ref}
        className="glass h-full w-full p-2.5 flex items-center gap-2.5 overflow-hidden relative"
      >
        {cover && (
          <div
            className="absolute inset-0 pointer-events-none opacity-25"
            style={{
              backgroundImage: `url(${cover})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              filter: 'blur(22px)',
              transform: 'scale(1.2)',
            }}
            aria-hidden="true"
          />
        )}
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          aria-label={t('w.player.open')}
          className="relative flex items-center gap-2.5 min-w-0 flex-1 text-left rounded-md overflow-hidden focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/70"
        >
          {cover ? (
            <img
              src={cover}
              alt=""
              width={48}
              height={48}
              loading="lazy"
              className="w-12 h-12 rounded-md object-cover shrink-0"
            />
          ) : (
            <div className="w-12 h-12 rounded-md bg-black/10 dark:bg-white/10 flex items-center justify-center shrink-0">
              <GlanceIcon value="music" size={24} />
            </div>
          )}
          <div className="min-w-0 flex-1 overflow-hidden">
            <div className="text-[11px] text-text-tertiary truncate">
              {active?.name ?? label}
            </div>
            <MarqueeText className="text-sm font-medium block w-full">{title}</MarqueeText>
            {artist && (
              <MarqueeText className="text-[10px] text-text-tertiary block w-full">
                {artist}
              </MarqueeText>
            )}
          </div>
        </button>
        <PressButton
          onClick={togglePlay}
          disabled={!active}
          size={40}
          ariaLabel={playing ? t('w.player.pause') : t('w.player.play')}
          bg={playBg}
          bgPressed={playBgPressed}
        >
          {playing ? <Pause size={16} aria-hidden="true" /> : <Play size={16} aria-hidden="true" />}
        </PressButton>
      </div>
      {sheet}
    </>
  );
}
