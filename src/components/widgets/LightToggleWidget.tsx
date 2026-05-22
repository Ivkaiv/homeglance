'use client';

import { useEntity, useCallService } from '@/lib/ha/ConnectionProvider';
import { EntityToggleShell } from './EntityToggleShell';
import { useT } from '@/lib/i18n/I18nProvider';

interface Params {
  entity: string;
  label?: string;
  color?: string;
  icon?: string;
}

export function LightToggleWidget({ params }: { params: Params }) {
  const e = useEntity(params.entity);
  const callService = useCallService();
  const t = useT();

  const on = e?.state === 'on';
  const isBad = !e || e.state === 'unavailable';
  const label = params.label ?? e?.attributes.friendly_name ?? t('w.light.label');
  const color = params.color ?? '#fbbf24';
  const haIcon = e?.attributes.icon as string | undefined;
  const iconValue = params.icon || haIcon || '💡';

  const onClick = () =>
    !isBad && callService('light', on ? 'turn_off' : 'turn_on', params.entity);

  return (
    <EntityToggleShell
      on={on}
      isBad={isBad}
      label={label}
      iconValue={iconValue}
      color={color}
      statusText={{ on: t('w.light.on'), off: t('w.light.off'), bad: t('w.noConnection') }}
      onClick={onClick}
    />
  );
}
