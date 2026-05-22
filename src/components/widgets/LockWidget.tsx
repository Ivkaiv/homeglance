'use client';

import { useEntity, useCallService } from '@/lib/ha/ConnectionProvider';
import { EntityToggleShell } from './EntityToggleShell';
import { useT } from '@/lib/i18n/I18nProvider';

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
  const t = useT();

  if (!params.entity) {
    return (
      <div className="glass h-full w-full p-3 flex items-center justify-center text-text-tertiary text-xs text-center">
        {t('w.lock.configure')}
      </div>
    );
  }

  const state = e?.state;
  const unlocked = state === 'unlocked';
  const busy = state === 'locking' || state === 'unlocking';
  const jammed = state === 'jammed';
  const isBad = !e || state === 'unavailable' || jammed;
  const label = params.label ?? e?.attributes.friendly_name ?? t('w.lock.label');
  const haIcon = e?.attributes.icon as string | undefined;
  const iconValue = params.icon || haIcon || (unlocked ? 'lock-open-variant' : 'lock');

  const onClick = () => {
    if (isBad || busy) return;
    callService('lock', unlocked ? 'lock' : 'unlock', params.entity);
  };

  const statusText = jammed
    ? { on: t('w.lock.jammed'), off: t('w.lock.jammed'), bad: t('w.lock.jammed') }
    : busy
      ? { on: '…', off: '…', bad: '…' }
      : { on: t('w.lock.unlocked'), off: t('w.lock.locked'), bad: t('w.noConnection') };

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
