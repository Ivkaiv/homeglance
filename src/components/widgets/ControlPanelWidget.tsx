'use client';

import clsx from 'clsx';
import { useState } from 'react';
import { useStates, useCallService } from '@/lib/ha/ConnectionProvider';
import { useWidgetSize, sizeTier } from '@/lib/widgets/useWidgetSize';
import { MdiIcon, getMdiPath, GlanceIcon } from '@/components/icons/MdiIcon';
import { PressButton } from '@/components/ui/PressButton';
import { Check, Loader2 } from 'lucide-react';

interface Params {
  /** Заголовок панели (опционально). Если пустой — шапка не показывается. */
  title?: string;
  /** Эмодзи/иконка слева от заголовка. */
  icon?: string;
  /** Список entity_id (light.*, switch.*, scene.*, script.*, button.*, automation.*). */
  entities?: string[];
  /** Кастомные иконки для конкретных entity_id. */
  entityIcons?: Record<string, string>;
}

const TRANSIENT_DOMAINS = new Set(['scene', 'script', 'button', 'input_button', 'automation']);

const SERVICE_BY_DOMAIN: Record<string, { svc: string; toggle: boolean }> = {
  light: { svc: 'turn_on', toggle: true },
  switch: { svc: 'turn_on', toggle: true },
  fan: { svc: 'turn_on', toggle: true },
  scene: { svc: 'turn_on', toggle: false },
  script: { svc: 'turn_on', toggle: false },
  button: { svc: 'press', toggle: false },
  input_button: { svc: 'press', toggle: false },
  automation: { svc: 'trigger', toggle: false },
};

const FALLBACK_EMOJI: Record<string, string> = {
  light: '💡',
  switch: '🔌',
  fan: '🌀',
  scene: '🎬',
  script: '⚡',
  button: '🔘',
  input_button: '🔘',
  automation: '🤖',
};

/**
 * Виджет «Панель управления» — гибкая сетка из любых HA-actions:
 * лампы, переключатели, сценарии, скрипты, кнопки, автоматизации.
 *
 * В отличие от RoomHubWidget — нет шапки с температурой/влажностью,
 * нет привязки к комнате. Чистая сетка кнопок с опциональным заголовком.
 *
 * - Toggleable (light/switch/fan): показывает on/off-состояние и переключает.
 * - Transient (scene/script/button/automation): нажатие триггерит, на момент
 *   выполнения видна крутилка → галочка.
 */
