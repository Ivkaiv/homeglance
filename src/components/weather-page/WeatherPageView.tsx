'use client';

import { motion } from 'framer-motion';
import { useEntity, useStates, useWeatherForecast } from '@/lib/ha/ConnectionProvider';
import { TempChart } from '@/components/charts/TempChart';
import { WeatherIcon } from '@/components/icons/WeatherIcon';
import { StormSection } from './StormSection';
import { useT, useI18n, type TFunction } from '@/lib/i18n/I18nProvider';
import type { WeatherPageConfig } from '@/lib/pages/types';

// Сопоставление состояния погоды HA с i18n-ключом. windy-variant использует
// тот же ключ, что и windy.
const STATE_KEY: Record<string, string> = {
  sunny: 'page.weather.state.sunny',
  clear: 'page.weather.state.clear',
  'clear-night': 'page.weather.state.clear-night',
  cloudy: 'page.weather.state.cloudy',
  partlycloudy: 'page.weather.state.partlycloudy',
  rainy: 'page.weather.state.rainy',
  pouring: 'page.weather.state.pouring',
  snowy: 'page.weather.state.snowy',
  'snowy-rainy': 'page.weather.state.snowy-rainy',
  fog: 'page.weather.state.fog',
  mist: 'page.weather.state.mist',
  windy: 'page.weather.state.windy',
  'windy-variant': 'page.weather.state.windy',
  hail: 'page.weather.state.hail',
  lightning: 'page.weather.state.lightning',
  'lightning-rainy': 'page.weather.state.lightning-rainy',
  exceptional: 'page.weather.state.exceptional',
  unknown: 'page.weather.state.unknown',
  unavailable: 'page.weather.state.unavailable',
};

// Переводит код состояния погоды; если кода нет в карте — возвращает сам код.
function stateLabel(cond: string, t: TFunction): string {
  return STATE_KEY[cond] ? t(STATE_KEY[cond]) : cond;
}

function convertTemp(c: number | undefined, unit: 'C' | 'F'): string {
  if (c === undefined || c === null) return '—';
  const v = unit === 'F' ? (c * 9) / 5 + 32 : c;
  return Math.round(v) + '°';
}

function convertWind(
  ms: number | undefined,
  unit: 'm/s' | 'km/h' | 'mph',
  t: TFunction
): string {
  if (ms === undefined || ms === null) return '—';
  const v = unit === 'km/h' ? ms * 3.6 : unit === 'mph' ? ms * 2.237 : ms;
  const unitLabel =
    unit === 'm/s'
      ? t('page.weather.windUnit.ms')
      : unit === 'km/h'
        ? t('page.weather.windUnit.kmh')
        : t('page.weather.windUnit.mph');
  return `${Math.round(v)} ${unitLabel}`;
}

function convertPressure(
  v: number | undefined,
  fromUnit: string,
  toUnit: 'mmHg' | 'hPa' | 'inHg',
  t: TFunction
): string {
  if (v === undefined || v === null) return '—';
  let hpa: number;
  if (fromUnit === 'mmHg') hpa = v * 1.33322;
  else if (fromUnit === 'inHg') hpa = v * 33.8639;
  else hpa = v;
  if (toUnit === 'mmHg') return `${Math.round(hpa / 1.33322)} ${t('page.weather.pressureUnit.mmHg')}`;
  if (toUnit === 'inHg') return `${(hpa / 33.8639).toFixed(2)} inHg`;
  return `${Math.round(hpa)} ${t('page.weather.pressureUnit.hPa')}`;
}

interface ForecastPoint {
  datetime: string;
  condition?: string;
  temperature?: number;
  templow?: number;
  precipitation?: number;
  precipitation_probability?: number;
}

