'use client';

import { useEntity, useWeatherForecast } from '@/lib/ha/ConnectionProvider';
import { useWidgetSize, sizeTier } from '@/lib/widgets/useWidgetSize';
import { WeatherIcon } from '@/components/icons/WeatherIcon';
import { useT } from '@/lib/i18n/I18nProvider';

interface Params {
  entity: string;
  label?: string;
  city?: string;
  /** Что показывать. Если undefined — все доступные. */
  fields?: string[];
}

const ALL_FIELDS = [
  'apparent',
  'humidity',
  'wind',
  'pressure',
  'uv',
  'gust',
  'visibility',
  'cloud',
  'dew_point',
  'forecast',
];

const WEATHER_STATE_KEYS: Record<string, string> = {
  sunny: 'w.weather.state.sunny',
  clear: 'w.weather.state.sunny',
  'clear-night': 'w.weather.state.clear-night',
  cloudy: 'w.weather.state.cloudy',
  partlycloudy: 'w.weather.state.partlycloudy',
  rainy: 'w.weather.state.rainy',
  pouring: 'w.weather.state.pouring',
  snowy: 'w.weather.state.snowy',
  'snowy-rainy': 'w.weather.state.snowy-rainy',
  fog: 'w.weather.state.fog',
  mist: 'w.weather.state.fog',
  windy: 'w.weather.state.windy',
  hail: 'w.weather.state.hail',
  lightning: 'w.weather.state.lightning',
  'lightning-rainy': 'w.weather.state.lightning-rainy',
  exceptional: 'w.weather.state.exceptional',
};

const WIND_DIR_KEYS = [
  'w.weather.wind.N',
  'w.weather.wind.NE',
  'w.weather.wind.E',
  'w.weather.wind.SE',
  'w.weather.wind.S',
  'w.weather.wind.SW',
  'w.weather.wind.W',
  'w.weather.wind.NW',
];

function fmtTemp(t: any): string {
  if (t === undefined || t === null) return '—';
  return Math.round(Number(t)) + '°';
}

