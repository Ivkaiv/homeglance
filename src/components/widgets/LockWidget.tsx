'use client';

import { useEntity, useCallService } from '@/lib/ha/ConnectionProvider';
import { EntityToggleShell } from './EntityToggleShell';

interface Params {
  entity: string;
  label?: string;
  icon?: string;
}

// Янтарный — статусу «открыто» (предупреждающий), а «заперто» = тёмная плитка.
const ACCENT = '#fbbf24';

/**
 * Виджет управления замком: `lock.*` сущности HA.
 *
 * Состояния HA:
 *  - `locked` — заперт (визуально «выключенный» вид)
 *  - `unlocked` — открыт (визуально «включённый» с янтарным акцентом)
 *  - `locking` / `unlocking` — переходные, показываем как busy
 *  - `jammed` — заклинило, показываем как bad
 *
 * Тап вызывает противоположное действие. Янтарный цвет в открытом
 * состоянии работает как мягкое предупреждение «дверь не заперта».
 */
export function LockWidget({ params }: { params: Params }) {
  const e = useEntity(params.entity);
  const callService = useCallService();

  if (!params.entity) {
    return (
      <div className="glass h-full w-full p-3 flex items-center justify-center text-text-tertiary text-xs text-center">
        ⚙️ Настрой замок
      </div>
    );
  }

  const state = e?.state;
  const unlocked = state === 'unlocked';
  const busy = state === 'locking' || state === 'unlocking';
  const jammed = state === 'jammed';
  const isBad = !e || state === 'unavailable' || jammed;
  const label = params.label ?? e?.attributes.friendly_name ?? 'Замок';
  const haIcon = e?.attributes.icon as string | undefined;
  const iconValue = params.icon || haIcon || (unlocked ? 'lock-open-variant' : 'lock');

  const onClick = () => {
    if (isBad || busy) return;
    callService('lock', unlocked ? 'lock' : 'unlock', params.entity);
  };

  const statusText = jammed
    ? { on: 'Заклинило', off: 'Заклинило', bad: 'Заклинило' }
    : busy
      ? { on: '…', off: '…', bad: '…' }
      : { on: 'Открыто', off: 'Заперто', bad: 'Нет связи' };

  // В открытом состоянии — мягкое янтарное свечение, как «горит лампочка».
  const glow = unlocked ? { boxShadow: '0 0 24px rgba(251, 191, 36, 0.4)' } : undefined;

  return (
    <EntityToggleShell
      on={unlocked}
      isBad={isBad}
      label={label}
      iconValue={iconValue}
      color={ACCENT}
      statusText={statusText}
      onClick={onClick}
      glowOverride={glow}
    />
  );
}
