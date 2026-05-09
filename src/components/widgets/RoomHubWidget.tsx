'use client';

import { useState } from 'react';
import clsx from 'clsx';
import { useStates, useCallService } from '@/lib/ha/ConnectionProvider';
import { useWidgetSize, sizeTier } from '@/lib/widgets/useWidgetSize';
import { GlanceIcon } from '@/components/icons/MdiIcon';
import { PressButton } from '@/components/ui/PressButton';
import { Play, Pause, Plus, Minus, SkipForward, SkipBack } from 'lucide-react';
import { SensorChip } from './SensorChip';
import { SensorIconBadge } from './SensorIconBadge';
import { SensorHistoryButton } from '@/components/charts/SensorHistoryButton';
import { MediaPlayerSheet } from './MediaPlayerSheet';
import { ClimateSheet } from './ClimateSheet';
import { useImageAccent } from '@/lib/useImageAccent';
import { detectSensorType, getSensorPreset } from '@/lib/sensor/presets';

interface Params {
  name: string;
  icon?: string;
  tempEntity?: string;
  humidityEntity?: string;
  showTemp?: boolean;
  showHumidity?: boolean;
  lights?: string[];
  switches?: string[];
  lightIcons?: Record<string, string>;
  switchIcons?: Record<string, string>;
  /** Плеер для встраивания компактной полоски управления внутри карточки. */
  mediaPlayerEntity?: string;
  /** Климат-сущности (climate.*) для встраивания компактных степперов температуры. */
  climateEntities?: string[];
  /** Шаг изменения температуры для climate-степперов. По умолчанию 1. */
  climateStep?: number;
  /** Дополнительные «умные» сенсоры (sensor.*, binary_sensor.*) — отображаются
   *  как компактные чипы с авто-распознаванием типа: давление, освещённость,
   *  CO₂, дверь, окно, движение и т.д. */
  sensorEntities?: string[];
}

function fmt(n: any, unit = ''): string {
  if (n === undefined || n === null || n === 'unavailable' || n === 'unknown') return '—';
  const num = Number(n);
  if (Number.isNaN(num)) return String(n);
  return `${Math.round(num)}${unit}`;
}

