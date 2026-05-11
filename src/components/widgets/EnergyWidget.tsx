'use client';

import { useEntity } from '@/lib/ha/ConnectionProvider';
import { Zap } from 'lucide-react';
import { SensorHistoryButton } from '@/components/charts/SensorHistoryButton';
import { useWidgetSize, sizeTier } from '@/lib/widgets/useWidgetSize';

interface Params {
  /** Текущая мощность (W) — sensor.* с device_class=power. */
  power: string;
  /** Потребление за сегодня (kWh) — sensor.* с device_class=energy (опционально). */
  todayEnergy?: string;
  /** Потребление за этот месяц (kWh) — sensor.* (опционально). */
  monthEnergy?: string;
  /** Цена за kWh (опционально) — показывает текущую стоимость. */
  pricePerKwh?: number;
  /** Валюта (по умолчанию ₽). */
  currency?: string;
  label?: string;
}

function fmt(s?: string, decimals = 0): { value: string; unit: string } {
  if (!s || s === 'unavailable' || s === 'unknown') return { value: '—', unit: '' };
  const n = Number(s);
  if (!Number.isFinite(n)) return { value: s, unit: '' };
  return { value: n.toFixed(decimals), unit: '' };
}

/**
 * Виджет «Энергопотребление»: текущая мощность (W) крупным значением,
 * под ним опциональные строчки «сегодня / месяц» в kWh.
 *
 * Тап на основное значение открывает график мощности через
 * `SensorHistoryButton` — стандартный паттерн в Glance.
 */
export function EnergyWidget({ params }: { params: Params }) {
  const [ref, size] = useWidgetSize();
  const tier = sizeTier(size);
  const power = useEntity(params.power);
  const today = useEntity(params.todayEnergy ?? '');
  const month = useEntity(params.monthEnergy ?? '');

  if (!params.power) {
    return (
      <div className="glass h-full w-full p-3 flex items-center justify-center text-text-tertiary text-xs text-center">
        ⚙️ Укажи sensor мощности
      </div>
    );
  }

  const isBad = !power || power.state === 'unavailable' || power.state === 'unknown';
  const powerVal = isBad ? '—' : fmt(power.state, 0).value;
  const powerUnit = power?.attributes.unit_of_measurement ?? 'Вт';
  const label = params.label ?? power?.attributes.friendly_name ?? 'Потребление';

  const todayVal = params.todayEnergy ? fmt(today?.state, 1).value : null;
  const todayUnit = today?.attributes.unit_of_measurement ?? 'кВт·ч';
  const monthVal = params.monthEnergy ? fmt(month?.state, 1).value : null;
  const monthUnit = month?.attributes.unit_of_measurement ?? 'кВт·ч';

  // Стоимость рассчитываем от текущего значения сегодняшней энергии
  const todayCost =
    params.pricePerKwh && todayVal && todayVal !== '—'
      ? (Number(todayVal) * params.pricePerKwh).toFixed(0)
      : null;
  const currency = params.currency ?? '₽';

  if (!size.measured) {
    return <div ref={ref} className="glass h-full w-full" />;
  }

  // Tiny — только большое значение мощности
  if (tier === 'tiny') {
    return (
      <div
        ref={ref}
        className="glass h-full w-full flex flex-col items-center justify-center"
        title={`${label}: ${powerVal} ${powerUnit}`}
      >
        <span className="text-sm font-semibold tabular-nums leading-none">{powerVal}</span>
        <span className="text-[9px] text-text-tertiary mt-0.5">{powerUnit}</span>
      </div>
    );
  }

  const big = (
    <div className="flex items-baseline gap-1.5">
      <span
        className={`text-2xl font-semibold tabular-nums leading-none ${
          isBad ? 'text-text-tertiary' : ''
        }`}
      >
        {powerVal}
      </span>
      <span className="text-xs text-text-tertiary">{powerUnit}</span>
    </div>
  );

  return (
    <div ref={ref} className="glass h-full w-full p-3 flex flex-col gap-2 overflow-hidden">
      <header className="flex items-center gap-1.5 min-w-0 shrink-0">
        <Zap size={12} className="text-amber-300 shrink-0" aria-hidden="true" />
        <span className="text-[11px] text-text-tertiary truncate flex-1">{label}</span>
      </header>

      {isBad ? (
        big
      ) : (
        <SensorHistoryButton entityId={params.power} unit={powerUnit} decimals={0}>
          {big}
        </SensorHistoryButton>
      )}

      {(todayVal || monthVal) && (
        <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-text-tertiary mt-auto shrink-0">
          {todayVal && (
            <span className="tabular-nums">
              Сегодня <span className="text-text-secondary">{todayVal}</span> {todayUnit}
              {todayCost && (
                <span className="text-text-tertiary"> · ≈{todayCost}{currency}</span>
              )}
            </span>
          )}
          {monthVal && (
            <span className="tabular-nums">
              Месяц <span className="text-text-secondary">{monthVal}</span> {monthUnit}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