export function WeatherWidget({ params }: { params: Params }) {
  const t = useT();
  const e = useEntity(params.entity);
  const forecast = useWeatherForecast(params.entity, 'daily');
  const [ref, size] = useWidgetSize();
  const tier = sizeTier(size);

  const cond = e?.state ?? 'unknown';
  const temp = e?.attributes.temperature;
  const apparent = e?.attributes.apparent_temperature;
  const humidity = e?.attributes.humidity;
  const wind = e?.attributes.wind_speed;
  const windBearing = e?.attributes.wind_bearing;
  const windGust = e?.attributes.wind_gust_speed;
  const pressure = e?.attributes.pressure;
  const pressureUnit = e?.attributes.pressure_unit || t('w.weather.mmPerH');
  const visibility = e?.attributes.visibility;
  const uv = e?.attributes.uv_index;
  const cloud = e?.attributes.cloud_coverage;
  const dewPoint = e?.attributes.dew_point;
  const stateStr = WEATHER_STATE_KEYS[cond] ? t(WEATHER_STATE_KEYS[cond]) : cond;
  const cityLabel = params.city || params.label || t('w.weather.label');
  const fields = params.fields ?? ALL_FIELDS;
  const show = (k: string) => fields.includes(k);
  const windDir = (deg: number | undefined): string => {
    if (deg === undefined || deg === null) return '';
    return t(WIND_DIR_KEYS[Math.round(deg / 45) % 8]);
  };

  if (!size.measured) {
    return <div ref={ref} className="glass h-full w-full" />;
  }

  if (tier === 'tiny') {
    return (
      <div
        ref={ref}
        className="glass h-full w-full flex items-center justify-center"
        title={`${stateStr}, ${fmtTemp(temp)}`}
      >
        <WeatherIcon condition={cond} size={26} />
      </div>
    );
  }

  if (tier === 'small') {
    return (
      <div
        ref={ref}
        className="glass h-full w-full p-2 flex flex-col items-center justify-center gap-1"
        title={`${stateStr}, ${fmtTemp(temp)}`}
      >
        <WeatherIcon condition={cond} size={32} />
        <div className="text-xl font-light tabular-nums leading-none">{fmtTemp(temp)}</div>
        {size.h >= 110 && (
          <div className="text-[10px] text-text-secondary truncate text-center">{stateStr}</div>
        )}
      </div>
    );
  }

  // Низкий виджет (medium-width, h<110) — горизонталь
  if (size.h < 110) {
    return (
      <div
        ref={ref}
        className="glass h-full w-full p-2 flex items-center gap-3 overflow-hidden"
        title={`${stateStr}, ${fmtTemp(temp)}`}
      >
        <WeatherIcon condition={cond} size={36} />
        <div className="flex flex-col leading-none min-w-0 flex-1">
          <div className="text-[10px] text-text-secondary uppercase tracking-wider truncate">
            {cityLabel}
          </div>
          <div className="text-2xl font-light tabular-nums leading-tight">{fmtTemp(temp)}</div>
          <div className="text-[11px] text-text-secondary mt-0.5 truncate">{stateStr}</div>
        </div>
        {show('humidity') && humidity !== undefined && size.w >= 200 && (
          <div className="text-xs text-text-tertiary tabular-nums shrink-0 whitespace-nowrap">
            💧 {Math.round(humidity)}%
          </div>
        )}
      </div>
    );
  }

  // medium / large — полный layout
  const showApparent = show('apparent') && size.h >= 160 && apparent !== undefined;
  const showExtended = size.w >= 260 && size.h >= 180;
  const showForecast = show('forecast') && size.w >= 300 && size.h >= 220 && forecast.length >= 2;

  return (
    <div ref={ref} className="glass h-full w-full p-4 flex flex-col gap-2 overflow-hidden">
      <div className="flex items-start justify-between gap-2 shrink-0">
        <div className="min-w-0 flex-1">
          <div className="text-xs text-text-secondary uppercase tracking-wider truncate">
            {cityLabel}
          </div>
          <div className="text-4xl font-light tabular-nums leading-none mt-1">
            {fmtTemp(temp)}
          </div>
          <div className="text-sm text-text-secondary mt-1 truncate">{stateStr}</div>
          {showApparent && (
            <div className="text-[11px] text-text-tertiary mt-0.5">
              {t('w.weather.feelsLike')} {fmtTemp(apparent)}
            </div>
          )}
        </div>
        <div className="shrink-0">
          <WeatherIcon condition={cond} size={tier === 'large' ? 56 : 48} strokeWidth={1.4} />
        </div>
      </div>

      {/* Базовые extras */}
      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-text-tertiary mt-1 shrink-0">
        {show('humidity') && humidity !== undefined && <span>💧 {Math.round(humidity)}%</span>}
        {show('wind') && wind !== undefined && (
          <span>
            💨 {Math.round(wind)} {t('w.weatherRoom.windUnit.ms')}{windBearing !== undefined && ` ${windDir(windBearing)}`}
          </span>
        )}
        {show('pressure') && pressure !== undefined && (
          <span>📊 {Math.round(pressure)} {pressureUnit === 'mmHg' ? t('w.weather.mmPerH') : pressureUnit}</span>
        )}
        {show('uv') && uv !== undefined && uv >= 1 && <span>☀️ {t('w.weather.uv')} {Math.round(uv)}</span>}
      </div>

      {showExtended && (
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-text-tertiary shrink-0">
          {show('gust') && windGust !== undefined && wind !== undefined && windGust > wind + 1 && (
            <span>⚡ {t('w.weather.gusts')} {Math.round(windGust)} {t('w.weatherRoom.windUnit.ms')}</span>
          )}
          {show('visibility') && visibility !== undefined && <span>👁 {Math.round(visibility)} {t('w.weather.km')}</span>}
          {show('cloud') && cloud !== undefined && <span>☁️ {Math.round(cloud)}%</span>}
          {show('dew_point') && dewPoint !== undefined && <span>💧 {t('w.weather.dewPoint')} {fmtTemp(dewPoint)}</span>}
        </div>
      )}

      {showForecast && (
        <div className="flex mt-auto pt-2 border-t border-black/10 dark:border-white/10 justify-between items-end gap-1 overflow-hidden">
          {forecast.slice(0, 5).map((day, i) => {
            const dt = day.datetime ? new Date(day.datetime) : null;
            const dayLabel = i === 0 ? t('w.weather.today') : dt ? t(`w.weather.weekday.${dt.getDay()}`) : '?';
            const dayCond = day.condition || 'unknown';
            const tHigh = day.temperature ?? day.native_temperature;
            const tLow = day.templow ?? day.native_templow;
            return (
              <div key={i} className="flex flex-col items-center gap-0.5 min-w-0 flex-1">
                <span className="text-[10px] text-text-tertiary truncate">{dayLabel}</span>
                <WeatherIcon condition={dayCond} size={22} />
                <span className="text-xs tabular-nums">{fmtTemp(tHigh)}</span>
                {tLow !== undefined && (
                  <span className="text-[10px] text-text-tertiary tabular-nums">
                    {fmtTemp(tLow)}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
