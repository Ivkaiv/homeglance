'use client';

import { useState } from 'react';
import { useEntity, useCallService } from '@/lib/ha/ConnectionProvider';
import { useWidgetSize, sizeTier } from '@/lib/widgets/useWidgetSize';
import { useImageAccent } from '@/lib/useImageAccent';
import { GlanceIcon } from '@/components/icons/MdiIcon';
import { MarqueeText } from '@/components/ui/MarqueeText';
import { PressButton } from '@/components/ui/PressButton';
import { MediaPlayerSheet } from './MediaPlayerSheet';
import { Play, Pause, SkipBack, SkipForward, Volume2 } from 'lucide-react';

interface Params {
  entity: string;
  label?: string;
  icon?: string;
  /** Показать ли в попапе плеера секцию радиоканалов Zaycev FM. */
  radio?: boolean;
  /** Битрейт радио-стрима — 48/128/256 kbps. По умолчанию 128. */
  radioBitrate?: '48k' | '128k' | '256k';
}

export function MediaPlayerWidget({ params }: { params: Params }) {
  const e = useEntity(params.entity);
  const callService = useCallService();
  const [ref, size] = useWidgetSize();
  const tier = sizeTier(size);
  const [sheetOpen, setSheetOpen] = useState(false);
  const openSheet = () => setSheetOpen(true);
  const sheet = (
    <MediaPlayerSheet
      entityId={params.entity}
      open={sheetOpen}
      onClose={() => setSheetOpen(false)}
      radio={params.radio}
      radioBitrate={params.radioBitrate}
    />
  );

  const isBad = !e || e.state === 'unavailable' || e.state === 'unknown' || e.state === 'off';
  const label = params.label ?? e?.attributes.friendly_name ?? 'Плеер';
  const playing = e?.state === 'playing';
  const title = e?.attributes.media_title || '—';
  const artist = e?.attributes.media_artist || '';
  const cover = e?.attributes.entity_picture as string | undefined;
  const volume = e?.attributes.volume_level ?? 0;

  // Цветовая подсветка от обложки — как у mini-плеера в RoomHubWidget и
  // у полноэкранного MediaPlayerSheet. До alpha.46 в standalone-виджете её
  // не было, и плеер выглядел нейтральным «стеклом», тогда как тот же
  // entity в RoomHub светился по обложке. Берём accent только когда cover
  // — полный URL (HA-relative `/api/...` не проходит CORS у useImageAccent).
  const coverForAccent = cover?.startsWith('http') ? cover : null;
  const mediaAccent = useImageAccent(coverForAccent);
  const accentRgb = mediaAccent?.match(/\d+/g)?.join(' ') ?? null;
  const playBg = accentRgb ? `rgb(${accentRgb} / 0.25)` : 'rgb(var(--accent) / 0.25)';
  const playBgPressed = accentRgb ? `rgb(${accentRgb} / 0.45)` : 'rgb(var(--accent) / 0.45)';
  const accentGlow = accentRgb
    ? {
        borderColor: `rgb(${accentRgb} / 0.35)`,
        boxShadow: `0 0 18px rgb(${accentRgb} / 0.18)`,
      }
    : undefined;

  const cmd = (service: string, data?: any) =>
    callService('media_player', service, params.entity, data);

  const haIcon = e?.attributes.icon as string | undefined;
  const iconValue = params.icon || haIcon || 'music';
  const playPauseLabel = playing ? 'Пауза' : 'Воспроизвести';

  if (!size.measured) {
    return <div ref={ref} className="glass h-full w-full" />;
  }

  if (tier === 'tiny') {
    return (
      <>
        <button
          ref={ref}
          onClick={() => cmd(playing ? 'media_pause' : 'media_play')}
          disabled={isBad}
          title={label}
          aria-label={playPauseLabel}
          className="glass h-full w-full flex items-center justify-center disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/70"
        >
          {playing ? <Pause size={18} aria-hidden="true" /> : <Play size={18} aria-hidden="true" />}
        </button>
        {sheet}
      </>
    );
  }

  if (tier === 'small') {
    return (
      <>
        <div
          ref={ref}
          className="glass h-full w-full p-2 flex flex-col items-center justify-center gap-1"
        >
          <button
            type="button"
            onClick={openSheet}
            aria-label="Открыть плеер"
            className="rounded-md focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/70"
          >
            {cover ? (
              <img
                src={cover}
                alt={title ? `Обложка: ${title}` : ''}
                width={40}
                height={40}
                loading="lazy"
                className="w-10 h-10 rounded-md object-cover"
              />
            ) : (
              <GlanceIcon value={iconValue} size={28} />
            )}
          </button>
          <PressButton
            onClick={() => cmd(playing ? 'media_pause' : 'media_play')}
            disabled={isBad}
            size={32}
            ariaLabel={playPauseLabel}
          >
            {playing ? <Pause size={14} aria-hidden="true" /> : <Play size={14} aria-hidden="true" />}
          </PressButton>
        </div>
        {sheet}
      </>
    );
  }

  // medium / large: горизонтальный layout с обложкой, title, контролами
  const isShort = size.h < 130;
  const showPrevNext = size.w >= 200;
  const showCover = size.w >= 180;
  const showVolume = !isShort && size.w >= 220 && size.h >= 180;
  const coverPx = isShort ? Math.min(size.h - 16, 60) : 48;

  if (isShort) {
    return (
      <>
      <div
        ref={ref}
        className="glass h-full w-full p-2 flex items-center gap-2 overflow-hidden relative"
        style={accentGlow}
      >
        {coverForAccent && (
          <div
            className="absolute inset-0 pointer-events-none opacity-25"
            style={{
              backgroundImage: `url(${coverForAccent})`,
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
          onClick={openSheet}
          aria-label="Открыть плеер"
          className="relative flex items-center gap-2 min-w-0 flex-1 text-left rounded-md overflow-hidden focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/70"
        >
          {showCover && (
            cover ? (
              <img
                src={cover}
                alt={title ? `Обложка: ${title}` : ''}
                width={coverPx}
                height={coverPx}
                loading="lazy"
                className="rounded-md object-cover shrink-0"
                style={{ width: coverPx, height: coverPx }}
              />
            ) : (
              <div
                className="rounded-md bg-black/10 dark:bg-white/10 flex items-center justify-center shrink-0"
                style={{ width: coverPx, height: coverPx }}
              >
                <GlanceIcon value={iconValue} size={Math.round(coverPx * 0.5)} />
              </div>
            )
          )}
          <div className="min-w-0 flex-1 overflow-hidden">
            <MarqueeText className="text-sm font-medium block w-full">{title}</MarqueeText>
            {artist && (
              <MarqueeText className="text-[10px] text-text-tertiary block w-full">{artist}</MarqueeText>
            )}
          </div>
        </button>
        <div className="relative flex items-center gap-1 shrink-0">
          {showPrevNext && (
            <PressButton
              onClick={() => cmd('media_previous_track')}
              disabled={isBad}
              size={32}
              ariaLabel="Предыдущий"
            >
              <SkipBack size={12} aria-hidden="true" />
            </PressButton>
          )}
          <PressButton
            onClick={() => cmd(playing ? 'media_pause' : 'media_play')}
            disabled={isBad}
            size={36}
            ariaLabel={playPauseLabel}
            bg={playBg}
            bgPressed={playBgPressed}
          >
            {playing ? <Pause size={14} aria-hidden="true" /> : <Play size={14} aria-hidden="true" />}
          </PressButton>
          {showPrevNext && (
            <PressButton
              onClick={() => cmd('media_next_track')}
              disabled={isBad}
              size={32}
              ariaLabel="Следующий"
            >
              <SkipForward size={12} aria-hidden="true" />
            </PressButton>
          )}
        </div>
      </div>
      {sheet}
      </>
    );
  }

  // Вертикальный layout (h>=130)
  return (
    <>
    <div
      ref={ref}
      className="glass h-full w-full p-3 flex flex-col gap-2 overflow-hidden relative"
      style={accentGlow}
    >
      {coverForAccent && (
        <div
          className="absolute inset-0 pointer-events-none opacity-25"
          style={{
            backgroundImage: `url(${coverForAccent})`,
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
        onClick={openSheet}
        aria-label="Открыть плеер"
        className="relative flex gap-3 items-center min-w-0 w-full shrink-0 text-left rounded-md overflow-hidden focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/70"
      >
        {showCover && (
          <div className="shrink-0">
            {cover ? (
              <img
                src={cover}
                alt={title ? `Обложка: ${title}` : ''}
                width={48}
                height={48}
                loading="lazy"
                className="w-12 h-12 rounded-md object-cover"
              />
            ) : (
              <div className="w-12 h-12 rounded-md bg-black/10 dark:bg-white/10 flex items-center justify-center">
                <GlanceIcon value={iconValue} size={24} />
              </div>
            )}
          </div>
        )}
        <div className="min-w-0 flex-1 overflow-hidden">
          <div className="text-xs text-text-tertiary truncate">{label}</div>
          <MarqueeText className="text-sm font-medium block w-full">{title}</MarqueeText>
          {artist && (
            <MarqueeText className="text-[10px] text-text-tertiary block w-full">{artist}</MarqueeText>
          )}
        </div>
      </button>

      <div className="relative flex items-center justify-center gap-1.5 my-auto shrink-0">
        {showPrevNext && (
          <PressButton
            onClick={() => cmd('media_previous_track')}
            disabled={isBad}
            size={36}
            ariaLabel="Предыдущий"
          >
            <SkipBack size={14} aria-hidden="true" />
          </PressButton>
        )}
        <PressButton
          onClick={() => cmd(playing ? 'media_pause' : 'media_play')}
          disabled={isBad}
          size={44}
          ariaLabel={playPauseLabel}
          bg={playBg}
          bgPressed={playBgPressed}
        >
          {playing ? <Pause size={18} aria-hidden="true" /> : <Play size={18} aria-hidden="true" />}
        </PressButton>
        {showPrevNext && (
          <PressButton
            onClick={() => cmd('media_next_track')}
            disabled={isBad}
            size={36}
            ariaLabel="Следующий"
          >
            <SkipForward size={14} aria-hidden="true" />
          </PressButton>
        )}
      </div>

      {showVolume && (
        <div className="relative flex items-center gap-2 mt-1 min-w-0 shrink-0">
          <Volume2 size={12} className="text-text-tertiary shrink-0" aria-hidden="true" />
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={volume}
            onChange={(ev) => cmd('volume_set', { volume_level: Number(ev.target.value) })}
            disabled={isBad}
            aria-label="Громкость"
            className="no-drag flex-1 min-w-0 accent-accent"
          />
          <span className="text-[10px] text-text-tertiary tabular-nums w-8 text-right shrink-0">
            {Math.round(volume * 100)}%
          </span>
        </div>
      )}
    </div>
    {sheet}
    </>
  );
}
