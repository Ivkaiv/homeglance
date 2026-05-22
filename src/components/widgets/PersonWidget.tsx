'use client';

import { useEntity } from '@/lib/ha/ConnectionProvider';
import { GlanceIcon } from '@/components/icons/MdiIcon';
import { useT } from '@/lib/i18n/I18nProvider';

interface Params {
  entity: string;
  label?: string;
  icon?: string;
}

export function PersonWidget({ params }: { params: Params }) {
  const e = useEntity(params.entity);
  const t = useT();

  const isBad = !e || e.state === 'unavailable';
  const label = params.label ?? e?.attributes.friendly_name ?? t('w.person.label');
  const home = e?.state === 'home';
  const stateText = home ? t('w.person.home') : e?.state === 'not_home' ? t('w.person.away') : (e?.state ?? '—');
  const picture: string | undefined = e?.attributes.entity_picture;
  const dotColor = home ? '#34d399' : isBad ? 'rgba(255,255,255,0.18)' : '#fbbf24';
  const iconValue = params.icon || 'account';

  // tiny (<140): только аватар/иконка по центру
  // medium+ (>=140): аватар слева + label/state справа, плюс точка-индикатор
  return (
    <div
      className="glass h-full w-full flex items-center justify-center @[140px]:justify-start @[140px]:gap-3 @[140px]:p-3"
      title={`${label}: ${stateText}`}
    >
      {/* Tiny-аватар (32px), скрыт в medium+ */}
      <div className="@[140px]:hidden">
        {picture ? (
          <img
            src={picture}
            alt={t('w.avatarAlt', { name: label })}
            width={32}
            height={32}
            loading="lazy"
            className="w-8 h-8 rounded-full object-cover"
          />
        ) : (
          <GlanceIcon value={iconValue} size={28} />
        )}
      </div>

      {/* Medium-аватар (48px) с точкой-индикатором, скрыт в tiny */}
      <div className="hidden @[140px]:block relative">
        {picture ? (
          <img
            src={picture}
            alt={t('w.avatarAlt', { name: label })}
            width={48}
            height={48}
            loading="lazy"
            className="w-12 h-12 rounded-full object-cover"
          />
        ) : (
          <div className="w-12 h-12 rounded-full bg-black/10 dark:bg-white/10 flex items-center justify-center">
            <GlanceIcon value={iconValue} size={26} />
          </div>
        )}
        <div
          className="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-bg-primary"
          style={{ background: dotColor }}
          aria-hidden="true"
        />
      </div>

      {/* Тексты для medium+ */}
      <div className="hidden @[140px]:block flex-1 min-w-0">
        <div className="text-sm font-medium truncate">{label}</div>
        <div className="text-xs text-text-secondary">{stateText}</div>
      </div>
    </div>
  );
}
