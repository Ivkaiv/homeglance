'use client';

import { useEffect, useRef, useState } from 'react';
import { ModalSheet } from '@/components/ui/ModalSheet';
import { PressButton } from '@/components/ui/PressButton';
import { useEntity, useCallService } from '@/lib/ha/ConnectionProvider';
import { useImageAccent } from '@/lib/useImageAccent';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  Volume1,
  VolumeX,
  Shuffle,
  Repeat,
  Repeat1,
  Radio,
  ChevronDown,
} from 'lucide-react';
import { ZAYCEV_CHANNELS, zaycevStreamUrl, type ZaycevBitrate } from '@/lib/zaycev';
import { useT } from '@/lib/i18n/I18nProvider';

// Битмаска SUPPORT_* из media_player в Home Assistant
const SUPPORT_PAUSE = 1;
const SUPPORT_SEEK = 2;
const SUPPORT_VOLUME_SET = 4;
const SUPPORT_VOLUME_MUTE = 8;
const SUPPORT_PREVIOUS_TRACK = 16;
const SUPPORT_NEXT_TRACK = 32;
const SUPPORT_PLAY = 16384;
const SUPPORT_SHUFFLE_SET = 32768;
const SUPPORT_REPEAT_SET = 262144;

function fmtTime(sec: number): string {
  if (!isFinite(sec) || sec < 0) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

interface Props {
  entityId: string;
  open: boolean;
  onClose: () => void;
  /** Показать ли сворачиваемую секцию радиоканалов Zaycev FM. */
  radio?: boolean;
  /** Битрейт радио-стрима. По умолчанию 128 kbps. */
  radioBitrate?: ZaycevBitrate;
}

/**
 * Расширенный попап-плеер: большая обложка, прогресс-бар, громкость,
 * shuffle/repeat и переключение источника. Открывается тапом по mini-плееру
 * в RoomHubWidget. Использует общую ModalSheet (нижняя шторка с focus-trap).
 */
export function MediaPlayerSheet({ entityId, open, onClose, radio, radioBitrate }: Props) {
  const t = useT();
  const e = useEntity(entityId);
  const callService = useCallService();
  // now нужен только чтобы пересчитывать прогресс «живым» при playing —
  // media_position в HA не тикает сам, его надо экстраполировать от
  // media_position_updated_at.
  const [now, setNow] = useState(() => Date.now());

  const playing = e?.state === 'playing';

  useEffect(() => {
    if (!open || !playing) return;
    const id = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(id);
  }, [open, playing]);

  // ── Радио (Zaycev FM) ──────────────────────────────────────────────
  // radioOpen — раскрыта ли секция со списком каналов (по умолчанию нет).
  // lastRequested — какой канал мы запросили последним: AlexxIT/YandexStation
  // прячет наш URL за proxy, поэтому media_content_id перестаёт указывать на
  // abs.zaycev.fm, и без локальной памяти подсветка активного канала не
  // работала бы.
  const [radioOpen, setRadioOpen] = useState(false);
  const [lastRequested, setLastRequested] = useState<string | null>(null);

  // Секция радио снова сворачивается при закрытии попапа — чтобы при
  // следующем открытии она была свёрнута, как и задумано по умолчанию.
  useEffect(() => {
    if (!open) setRadioOpen(false);
  }, [open]);

  // Сбрасываем «запомненный» канал, когда плеер ушёл в terminal-состояние
  // (off / idle / unavailable) — значит пользователь сам всё выключил.
  const stateStr = e?.state;
  useEffect(() => {
    if (lastRequested && stateStr && ['off', 'idle', 'unavailable'].includes(stateStr)) {
      setLastRequested(null);
    }
  }, [stateStr, lastRequested]);

  // Хуки должны вызываться до любого return — иначе React падает на смене состояния.
  const rawCover = e?.attributes.entity_picture as string | undefined;
  const coverForAccent = rawCover && rawCover.startsWith('http') ? rawCover : null;
  const accent = useImageAccent(coverForAccent);

  // Идентификатор текущего трека (для сброса экстраполяции при переключении).
  const trackIdRaw =
    (e?.attributes.media_content_id as string) ||
    (e?.attributes.media_title as string) ||
    '';
  const trackChangedAt = useRef<number>(Date.now());
  const prevTrackRef = useRef<string>(trackIdRaw);
  if (trackIdRaw !== prevTrackRef.current) {
    prevTrackRef.current = trackIdRaw;
    trackChangedAt.current = Date.now();
  }

  if (!e) {
    return (
      <ModalSheet open={open} onClose={onClose} title={t('w.mediaSheet.unavailable')} position="center">
        <div className="text-sm text-text-secondary">{t('w.mediaSheet.offlineBody')}</div>
      </ModalSheet>
    );
  }

  const a = e.attributes;
  const features = (a.supported_features as number) ?? 0;
  const has = (mask: number) => (features & mask) !== 0;

  const title = (a.media_title as string) || '—';
  const artist = (a.media_artist as string) || '';
  const album = (a.media_album_name as string) || '';
  const coverSrc = coverForAccent;

  const duration = (a.media_duration as number) ?? 0;
  const posBase = (a.media_position as number) ?? 0;
  const posUpdAt = a.media_position_updated_at as string | undefined;

  // HA при смене трека обновляет media_title почти сразу, а
  // media_position_updated_at — с задержкой ~1 сек, и за этот зазор мы
  // успеваем накрутить лишние секунды поверх старого updated_at. Игнорируем
  // экстраполяцию пока updMs не «свежее» момента смены трека (см. trackChangedAt
  // выше — он обновляется по trackIdRaw).
  let position = posBase;
  if (playing && posUpdAt) {
    const updMs = new Date(posUpdAt).getTime();
    // Доверяем updMs только если он не старше момента последней смены трека
    // (минус 500 мс, чтобы не дёргалось из-за рассинхрона часов).
    if (!Number.isNaN(updMs) && updMs >= trackChangedAt.current - 500) {
      position = posBase + (now - updMs) / 1000;
    }
  }
  if (duration > 0) position = Math.min(position, duration);
  if (position < 0) position = 0;

  const volume = (a.volume_level as number) ?? 0;
  const muted = (a.is_volume_muted as boolean) ?? false;
  const shuffle = (a.shuffle as boolean) ?? false;
  const repeat = ((a.repeat as string) ?? 'off') as 'off' | 'all' | 'one';
  const friendly = (a.friendly_name as string) ?? entityId;
  const appName = (a.app_name as string) ?? '';

  const cmd = (svc: string, data?: Record<string, unknown>) =>
    callService('media_player', svc, entityId, data);

  // Текущий радиоканал: прямое совпадение в media_content_id (если плеер не
  // прячет URL), либо локально запомненный канал (AlexxIT прячет за proxy).
  const radioMediaId = a.media_content_id as string | undefined;
  const radioDirectMatch = radioMediaId?.match(
    /abs\.zaycev\.fm\/(\w+?)(?:48|128|256)k/,
  )?.[1];
  const activeRadioChannel = radioDirectMatch || lastRequested || undefined;
  const radioBitrateValue: ZaycevBitrate = radioBitrate ?? '128k';
  const playRadio = (channelId: string) => {
    setLastRequested(channelId);
    cmd('play_media', {
      media_content_id: zaycevStreamUrl(channelId, radioBitrateValue),
      // 'stream.mp3' — AlexxIT/YandexStation требует именно такой тип, чтобы
      // понять что media_id — прямой HTTP-MP3 стрим, а не идентификатор трека.
      media_content_type: 'stream.mp3',
    });
  };

  // Подкрашиваем плеер цветом, добытым из обложки. Если обложки нет или CDN
  // не отдал CORS — возвращаемся к стандартному --accent темы (зелёный).
  const accentRgb = accent?.match(/\d+/g)?.join(' ') ?? null;
  const accentColor = accentRgb ? `rgb(${accentRgb})` : 'rgb(var(--accent))';
  const accentSoft = (op: number) =>
    accentRgb ? `rgb(${accentRgb} / ${op})` : `rgb(var(--accent) / ${op})`;

  const canPlayPause = has(SUPPORT_PLAY) || has(SUPPORT_PAUSE) || true; // фоллбэк всегда показываем

  return (
    <ModalSheet
      open={open}
      onClose={onClose}
      title={friendly}
      subtitle={appName || undefined}
      ariaLabel={t('w.mediaSheet.ariaLabel')}
      innerStyle={
        accent
          ? {
              // Свечение от обложки идёт через всё окно — растянутый radial
              // от верха к низу. Локальный gradient на блоке обложки имел
              // резкий обрыв снизу; перенесли в innerStyle ModalSheet, чтобы
              // плавно затухал вплоть до контролов и громкости.
              background: `radial-gradient(ellipse 90% 70% at 50% 0%, ${accentSoft(0.42)} 0%, ${accentSoft(0.18)} 30%, ${accentSoft(0.06)} 60%, transparent 92%), rgb(var(--bg-secondary))`,
            }
          : undefined
      }
    >
      <div className="relative flex flex-col items-center gap-4 mb-5 pt-2 pb-3">
        <div className="relative">
          {coverSrc ? (
            <img
              src={coverSrc}
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
        </div>
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

      {/* Прогресс-бар. Рендерится ВСЕГДА — иначе при переключении трека блок
          на секунду исчезает (HA шлёт duration=0 в момент смены), и контент
          ниже прыгает. Когда длительность неизвестна — полоска просто серая,
          а вместо времени прочерки. Кликабельная зона расширена до h-7 за
          счёт прозрачного padding'а — чтобы попадать пальцем; сама полоса
          1.5px по центру. */}
      {(() => {
        const hasTime = duration > 0;
        const widthPct = hasTime ? Math.min(100, (position / duration) * 100) : 0;
        const canSeek = hasTime && has(SUPPORT_SEEK);
        const handleSeek = (clientX: number, rect: DOMRect) => {
          if (!canSeek) return;
          const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
          cmd('media_seek', { seek_position: pct * duration });
        };
        return (
          <div className="mb-5">
            <div
              className={`relative h-7 -my-2 flex items-center ${canSeek ? 'cursor-pointer' : ''}`}
              role={canSeek ? 'slider' : undefined}
              aria-label={canSeek ? t('w.mediaSheet.seekAriaLabel') : undefined}
              aria-valuemin={canSeek ? 0 : undefined}
              aria-valuemax={canSeek ? Math.round(duration) : undefined}
              aria-valuenow={canSeek ? Math.round(position) : undefined}
              onPointerDown={(ev) => {
                if (!canSeek) return;
                ev.currentTarget.setPointerCapture(ev.pointerId);
                handleSeek(ev.clientX, ev.currentTarget.getBoundingClientRect());
              }}
              onPointerMove={(ev) => {
                if (!canSeek) return;
                if (ev.buttons === 0) return; // только при зажатой кнопке/пальце
                handleSeek(ev.clientX, ev.currentTarget.getBoundingClientRect());
              }}
            >
              <div className="relative h-1.5 w-full rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
                <div
                  className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-500"
                  style={{
                    width: `${widthPct}%`,
                    background: hasTime ? accentColor : 'rgb(0 0 0 / 0.2)',
                  }}
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

      {/* Кнопки управления */}
      <div className="flex items-center justify-center gap-3 mb-5">
        {has(SUPPORT_SHUFFLE_SET) && (
          <PressButton
            size={40}
            ariaLabel={shuffle ? t('w.mediaSheet.shuffleOff') : t('w.mediaSheet.shuffleOn')}
            onClick={() => cmd('shuffle_set', { shuffle: !shuffle })}
          >
            <Shuffle
              size={16}
              aria-hidden="true"
              style={shuffle ? { color: accentColor } : undefined}
            />
          </PressButton>
        )}
        {has(SUPPORT_PREVIOUS_TRACK) && (
          <PressButton
            size={48}
            ariaLabel={t('w.player.previous')}
            onClick={() => cmd('media_previous_track')}
          >
            <SkipBack size={20} aria-hidden="true" />
          </PressButton>
        )}
        {canPlayPause && (
          <PressButton
            size={64}
            ariaLabel={playing ? t('w.player.pause') : t('w.player.play')}
            bg={accentSoft(0.25)}
            bgPressed={accentSoft(0.45)}
            onClick={() => cmd(playing ? 'media_pause' : 'media_play')}
          >
            {playing ? (
              <Pause size={26} aria-hidden="true" />
            ) : (
              <Play size={26} aria-hidden="true" />
            )}
          </PressButton>
        )}
        {has(SUPPORT_NEXT_TRACK) && (
          <PressButton
            size={48}
            ariaLabel={t('w.player.next')}
            onClick={() => cmd('media_next_track')}
          >
            <SkipForward size={20} aria-hidden="true" />
          </PressButton>
        )}
        {has(SUPPORT_REPEAT_SET) && (
          <PressButton
            size={40}
            ariaLabel={t('w.mediaSheet.repeatAriaLabel')}
            onClick={() => {
              const next = repeat === 'off' ? 'all' : repeat === 'all' ? 'one' : 'off';
              cmd('repeat_set', { repeat: next });
            }}
          >
            {repeat === 'one' ? (
              <Repeat1 size={16} aria-hidden="true" style={{ color: accentColor }} />
            ) : (
              <Repeat
                size={16}
                aria-hidden="true"
                style={repeat !== 'off' ? { color: accentColor } : undefined}
              />
            )}
          </PressButton>
        )}
      </div>

      {/* Громкость */}
      {(has(SUPPORT_VOLUME_SET) || has(SUPPORT_VOLUME_MUTE)) && (
        <div className="flex items-center gap-3 mb-5">
          {has(SUPPORT_VOLUME_MUTE) && (
            <PressButton
              size={36}
              ariaLabel={muted ? t('w.player.unmute') : t('w.player.mute')}
              onClick={() => cmd('volume_mute', { is_volume_muted: !muted })}
            >
              {muted ? (
                <VolumeX size={14} aria-hidden="true" />
              ) : volume < 0.4 ? (
                <Volume1 size={14} aria-hidden="true" />
              ) : (
                <Volume2 size={14} aria-hidden="true" />
              )}
            </PressButton>
          )}
          {has(SUPPORT_VOLUME_SET) && (
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={muted ? 0 : volume}
              onChange={(ev) =>
                cmd('volume_set', { volume_level: parseFloat(ev.target.value) })
              }
              aria-label={t('w.player.volume')}
              className="flex-1"
              style={{ accentColor: accentColor }}
            />
          )}
          <span className="text-xs text-text-tertiary tabular-nums w-10 text-right">
            {Math.round((muted ? 0 : volume) * 100)}%
          </span>
        </div>
      )}

      {/* Радио — сворачиваемая секция с каналами Zaycev FM. Появляется
          только если в настройках виджета включена галочка «Радио». */}
      {radio && (
        <div className="border-t border-black/5 dark:border-white/5 pt-1">
          <button
            type="button"
            onClick={() => setRadioOpen((v) => !v)}
            aria-expanded={radioOpen}
            className="w-full flex items-center gap-2 py-2 px-1 rounded-lg text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-black/5 dark:hover:bg-white/5 transition focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/70"
          >
            <Radio size={16} aria-hidden="true" />
            <span className="flex-1 text-left">{t('w.mediaSheet.radioSection')}</span>
            {activeRadioChannel && !radioOpen && (
              <span className="text-xs text-text-tertiary truncate max-w-[40%]">
                {ZAYCEV_CHANNELS.find((c) => c.id === activeRadioChannel)?.name}
              </span>
            )}
            <ChevronDown
              size={16}
              aria-hidden="true"
              className="shrink-0 transition-transform"
              style={radioOpen ? { transform: 'rotate(180deg)' } : undefined}
            />
          </button>
          {radioOpen && (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mt-2 mb-1">
              {ZAYCEV_CHANNELS.map((ch) => {
                const active = activeRadioChannel === ch.id;
                return (
                  <button
                    key={ch.id}
                    type="button"
                    onClick={() => playRadio(ch.id)}
                    aria-label={t('w.mediaSheet.playChannel', { name: ch.name })}
                    className={`flex flex-col items-center justify-center gap-1 py-2.5 px-1 rounded-lg border transition focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/70 ${
                      active
                        ? ''
                        : 'bg-black/5 dark:bg-white/5 border-black/10 dark:border-white/10 hover:bg-black/10 dark:hover:bg-white/10'
                    }`}
                    style={
                      active
                        ? {
                            background: accentSoft(0.15),
                            borderColor: accentSoft(0.4),
                            boxShadow: `0 0 16px ${accentSoft(0.35)}`,
                          }
                        : undefined
                    }
                  >
                    <span className="text-2xl leading-none" aria-hidden="true">
                      {ch.emoji}
                    </span>
                    <span
                      className="text-[11px] leading-tight truncate w-full text-center px-0.5"
                      style={active ? { color: accentColor } : undefined}
                    >
                      {ch.name}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

    </ModalSheet>
  );
}
