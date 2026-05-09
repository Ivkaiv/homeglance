'use client';

import { useState } from 'react';
import { useEntity, useCallService } from '@/lib/ha/ConnectionProvider';
import { GlanceIcon } from '@/components/icons/MdiIcon';
import { PressButton } from '@/components/ui/PressButton';
import { Check, Loader2 } from 'lucide-react';

interface Params {
  entity: string;
  label?: string;
  icon?: string;
  color?: string;
}

const SERVICES: Record<string, { domain: string; service: string }> = {
  script: { domain: 'script', service: 'turn_on' },
  automation: { domain: 'automation', service: 'trigger' },
  button: { domain: 'button', service: 'press' },
  scene: { domain: 'scene', service: 'turn_on' },
  input_button: { domain: 'input_button', service: 'press' },
};

export function QuickActionWidget({ params }: { params: Params }) {
  const e = useEntity(params.entity);
  const callService = useCallService();
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);

  if (!params.entity) {
    return (
      <div className="glass h-full w-full p-3 flex items-center justify-center text-text-tertiary text-xs text-center">
        ⚙️ Настрой действие
      </div>
    );
  }

  const dom = params.entity.split('.')[0];
  const cfg = SERVICES[dom];
  const isBad = !e || e.state === 'unavailable' || !cfg;
  const label = params.label ?? e?.attributes.friendly_name ?? params.entity;
  const haIcon = e?.attributes.icon as string | undefined;
  const iconValue = params.icon || haIcon || 'flash';
  const color = params.color ?? '#a855f7';

  async function trigger() {
    if (isBad || !cfg) return;
    setRunning(true);
    try {
      await callService(cfg.domain, cfg.service, params.entity);
      setDone(true);
      setTimeout(() => setDone(false), 1500);
    } finally {
      setRunning(false);
    }
  }

  // tiny (<140): иконка 22px по центру
  // medium+ (>=140): иконка 32px + подпись снизу
  // Чтобы избежать колдовства с !w/h на SVG, рендерим иконку дважды и
  // переключаем CQ-классами.
  const renderIcon = (px: number) => {
    if (running) return <Loader2 size={px} className="animate-spin" />;
    if (done) return <Check size={px} className="text-emerald-300" />;
    return <GlanceIcon value={iconValue} size={px} />;
  };

  return (
    <PressButton
      pressedScale={0.92}
      onClick={trigger}
      disabled={isBad}
      title={label}
      bg="none"
      className="glass h-full w-full @[140px]:flex-col @[140px]:gap-2 @[140px]:p-3"
      style={{ boxShadow: `0 0 14px ${color}40` }}
    >
      {/* Иконка для tiny */}
      <div className="@[140px]:hidden flex items-center justify-center">
        {renderIcon(22)}
      </div>
      {/* Иконка для medium+ */}
      <div className="hidden @[140px]:flex items-center justify-center text-3xl">
        {renderIcon(32)}
      </div>
      {/* Подпись только в medium+ */}
      <div className="hidden @[140px]:block text-xs text-text-secondary truncate w-full text-center">
        {label}
      </div>
    </PressButton>
  );
}