function HourlyStrip({
  points,
  tempUnit,
}: {
  points: ForecastPoint[];
  tempUnit: 'C' | 'F';
}) {
  const tr = useT();
  const next24 = points.slice(0, 24);
  if (next24.length === 0) return null;
  const temps = next24.map((p) => p.temperature ?? 0);
  const tMin = Math.min(...temps);
  const tMax = Math.max(...temps);

  return (
    <div className="glass p-4 overflow-x-auto">
      <div className="flex gap-3 min-w-max">
        {next24.map((p, i) => {
          const dt = new Date(p.datetime);
          const hour = dt.getHours();
          const t = p.temperature ?? 0;
          const heightPct = tMax > tMin ? ((t - tMin) / (tMax - tMin)) * 100 : 50;
          const probP = p.precipitation_probability ?? 0;
          const isNow = i === 0;
          return (
            <div
              key={p.datetime}
              className={`flex flex-col items-center gap-1 px-1 ${
                isNow ? 'opacity-100' : 'opacity-90'
              }`}
            >
              <div className="text-[10px] text-text-secondary">{isNow ? tr('page.weather.now') : `${hour}:00`}</div>
              <WeatherIcon condition={p.condition || ''} size={28} />
              <div className="h-12 w-3 bg-black/8 dark:bg-white/8 rounded-full relative overflow-hidden">
                <div
                  className="absolute bottom-0 left-0 right-0 bg-linear-to-t from-orange-300 to-amber-200 rounded-full"
                  style={{ height: `${heightPct}%` }}
                />
              </div>
              <div className="text-xs tabular-nums font-medium">{convertTemp(t, tempUnit)}</div>
              {probP > 20 && (
                <div className="text-[10px] text-cyan-300 tabular-nums">{Math.round(probP)}%</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DailyList({ points, tempUnit }: { points: ForecastPoint[]; tempUnit: 'C' | 'F' }) {
  const { t, locale } = useI18n();
  if (points.length === 0) return null;
  return (
    <div className="glass p-2">
      {points.map((p) => {
        const dt = new Date(p.datetime);
        const weekday = dt.toLocaleDateString(locale, { weekday: 'long' });
        const dateStr = dt.toLocaleDateString(locale, { day: 'numeric', month: 'short' });
        return (
          <div
            key={p.datetime}
            className="flex items-center gap-3 px-2 py-2.5 border-b border-black/5 dark:border-white/5 last:border-0"
          >
            <div className="w-24">
              <div className="text-sm capitalize">{weekday}</div>
              <div className="text-xs text-text-tertiary">{dateStr}</div>
            </div>
            <div className="shrink-0">
              <WeatherIcon condition={p.condition || ''} size={32} />
            </div>
            <div className="flex-1 min-w-0 text-sm text-text-secondary truncate">
              {STATE_KEY[p.condition || ''] ? t(STATE_KEY[p.condition || '']) : ''}
            </div>
            <div className="text-sm tabular-nums text-right shrink-0 flex flex-col items-end leading-tight">
              <div>
                <span className="text-text-tertiary">
                  {p.templow !== undefined ? convertTemp(p.templow, tempUnit) : '—'}
                </span>
                <span className="mx-1 text-text-tertiary opacity-50">/</span>
                <span className="font-medium">
                  {p.temperature !== undefined ? convertTemp(p.temperature, tempUnit) : '—'}
                </span>
              </div>
              {p.precipitation !== undefined && p.precipitation > 0.1 && (
                <div className="text-[10px] text-cyan-300/80 tabular-nums mt-0.5">
                  💧 {p.precipitation.toFixed(1)} {t('w.weather.mmPerH')}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function SensorTile({
  entityId,
  emoji,
  label,
}: {
  entityId: string;
  emoji?: string;
  label?: string;
}) {
  const e = useEntity(entityId);
  if (!e) return null;
  const v = e.state;
  const unit = e.attributes.unit_of_measurement || '';
  const friendlyName = label || e.attributes.friendly_name || entityId;
  return (
    <div className="glass p-3">
      <div className="text-xs text-text-secondary uppercase tracking-wider truncate flex items-center gap-1.5">
        {emoji && <span>{emoji}</span>}
        <span>{friendlyName}</span>
      </div>
      <div className="text-2xl font-light tabular-nums mt-1">
        {v && v !== 'unknown' && v !== 'unavailable' ? `${v}${unit ? ' ' + unit : ''}` : '—'}
      </div>
    </div>
  );
}

interface Props {
  config: WeatherPageConfig;
  pageTitle: string;
}

export function WeatherPageView({ config, pageTitle }: Props) {
  const t = useT();
  const w = useEntity(config.weatherEntity);
  const outdoorTempEntity = useEntity(config.outdoorTempEntity);
  const apparentEntity = useEntity(config.apparentTempEntity);
  const states = useStates();
  const tempUnit = config.tempUnit ?? 'C';
  const windUnit = config.windUnit ?? 'm/s';
  const pressureUnit = config.pressureUnit ?? 'mmHg';
  const sections = config.sections;

  const wantHourly = sections.hourly;
  const wantDaily = sections.daily;
  const hourly = useWeatherForecast(
    wantHourly ? config.weatherEntity : undefined,
    'hourly'
  ) as ForecastPoint[];
  const daily = useWeatherForecast(
    wantDaily ? config.weatherEntity : undefined,
    'daily'
  ) as ForecastPoint[];

  if (!w) {
    return (
      <div className="p-6 text-center text-text-tertiary">
        {t('page.weather.noProvider')}
      </div>
    );
  }

  const cond = w.state ?? 'unknown';
  const stateRu = stateLabel(cond, t);

  // Температура: предпочесть уличный датчик, если он есть и валидный
  let temp: number | undefined;
  if (
    outdoorTempEntity &&
    outdoorTempEntity.state !== 'unknown' &&
    outdoorTempEntity.state !== 'unavailable'
  ) {
    const n = Number(outdoorTempEntity.state);
    if (!Number.isNaN(n)) temp = n;
  }
  if (temp === undefined) temp = w.attributes.temperature;

  // «Ощущается как»: предпочесть свой сенсор, если задан и валидный
  let apparent: number | undefined;
  if (
    apparentEntity &&
    apparentEntity.state !== 'unknown' &&
    apparentEntity.state !== 'unavailable'
  ) {
    const n = Number(apparentEntity.state);
    if (!Number.isNaN(n)) apparent = n;
  }
  if (apparent === undefined) apparent = w.attributes.apparent_temperature;

  // Активные метеопредупреждения
  const activeAlerts = (config.alertEntities ?? [])
    .map((id) => states[id])
    .filter(
      (a) =>
        a &&
        a.state !== 'off' &&
        a.state !== '0' &&
        a.state !== 'unavailable' &&
        a.state !== 'unknown'
    );

  return (
    <div className="max-w-(--breakpoint-xl) mx-auto p-4 sm:p-6">
      <motion.h1
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-2xl sm:text-3xl font-semibold mb-5 flex items-center gap-3"
      >
        <span>🌤</span>
        <span>{pageTitle || t('page.weather.title')}</span>
      </motion.h1>

      {sections.header && (
        <div className="glass p-5 mb-6">
          <div className="flex items-center gap-3 sm:gap-5 flex-nowrap">
            <div className="shrink-0">
              <div className="text-xs text-text-secondary uppercase tracking-wider">{t('page.weather.nowLabel')}</div>
              <div className="flex items-center gap-2 sm:gap-4 mt-1">
                <div className="flex items-baseline gap-2">
                  <div className="text-6xl sm:text-7xl font-light tabular-nums leading-none">
                    {convertTemp(temp, tempUnit)}
                  </div>
                  {apparent !== undefined && (
                    <div className="text-xl sm:text-2xl font-light tabular-nums text-text-tertiary leading-none whitespace-nowrap">
                      / {convertTemp(apparent, tempUnit)}
                    </div>
                  )}
                </div>
                <WeatherIcon condition={cond} size={56} strokeWidth={1.4} />
              </div>
              <div className="text-sm sm:text-base text-text-secondary mt-2">{stateRu}</div>
            </div>
            {config.outdoorTempEntity && (
              <div className="flex-1 min-w-0">
                <TempChart
                  entityId={config.outdoorTempEntity}
                  hoursBack={24}
                  modalLabel={t('page.weather.outdoorChartLabel')}
                />
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-text-secondary mt-4 pt-3 border-t border-black/4 dark:border-white/4">
            {w.attributes.humidity !== undefined && (
              <div>💧 {Math.round(w.attributes.humidity)}%</div>
            )}
            {w.attributes.wind_speed !== undefined && (
              <div>💨 {convertWind(w.attributes.wind_speed, windUnit, t)}</div>
            )}
            {w.attributes.cloud_coverage !== undefined && (
              <div>☁️ {Math.round(w.attributes.cloud_coverage)}%</div>
            )}
            {w.attributes.pressure !== undefined && (
              <div>
                📊 {convertPressure(w.attributes.pressure, w.attributes.pressure_unit || 'hPa', pressureUnit, t)}
              </div>
            )}
          </div>
        </div>
      )}

      {sections.alerts && activeAlerts.length > 0 && (
        <section className="mb-6">
          <h2 className="text-xs uppercase tracking-wider text-text-tertiary mb-3 px-1">
            {t('page.weather.alerts.title')}
          </h2>
          <div className="flex flex-col gap-2">
            {activeAlerts.map((a) => {
              const isOrange = a.entity_id.includes('_o_') || a.state.toLowerCase().includes('orange');
              return (
                <div
                  key={a.entity_id}
                  className={`p-4 rounded-2xl border-l-4 ${
                    isOrange
                      ? 'bg-orange-500/15 border-orange-400'
                      : 'bg-yellow-500/15 border-yellow-400'
                  }`}
                >
                  <div
                    className={`text-xs uppercase font-medium mb-1 ${
                      isOrange
                        ? 'text-orange-700 dark:text-orange-200'
                        : 'text-yellow-700 dark:text-yellow-200'
                    }`}
                  >
                    {isOrange ? t('page.weather.alerts.orange') : t('page.weather.alerts.yellow')}
                  </div>
                  <div className="text-text-primary font-medium">
                    {a.attributes.friendly_name || a.state}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {sections.hourly && hourly.length > 0 && (
        <section className="mb-6">
          <h2 className="text-xs uppercase tracking-wider text-text-tertiary mb-3 px-1">{t('page.weather.hourly.title')}</h2>
          <HourlyStrip points={hourly} tempUnit={tempUnit} />
        </section>
      )}

      {sections.daily && daily.length > 0 && (
        <section className="mb-6">
          <h2 className="text-xs uppercase tracking-wider text-text-tertiary mb-3 px-1">{t('page.weather.daily.title')}</h2>
          <DailyList points={daily} tempUnit={tempUnit} />
        </section>
      )}

      {sections.extras && (config.extraSensors?.length ?? 0) > 0 && (
        <section className="mb-6">
          <h2 className="text-xs uppercase tracking-wider text-text-tertiary mb-3 px-1">{t('page.weather.extras.title')}</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {config.extraSensors!.map((id) => (
              <SensorTile key={id} entityId={id} />
            ))}
          </div>
        </section>
      )}

      {sections.lightning && (config.lightningSensors?.length ?? 0) > 0 && (
        <section className="mb-6">
          <h2 className="text-xs uppercase tracking-wider text-text-tertiary mb-3 px-1">{t('page.weather.lightning.title')}</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {config.lightningSensors!.map((id) => (
              <SensorTile key={id} entityId={id} />
            ))}
          </div>
        </section>
      )}

      {sections.storm && <StormSection config={config} />}
    </div>
  );
}
