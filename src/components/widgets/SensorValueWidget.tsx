'use client';

import { useEntity } from '@/lib/ha/ConnectionProvider';
import { GlanceIcon } from '@/components/icons/MdiIcon';
import { SensorHistoryButton } from '@/components/charts/SensorHistoryButton';
import {
  detectSensorType,
  getSensorPreset,
  type SensorType,
} from '@/lib/sensor/presets';
import { useT } from '@/lib/i18n/I18nProvider';

interface Params {
  entity: string;
  label?: string;
  /** Тип сенсора (auto = определяется из device_class / entity_id). */
  type?: SensorType;
  /** Override icon (если auto не угадал или хочется иначе). */
  icon?: string;
  /** Override unit. */
  unit?: string;
  /** Override decimals. */
  decimals?: number;
}


export function SensorValueWidget({ params }: { params: Params }) {
  const t = useT();
  const e = useEntity(params.entity);

  const detected = params.type && params.type !== 'auto' ? params.type : detectSensorType(e);
  const preset = getSensorPreset(detected);

  const isBad = !e || e.state === 'unavailable' || e.state === 'unknown';
  const isBinary = !!preset.binary;
  const on = e?.state === 'on';

  // Значение и единица — для бинарных подменяем на текст состояния.
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
    val = Number.isFinite(n) ? n.toFixed(params.decimals ?? preset.decimals) : e!.state;
    unit = params.unit ?? e?.attributes.unit_of_measurement ?? preset.unit;
  }

  const label = params.label ?? e?.attributes.friendly_name ?? params.entity;

  // Иконка: override → preset (для бинарных учитываем on/off)
  const haIcon = e?.attributes.icon as string | undefined;
  let iconValue = params.icon || haIcon || preset.icon;
  if (isBinary && on) iconValue = params.icon || haIcon || preset.binary!.onIcon;

  // Цвет: бинарные мигают в активном цвете, числовые — постоянный preset accent
  const accentClass = isBinary && on ? preset.binary!.onAccent : preset.accent;

  const inner = (
    <div
      className="glass h-full w-full flex flex-col items-center justify-center p-1 @[80px]:p-2 @[140px]:p-3 @[140px]:items-stretch @[140px]:justify-between"
      title={`${label}: ${val}${unit}${isBinary ? '' : ` · ${t('w.sensor.chartHint')}`}`}
    >
      {/* Header (medium+): label слева, иконка справа.
          Унифицировано: text-sm + icon 14px (как у других виджетов). */}
      <div className="hidden @[140px]:flex items-center justify-between gap-1.5">
        <div className="text-sm font-medium leading-tight truncate">{label}</div>
        <GlanceIcon value={iconValue} size={14} className={`shrink-0 ${accentClass}`} />
      </div>

      {/* Иконка для small (80-140): над значением */}
      <div className="hidden @[80px]:block @[140px]:hidden mb-0.5">
        <GlanceIcon value={iconValue} size={20} className={accentClass} />
      </div>

      {/* Значение: разный размер шрифта по tier'ам */}
      <div className="@[140px]:flex @[140px]:items-baseline @[140px]:gap-1">
        <div
          className={`text-base @[80px]:text-xl ${
            isBinary
              ? '@[140px]:text-xl @[220px]:text-2xl'
              : '@[140px]:text-3xl @[220px]:text-4xl'
          } font-medium @[80px]:font-light tabular-nums leading-tight text-center @[140px]:text-left ${
            isBad ? 'text-text-tertiary' : ''
          }`}
        >
          {val}
          {unit && (
            <span className="text-[9px] @[80px]:text-xs @[140px]:hidden text-text-secondary ml-0.5">
              {unit}
            </span>
          )}
        </div>
        {unit && !isBad && (
          <div className="hidden @[140px]:block text-sm text-text-secondary">{unit}</div>
        )}
      </div>
    </div>
  );

  // Бинарные сенсоры (двери, окна, движение) — без графика, история неинформативна.
  // Числовые — обернуты в кликабельную кнопку, открывающую модал с графиком.
  if (isBinary || isBad) return inner;
  return (
    <SensorHistoryButton
      entityId={params.entity}
      label={label}
      unit={unit}
      decimals={params.decimals ?? preset.decimals}
      className="block w-full h-full"
    >
      {inner}
    </SensorHistoryButton>
  );
}
