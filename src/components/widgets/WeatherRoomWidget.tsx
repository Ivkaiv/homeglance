'use client';

import { useEntity, useWeatherForecast } from '@/lib/ha/ConnectionProvider';

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

const STATE_RU: Record<string, string> = {
  sunny: 'Солнечно',
  clear: 'Ясно',
  'clear-night': 'Ясная ночь',
  cloudy: 'Облачно',
  partlycloudy: 'Переменно',
  rainy: 'Дождь',
  pouring: 'Ливень',
  snowy: 'Снег',
  'snowy-rainy': 'Снег с дождём',
  fog: 'Туман',
  mist: 'Дымка',
  windy: 'Ветрено',
  hail: 'Град',
  lightning: 'Гроза',
  'lightning-rainy': 'Гроза с дождём',
  exceptional: 'Опасная погода',
  unknown: '—',
  unavailable: 'Нет данных',
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

const WEEKDAY_RU = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];

const FIELD_OPTIONS = [
  { value: 'apparent', label: 'Ощущается как' },
  { value: 'humidity', label: 'Влажность' },
  { value: 'wind', label: 'Ветер (скорость + направление)' },
  { value: 'wind_gust', label: 'Порывы ветра' },
  { value: 'pressure', label: 'Атмосферное давление' },
  { value: 'uv', label: 'УФ-индекс' },
  { value: 'visibility', label: 'Видимость' },
  { value: 'cloud', label: 'Облачность %' },
  { value: 'dew_point', label: 'Точка росы' },
  { value: 'forecast', label: 'Прогноз на несколько дней' },
];

const DEFAULT_FIELDS = [
  'apparent',
  'humidity',
  'wind',
  'pressure',
  'uv',
  'forecast',
];

function windDirRu(deg: number | undefined): string {
  if (deg === undefined || deg === null) return '';
  const dirs = ['С', 'СВ', 'В', 'ЮВ', 'Ю', 'ЮЗ', 'З', 'СЗ'];
  return dirs[Math.round(deg / 45) % 8];
}

function convertTemp(c: number | undefined, unit: 'C' | 'F'): string {
  if (c === undefined || c === null) return '—';
  const v = unit === 'F' ? c * 9 / 5 + 32 : c;
  return Math.round(v) + (unit === 'F' ? '°F' : '°');
}

function convertWind(ms: number | undefined, unit: 'm/s' | 'km/h' | 'mph'): string {
  if (ms === undefined || ms === null) return '—';
  const v = unit === 'km/h' ? ms * 3.6 : unit === 'mph' ? ms * 2.237 : ms;
  return `${Math.round(v)} ${unit === 'm/s' ? 'м/с' : unit === 'km/h' ? 'км/ч' : 'миль/ч'}`;
}

function convertPressure(
  v: number | undefined,
  fromUnit: string,
  toUnit: 'mmHg' | 'hPa' | 'inHg'
): string {
  if (v === undefined || v === null) return '—';
  let hpa: number;
  if (fromUnit === 'mmHg') hpa = v * 1.33322;
  else if (fromUnit === 'inHg') hpa = v * 33.8639;
  else hpa = v;
  let out: number;
  let label: string;
  if (toUnit === 'mmHg') {
    out = hpa / 1.33322;
    label = 'мм рт. ст.';
  } else if (toUnit === 'inHg') {
    out = hpa / 33.8639;
    label = 'inHg';
  } else {
    out = hpa;
    label = 'гПа';
  }
  return `${Math.round(out)} ${label}`;
}

function convertVisibility(km: number | undefined, unit: 'km' | 'mi'): string {
  if (km === undefined || km === null) return '—';
  const v = unit === 'mi' ? km * 0.621371 : km;
  return `${Math.round(v)} ${unit === 'mi' ? 'миль' : 'км'}`;
}

interface MetricItem {
  key: string;
  icon: string;
  label: string;
  value: string;
}

export function WeatherRoomWidget({ params }: { params: Params }) {
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
  const stateRu = STATE_RU[cond] || cond;
  const cityLabel = params.city || 'Погода';

  const metrics: MetricItem[] = [];
  if (fields.includes('apparent') && apparent !== undefined) {
    metrics.push({
      key: 'apparent',
      icon: '🌡',
      label: 'Ощущается',
      value: convertTemp(apparent, tempUnit),
    });
  }
  if (fields.includes('humidity') && humidity !== undefined) {
    metrics.push({
      key: 'humidity',
      icon: '💧',
      label: 'Влажность',
      value: `${Math.round(humidity)}%`,
    });
  }
  if (fields.includes('wind') && wind !== undefined) {
    metrics.push({
      key: 'wind',
      icon: '💨',
      label: 'Ветер',
      value: `${convertWind(wind, windUnit)}${windBearing !== undefined ? ' ' + windDirRu(windBearing) : ''}`,
    });
  }
  if (fields.includes('wind_gust') && windGust !== undefined) {
    metrics.push({
      key: 'wind_gust',
      icon: '⚡',
      label: 'Порывы',
      value: convertWind(windGust, windUnit),
    });
  }
  if (fields.includes('pressure') && pressure !== undefined) {
    metrics.push({
      key: 'pressure',
      icon: '📊',
      label: 'Давление',
      value: convertPressure(pressure, pressureUnitFrom, pressureUnit),
    });
  }
  if (fields.includes('uv') && uv !== undefined) {
    let uvLevel = '';
    if (uv >= 11) uvLevel = ' (экстрим)';
    else if (uv >= 8) uvLevel = ' (очень высокий)';
    else if (uv >= 6) uvLevel = ' (высокий)';
    else if (uv >= 3) uvLevel = ' (умеренный)';
    else uvLevel = ' (низкий)';
    metrics.push({
      key: 'uv',
      icon: '☀️',
      label: 'УФ',
      value: `${Math.round(uv)}${uvLevel}`,
    });
  }
  if (fields.includes('visibility') && visibility !== undefined) {
    metrics.push({
      key: 'visibility',
      icon: '👁',
      label: 'Видимость',
      value: convertVisibility(visibility, visibilityUnit),
    });
  }
  if (fields.includes('cloud') && cloud !== undefined) {
    metrics.push({
      key: 'cloud',
      icon: '☁️',
      label: 'Облачность',
      value: `${Math.round(cloud)}%`,
    });
  }
  if (fields.includes('dew_point') && dewPoint !== undefined) {
    metrics.push({
      key: 'dew_point',
      icon: '💦',
      label: 'Точка росы',
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
          <div className="text-sm text-text-secondary mt-1.5 truncate">{stateRu}</div>
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
            const dayLabel = i === 0 ? 'Сегодня' : dt ? WEEKDAY_RU[dt.getDay()] : '?';
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
