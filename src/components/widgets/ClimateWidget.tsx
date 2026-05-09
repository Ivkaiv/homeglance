'use client';

import { useEntity, useCallService } from '@/lib/ha/ConnectionProvider';
import { useWidgetSize, sizeTier } from '@/lib/widgets/useWidgetSize';
import { GlanceIcon } from '@/components/icons/MdiIcon';
import { PressButton } from '@/components/ui/PressButton';
import { Plus, Minus } from 'lucide-react';

interface Params {
  entity: string;
  label?: string;
  step?: number;
  icon?: string;
}

export function ClimateWidget({ params }: { params: Params }) {
  const e = useEntity(params.entity);
  const callService = useCallService();
  const [ref, size] = useWidgetSize();
  const tier = sizeTier(size);

  const isBad = !e || e.state === 'unavailable';
  const label = params.label ?? e?.attributes.friendly_name ?? 'Климат';
  const current = e?.attributes.current_temperature;
  const target = e?.attributes.temperature;
  const mode = e?.state ?? 'unknown';
  const step = params.step ?? 1;
  const isHeating = mode === 'heat' || mode === 'auto' || mode === 'heat_cool';

  const setTemp = (delta: number) => {
    if (target === undefined) return;
    callService('climate', 'set_temperature', params.entity, { temperature: target + delta });
  };

  const glow = isHeating ? { boxShadow: '0 0 24px rgba(249, 115, 22, 0.3)' } : undefined;
  const haIcon = e?.attributes.icon as string | undefined;
  const iconValue = params.icon || haIcon || 'thermometer';
  const hasTarget = target !== undefined && !isBad;
  const heatColor = isHeating ? 'text-orange-600 dark:text-orange-300' : 'text-text-secondary';
  const tempCurrent = current !== undefined ? Math.round(current) + '°' : '—';

  if (!size.measured) {
    return <div ref={ref} className="glass h-full w-full" />;
  }

  if (tier === 'tiny') {
    return (
      <div
        ref={ref}
        className="glass h-full w-full flex items-center justify-center"
        style={glow}
        title={label}
      >
        <div className="text-base font-medium tabular-nums">{tempCurrent}</div>
      </div>
    );
  }

  // Если высота низкая (узкий короткий виджет) — рендерим горизонтальный
  // layout даже на средних/больших ширинах. Иначе вертикальная компоновка
  // с большим температурным числом по центру.
  const isShort = size.h < 110;

  if (tier === 'small' || isShort) {
    return (
      <div
        ref={ref}
        className="glass h-full w-full p-2 flex items-center gap-2 overflow-hidden"
        style={glow}
      >
        <GlanceIcon
          value={iconValue}
          size={22}
          className={`shrink-0 ${heatColor}`}
          aria-hidden="true"
        />
        <div className="flex flex-col leading-none min-w-0 flex-1">
          <span className="text-[11px] text-text-secondary truncate">{label}</span>
          <div className="flex items-baseline gap-1 leading-tight">
            <span className="text-xl font-light tabular-nums">{tempCurrent}</span>
            {hasTarget && size.w < 200 && (
              <span className="text-[10px] text-orange-700 dark:text-orange-200/85 tabular-nums whitespace-nowrap">
                → {Math.round(target!)}°
              </span>
            )}
          </div>
        </div>
        {hasTarget && (
          <div className="flex items-center gap-1 shrink-0">
            <PressButton
              onClick={() => setTemp(-step)}
              size={26}
              ariaLabel={`Уменьшить (текущая ${Math.round(target!)}°)`}
            >
              <Minus size={12} aria-hidden="true" />
            </PressButton>
            {size.w >= 200 && (
              <div className="text-xs font-semibold tabular-nums text-orange-700 dark:text-orange-100 min-w-[26px] text-center">
                {Math.round(target!)}°
              </div>
            )}
            <PressButton
              onClick={() => setTemp(+step)}
              size={26}
              ariaLabel={`Увеличить (текущая ${Math.round(target!)}°)`}
            >
              <Plus size={12} aria-hidden="true" />
            </PressButton>
          </div>
        )}
      </div>
    );
  }

  // medium / large (height >= 110)
  return (
    <div
      ref={ref}
      className="glass h-full w-full p-3 flex flex-col gap-2 overflow-hidden"
      style={glow}
    >
      <div className="flex items-center justify-between shrink-0 gap-1.5">
        <div className="text-sm font-medium leading-tight truncate min-w-0">{label}</div>
        <GlanceIcon
          value={iconValue}
          size={14}
          className={`shrink-0 ${heatColor}`}
          aria-hidden="true"
        />
      </div>

      <div className="flex items-baseline gap-1.5 my-auto justify-center">
        <div className="text-3xl font-light tabular-nums">
          {current !== undefined ? Math.round(current) : '—'}
        </div>
        <div className="text-sm text-text-secondary">°</div>
      </div>

      {hasTarget && (
        <div className="flex items-center justify-between gap-2 shrink-0">
          <PressButton
            onClick={() => setTemp(-step)}
            size={32}
            ariaLabel={`Уменьшить (текущая ${Math.round(target!)}°)`}
          >
            <Minus size={14} aria-hidden="true" />
          </PressButton>
          <div className="text-base font-semibold tabular-nums text-orange-700 dark:text-orange-100">
            {Math.round(target!)}°
          </div>
          <PressButton
            onClick={() => setTemp(+step)}
            size={32}
            ariaLabel={`Увеличить (текущая ${Math.round(target!)}°)`}
          >
            <Plus size={14} aria-hidden="true" />
          </PressButton>
        </div>
      )}
    </div>
  );
}
