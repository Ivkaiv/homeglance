'use client';

import { useEntity } from '@/lib/ha/ConnectionProvider';
import type { WeatherPageConfig } from '@/lib/pages/types';

function bearingToCompass(deg: number): string {
  const dirs = ['С', 'СВ', 'В', 'ЮВ', 'Ю', 'ЮЗ', 'З', 'СЗ'];
  return dirs[Math.round(deg / 45) % 8];
}

function bearingToCompassLong(deg: number): string {
  const dirs = ['северный', 'северо-восточный', 'восточный', 'юго-восточный', 'южный', 'юго-западный', 'западный', 'северо-западный'];
  return dirs[Math.round(deg / 45) % 8];
}

/**
 * Показывает Kp-индекс с цветной шкалой.
 * Шкала NOAA: <4 спокойно, 4 возмущено, 5 G1, 6 G2, 7 G3, 8 G4, 9 G5
 */
function kpColor(kp: number): { bg: string; text: string; sub: string; label: string } {
  // text — большая цифра (контрастная), sub — подпись (помягче). Для светлой
  // темы используем «-700/-800», для тёмной через `dark:` — «-300/-400».
  if (kp < 4)
    return {
      bg: 'bg-emerald-500/20 dark:bg-emerald-500/15',
      text: 'text-emerald-700 dark:text-emerald-300',
      sub: 'text-emerald-700 dark:text-emerald-200',
      label: 'Спокойно',
    };
  if (kp < 5)
    return {
      bg: 'bg-yellow-500/25 dark:bg-yellow-500/15',
      text: 'text-yellow-800 dark:text-yellow-300',
      sub: 'text-yellow-800 dark:text-yellow-200',
      label: 'Возмущено',
    };
  if (kp < 6)
    return {
      bg: 'bg-orange-500/25 dark:bg-orange-500/15',
      text: 'text-orange-800 dark:text-orange-300',
      sub: 'text-orange-800 dark:text-orange-200',
      label: 'Слабая буря (G1)',
    };
  if (kp < 7)
    return {
      bg: 'bg-orange-600/30 dark:bg-orange-600/20',
      text: 'text-orange-800 dark:text-orange-400',
      sub: 'text-orange-800 dark:text-orange-300',
      label: 'Умеренная буря (G2)',
    };
  if (kp < 8)
    return {
      bg: 'bg-red-500/25 dark:bg-red-500/15',
      text: 'text-red-800 dark:text-red-300',
      sub: 'text-red-800 dark:text-red-200',
      label: 'Сильная буря (G3)',
    };
  if (kp < 9)
    return {
      bg: 'bg-red-600/35 dark:bg-red-600/25',
      text: 'text-red-900 dark:text-red-400',
      sub: 'text-red-900 dark:text-red-300',
      label: 'Очень сильная (G4)',
    };
  return {
    bg: 'bg-red-700/40 dark:bg-red-700/30',
    text: 'text-red-900 dark:text-red-500',
    sub: 'text-red-900 dark:text-red-400',
    label: 'Экстремальная (G5)',
  };
}

function CompassArrow({ bearing, size = 88 }: { bearing: number; size?: number }) {
  // Радиус круга меньше, чем половина viewBox, чтобы для букв (С/В/Ю/З)
  // оставалось место за пределами кольца, иначе они визуально «вылазят»
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 14;
  const fontPx = Math.round(size * 0.13);
  const labelOffset = r + 9;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0 text-text-tertiary">
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke="currentColor"
        strokeOpacity={0.22}
        strokeWidth={1.5}
      />
      <text x={cx} y={cy - labelOffset} fontSize={fontPx} fill="currentColor" textAnchor="middle" dominantBaseline="middle">С</text>
      <text x={cx + labelOffset} y={cy} fontSize={fontPx} fill="currentColor" textAnchor="middle" dominantBaseline="middle">В</text>
      <text x={cx} y={cy + labelOffset} fontSize={fontPx} fill="currentColor" textAnchor="middle" dominantBaseline="middle">Ю</text>
      <text x={cx - labelOffset} y={cy} fontSize={fontPx} fill="currentColor" textAnchor="middle" dominantBaseline="middle">З</text>
      <g transform={`translate(${cx}, ${cy}) rotate(${bearing})`}>
        <path
          d={`M 0 -${r - 5} L 5 0 L 0 -3 L -5 0 Z`}
          fill="rgb(56, 189, 248)"
          opacity={0.95}
        />
      </g>
      <circle cx={cx} cy={cy} r={2.5} fill="rgb(56, 189, 248)" />
    </svg>
  );
}

