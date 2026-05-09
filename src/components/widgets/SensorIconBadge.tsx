'use client';

import clsx from 'clsx';
import { useEntity } from '@/lib/ha/ConnectionProvider';
import { GlanceIcon } from '@/components/icons/MdiIcon';
import { detectSensorType, getSensorPreset } from '@/lib/sensor/presets';

interface Props {
  entityId: string;
  /** Размер иконки. По умолчанию 18. */
  size?: number;
}

/**
 * Мини-индикатор бинарного сенсора (дверь, окно, движение, занятость, розетка).
 * В отличие от {@link SensorChip} рендерит **только иконку** (без текста и фона),
 * подсвечивая её акцент-цветом если состояние «активное» (open/motion/etc).
 *
 * Используется в RoomHubWidget рядом с температурой/влажностью — статус-ленте
 * комнаты, без занятия отдельной строки.
 *
 * Для не-бинарных типов (numeric) ничего не рендерит.
 */
export function SensorIconBadge({ entityId, size = 18 }: Props) {
  const e = useEntity(entityId);
  const detected = detectSensorType(e);
  const preset = getSensorPreset(detected);

  if (!preset.binary) return null; // numeric — не наша зона ответственности

  const isBad = !e || e.state === 'unavailable' || e.state === 'unknown';
  const on = e?.state === 'on';
  const iconValue = (e?.attributes.icon as string | undefined)
    ?? (on ? preset.binary.onIcon : preset.icon);
  const colorClass = on ? preset.binary.onAccent : 'text-text-tertiary';
  const label = on ? preset.binary.onLabel : preset.binary.offLabel;
  const fullLabel = `${e?.attributes.friendly_name || entityId}: ${isBad ? 'нет связи' : label}`;

  return (
    <span
      className={clsx('inline-flex items-center', isBad && 'opacity-40')}
      title={fullLabel}
      aria-label={fullLabel}
    >
      <GlanceIcon value={iconValue} size={size} className={colorClass} />
    </span>
  );
}
