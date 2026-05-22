'use client';

import clsx from 'clsx';
import { useEntity } from '@/lib/ha/ConnectionProvider';
import { GlanceIcon } from '@/components/icons/MdiIcon';
import { SensorHistoryButton } from '@/components/charts/SensorHistoryButton';
import { detectSensorType, getSensorPreset } from '@/lib/sensor/presets';
import { useT } from '@/lib/i18n/I18nProvider';

interface Props {
  entityId: string;
  /** Высота чипа — пусть совпадает с размером кнопок в room hub. */
  height?: number;
  /** Override знаков после запятой (если не задано — preset.decimals). */
  decimals?: number;
}

/**
 * Компактный non-interactive чип-сенсор для встраивания в room-hub
 * (рядом с переключателями и climate-степперами).
 *
 * Авто-определяет тип сенсора (температура/влажность/давление/door/...) из
 * device_class и показывает подходящую иконку + значение.
 *
 * Пример: 🌡 22°  | 💧 45% | 🚪 Открыта
 */
export function SensorChip({ entityId, height = 36, decimals }: Props) {
  const t = useT();
  const dec = decimals ?? undefined;
  const e = useEntity(entityId);

  const detected = detectSensorType(e);
  const preset = getSensorPreset(detected);
  const isBad = !e || e.state === 'unavailable' || e.state === 'unknown';
  const isBinary = !!preset.binary;
  const on = e?.state === 'on';

  let val: string;
  let unit: string;
  if (isBad) {
    val = '—';
    unit = '';
  } else if (isBinary) {
    val = on ? t(preset.binary!.onLabel) : t(preset.binary!.offLabel);
    unit = '';
  } else {
    const n = Number(e!.state);
    val = Number.isFinite(n) ? n.toFixed(dec ?? preset.decimals) : e!.state;
    unit = e?.attributes.unit_of_measurement ?? preset.unit;
  }

  const haIcon = e?.attributes.icon as string | undefined;
  let iconValue = haIcon || preset.icon;
  if (isBinary && on) iconValue = haIcon || preset.binary!.onIcon;

  const accentClass =
    isBinary && on ? preset.binary!.onAccent : preset.accent;

  // Активные бинарные подсвечиваем фоном (как «алерт-чип»)
  const activeBinary = isBinary && on;

  const chipBody = (
    <div
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-full border whitespace-nowrap',
        activeBinary
          ? 'bg-amber-500/15 border-amber-300/30 dark:bg-amber-500/15 dark:border-amber-300/30'
          : 'bg-black/5 dark:bg-white/5 border-black/10 dark:border-white/10'
      )}
      style={{
        height,
        paddingLeft: 10,
        paddingRight: 10,
      }}
      title={`${e?.attributes.friendly_name || entityId}: ${val}${unit}${isBinary || isBad ? '' : ` · ${t('w.sensor.chartHint')}`}`}
    >
      <GlanceIcon
        value={iconValue}
        size={Math.round(height * 0.45)}
        className={`shrink-0 ${accentClass}`}
      />
      <span
        className={clsx(
          'text-xs tabular-nums leading-none',
          isBad ? 'text-text-tertiary' : isBinary ? accentClass : 'text-text-primary'
        )}
      >
        {val}
        {unit && <span className="text-text-secondary ml-0.5">{unit}</span>}
      </span>
    </div>
  );

  // Числовые сенсоры → кликабельные с графиком. Бинарные/недоступные — статичные.
  if (isBinary || isBad) return chipBody;
  return (
    <SensorHistoryButton entityId={entityId} unit={unit} decimals={dec ?? preset.decimals} className="rounded-full">
      {chipBody}
    </SensorHistoryButton>
  );
}
