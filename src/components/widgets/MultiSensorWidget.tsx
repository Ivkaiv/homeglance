'use client';

import { SensorChip } from './SensorChip';
import { useWidgetSize } from '@/lib/widgets/useWidgetSize';
import { useT } from '@/lib/i18n/I18nProvider';

interface Params {
  /** Список entity_id сенсоров (sensor.* / binary_sensor.*) — через ConfigSheet, multi-entity. */
  entities?: string[];
  label?: string;
  /** Знаков после запятой для каждой числовой сущности (entity_id → decimals).
   *  Пусто — берётся из preset (preset.decimals: 0 для температуры по умолчанию,
   *  1 для влажности и т.д.). */
  decimals?: Record<string, number>;
}

/**
 * Виджет «несколько сенсоров одним пакетом» — компактный список chip'ов.
 *
 * Зачем: на дашборде часто нужны 3-5 связанных метрик (температуры по
 * комнатам, открытые двери, заряд устройств). Отдельные `SensorValueWidget`
 * занимают много места — MultiSensor показывает их одним блоком.
 *
 * Использует тот же `SensorChip`, что и `RoomHubWidget`, поэтому каждый
 * чип кликабелен и открывает график истории (через `SensorHistoryButton`).
 */
export function MultiSensorWidget({ params }: { params: Params }) {
  const t = useT();
  const [ref, size] = useWidgetSize();
  const list = Array.isArray(params.entities) ? params.entities.filter(Boolean) : [];

  if (list.length === 0) {
    return (
      <div className="glass h-full w-full p-3 flex items-center justify-center text-text-tertiary text-xs text-center">
        {t('w.multiSensor.configure')}
      </div>
    );
  }

  // Высота chip'а зависит от высоты ячейки — на маленьких полях ужимаем.
  const chipHeight = size.h && size.h < 100 ? 28 : 32;

  return (
    <div ref={ref} className="glass h-full w-full p-2 flex flex-col gap-1.5 overflow-hidden">
      {params.label && (
        <div className="text-[11px] text-text-tertiary px-1 shrink-0 truncate">
          {params.label}
        </div>
      )}
      <div className="flex flex-wrap gap-1.5 overflow-auto min-h-0">
        {list.map((id) => (
          <SensorChip key={id} entityId={id} height={chipHeight} decimals={params.decimals?.[id]} />
        ))}
      </div>
    </div>
  );
}
