'use client';

import { ModalSheet } from '@/components/ui/ModalSheet';
import { PressButton } from '@/components/ui/PressButton';
import { useEntity, useCallService } from '@/lib/ha/ConnectionProvider';
import { formatTemp, applyStep } from '@/lib/ha/climate-temp';
import { Plus, Minus, Power, Flame, Snowflake, Wind, Droplets, Wand2, Activity } from 'lucide-react';
import { useT } from '@/lib/i18n/I18nProvider';

interface Props {
  entityId: string;
  open: boolean;
  onClose: () => void;
}

const HVAC_ICONS: Record<string, JSX.Element> = {
  off: <Power size={16} aria-hidden="true" />,
  heat: <Flame size={16} aria-hidden="true" />,
  cool: <Snowflake size={16} aria-hidden="true" />,
  auto: <Wand2 size={16} aria-hidden="true" />,
  heat_cool: <Wand2 size={16} aria-hidden="true" />,
  dry: <Droplets size={16} aria-hidden="true" />,
  fan_only: <Wind size={16} aria-hidden="true" />,
};

const HVAC_MODE_KEYS: Record<string, string> = {
  off: 'w.climateSheet.mode.off',
  heat: 'w.climateSheet.mode.heat',
  cool: 'w.climateSheet.mode.cool',
  auto: 'w.climateSheet.mode.auto',
  heat_cool: 'w.climateSheet.mode.heat_cool',
  dry: 'w.climateSheet.mode.dry',
  fan_only: 'w.climateSheet.mode.fan_only',
};

const HVAC_TONES: Record<string, string> = {
  heat: 'bg-orange-500/20 border-orange-300/40 text-orange-700 dark:text-orange-200',
  cool: 'bg-sky-500/20 border-sky-300/40 text-sky-700 dark:text-sky-200',
  auto: 'bg-emerald-500/20 border-emerald-300/40 text-emerald-700 dark:text-emerald-200',
  heat_cool: 'bg-emerald-500/20 border-emerald-300/40 text-emerald-700 dark:text-emerald-200',
  dry: 'bg-amber-500/20 border-amber-300/40 text-amber-700 dark:text-amber-200',
  fan_only: 'bg-violet-500/20 border-violet-300/40 text-violet-700 dark:text-violet-200',
  off: 'bg-white/5 dark:bg-white/5 border-white/10 text-text-secondary',
};

/**
 * Полноэкранная (нижняя) модалка управления climate-сущностью.
 *
 * Открывается по тапу на ClimateWidget и на climate-пилюлю в RoomHubWidget.
 * Показывает все доступные органы управления, которые сущность поддерживает:
 * целевую температуру (+/- кнопки крупные), HVAC-режимы chip'ами, fan mode,
 * preset mode, swing mode. Что не поддерживается — то секция скрывается.
 */
