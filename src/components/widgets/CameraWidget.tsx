'use client';

import { useEffect, useRef, useState } from 'react';
import { useEntity } from '@/lib/ha/ConnectionProvider';
import { useWidgetSize, sizeTier } from '@/lib/widgets/useWidgetSize';
import { Camera, Maximize2, X } from 'lucide-react';
import { getClient } from '@/lib/ha/client';
import { createPortal } from 'react-dom';

interface Params {
  entity: string;
  /** Подпись (если пусто — берётся friendly_name). */
  label?: string;
  /** Период обновления snapshot в секундах (для режима snapshot и фолбэка). */
  refreshSec?: number;
  /** Режим: auto (live с фолбэком на снимок), stream (только live), snapshot (только снимки). */
  mode?: 'auto' | 'stream' | 'snapshot';
  /** Заглушить аудио стрима. По умолчанию true. */
  muted?: boolean;
}

/**
 * Виджет «Камера» — live-стрим с HA-камеры через HLS, со снимком как фолбэк.
 *
 * Стратегия:
 *   1. WS-команда `camera/stream` запрашивает HLS-плейлист (HA Stream
 *      Integration сама перекодирует RTSP/ONVIF в HLS).
 *   2. Если URL получен — рендерим `<video>` через hls.js (Safari использует
 *      нативный HLS). Реальное живое видео, без «дёрганых» снимков.
 *   3. Если URL нет (камера без stream-source, отключённая интеграция и т.п.)
 *      — фолбэк на `entity_picture` + обновление по таймеру (как было до
 *      alpha.53). Покрывает дешёвые камеры/ESP.
 *
 * hls.js загружается через dynamic import — не утяжеляет initial bundle
 * для пользователей без камер.
 */
export function CameraWidget({ params }: { params: Params }) {
  const e = useEntity(params.entity);
  const [ref, size] = useWidgetSize();
  const tier = sizeTier(size);
  const [fullscreen, setFullscreen] = useState(false);

  const label = params.label ?? e?.attributes.friendly_name ?? 'Камера';
  const isUnavail = !e || e.state === 'unavailable' || e.state === 'unknown';
  const mode = params.mode ?? 'auto';
  const muted = params.muted ?? true;
  const refreshSec = Math.max(2, params.refreshSec ?? 10);

  if (!size.measured) {
    return <div ref={ref} className="glass h-full w-full" />;
  }

  if (isUnavail) {
    return (
      <div
        ref={ref}
        className="glass h-full w-full flex flex-col items-center justify-center gap-1 text-text-tertiary"
      >
        <Camera size={tier === 'tiny' ? 18 : 28} aria-hidden="true" />
        <div className="text-[10px] truncate text-center px-2">{label}</div>
        <div className="text-[9px] text-text-tertiary opacity-60">подключаюсь…</div>
      </div>
    );
  }

  // Tiny: маленькое превью со снимка (живое видео тут визуально неоправданно
  // — слишком мелко, и держать stream ради превью 80×64px — пустая нагрузка
  // на камеру).
  if (tier === 'tiny') {
    return (
      <button
        ref={ref as any}
        onClick={() => setFullscreen(true)}
        title={label}
        aria-label={`Открыть камеру ${label}`}
        className="glass h-full w-full overflow-hidden relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/70"
      >
        <SnapshotImage
          entity={params.entity}
          alt={`Снимок: ${label}`}
          refreshSec={refreshSec}
          className="absolute inset-0 w-full h-full object-cover"
          fallback={<Camera size={20} aria-hidden="true" />}
        />
        {fullscreen &&
          typeof document !== 'undefined' &&
          createPortal(
            <FullscreenView
              entity={params.entity}
              label={label}
              refreshSec={refreshSec}
              mode={mode}
              muted={muted}
              onClose={() => setFullscreen(false)}
            />,
            document.body,
          )}
      </button>
    );
  }

  return (
    <>
      <button
        ref={ref as any}
        onClick={() => setFullscreen(true)}
        title={label}
        aria-label={`Открыть камеру ${label}`}
        className="glass h-full w-full overflow-hidden relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/70"
      >
        <LiveOrSnapshot
          entity={params.entity}
          label={label}
          refreshSec={refreshSec}
          mode={mode}
          muted={muted}
          autoplay
          className="absolute inset-0 w-full h-full object-cover"
        />
        {/* Подпись и кнопка fullscreen — overlay поверх видео */}
        <div className="absolute inset-x-0 bottom-0 px-2 py-1.5 flex items-center justify-between gap-2 bg-gradient-to-t from-black/70 to-transparent">
          <div className="text-xs text-white/95 truncate">{label}</div>
          <Maximize2 size={14} className="text-white/85 shrink-0" aria-hidden="true" />
        </div>
        <div
          className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-emerald-400/80 animate-pulse"
          aria-hidden="true"
        />
      </button>

      {fullscreen &&
        typeof document !== 'undefined' &&
        createPortal(
          <FullscreenView
            entity={params.entity}
            label={label}
            refreshSec={refreshSec}
            mode={mode}
            muted={muted}
            onClose={() => setFullscreen(false)}
          />,
          document.body,
        )}
    </>
  );
}

function FullscreenView({
  entity,
  label,
  refreshSec,
  mode,
  muted,
  onClose,
}: {
  entity: string;
  label: string;
  refreshSec: number;
  mode: 'auto' | 'stream' | 'snapshot';
  muted: boolean;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[80] bg-black/95 flex items-center justify-center"
      onClick={onClose}
    >
      <button
        onClick={(ev) => {
          ev.stopPropagation();
          onClose();
        }}
        aria-label="Закрыть"
        className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-black/10 dark:bg-white/10 backdrop-blur-md text-white flex items-center justify-center hover:bg-black/20 dark:hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
      >
        <X size={18} aria-hidden="true" />
      </button>
      <div className="absolute top-4 left-4 z-10 px-3 py-1.5 rounded-full bg-black/10 dark:bg-white/10 backdrop-blur-md text-white text-sm">
        {label}
      </div>
      <LiveOrSnapshot
        entity={entity}
        label={label}
        refreshSec={refreshSec}
        mode={mode}
        muted={muted}
        autoplay
        className="max-w-full max-h-full object-contain"
      />
    </div>
  );
}

