'use client';

import { useEntity } from '@/lib/ha/ConnectionProvider';
import { useT } from '@/lib/i18n/I18nProvider';
import type { WeatherPageConfig } from '@/lib/pages/types';

// Возвращает i18n-ключ короткой стороны света (С/СВ/В…). Для составных
// направлений (СВ) переиспользуем существующие ключи w.weather.wind.*.
function bearingToCompassKey(deg: number): string {
  const keys = [
    'w.weather.wind.N',
    'w.weather.wind.NE',
    'w.weather.wind.E',
    'w.weather.wind.SE',
    'w.weather.wind.S',
    'w.weather.wind.SW',
    'w.weather.wind.W',
    'w.weather.wind.NW',
  ];
  return keys[Math.round(deg / 45) % 8];
}

// Возвращает i18n-ключ длинного названия стороны света («северный»…).
function bearingToCompassLongKey(deg: number): string {
  const keys = [
    'page.storm.compass.long.N',
    'page.storm.compass.long.NE',
    'page.storm.compass.long.E',
    'page.storm.compass.long.SE',
    'page.storm.compass.long.S',
    'page.storm.compass.long.SW',
    'page.storm.compass.long.W',
    'page.storm.compass.long.NW',
  ];
  return keys[Math.round(deg / 45) % 8];
}

/**
 * Показывает Kp-индекс с цветной шкалой.
 * Шкала NOAA: <4 спокойно, 4 возмущено, 5 G1, 6 G2, 7 G3, 8 G4, 9 G5
 */
function kpColor(kp: number): { bg: string; text: string; sub: string; labelKey: string } {
  // text — большая цифра (контрастная), sub — подпись (помягче). Для светлой
  // темы используем «-700/-800», для тёмной через `dark:` — «-300/-400».
  if (kp < 4)
    return {
      bg: 'bg-emerald-500/20 dark:bg-emerald-500/15',
      text: 'text-emerald-700 dark:text-emerald-300',
      sub: 'text-emerald-700 dark:text-emerald-200',
      labelKey: 'page.storm.kp.calm',
    };
  if (kp < 5)
    return {
      bg: 'bg-yellow-500/25 dark:bg-yellow-500/15',
      text: 'text-yellow-800 dark:text-yellow-300',
      sub: 'text-yellow-800 dark:text-yellow-200',
      labelKey: 'page.storm.kp.unsettled',
    };
  if (kp < 6)
    return {
      bg: 'bg-orange-500/25 dark:bg-orange-500/15',
      text: 'text-orange-800 dark:text-orange-300',
      sub: 'text-orange-800 dark:text-orange-200',
      labelKey: 'page.storm.kp.g1',
    };
  if (kp < 7)
    return {
      bg: 'bg-orange-600/30 dark:bg-orange-600/20',
      text: 'text-orange-800 dark:text-orange-400',
      sub: 'text-orange-800 dark:text-orange-300',
      labelKey: 'page.storm.kp.g2',
    };
  if (kp < 8)
    return {
      bg: 'bg-red-500/25 dark:bg-red-500/15',
      text: 'text-red-800 dark:text-red-300',
      sub: 'text-red-800 dark:text-red-200',
      labelKey: 'page.storm.kp.g3',
    };
  if (kp < 9)
    return {
      bg: 'bg-red-600/35 dark:bg-red-600/25',
      text: 'text-red-900 dark:text-red-400',
      sub: 'text-red-900 dark:text-red-300',
      labelKey: 'page.storm.kp.g4',
    };
  return {
    bg: 'bg-red-700/40 dark:bg-red-700/30',
    text: 'text-red-900 dark:text-red-500',
    sub: 'text-red-900 dark:text-red-400',
    labelKey: 'page.storm.kp.g5',
  };
}

function CompassArrow({ bearing, size = 88 }: { bearing: number; size?: number }) {
  const t = useT();
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
      <text x={cx} y={cy - labelOffset} fontSize={fontPx} fill="currentColor" textAnchor="middle" dominantBaseline="middle">{t('page.storm.compass.N')}</text>
      <text x={cx + labelOffset} y={cy} fontSize={fontPx} fill="currentColor" textAnchor="middle" dominantBaseline="middle">{t('page.storm.compass.E')}</text>
      <text x={cx} y={cy + labelOffset} fontSize={fontPx} fill="currentColor" textAnchor="middle" dominantBaseline="middle">{t('page.storm.compass.S')}</text>
      <text x={cx - labelOffset} y={cy} fontSize={fontPx} fill="currentColor" textAnchor="middle" dominantBaseline="middle">{t('page.storm.compass.W')}</text>
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
  const t = useT();
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
      <div className={`text-[11px] font-medium ${c.sub}`}>{t(c.labelKey)}</div>
    </div>
  );
}

export function StormSection({ config }: { config: WeatherPageConfig }) {
  const t = useT();
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

  const distUnit = distEnt?.attributes.unit_of_measurement || t('page.storm.distUnit');

  return (
    <section className="mb-6">
      <h2 className="text-xs uppercase tracking-wider text-text-tertiary mb-3 px-1">
        {t('page.storm.title')}
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {hasStorm && (
          <div className="glass p-4 flex items-center gap-4">
            {bearing !== undefined && <CompassArrow bearing={bearing} size={84} />}
            <div className="min-w-0 flex-1">
              {distance !== undefined && (
                <>
                  <div className="text-[10px] uppercase tracking-wider text-text-tertiary">
                    {t('page.storm.nearestStorm')}
                  </div>
                  <div className="text-3xl font-light tabular-nums leading-tight">
                    {Math.round(distance)} <span className="text-base text-text-tertiary">{distUnit}</span>
                  </div>
                </>
              )}
              {bearing !== undefined && (
                <div className="text-sm text-text-secondary mt-0.5">
                  {t('page.storm.bearing', {
                    dir: t(bearingToCompassLongKey(bearing)),
                    deg: Math.round(bearing),
                    short: t(bearingToCompassKey(bearing)),
                  })}
                </div>
              )}
              {movement !== undefined && (
                <div className="text-xs text-text-tertiary mt-1.5 flex items-center gap-1">
                  <span>{t('page.storm.movement', { dir: t(bearingToCompassLongKey(movement)) })}</span>
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
              {t('page.storm.geomagnetic')}
            </div>
            <div className="grid grid-cols-3 gap-2">
              <MagneticBlock entityId={config.magneticStormEntity} label={t('page.storm.today')} />
              <MagneticBlock entityId={config.magneticStormTomorrowEntity} label={t('page.storm.tomorrow')} />
              <MagneticBlock entityId={config.magneticStormAfterTomorrowEntity} label={t('page.storm.after')} />
            </div>
            <div className="text-[10px] text-text-tertiary mt-2 leading-snug">
              {t('page.storm.kpLegend')}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
