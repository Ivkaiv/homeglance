'use client';

import { useEffect, useState } from 'react';
import { useEntity } from '@/lib/ha/ConnectionProvider';
import { useWidgetSize, sizeTier } from '@/lib/widgets/useWidgetSize';
import { Camera, Maximize2, X } from 'lucide-react';
import { getClient } from '@/lib/ha/client';
import { createPortal } from 'react-dom';

interface Params {
  entity: string;
  /** Подпись (если пусто — берётся friendly_name). */
  label?: string;
  /** Период обновления снимка в секундах. По умолчанию 10. */
  refreshSec?: number;
}

/**
 * Виджет «Камера» — снимок с HA-камеры.
 * Использует `entity_picture` атрибут (подписанный URL с токеном),
 * перезапрашивает каждые `refreshSec` секунд.
 *
 * Клик — открывает fullscreen-режим с обновлением раз в 1с.
 *
 * Pro-tip: для live-видео нужен go2rtc/WebRTC — пока не реализовано
 * (там сложнее, нужен gateway). Для большинства домашних камер снимок
 * каждые 5-10с покрывает «глянуть что во дворе».
 */
export function CameraWidget({ params }: { params: Params }) {
  const e = useEntity(params.entity);
  const [ref, size] = useWidgetSize();
  const tier = sizeTier(size);
  const [tick, setTick] = useState(0);
  const [errored, setErrored] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);

  const refreshSec = Math.max(2, params.refreshSec ?? 10);
  const label = params.label ?? e?.attributes.friendly_name ?? 'Камера';
  const isUnavail = !e || e.state === 'unavailable' || e.state === 'unknown';

  // Тик для обновления снимка
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), refreshSec * 1000);
    return () => clearInterval(id);
  }, [refreshSec]);

  // Тик в fullscreen — каждую секунду
  useEffect(() => {
    if (!fullscreen) return;
    const id = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, [fullscreen]);

  if (!size.measured) {
    return <div ref={ref} className="glass h-full w-full" />;
  }

  const haUrl = getClient().getUrl();
  const picture = e?.attributes.entity_picture as string | undefined;
  const imgSrc = haUrl && picture ? `${haUrl}${picture}&t=${tick}` : '';

  if (isUnavail || !imgSrc) {
    return (
      <div
        ref={ref}
        className="glass h-full w-full flex flex-col items-center justify-center gap-1 text-text-tertiary"
      >
        <Camera size={tier === 'tiny' ? 18 : 28} aria-hidden="true" />
        <div className="text-[10px] truncate text-center px-2">{label}</div>
        {!isUnavail && (
          <div className="text-[9px] text-text-tertiary opacity-60">подключаюсь…</div>
        )}
      </div>
    );
  }

  // Tiny: маленькое превью + иконка камеры по центру (для быстрого взгляда)
  if (tier === 'tiny') {
    return (
      <button
        ref={ref as any}
        onClick={() => setFullscreen(true)}
        title={label}
        aria-label={`Открыть камеру ${label}`}
        className="glass h-full w-full overflow-hidden relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/70"
      >
        {!errored && (
          <img
            src={imgSrc}
            alt={`Снимок: ${label}`}
            className="absolute inset-0 w-full h-full object-cover"
            onError={() => setErrored(true)}
          />
        )}
        {errored && (
          <div className="w-full h-full flex items-center justify-center text-text-tertiary">
            <Camera size={20} aria-hidden="true" />
          </div>
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
        {!errored && (
          <img
            src={imgSrc}
            alt={`Снимок: ${label}`}
            className="absolute inset-0 w-full h-full object-cover"
            onError={() => setErrored(true)}
          />
        )}
        {errored && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-text-tertiary">
            <Camera size={28} aria-hidden="true" />
            <div className="text-[10px]">снимок недоступен</div>
          </div>
        )}
        {/* Подпись и кнопка fullscreen — overlay поверх снимка */}
        <div className="absolute inset-x-0 bottom-0 px-2 py-1.5 flex items-center justify-between gap-2 bg-gradient-to-t from-black/70 to-transparent">
          <div className="text-xs text-white/95 truncate">{label}</div>
          <Maximize2 size={14} className="text-white/85 shrink-0" aria-hidden="true" />
        </div>
        <div className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-emerald-400/80 animate-pulse" aria-hidden="true" />
      </button>

      {fullscreen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="fixed inset-0 z-[80] bg-black/95 flex items-center justify-center"
            onClick={() => setFullscreen(false)}
          >
            <button
              onClick={(ev) => {
                ev.stopPropagation();
                setFullscreen(false);
              }}
              aria-label="Закрыть"
              className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-black/10 dark:bg-white/10 backdrop-blur-md text-white flex items-center justify-center hover:bg-black/20 dark:hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
            >
              <X size={18} aria-hidden="true" />
            </button>
            <div className="absolute top-4 left-4 z-10 px-3 py-1.5 rounded-full bg-black/10 dark:bg-white/10 backdrop-blur-md text-white text-sm">
              {label}
            </div>
            {!errored ? (
              <img
                src={imgSrc}
                alt={`Снимок: ${label}`}
                className="max-w-full max-h-full object-contain"
                onError={() => setErrored(true)}
              />
            ) : (
              <div className="text-white/70 flex flex-col items-center gap-2">
                <Camera size={48} aria-hidden="true" />
                <div className="text-sm">камера недоступна</div>
              </div>
            )}
          </div>,
          document.body
        )}
    </>
  );
}
