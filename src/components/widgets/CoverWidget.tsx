'use client';

import { useState } from 'react';
import { useEntity, useCallService } from '@/lib/ha/ConnectionProvider';
import { GlanceIcon } from '@/components/icons/MdiIcon';
import { PressButton } from '@/components/ui/PressButton';
import { ChevronUp, ChevronDown, Square } from 'lucide-react';
import { CoverSheet } from './CoverSheet';

interface Params {
  entity: string;
  label?: string;
  icon?: string;
}

export function CoverWidget({ params }: { params: Params }) {
  const e = useEntity(params.entity);
  const callService = useCallService();
  const [sheetOpen, setSheetOpen] = useState(false);

  const isBad = !e || e.state === 'unavailable';
  const label = params.label ?? e?.attributes.friendly_name ?? 'Шторы';
  const position = e?.attributes.current_position;
  const state = e?.state;

  const stateText =
    state === 'open'
      ? 'Открыты'
      : state === 'closed'
        ? 'Закрыты'
        : state === 'opening'
          ? 'Открываются'
          : state === 'closing'
            ? 'Закрываются'
            : isBad
              ? 'Нет связи'
              : '—';

  const cmd = (service: string) => callService('cover', service, params.entity);
  const haIcon = e?.attributes.icon as string | undefined;
  const iconValue = params.icon || haIcon || 'window-shutter';
  const openSheet = () => !isBad && setSheetOpen(true);

  return (
    <>
      <div className="glass h-full w-full @[140px]:p-3 @[140px]:flex @[140px]:flex-col @[140px]:gap-2">
        {/* Tiny: clickable иконка по центру — тап открывает sheet */}
        <button
          onClick={openSheet}
          disabled={isBad}
          title={label}
          aria-label={`${label}: ${stateText}, открыть управление`}
          className="@[140px]:hidden h-full w-full flex items-center justify-center disabled:opacity-40"
        >
          <GlanceIcon value={iconValue} size={28} />
        </button>

        {/* Medium+: header + state + buttons. Клик по верхней зоне → sheet. */}
        <button
          type="button"
          onClick={openSheet}
          disabled={isBad}
          aria-label={`${label}: открыть управление`}
          className="hidden @[140px]:block text-left disabled:opacity-40 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/70 rounded-md"
        >
          <div className="flex items-start justify-between">
            <div className="text-xs text-text-secondary truncate">{label}</div>
            <GlanceIcon value={iconValue} size={28} className="shrink-0" />
          </div>
          <div className="text-sm">
            {stateText}
            {position !== undefined && (
              <span className="text-text-tertiary ml-2 text-xs">{Math.round(position)}%</span>
            )}
          </div>
        </button>

        <div className="hidden @[140px]:flex gap-1.5 mt-auto">
          <PressButton
            disabled={isBad}
            onClick={() => cmd('open_cover')}
            className="flex-1 h-9"
            ariaLabel="Открыть"
          >
            <ChevronUp size={16} />
          </PressButton>
          <PressButton
            disabled={isBad}
            onClick={() => cmd('stop_cover')}
            size={36}
            ariaLabel="Стоп"
          >
            <Square size={12} />
          </PressButton>
          <PressButton
            disabled={isBad}
            onClick={() => cmd('close_cover')}
            className="flex-1 h-9"
            ariaLabel="Закрыть"
          >
            <ChevronDown size={16} />
          </PressButton>
        </div>
      </div>
      <CoverSheet
        entityId={params.entity}
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
      />
    </>
  );
}
