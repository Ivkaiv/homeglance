'use client';

import { useState } from 'react';
import { ChevronUp, ChevronDown, Square } from 'lucide-react';
import { ModalSheet } from '@/components/ui/ModalSheet';
import { useEntity, useCallService } from '@/lib/ha/ConnectionProvider';
import { GlanceIcon } from '@/components/icons/MdiIcon';

interface Props {
  entityId: string;
  open: boolean;
  onClose: () => void;
}

const POSITION_PRESETS = [
  { label: '0%', value: 0 },
  { label: '25%', value: 25 },
  { label: '50%', value: 50 },
  { label: '75%', value: 75 },
  { label: '100%', value: 100 },
];

/**
 * Полноэкранный sheet управления штор/жалюзи.
 *
 * Содержимое:
 * - крупные кнопки Open / Stop / Close
 * - slider позиции 0..100% (если cover поддерживает `set_cover_position`)
 * - быстрые preset'ы 0/25/50/75/100%
 * - tilt slider (если поддерживается `set_cover_tilt_position` — например
 *   у жалюзи с ламелями)
 *
 * Поддерживаемые сервисы определяются через `supported_features` bitmask
 * (см. https://developers.home-assistant.io/docs/core/entity/cover/).
 */
const SUPPORT_OPEN = 1;
const SUPPORT_CLOSE = 2;
const SUPPORT_SET_POSITION = 4;
const SUPPORT_STOP = 8;
const SUPPORT_OPEN_TILT = 16;
const SUPPORT_CLOSE_TILT = 32;
const SUPPORT_STOP_TILT = 64;
const SUPPORT_SET_TILT_POSITION = 128;

export function CoverSheet({ entityId, open, onClose }: Props) {
  const e = useEntity(entityId);
  const callService = useCallService();
  const [localPos, setLocalPos] = useState<number | null>(null);
  const [localTilt, setLocalTilt] = useState<number | null>(null);

  const isBad = !e || e.state === 'unavailable';
  const friendly = e?.attributes.friendly_name ?? 'Шторы';
  const features = (e?.attributes.supported_features as number | undefined) ?? 0;
  const has = (flag: number) => (features & flag) !== 0;

  const state = e?.state;
  const stateText = isBad
    ? 'нет связи'
    : state === 'open'
      ? 'открыто'
      : state === 'closed'
        ? 'закрыто'
        : state === 'opening'
          ? 'открывается…'
          : state === 'closing'
            ? 'закрывается…'
            : state ?? '—';

  const positionHa = e?.attributes.current_position as number | undefined;
  const position = localPos ?? (positionHa !== undefined ? Math.round(positionHa) : 0);
  const tiltHa = e?.attributes.current_tilt_position as number | undefined;
  const tilt = localTilt ?? (tiltHa !== undefined ? Math.round(tiltHa) : 0);
  const haIcon = e?.attributes.icon as string | undefined;
  const iconValue = haIcon || 'window-shutter';

  const cmd = (service: string, data?: any) => {
    if (isBad) return;
    callService('cover', service, entityId, data);
  };

  const sendPosition = (pct: number) => {
    setLocalPos(pct);
    cmd('set_cover_position', { position: pct });
    setTimeout(() => setLocalPos(null), 1500);
  };

  const sendTilt = (pct: number) => {
    setLocalTilt(pct);
    cmd('set_cover_tilt_position', { tilt_position: pct });
    setTimeout(() => setLocalTilt(null), 1500);
  };

  return (
    <ModalSheet
      open={open}
      onClose={onClose}
      title={friendly}
      subtitle={stateText}
      ariaLabel="Управление шторами"
    >
      <div className="flex flex-col items-center gap-5 mb-5">
        <div className="w-20 h-20 rounded-2xl bg-black/5 dark:bg-white/5 flex items-center justify-center">
          <GlanceIcon value={iconValue} size={42} className="text-text-secondary" />
        </div>

        {/* Open / Stop / Close — большие кнопки */}
        <div className="grid grid-cols-3 gap-2 w-full">
          {has(SUPPORT_OPEN) && (
            <button
              type="button"
              onClick={() => cmd('open_cover')}
              disabled={isBad}
              className="rounded-2xl bg-emerald-500/15 border border-emerald-300/30 text-emerald-700 dark:text-emerald-200 py-3 flex items-center justify-center disabled:opacity-40"
              aria-label="Открыть"
            >
              <ChevronUp size={22} />
            </button>
          )}
          {has(SUPPORT_STOP) && (
            <button
              type="button"
              onClick={() => cmd('stop_cover')}
              disabled={isBad}
              className="rounded-2xl bg-black/10 dark:bg-white/10 text-text-secondary py-3 flex items-center justify-center disabled:opacity-40"
              aria-label="Стоп"
            >
              <Square size={14} />
            </button>
          )}
          {has(SUPPORT_CLOSE) && (
            <button
              type="button"
              onClick={() => cmd('close_cover')}
              disabled={isBad}
              className="rounded-2xl bg-sky-500/15 border border-sky-300/30 text-sky-700 dark:text-sky-200 py-3 flex items-center justify-center disabled:opacity-40"
              aria-label="Закрыть"
            >
              <ChevronDown size={22} />
            </button>
          )}
        </div>
      </div>

      {has(SUPPORT_SET_POSITION) && (
        <section className="mb-5">
          <div className="flex items-baseline justify-between text-xs text-text-tertiary mb-1.5 px-1">
            <span>Позиция</span>
            <span className="tabular-nums">{position}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={position}
            onChange={(ev) => sendPosition(Number(ev.target.value))}
            disabled={isBad}
            aria-label="Позиция"
            className="no-drag w-full h-2 cursor-pointer accent-accent"
          />
          <div className="grid grid-cols-5 gap-1.5 mt-2">
            {POSITION_PRESETS.map((p) => {
              const active = position === p.value;
              return (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => sendPosition(p.value)}
                  disabled={isBad}
                  className={`no-drag text-xs py-1.5 rounded-full transition disabled:opacity-40 ${
                    active
                      ? 'bg-accent/25 border border-accent/50 text-accent'
                      : 'bg-black/10 dark:bg-white/10 border border-transparent text-text-secondary'
                  }`}
                >
                  {p.label}
                </button>
              );
            })}
          </div>
        </section>
      )}

      {has(SUPPORT_SET_TILT_POSITION) && (
        <section>
          <div className="flex items-baseline justify-between text-xs text-text-tertiary mb-1.5 px-1">
            <span>Угол ламелей</span>
            <span className="tabular-nums">{tilt}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={tilt}
            onChange={(ev) => sendTilt(Number(ev.target.value))}
            disabled={isBad}
            aria-label="Угол ламелей"
            className="no-drag w-full h-2 cursor-pointer accent-accent"
          />
        </section>
      )}
    </ModalSheet>
  );
}