/**
 * Пробует получить HLS-стрим, при неудаче — снимок с периодическим
 * обновлением. Это сердце виджета.
 *
 * `mode='snapshot'` — не запрашиваем stream вообще, рендерим snapshot.
 * `mode='stream'` — только видео; если стрима нет, остаёмся на «подключение…»
 *   (не сваливаемся в snapshot — пользователь явно попросил видео).
 * `mode='auto'` — пробуем видео, при неудаче — snapshot.
 */
function LiveOrSnapshot({
  entity,
  label,
  refreshSec,
  mode,
  muted,
  autoplay,
  className,
}: {
  entity: string;
  label: string;
  refreshSec: number;
  mode: 'auto' | 'stream' | 'snapshot';
  muted: boolean;
  autoplay: boolean;
  className?: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [streamFailed, setStreamFailed] = useState(false);

  // Запрашиваем HLS URL один раз при mount (URL имеет долгий TTL — HA Stream
  // Integration держит транскод пока есть подписчики). Если URL вернулся —
  // показываем video, иначе фолбэк на snapshot ниже.
  useEffect(() => {
    if (mode === 'snapshot') return;
    let cancelled = false;
    setStreamUrl(null);
    setStreamFailed(false);
    getClient()
      .getCameraStreamUrl(entity)
      .then((url) => {
        if (cancelled) return;
        if (url) setStreamUrl(url);
        else setStreamFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [entity, mode]);

  // Когда URL готов и есть <video> — подключаем hls.js (или native Safari).
  useEffect(() => {
    if (!streamUrl) return;
    const video = videoRef.current;
    if (!video) return;

    let hls: { destroy: () => void } | null = null;

    // Safari (iOS / macOS) умеет HLS нативно — отдаём URL и не тащим hls.js.
    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = streamUrl;
      return () => {
        video.src = '';
      };
    }

    // Chrome / Firefox / Edge — через hls.js. Динамический импорт чтобы
    // ~50КБ библиотеки не сидели в основном бандле у пользователей без камер.
    let mounted = true;
    import('hls.js')
      .then((mod) => {
        if (!mounted) return;
        const Hls = mod.default;
        if (!Hls.isSupported()) {
          setStreamFailed(true);
          return;
        }
        const instance = new Hls({
          // Низкая latency: не буферизуем много, начинаем как можно ближе к
          // live edge. Для домашнего видеонаблюдения «отставание на 10 сек»
          // бессмысленно.
          lowLatencyMode: true,
          backBufferLength: 10,
        });
        instance.loadSource(streamUrl);
        instance.attachMedia(video);
        instance.on(Hls.Events.ERROR, (_e, data) => {
          if (data.fatal) {
            // Не пытаемся бесконечно реанимировать — переключаемся на
            // снимок. Пользователь нажмёт «обновить» (rerender) если что.
            instance.destroy();
            setStreamFailed(true);
          }
        });
        hls = instance;
      })
      .catch(() => setStreamFailed(true));

    return () => {
      mounted = false;
      if (hls) hls.destroy();
    };
  }, [streamUrl]);

  // Видео — если есть URL и режим не «только снимок».
  if (streamUrl && !streamFailed && mode !== 'snapshot') {
    return (
      <video
        ref={videoRef}
        autoPlay={autoplay}
        muted={muted}
        playsInline
        // Без controls — клик ведёт открытие fullscreen (через родительский button).
        className={className}
        aria-label={`Видео с камеры ${label}`}
      />
    );
  }

  // Если пользователь явно выбрал stream-only, а стрима нет — не падаем на
  // снимок (это противоречит его выбору), показываем заглушку.
  if (mode === 'stream') {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-text-tertiary">
        <Camera size={28} aria-hidden="true" />
        <div className="text-[10px]">
          {streamFailed ? 'видео недоступно' : 'подключаюсь…'}
        </div>
      </div>
    );
  }

  // Auto или snapshot: показываем снимок.
  return (
    <SnapshotImage
      entity={entity}
      alt={`Снимок: ${label}`}
      refreshSec={refreshSec}
      className={className}
      fallback={
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-text-tertiary">
          <Camera size={28} aria-hidden="true" />
          <div className="text-[10px]">снимок недоступен</div>
        </div>
      }
    />
  );
}

/**
 * Снимок с периодическим обновлением через `entity_picture`.
 * Используется как фолбэк когда HLS-стрим недоступен, и для tier='tiny'.
 */
function SnapshotImage({
  entity,
  alt,
  refreshSec,
  className,
  fallback,
}: {
  entity: string;
  alt: string;
  refreshSec: number;
  className?: string;
  fallback: React.ReactNode;
}) {
  const e = useEntity(entity);
  const [tick, setTick] = useState(0);
  const [errored, setErrored] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), refreshSec * 1000);
    return () => clearInterval(id);
  }, [refreshSec]);

  const haUrl = getClient().getUrl();
  const picture = e?.attributes.entity_picture as string | undefined;
  const imgSrc = haUrl && picture ? `${haUrl}${picture}&t=${tick}` : '';

  if (errored || !imgSrc) {
    return <>{fallback}</>;
  }
  return (
    <img src={imgSrc} alt={alt} className={className} onError={() => setErrored(true)} />
  );
}