function MagneticBlock({
  entityId,
  label,
}: {
  entityId: string | undefined;
  label: string;
}) {
  const e = useEntity(entityId);
  if (!e || e.state === 'unknown' || e.state === 'unavailable') return null;
  const kp = Number(e.state);
  if (Number.isNaN(kp)) return null;
  const c = kpColor(kp);
  return (
    <div className={`p-3 rounded-xl ${c.bg}`}>
      <div className="text-[10px] uppercase tracking-wider text-text-secondary font-medium">
        {label}
      </div>
      <div className={`text-2xl font-medium tabular-nums mt-0.5 ${c.text}`}>
        {kp.toFixed(1)} <span className={`text-xs font-normal ${c.sub} opacity-80`}>Kp</span>
      </div>
      <div className={`text-[11px] font-medium ${c.sub}`}>{c.label}</div>
    </div>
  );
}

export function StormSection({ config }: { config: WeatherPageConfig }) {
  const distEnt = useEntity(config.stormDistanceEntity);
  const bearEnt = useEntity(config.stormBearingEntity);
  const moveEnt = useEntity(config.stormEntity);
  const magNow = useEntity(config.magneticStormEntity);
  const magTom = useEntity(config.magneticStormTomorrowEntity);
  const magAft = useEntity(config.magneticStormAfterTomorrowEntity);

  const distance = distEnt && distEnt.state !== 'unknown' && distEnt.state !== 'unavailable'
    ? Number(distEnt.state)
    : undefined;
  const bearing = bearEnt && bearEnt.state !== 'unknown' && bearEnt.state !== 'unavailable'
    ? Number(bearEnt.state)
    : undefined;
  const movement = moveEnt && moveEnt.state !== 'unknown' && moveEnt.state !== 'unavailable'
    ? Number(moveEnt.state)
    : undefined;

  const hasStorm = distance !== undefined || bearing !== undefined || movement !== undefined;
  const hasMagnetic = magNow || magTom || magAft;

  if (!hasStorm && !hasMagnetic) return null;

  const distUnit = distEnt?.attributes.unit_of_measurement || 'км';

  return (
    <section className="mb-6">
      <h2 className="text-xs uppercase tracking-wider text-text-tertiary mb-3 px-1">
        🌀 Шторм-радар
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {hasStorm && (
          <div className="glass p-4 flex items-center gap-4">
            {bearing !== undefined && <CompassArrow bearing={bearing} size={84} />}
            <div className="min-w-0 flex-1">
              {distance !== undefined && (
                <>
                  <div className="text-[10px] uppercase tracking-wider text-text-tertiary">
                    Ближайшая гроза
                  </div>
                  <div className="text-3xl font-light tabular-nums leading-tight">
                    {Math.round(distance)} <span className="text-base text-text-tertiary">{distUnit}</span>
                  </div>
                </>
              )}
              {bearing !== undefined && (
                <div className="text-sm text-text-secondary mt-0.5">
                  на {bearingToCompassLong(bearing)} ({Math.round(bearing)}° {bearingToCompass(bearing)})
                </div>
              )}
              {movement !== undefined && (
                <div className="text-xs text-text-tertiary mt-1.5 flex items-center gap-1">
                  <span>↗ движется на {bearingToCompassLong(movement)}</span>
                  <span className="text-text-tertiary opacity-60">
                    ({Math.round(movement)}°)
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {hasMagnetic && (
          <div className="glass p-4">
            <div className="text-[10px] uppercase tracking-wider text-text-tertiary mb-2">
              🌍 Геомагнитная активность
            </div>
            <div className="grid grid-cols-3 gap-2">
              <MagneticBlock entityId={config.magneticStormEntity} label="Сегодня" />
              <MagneticBlock entityId={config.magneticStormTomorrowEntity} label="Завтра" />
              <MagneticBlock entityId={config.magneticStormAfterTomorrowEntity} label="После" />
            </div>
            <div className="text-[10px] text-text-tertiary mt-2 leading-snug">
              Kp 0–3: спокойно · 4: возмущено · 5+: магнитная буря
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
