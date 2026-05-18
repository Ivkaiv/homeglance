'use client';

import { useEntity, useCallService } from '@/lib/ha/ConnectionProvider';
import { EntityToggleShell } from './EntityToggleShell';

interface Params {
  entity: string;
  label?: string;
  icon?: string;
  /** Цвет свечения когда включён — hex (#34d399). Если не задан — дефолтный
   *  зелёный. Пользователь может выставить голубой для вентилятора,
   *  оранжевый для обогревателя и т.п. */
  color?: string;
}

const DEFAULT_COLOR = '#34d399';

export function SwitchToggleWidget({ params }: { params: Params }) {
  const e = useEntity(params.entity);
  const callService = useCallService();

  if (!params.entity) {
    return (
      <div className="glass h-full w-full p-3 flex items-center justify-center text-text-tertiary text-xs text-center">
        ⚙️ Настрой переключатель
      </div>
    );
  }

  const on = e?.state === 'on';
  const isBad = !e || e.state === 'unavailable';
  const label = params.label ?? e?.attributes.friendly_name ?? 'Переключатель';
  const haIcon = e?.attributes.icon as string | undefined;
  const iconValue = params.icon || haIcon || '🔌';
  const color = params.color || DEFAULT_COLOR;
  const dom = params.entity.split('.')[0];

  const onClick = () =>
    !isBad && callService(dom, on ? 'turn_off' : 'turn_on', params.entity);

  return (
    <EntityToggleShell
      on={on}
      isBad={isBad}
      label={label}
      iconValue={iconValue}
      color={color}
      statusText={{ on: 'Включено', off: 'Выключено', bad: 'Нет связи' }}
      onClick={onClick}
    />
  );
}