export function ClimateSheet({ entityId, open, onClose }: Props) {
  const t = useT();
  const e = useEntity(entityId);
  const callService = useCallService();

  if (!e) {
    return (
      <ModalSheet open={open} onClose={onClose} title={t('w.climateSheet.unavailable')} position="center">
        <div className="text-sm text-text-secondary">
          {t('w.climateSheet.offlineBody')}
        </div>
      </ModalSheet>
    );
  }

  const a = e.attributes;
  const friendlyName = (a.friendly_name as string) || entityId;
  const hvacAction = (a.hvac_action as string) || e.state;
  const current = a.current_temperature as number | undefined;
  const target = a.temperature as number | undefined;
  const minTemp = (a.min_temp as number) ?? 7;
  const maxTemp = (a.max_temp as number) ?? 35;
  const step = (a.target_temp_step as number) ?? 1;

  const hvacModes = (a.hvac_modes as string[] | undefined) ?? [];
  const fanModes = (a.fan_modes as string[] | undefined) ?? [];
  const fanMode = a.fan_mode as string | undefined;
  const presetModes = (a.preset_modes as string[] | undefined) ?? [];
  const presetMode = a.preset_mode as string | undefined;
  const swingModes = (a.swing_modes as string[] | undefined) ?? [];
  const swingMode = a.swing_mode as string | undefined;

  const setTemp = (delta: number) => {
    if (target === undefined) return;
    const next = applyStep(Math.max(minTemp, Math.min(maxTemp, target + delta)), step);
    callService('climate', 'set_temperature', entityId, { temperature: next });
  };

  const setMode = (mode: string) =>
    callService('climate', 'set_hvac_mode', entityId, { hvac_mode: mode });

  const setFan = (mode: string) =>
    callService('climate', 'set_fan_mode', entityId, { fan_mode: mode });

  const setPreset = (mode: string) =>
    callService('climate', 'set_preset_mode', entityId, { preset_mode: mode });

  const setSwing = (mode: string) =>
    callService('climate', 'set_swing_mode', entityId, { swing_mode: mode });

  const isOff = e.state === 'off';
  // hvac_action — что сущность РЕАЛЬНО делает (heating/cooling/drying/fan/idle/off).
  // hvac_mode (e.state) — какой режим выбран. Они могут расходиться: например
  // выбран heat, но температура достигнута — action=idle.
  const isActive =
    !!hvacAction &&
    hvacAction !== 'idle' &&
    hvacAction !== 'off' &&
    !isOff;

  const ACTION_LABEL_KEYS: Record<string, string> = {
    heating: 'w.climateSheet.action.heating',
    cooling: 'w.climateSheet.action.cooling',
    drying: 'w.climateSheet.action.drying',
    fan: 'w.climateSheet.action.fan',
    idle: 'w.climateSheet.action.idle',
    off: 'w.climateSheet.action.off',
    preheating: 'w.climateSheet.action.heating',
    defrosting: 'w.climateSheet.action.cooling',
  };
  const ACTION_DOTS: Record<string, string> = {
    heating: 'bg-orange-400',
    cooling: 'bg-sky-400',
    drying: 'bg-amber-400',
    fan: 'bg-violet-400',
    preheating: 'bg-orange-400',
    defrosting: 'bg-sky-400',
  };

  const subtitleNode = isOff ? (
    <span>{t('w.climateSheet.off')}</span>
  ) : (
    <span className="inline-flex items-center gap-2">
      {isActive && (
        <span
          className={`inline-block w-2 h-2 rounded-full animate-pulse ${
            ACTION_DOTS[hvacAction] ?? 'bg-emerald-400'
          }`}
          aria-hidden="true"
        />
      )}
      <span>{t(HVAC_MODE_KEYS[e.state] ?? e.state)}</span>
      {hvacAction && hvacAction !== e.state && (
        <span className="text-text-tertiary">·</span>
      )}
      {hvacAction && hvacAction !== e.state && (
        <span className={isActive ? 'text-text-secondary' : 'text-text-tertiary'}>
          {t(ACTION_LABEL_KEYS[hvacAction] ?? hvacAction)}
        </span>
      )}
    </span>
  );

  return (
    <ModalSheet
      open={open}
      onClose={onClose}
      title={friendlyName}
      subtitle={subtitleNode}
      ariaLabel={t('w.climateSheet.ariaLabel', { name: friendlyName })}
    >
      {/* Целевая температура — большой блок с +/- по бокам. */}
      {target !== undefined && (
        <div className="flex items-center justify-center gap-5 my-4">
          <PressButton
            onClick={() => setTemp(-step)}
            disabled={isOff}
            size={56}
            ariaLabel={t('w.climateSheet.decrease')}
          >
            <Minus size={20} aria-hidden="true" />
          </PressButton>
          <div className="text-center min-w-[110px]">
            <div className="text-5xl font-light tabular-nums leading-none">
              {formatTemp(target, step)}°
            </div>
            {current !== undefined && (
              <div className="text-xs text-text-tertiary mt-2 tabular-nums">
                {t('w.climateSheet.currentTemp', { temp: Math.round(current) })}
              </div>
            )}
          </div>
          <PressButton
            onClick={() => setTemp(+step)}
            disabled={isOff}
            size={56}
            ariaLabel={t('w.climateSheet.increase')}
          >
            <Plus size={20} aria-hidden="true" />
          </PressButton>
        </div>
      )}

      {/* HVAC modes — основные режимы работы. */}
      {hvacModes.length > 0 && (
        <ChipGroup label={t('w.climateSheet.modeLabel')} value={e.state} onChange={setMode} options={hvacModes}
          renderLabel={(m) => (
            <span className="inline-flex items-center gap-1.5 leading-none">
              <span className="inline-flex items-center justify-center w-3.5 h-3.5">
                {HVAC_ICONS[m] ?? <Activity size={14} aria-hidden="true" />}
              </span>
              <span className="leading-none">{t(HVAC_MODE_KEYS[m] ?? m)}</span>
            </span>
          )}
          tones={HVAC_TONES}
        />
      )}

      {fanModes.length > 0 && (
        <ChipGroup label={t('w.climateSheet.fanLabel')} value={fanMode ?? ''} onChange={setFan} options={fanModes} />
      )}

      {presetModes.length > 0 && (
        <ChipGroup label={t('w.climateSheet.presetLabel')} value={presetMode ?? ''} onChange={setPreset} options={presetModes} />
      )}

      {swingModes.length > 0 && (
        <ChipGroup label={t('w.climateSheet.swingLabel')} value={swingMode ?? ''} onChange={setSwing} options={swingModes} />
      )}
    </ModalSheet>
  );
}

/**
 * Группа chip'ов для выбора одного из значений.
 */
function ChipGroup({
  label,
  value,
  options,
  onChange,
  renderLabel,
  tones,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (next: string) => void;
  renderLabel?: (option: string) => React.ReactNode;
  tones?: Record<string, string>;
}) {
  return (
    <div className="mt-4">
      <div className="text-xs uppercase tracking-wider text-text-secondary mb-2">{label}</div>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => {
          const active = o === value;
          const activeTone = tones?.[o] ?? 'bg-accent/20 border-accent/40 text-accent';
          const idleTone =
            'bg-white/5 dark:bg-white/5 border-black/10 dark:border-white/10 text-text-secondary hover:bg-black/5 dark:hover:bg-white/10';
          return (
            <button
              key={o}
              onClick={() => onChange(o)}
              className={`inline-flex items-center justify-center px-3 py-1.5 rounded-full border text-xs leading-none transition ${
                active ? activeTone : idleTone
              } focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent/70`}
            >
              {renderLabel ? renderLabel(o) : o}
            </button>
          );
        })}
      </div>
    </div>
  );
}