export function ControlPanelWidget({ params }: { params: Params }) {
  const states = useStates();
  const callService = useCallService();
  const [ref, size] = useWidgetSize();
  const tier = sizeTier(size);
  const [busy, setBusy] = useState<Record<string, 'running' | 'done' | undefined>>({});

  const entities = Array.isArray(params.entities) ? params.entities : [];
  const title = (params.title ?? '').trim();
  const titleIcon = params.icon || '🎛';

  if (!size.measured) {
    return <div ref={ref} className="glass h-full w-full" />;
  }

  if (entities.length === 0) {
    return (
      <div
        ref={ref}
        className="glass h-full w-full p-3 flex items-center justify-center text-text-tertiary text-xs text-center"
      >
        ⚙️ Добавь сущности в настройках
      </div>
    );
  }

  // Размер плитки и количество в ряду — те же расчёты, что в RoomHubWidget.
  // pad и headerH **константны** — шапка одинаковая во всех виджетах.
  const isCompact = size.h < 110 || tier === 'small' || tier === 'tiny';
  const btnSize = tier === 'large' ? 36 : 32;
  const gap = 6;
  const pad = 10;
  const headerH = title ? 24 : 0;
  const innerGap = title ? (isCompact ? 4 : 8) : 0;
  const availW = Math.max(40, size.w - pad * 2);
  const availH = Math.max(0, size.h - pad * 2 - headerH - innerGap);
  const perRow = Math.max(1, Math.floor((availW + gap) / (btnSize + gap)));
  const maxRows = Math.max(1, Math.floor((availH + gap) / (btnSize + gap)));
  const maxBtns = perRow * maxRows;
  const overflow = entities.length - maxBtns;
  const visible = overflow > 0 ? entities.slice(0, maxBtns - 1) : entities;

  async function trigger(eid: string) {
    const dom = eid.split('.')[0];
    const cfg = SERVICE_BY_DOMAIN[dom];
    if (!cfg) return;
    const s = states[eid];
    const on = s?.state === 'on';

    if (cfg.toggle) {
      // Light/switch/fan: переключаем состояние
      callService(dom, on ? 'turn_off' : 'turn_on', eid);
      return;
    }

    // Transient: показываем running-индикатор
    setBusy((b) => ({ ...b, [eid]: 'running' }));
    try {
      await callService(dom, cfg.svc, eid);
      setBusy((b) => ({ ...b, [eid]: 'done' }));
      setTimeout(() => setBusy((b) => ({ ...b, [eid]: undefined })), 1300);
    } catch {
      setBusy((b) => ({ ...b, [eid]: undefined }));
    }
  }

  return (
    <div
      ref={ref}
      className="glass h-full w-full flex flex-col overflow-hidden"
      style={{ padding: pad, gap: innerGap }}
    >
      {title && (
        <div className="flex items-center gap-1.5 shrink-0 min-w-0">
          <GlanceIcon
            value={titleIcon}
            size={14}
            fallback="🎛"
          />
          <div
            className={clsx(
              'font-medium leading-tight truncate',
              'text-sm'
            )}
          >
            {title}
          </div>
        </div>
      )}

      <div
        className="flex flex-wrap"
        style={{ gap, maxHeight: maxRows * (btnSize + gap) - gap }}
      >
        {visible.map((eid) => {
          const dom = eid.split('.')[0];
          const cfg = SERVICE_BY_DOMAIN[dom];
          const s = states[eid];
          const isUnavail = !s || s.state === 'unavailable' || !cfg;
          const on = s?.state === 'on';
          const transient = TRANSIENT_DOMAINS.has(dom);
          const customIcon = params.entityIcons?.[eid];
          const haIcon = (s?.attributes.icon as string | undefined) ?? undefined;
          const iconName = customIcon || haIcon;
          const mdiPath = iconName ? getMdiPath(iconName) : null;
          const fallbackEmoji = FALLBACK_EMOJI[dom] || '◽';

          const transientState = busy[eid];
          const showRunning = transient && transientState === 'running';
          const showDone = transient && transientState === 'done';

          // Цвет «активного» состояния зависит от типа entity
          let activeBg: string | undefined;
          let glowColor: string | undefined;
          if (dom === 'light') {
            activeBg = 'rgba(251, 191, 36, 0.45)';
            glowColor = 'rgba(251, 191, 36, 0.6)';
          } else if (dom === 'switch' || dom === 'fan') {
            // Theme-aware accent (адаптивный — green на тёмной, dark-emerald на светлой).
            activeBg = 'rgb(var(--accent) / 0.40)';
            glowColor = 'rgb(var(--accent) / 0.55)';
          } else if (dom === 'scene' || dom === 'script' || dom === 'automation') {
            activeBg = 'rgba(168, 85, 247, 0.35)';
            glowColor = 'rgba(168, 85, 247, 0.5)';
          } else {
            activeBg = 'rgba(96, 165, 250, 0.35)';
            glowColor = 'rgba(96, 165, 250, 0.45)';
          }

          // Toggleable — фон по on; transient — мигает на done
          const usePressedBg = on || showDone;
          const label = s?.attributes.friendly_name || eid;

          return (
            <PressButton
              key={eid}
              pressedScale={0.9}
              disabled={isUnavail}
              onClick={() => trigger(eid)}
              size={btnSize}
              ariaLabel={label}
              title={label}
              bg={usePressedBg ? activeBg : 'none'}
              bgPressed={usePressedBg ? glowColor : undefined}
              className={clsx(
                isUnavail
                  ? 'border border-black/8 dark:border-white/8 cursor-not-allowed'
                  : usePressedBg
                    ? 'border border-black/30 dark:border-white/30'
                    : 'ctrl-btn'
              )}
              style={
                usePressedBg && glowColor ? { boxShadow: `0 0 18px ${glowColor}` } : undefined
              }
            >
              {showRunning ? (
                <Loader2 size={Math.round(btnSize * 0.55)} className="animate-spin text-white/85" />
              ) : showDone ? (
                <Check size={Math.round(btnSize * 0.55)} className="text-emerald-300" />
              ) : mdiPath ? (
                <MdiIcon
                  name={iconName!}
                  size={Math.round(btnSize * 0.6)}
                  className={usePressedBg ? 'text-white' : 'text-text-secondary'}
                />
              ) : (
                <span style={{ fontSize: Math.round(btnSize * 0.5) }}>{fallbackEmoji}</span>
              )}
            </PressButton>
          );
        })}
        {overflow > 0 && (
          <div
            className="rounded-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 flex items-center justify-center text-xs text-text-secondary tabular-nums"
            style={{ width: btnSize, height: btnSize }}
            title={`Ещё ${overflow + 1} устройств(а)`}
          >
            +{overflow + 1}
          </div>
        )}
      </div>
    </div>
  );
}
