'use client';

import { useEntity, useWeatherForecast } from '@/lib/ha/ConnectionProvider';
import { useT } from '@/lib/i18n/I18nProvider';

interface Params {
  entity: string;
  city?: string;
  fields?: string[];
  tempUnit?: 'C' | 'F';
  windUnit?: 'm/s' | 'km/h' | 'mph';
  pressureUnit?: 'mmHg' | 'hPa' | 'inHg';
  visibilityUnit?: 'km' | 'mi';
  forecastDays?: number;
}

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

const STATE_EMOJI: Record<string, string> = {
  sunny: '☀️',
  clear: '☀️',
  'clear-night': '🌙',
  cloudy: '☁️',
  partlycloudy: '⛅',
  rainy: '🌧',
  pouring: '🌧',
  snowy: '❄️',
  'snowy-rainy': '🌨',
  fog: '🌫',
  mist: '🌫',
  windy: '💨',
  hail: '🌨',
  lightning: '⛈',
  'lightning-rainy': '⛈',
  exceptional: '🌪',
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

const DEFAULT_FIELDS = [
  'apparent',
  'humidity',
  'wind',
  'pressure',
  'uv',
  'forecast',
];

function convertTemp(c: number | undefined, unit: 'C' | 'F'): string {
  if (c === undefined || c === null) return '—';
  const v = unit === 'F' ? c * 9 / 5 + 32 : c;
  return Math.round(v) + (unit === 'F' ? '°F' : '°');
}

function convertWindVal(ms: number | undefined, unit: 'm/s' | 'km/h' | 'mph'): number | null {
  if (ms === undefined || ms === null) return null;
  return unit === 'km/h' ? ms * 3.6 : unit === 'mph' ? ms * 2.237 : ms;
}

function convertPressureVal(
  v: number | undefined,
  fromUnit: string,
  toUnit: 'mmHg' | 'hPa' | 'inHg'
): { val: number; unitKey: string } | null {
  if (v === undefined || v === null) return null;
  let hpa: number;
  if (fromUnit === 'mmHg') hpa = v * 1.33322;
  else if (fromUnit === 'inHg') hpa = v * 33.8639;
  else hpa = v;
  let out: number;
  let unitKey: string;
  if (toUnit === 'mmHg') {
    out = hpa / 1.33322;
    unitKey = 'w.weatherRoom.pressureUnit.mmHg';
  } else if (toUnit === 'inHg') {
    out = hpa / 33.8639;
    unitKey = 'w.weatherRoom.pressureUnit.inHg';
  } else {
    out = hpa;
    unitKey = 'w.weatherRoom.pressureUnit.hPa';
  }
  return { val: Math.round(out), unitKey };
}

function convertVisibilityVal(km: number | undefined, unit: 'km' | 'mi'): { val: number; unitKey: string } | null {
  if (km === undefined || km === null) return null;
  const v = unit === 'mi' ? km * 0.621371 : km;
  return { val: Math.round(v), unitKey: unit === 'mi' ? 'w.weatherRoom.visibilityUnit.mi' : 'w.weatherRoom.visibilityUnit.km' };
}

interface MetricItem {
  key: string;
  icon: string;
  label: string;
  value: string;
}

export function WeatherRoomWidget({ params }: { params: Params }) {
  const t = useT();
  const e = useEntity(params.entity);
  const fields = params.fields ?? DEFAULT_FIELDS;
  const tempUnit = params.tempUnit ?? 'C';
  const windUnit = params.windUnit ?? 'm/s';
  const pressureUnit = params.pressureUnit ?? 'mmHg';
  const visibilityUnit = params.visibilityUnit ?? 'km';
  const forecastDays = Math.max(1, Math.min(7, params.forecastDays ?? 5));

  const wantForecast = fields.includes('forecast');
  const forecast = useWeatherForecast(wantForecast ? params.entity : undefined, 'daily');

  const cond = e?.state ?? 'unknown';
  const temp = e?.attributes.temperature;
  const apparent = e?.attributes.apparent_temperature;
  const humidity = e?.attributes.humidity;
  const wind = e?.attributes.wind_speed;
  const windBearing = e?.attributes.wind_bearing;
  const windGust = e?.attributes.wind_gust_speed;
  const pressure = e?.attributes.pressure;
  const pressureUnitFrom = e?.attributes.pressure_unit || 'hPa';
  const visibility = e?.attributes.visibility;
  const uv = e?.attributes.uv_index;
  const cloud = e?.attributes.cloud_coverage;
  const dewPoint = e?.attributes.dew_point;
  const emoji = STATE_EMOJI[cond] || '🌡';
  const stateStr = WEATHER_STATE_KEYS[cond] ? t(WEATHER_STATE_KEYS[cond]) : cond;
  const cityLabel = params.city || t('w.weather.label');

  const windUnitKey = windUnit === 'km/h' ? 'w.weatherRoom.windUnit.kmh' : windUnit === 'mph' ? 'w.weatherRoom.windUnit.mph' : 'w.weatherRoom.windUnit.ms';
  const windDir = (deg: number | undefined): string => {
    if (deg === undefined || deg === null) return '';
    return t(WIND_DIR_KEYS[Math.round(deg / 45) % 8]);
  };

  const metrics: MetricItem[] = [];
  if (fields.includes('apparent') && apparent !== undefined) {
    metrics.push({
      key: 'apparent',
      icon: '🌡',
      label: t('w.weatherRoom.feelsLike'),
      value: convertTemp(apparent, tempUnit),
    });
  }
  if (fields.includes('humidity') && humidity !== undefined) {
    metrics.push({
      key: 'humidity',
      icon: '💧',
      label: t('w.weatherRoom.humidity'),
      value: `${Math.round(humidity)}%`,
    });
  }
  if (fields.includes('wind') && wind !== undefined) {
    const wv = convertWindVal(wind, windUnit);
    metrics.push({
      key: 'wind',
      icon: '💨',
      label: t('w.weatherRoom.wind'),
      value: wv !== null ? `${Math.round(wv)} ${t(windUnitKey)}${windBearing !== undefined ? ' ' + windDir(windBearing) : ''}` : '—',
    });
  }
  if (fields.includes('wind_gust') && windGust !== undefined) {
    const wv = convertWindVal(windGust, windUnit);
    metrics.push({
      key: 'wind_gust',
      icon: '⚡',
      label: t('w.weatherRoom.gusts'),
      value: wv !== null ? `${Math.round(wv)} ${t(windUnitKey)}` : '—',
    });
  }
  if (fields.includes('pressure') && pressure !== undefined) {
    const pv = convertPressureVal(pressure, pressureUnitFrom, pressureUnit);
    metrics.push({
      key: 'pressure',
      icon: '📊',
      label: t('w.weatherRoom.pressure'),
      value: pv !== null ? `${pv.val} ${t(pv.unitKey)}` : '—',
    });
  }
  if (fields.includes('uv') && uv !== undefined) {
    let uvLevelKey = 'w.weatherRoom.uv.low';
    if (uv >= 11) uvLevelKey = 'w.weatherRoom.uv.extreme';
    else if (uv >= 8) uvLevelKey = 'w.weatherRoom.uv.veryHigh';
    else if (uv >= 6) uvLevelKey = 'w.weatherRoom.uv.high';
    else if (uv >= 3) uvLevelKey = 'w.weatherRoom.uv.moderate';
    metrics.push({
      key: 'uv',
      icon: '☀️',
      label: t('w.weatherRoom.uv'),
      value: `${Math.round(uv)} ${t(uvLevelKey)}`,
    });
  }
  if (fields.includes('visibility') && visibility !== undefined) {
    const vv = convertVisibilityVal(visibility, visibilityUnit);
    metrics.push({
      key: 'visibility',
      icon: '👁',
      label: t('w.weatherRoom.visibility'),
      value: vv !== null ? `${vv.val} ${t(vv.unitKey)}` : '—',
    });
  }
  if (fields.includes('cloud') && cloud !== undefined) {
    metrics.push({
      key: 'cloud',
      icon: '☁️',
      label: t('w.weatherRoom.cloud'),
      value: `${Math.round(cloud)}%`,
    });
  }
  if (fields.includes('dew_point') && dewPoint !== undefined) {
    metrics.push({
      key: 'dew_point',
      icon: '💦',
      label: t('w.weatherRoom.dewPoint'),
      value: convertTemp(dewPoint, tempUnit),
    });
  }

  // Сетка метрик: 2 колонки до 380px, 3 — на 380+ (через CSS variable + CQ)
  // Прогноз: видим если h>=180 (ch-flex-min-180) и есть данные.
  // Виджет имеет minSize 4×4, поэтому маленьких tier'ов нет — всегда «крупная» карточка.
  return (
    <div
      className="@container glass h-full w-full p-4 flex flex-col gap-3 overflow-hidden"
      style={{ containerType: 'size' }}
    >
      {/* Заголовок: город + большая температура + эмодзи */}
      <div className="flex items-start justify-between gap-2 shrink-0">
        <div className="min-w-0 flex-1">
          <div className="text-xs text-text-secondary uppercase tracking-wider truncate">
            {cityLabel}
          </div>
          <div className="text-5xl font-light tabular-nums leading-none mt-1">
            {convertTemp(temp, tempUnit)}
          </div>
          <div className="text-sm text-text-secondary mt-1.5 truncate">{stateStr}</div>
        </div>
        <div className="text-6xl shrink-0 leading-none">{emoji}</div>
      </div>

      {/* Сетка метрик: grid-template-columns переключается через CQ */}
      {metrics.length > 0 && (
        <div
          className="grid gap-x-3 gap-y-1.5 shrink-0 grid-cols-2 @[380px]:grid-cols-3"
        >
          {metrics.map((m) => (
            <div
              key={m.key}
              className="flex items-center gap-2 text-xs text-text-secondary min-w-0"
            >
              <span className="text-base shrink-0">{m.icon}</span>
              <div className="min-w-0 flex-1">
                <div className="text-[10px] text-text-tertiary uppercase tracking-wide truncate">
                  {m.label}
                </div>
                <div className="text-text-primary truncate">{m.value}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Прогноз: видим только при h>=180 */}
      {wantForecast && forecast.length >= 2 && (
        <div className="ch-flex-min-180 mt-auto pt-3 border-t border-black/10 dark:border-white/10 justify-between items-end gap-1 overflow-hidden">
          {forecast.slice(0, forecastDays).map((day, i) => {
            const dt = day.datetime ? new Date(day.datetime) : null;
            const dayLabel = i === 0 ? t('w.weather.today') : dt ? t(`w.weather.weekday.${dt.getDay()}`) : '?';
            const dayCond = day.condition || 'unknown';
            const dayEmoji = STATE_EMOJI[dayCond] || '🌡';
            const tHigh = day.temperature ?? day.native_temperature;
            const tLow = day.templow ?? day.native_templow;
            return (
              <div
                key={i}
                className="flex flex-col items-center gap-0.5 min-w-0 flex-1"
              >
                <span className="text-[10px] text-text-tertiary truncate">{dayLabel}</span>
                <span className="text-2xl">{dayEmoji}</span>
                <span className="text-sm tabular-nums">{convertTemp(tHigh, tempUnit)}</span>
                {tLow !== undefined && (
                  <span className="text-[10px] text-text-tertiary tabular-nums">
                    {convertTemp(tLow, tempUnit)}
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