export function RoomHubWidget({ params }: { params: Params }) {
  const states = useStates();
  const callService = useCallService();
  const [ref, size] = useWidgetSize();
  const tier = sizeTier(size);
  const [mediaSheetOpen, setMediaSheetOpen] = useState(false);
  const [climateSheetEntity, setClimateSheetEntity] = useState<string | null>(null);

  // Цвет, извлечённый из обложки текущего трека — подкрашивает мини-плеер
  // (рамка, кнопка play). Хук вызываем тут, в основном теле — нельзя внутри
  // IIFE ниже, иначе нарушит правило вызова хуков.
  const mediaCover = params.mediaPlayerEntity
    ? (states[params.mediaPlayerEntity]?.attributes.entity_picture as string | undefined)
    : undefined;
  const mediaCoverForAccent = mediaCover && mediaCover.startsWith('http') ? mediaCover : null;
  const mediaAccent = useImageAccent(mediaCoverForAccent);
  const mediaAccentRgb = mediaAccent?.match(/\d+/g)?.join(' ') ?? null;

  const lights = Array.isArray(params.lights) ? params.lights : [];
  const switches = Array.isArray(params.switches) ? params.switches : [];

  // Делим сенсоры на бинарные (door/window/motion/...) и числовые
  // (давление/освещённость/CO₂/...).
  // Бинарные — мини-иконки в шапке (информер, не занимает строку).
  // Числовые — полные чипы в отдельной info-row.
  const allSensors = Array.isArray(params.sensorEntities) ? params.sensorEntities : [];
  const binarySensors: string[] = [];
  const numericSensors: string[] = [];
  for (const sid of allSensors) {
    const e = states[sid];
    const t = detectSensorType(e);
    const preset = getSensorPreset(t);
    if (preset.binary) binarySensors.push(sid);
    else numericSensors.push(sid);
  }

  // Если флаг показа явно false — игнорируем entity. По умолчанию показываем
  // (для совместимости со старыми виджетами, где показ был неявно включён).
  const showTemp = params.showTemp !== false;
  const showHumidity = params.showHumidity !== false;
  const t = showTemp && params.tempEntity ? states[params.tempEntity]?.state : undefined;
  const h = showHumidity && params.humidityEntity ? states[params.humidityEntity]?.state : undefined;
  const lightsOn = lights.filter((id) => states[id]?.state === 'on').length;
  const switchesOn = switches.filter((id) => states[id]?.state === 'on').length;
  const isActive = lightsOn > 0 || switchesOn > 0;

  const baseStyle =
    lightsOn > 0
      ? { boxShadow: '0 0 32px rgba(251, 191, 36, 0.22), 0 4px 30px rgba(0,0,0,0.3)' }
      : isActive
        ? { boxShadow: '0 0 24px rgba(96, 165, 250, 0.18)' }
        : undefined;

  const allBtns: Array<{ kind: 'light' | 'switch'; id: string }> = [
    ...lights.map((id) => ({ kind: 'light' as const, id })),
    ...switches.map((id) => ({ kind: 'switch' as const, id })),
  ];

  if (!size.measured) {
    return <div ref={ref} className="glass h-full w-full" />;
  }

  if (tier === 'tiny') {
    return (
      <div
        ref={ref}
        className={clsx('glass h-full w-full flex items-center justify-center', isActive && 'glass-active')}
        style={baseStyle}
        title={params.name}
      >
        <GlanceIcon value={params.icon} size={28} fallback="🏠" />
      </div>
    );
  }

  // Quick-look режим — очень низкий виджет (h<70). Одна строка:
  // [🏠 Имя] [22° • активна]. Без кнопок, без плеера, без сенсоров —
  // только статус «состояния комнаты». Идеально для быстрого взгляда.
  if (size.h < 70) {
    return (
      <div
        ref={ref}
        className={clsx(
          'glass h-full w-full px-3 flex items-center gap-2 overflow-hidden',
          isActive && 'glass-active'
        )}
        style={baseStyle}
        title={`${params.name}${t !== undefined ? ` · ${fmt(t, '°')}` : ''}`}
      >
        <GlanceIcon value={params.icon} size={20} fallback="🏠" />
        <div className="text-sm font-medium truncate flex-1 min-w-0">{params.name}</div>
        {t !== undefined && (
          <span className="text-base font-semibold tabular-nums shrink-0">{fmt(t, '°')}</span>
        )}
        {isActive && (
          <span
            className="w-2 h-2 rounded-full shrink-0"
            style={{ background: 'rgb(var(--accent))', boxShadow: '0 0 8px rgb(var(--accent) / 0.7)' }}
            aria-label="активна"
          />
        )}
      </div>
    );
  }

  if (tier === 'small') {
    return (
      <div
        ref={ref}
        className={clsx(
          'glass h-full w-full p-2 flex flex-col items-center justify-center gap-0.5',
          isActive && 'glass-active'
        )}
        style={baseStyle}
        title={params.name}
      >
        <GlanceIcon value={params.icon} size={28} fallback="🏠" />
        {t !== undefined && (
          <span className="text-sm font-semibold tabular-nums">{fmt(t, '°')}</span>
        )}
      </div>
    );
  }

  // medium / large — header + сетка кнопок.
  // ВАЖНО: padding и размеры шапки **константны** (pad=10, headerH=24) —
  // тогда «шапка» во всех виджетах визуально одинаковая, не «дышит» иначе
  // на Дворе (h=3) и Кухне (h=7). Сжимаем только innerGap между секциями
  // body для компактных виджетов — это даёт больше места кнопкам, не
  // ломая раскладку шапки.
  const isCompact = size.h < 160;
  const gap = 6;
  const pad = 10;
  const headerH = 24;
  // innerGap = расстояние между шапкой и кнопками. На мелких виджетах
  // 6px смотрится слишком тесно — даём 10px всегда, чтобы шапка дышала.
  const innerGap = 10;

  // PWA-стиль: круглые 48px в large, 44 в medium. Кнопки — главное в виджете,
  // не ужимаем их (пробовали — пользователь не любит мелкие). При совсем малой
  // высоте (h<70) — quick-look режим без кнопок, выше — всегда 44/48.
  let btnSize = tier === 'large' ? 48 : 44;

  // Доступная высота под кнопки (с учётом header+padding+gap):
  const baseAvailH = Math.max(0, size.h - pad * 2 - headerH - innerGap);

  // Опциональные элементы: показываем только если все они + кнопки помещаются.
  // Приоритет: сначала прячем sensors-row, потом media-row.
  // Только числовые сенсоры — для info-row. Бинарные идут в шапку отдельно.
  const sensorsCount = numericSensors.length;
  const hasMediaPlayer =
    !!params.mediaPlayerEntity &&
    size.h >= 130 &&
    !!states[params.mediaPlayerEntity!] &&
    (states[params.mediaPlayerEntity!]?.state === 'playing' ||
      states[params.mediaPlayerEntity!]?.state === 'paused');

  // Высоты опциональных рядов
  const sensorRowH = sensorsCount > 0 && size.h >= 110 ? 28 + innerGap : 0;
  const mediaRowH = hasMediaPlayer ? 64 + innerGap : 0;
  const minBtnRowH = btnSize + 4;

  // Решаем что показывать. Кнопки — всегда (если высоты на них хватает).
  let showSensors = sensorRowH > 0 && baseAvailH - mediaRowH - sensorRowH >= minBtnRowH;
  let showMedia = mediaRowH > 0;
  if (showMedia && baseAvailH - mediaRowH - (showSensors ? sensorRowH : 0) < minBtnRowH) {
    // Если плеер играет, но места нет — отключаем сенсоры. Если всё равно мало — отключаем плеер.
    showSensors = false;
    if (baseAvailH - mediaRowH < minBtnRowH) {
      showMedia = false;
    }
  }

  const availH = Math.max(
    0,
    baseAvailH - (showMedia ? mediaRowH : 0) - (showSensors ? sensorRowH : 0)
  );

  const availW = Math.max(40, size.w - pad * 2);
  const perRow = Math.max(1, Math.floor((availW + gap) / (btnSize + gap)));
  const maxRows = Math.max(1, Math.floor((availH + gap) / (btnSize + gap)));
  const maxBtns = perRow * maxRows;
  const overflow = Math.max(0, allBtns.length - maxBtns);
  const visibleBtns = overflow > 0 ? allBtns.slice(0, maxBtns - 1) : allBtns;

  // Адаптивные пороги:
  // - Шапка: при w<200 убираем имя комнаты (оставляем иконку+температуру)
  // - Climate-пилюля: при w<220 компактная (без min-width на цифре)
  const showRoomName = size.w >= 200;
  const compactClimate = size.w < 220;

  return (
    <div
      ref={ref}
      className={clsx(
        'glass h-full w-full flex flex-col overflow-hidden',
        isActive && 'glass-active'
      )}
      style={{ ...baseStyle, padding: pad, gap: innerGap }}
    >
      <div className="flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          <GlanceIcon value={params.icon} size={14} fallback="🏠" />
          {showRoomName && (
            <div
              className={clsx(
                'font-medium leading-tight truncate',
                'text-sm'
              )}
            >
              {params.name}
            </div>
          )}
        </div>
        <div className="text-right whitespace-nowrap shrink-0 flex items-center gap-2">
          {t !== undefined && params.tempEntity && (
            <SensorHistoryButton entityId={params.tempEntity} unit="°" decimals={1}>
              <div
                className={clsx(
                  'flex items-center gap-1 font-semibold tabular-nums leading-none',
                  'text-sm'
                )}
                title={`Температура: ${fmt(t, '°')} · нажмите для графика`}
              >
                <GlanceIcon
                  value="thermometer"
                  size={14}
                  className="text-orange-700 dark:text-orange-300"
                />
                <span>{fmt(t, '°')}</span>
              </div>
            </SensorHistoryButton>
          )}
          {h !== undefined && params.humidityEntity && (
            <SensorHistoryButton entityId={params.humidityEntity} unit="%" decimals={0}>
              <div
                className={clsx(
                  'flex items-center gap-1 font-semibold tabular-nums leading-none',
                  'text-sm'
                )}
                title={`Влажность: ${fmt(h, '%')} · нажмите для графика`}
              >
                <GlanceIcon
                  value="water-percent"
                  size={14}
                  className="text-sky-700 dark:text-sky-300"
                />
                <span>{fmt(h, '%')}</span>
              </div>
            </SensorHistoryButton>
          )}
          {/* Бинарные сенсоры (двери, окна, движение, занятость, розетки) —
              визуально в один размер с названием виджета (текстом-sm/-xs),
              подсвечиваются акцентом когда сработали (open/motion/etc). */}
          {binarySensors.length > 0 && (
            <div className="flex items-center gap-1 ml-1">
              {binarySensors.map((sid) => (
                <SensorIconBadge
                  key={sid}
                  entityId={sid}
                  size={14}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Встроенный mini media-player в стиле PWA — большая обложка слева,
          blurred-bg, крупные тач-кнопки. Видно только когда играет/на паузе. */}
      {showMedia && params.mediaPlayerEntity && (() => {
        const m = states[params.mediaPlayerEntity];
        if (!m) return null;
        if (m.state !== 'playing' && m.state !== 'paused') return null;
        const playing = m.state === 'playing';
        const title = m.attributes.media_title || '—';
        const artist = m.attributes.media_artist || '';
        const cover = m.attributes.entity_picture as string | undefined;
        // Cover может быть полным URL (Яндекс CDN) или путём (`/api/...` от HA).
        // PWA-paths нам не подойдут (нет HA-токена тут под рукой), так что
        // показываем cover только если это полный URL.
        const coverSrc = cover?.startsWith('http') ? cover : null;
        const cmd = (svc: string) =>
          callService('media_player', svc, params.mediaPlayerEntity!);

        return (
          <div
            className="relative flex items-center gap-3 px-3 py-2.5 rounded-2xl bg-black/8 dark:bg-black/30 border border-black/10 dark:border-white/10 backdrop-blur-md shrink-0 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
            title={`${title}${artist ? ' — ' + artist : ''}`}
            style={
              mediaAccentRgb
                ? {
                    borderColor: `rgb(${mediaAccentRgb} / 0.35)`,
                    boxShadow: `0 0 18px rgb(${mediaAccentRgb} / 0.18)`,
                  }
                : undefined
            }
          >
            {/* Размытый фон из обложки — даёт глубину и связь с контентом. */}
            {coverSrc && (
              <div
                className="absolute inset-0 -z-0 opacity-30 pointer-events-none"
                style={{
                  backgroundImage: `url(${coverSrc})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  filter: 'blur(20px)',
                  transform: 'scale(1.2)',
                }}
                aria-hidden="true"
              />
            )}
            <button
              type="button"
              onClick={(ev) => {
                ev.stopPropagation();
                setMediaSheetOpen(true);
              }}
              className="relative flex items-center gap-3 min-w-0 flex-1 text-left rounded-xl focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/70"
              aria-label="Открыть плеер"
            >
              {coverSrc ? (
                <img
                  src={coverSrc}
                  alt=""
                  width={48}
                  height={48}
                  loading="lazy"
                  className="w-12 h-12 rounded-xl object-cover shrink-0 shadow-md"
                />
              ) : (
                <div className="w-12 h-12 rounded-xl bg-black/10 dark:bg-white/10 flex items-center justify-center shrink-0 text-2xl">
                  🎵
                </div>
              )}
              <div className="min-w-0 flex-1 leading-tight">
                <div className="text-sm font-medium truncate">{title}</div>
                {artist && (
                  <div className="text-[11px] text-text-tertiary truncate">{artist}</div>
                )}
              </div>
            </button>
            <div className="relative flex items-center gap-1 shrink-0">
              <PressButton
                onClick={() => cmd('media_previous_track')}
                size={36}
                ariaLabel="Предыдущий"
                className="hidden @[260px]:flex"
              >
                <SkipBack size={14} aria-hidden="true" />
              </PressButton>
              <PressButton
                onClick={() => cmd(playing ? 'media_pause' : 'media_play')}
                size={40}
                ariaLabel={playing ? 'Пауза' : 'Воспроизвести'}
                bg={mediaAccentRgb ? `rgb(${mediaAccentRgb} / 0.25)` : 'rgb(var(--accent) / 0.25)'}
                bgPressed={mediaAccentRgb ? `rgb(${mediaAccentRgb} / 0.45)` : 'rgb(var(--accent) / 0.45)'}
              >
                {playing ? (
                  <Pause size={16} aria-hidden="true" />
                ) : (
                  <Play size={16} aria-hidden="true" />
                )}
              </PressButton>
              <PressButton
                onClick={() => cmd('media_next_track')}
                size={36}
                ariaLabel="Следующий"
                className="hidden @[260px]:flex"
              >
                <SkipForward size={14} aria-hidden="true" />
              </PressButton>
            </div>
          </div>
        );
      })()}

      {/* Умные сенсорные чипы — отдельный info-row сразу после шапки/плеера.
          Не interactive, только индикаторы (давление, освещённость, дверь,
          движение и т.п.). Открытая дверь/движение подсвечиваются акцентом. */}
      {showSensors && numericSensors.length > 0 && (
        <div className="flex flex-wrap gap-1.5 shrink-0">
          {numericSensors.map((sid) => (
            <SensorChip key={sid} entityId={sid} height={28} />
          ))}
        </div>
      )}

      {/* Сетка action-controls: лампы, переключатели, climate-степперы.
          Идут в одной flex-wrap строке, как в PWA RoomCard — переключатели
          и колонка-DHW рядом, в один ряд. На больших экранах wrap'ится в 2 ряда.
          При очень узком виджете btnSize=0 — строка не рендерится вообще. */}
      {btnSize > 0 && (
      <div
        className="flex flex-wrap items-center mt-auto"
        style={{ gap, maxHeight: maxRows * (btnSize + gap) - gap }}
      >
        {visibleBtns.map(({ kind, id }) => {
          const s = states[id];
          const on = s?.state === 'on';
          const dom = id.split('.')[0];
          const isUnavail = !s || s.state === 'unavailable';
          const customIcon = kind === 'light' ? params.lightIcons?.[id] : params.switchIcons?.[id];
          const haIcon = (s?.attributes.icon as string | undefined) ?? undefined;
          const iconName = customIcon || haIcon;
          const fallbackEmoji = kind === 'light' ? '💡' : '🔌';
          // Light всегда тёплый янтарный; switch — accent (адаптивный к теме).
          const onClass = kind === 'light'
            ? 'rgba(251, 191, 36, 0.45)'
            : 'rgb(var(--accent) / 0.45)';
          const glowColor = kind === 'light'
            ? 'rgba(251, 191, 36, 0.6)'
            : 'rgb(var(--accent) / 0.6)';
          return (
            <PressButton
              key={id}
              pressedScale={0.9}
              disabled={isUnavail}
              onClick={() => callService(dom, on ? 'turn_off' : 'turn_on', id)}
              size={btnSize}
              ariaLabel={s?.attributes.friendly_name || id}
              // off-state: bg="none" → CSS-класс ctrl-btn (тёмная/светлая адаптация).
              // on-state: цветной фон с glow — задаётся через bg/bgPressed/style.
              bg={on ? onClass : 'none'}
              bgPressed={on ? glowColor : undefined}
              className={clsx(
                isUnavail
                  ? 'border border-black/8 dark:border-white/8 cursor-not-allowed'
                  : on
                    ? 'border border-black/30 dark:border-white/30'
                    : 'ctrl-btn'
              )}
              style={on ? { boxShadow: `0 0 18px ${glowColor}` } : undefined}
            >
              <GlanceIcon
                value={iconName}
                size={Math.round(btnSize * 0.55)}
                fallback={fallbackEmoji}
                className={on ? 'text-white' : 'text-text-secondary'}
              />
            </PressButton>
          );
        })}
        {overflow > 0 && (
          <div
            className="rounded-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 flex items-center justify-center text-xs text-text-secondary tabular-nums"
            style={{ width: btnSize, height: btnSize }}
            title={`Ещё ${overflow + 1} устройств`}
          >
            +{overflow + 1}
          </div>
        )}

        {/* Климат-степперы — в той же строке что и кнопки, как в PWA. */}
        {Array.isArray(params.climateEntities) &&
          params.climateEntities.map((cid) => {
            const c = states[cid];
            if (!c) return null;
            const target = c.attributes.temperature;
            const isUnavail = c.state === 'unavailable';
            const step = params.climateStep ?? 1;
            const setTemp = (delta: number) => {
              if (target === undefined) return;
              callService('climate', 'set_temperature', cid, { temperature: target + delta });
            };
            const label = c.attributes.friendly_name || cid;
            const isHeating =
              c.state === 'heat' || c.state === 'auto' || c.state === 'heat_cool';
            const isCooling = c.state === 'cool';

            const stateIcon = isHeating ? '🔥' : isCooling ? '❄️' : '💧';
            const pillClass = isHeating
              ? 'bg-orange-500/20 border-orange-300/25'
              : isCooling
                ? 'bg-sky-500/20 border-sky-300/25'
                : 'bg-black/5 dark:bg-white/5 border-black/10 dark:border-white/10';
            // Цвет цифры — тёплый/холодный, **с инверсией для светлой темы**
            // (bg-orange/20 на светлой теме = пастельно-оранжевый, белый текст
            // на нём становится невидимым → берём dark-orange-700 для контраста).
            const valueClass = isHeating
              ? 'text-orange-700 dark:text-orange-100'
              : isCooling
                ? 'text-sky-700 dark:text-sky-100'
                : 'text-text-secondary';
            const glow = isHeating
              ? '0 0 14px rgba(249, 115, 22, 0.22)'
              : isCooling
                ? '0 0 14px rgba(56, 189, 248, 0.22)'
                : undefined;
            // Высота пилюли = высота кнопок (btnSize), чтобы они выровнялись в ряду.
            // Внутренняя круглая кнопка -/+ — на 4px меньше.
            const pillH = btnSize;
            const innerBtn = btnSize - 12;

            return (
              <div
                key={cid}
                className={clsx(
                  'inline-flex items-center gap-1 rounded-full border',
                  pillClass
                )}
                style={{
                  height: pillH,
                  paddingLeft: 4,
                  paddingRight: 4,
                  ...(glow ? { boxShadow: glow } : null),
                }}
                title={label}
                onClick={(e) => e.stopPropagation()}
              >
                <PressButton
                  onClick={() => setTemp(-step)}
                  disabled={isUnavail || target === undefined}
                  size={innerBtn}
                  ariaLabel={`Уменьшить ${label}`}
                >
                  <Minus size={Math.round(innerBtn * 0.45)} aria-hidden="true" />
                </PressButton>
                <button
                  type="button"
                  onClick={() => setClimateSheetEntity(cid)}
                  aria-label={`Открыть настройки ${label}`}
                  title={`Открыть настройки ${label}`}
                  className={clsx(
                    'tabular-nums text-center flex items-center justify-center gap-0.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/70',
                    compactClimate
                      ? 'text-xs font-semibold px-0.5'
                      : 'text-sm font-semibold min-w-[44px] px-1',
                    valueClass
                  )}
                >
                  <span aria-hidden="true">{stateIcon}</span>
                  {target !== undefined ? `${Math.round(target)}°` : '—'}
                </button>
                <PressButton
                  onClick={() => setTemp(+step)}
                  disabled={isUnavail || target === undefined}
                  size={innerBtn}
                  ariaLabel={`Увеличить ${label}`}
                >
                  <Plus size={Math.round(innerBtn * 0.45)} aria-hidden="true" />
                </PressButton>
              </div>
            );
          })}

      </div>
      )}
      {params.mediaPlayerEntity && (
        <MediaPlayerSheet
          entityId={params.mediaPlayerEntity}
          open={mediaSheetOpen}
          onClose={() => setMediaSheetOpen(false)}
        />
      )}
      {climateSheetEntity && (
        <ClimateSheet
          entityId={climateSheetEntity}
          open={true}
          onClose={() => setClimateSheetEntity(null)}
        />
      )}
    </div>
  );
}
