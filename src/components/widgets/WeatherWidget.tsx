'use client';

import { useEntity, useWeatherForecast } from '@/lib/ha/ConnectionProvider';
import { useWidgetSize, sizeTier } from '@/lib/widgets/useWidgetSize';
import { WeatherIcon } from '@/components/icons/WeatherIcon';

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

const FIELD_OPTIONS = [
  { value: 'apparent', label: 'Ощущается как' },
  { value: 'humidity', label: 'Влажность' },
  { value: 'wind', label: 'Ветер' },
  { value: 'pressure', label: 'Давление' },
  { value: 'uv', label: 'УФ-индекс' },
  { value: 'gust', label: 'Порывы ветра' },
  { value: 'visibility', label: 'Видимость' },
  { value: 'cloud', label: 'Облачность %' },
  { value: 'dew_point', label: 'Точка росы' },
  { value: 'forecast', label: 'Прогноз на 5 дней' },
];

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

const WEEKDAY_RU = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];

function windDirRu(deg: number | undefined): string {
  if (deg === undefined || deg === null) return '';
  const dirs = ['С', 'СВ', 'В', 'ЮВ', 'Ю', 'ЮЗ', 'З', 'СЗ'];
  return dirs[Math.round(deg / 45) % 8];
}

function fmtTemp(t: any): string {
  if (t === undefined || t === null) return '—';
  return Math.round(Number(t)) + '°';
}

export function WeatherWidget({ params }: { params: Params }) {
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
  const pressureUnit = e?.attributes.pressure_unit || 'мм';
  const visibility = e?.attributes.visibility;
  const uv = e?.attributes.uv_index;
  const cloud = e?.attributes.cloud_coverage;
  const dewPoint = e?.attributes.dew_point;
  const stateRu = STATE_RU[cond] || cond;
  const cityLabel = params.city || params.label || 'Погода';
  const fields = params.fields ?? ALL_FIELDS;
  const show = (k: string) => fields.includes(k);

  if (!size.measured) {
    return <div ref={ref} className="glass h-full w-full" />;
  }

  if (tier === 'tiny') {
    return (
      <div
        ref={ref}
        className="glass h-full w-full flex items-center justify-center"
        title={`${stateRu}, ${fmtTemp(temp)}`}
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
        title={`${stateRu}, ${fmtTemp(temp)}`}
      >
        <WeatherIcon condition={cond} size={32} />
        <div className="text-xl font-light tabular-nums leading-none">{fmtTemp(temp)}</div>
        {size.h >= 110 && (
          <div className="text-[10px] text-text-secondary truncate text-center">{stateRu}</div>
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
        title={`${stateRu}, ${fmtTemp(temp)}`}
      >
        <WeatherIcon condition={cond} size={36} />
        <div className="flex flex-col leading-none min-w-0 flex-1">
          <div className="text-[10px] text-text-secondary uppercase tracking-wider truncate">
            {cityLabel}
          </div>
          <div className="text-2xl font-light tabular-nums leading-tight">{fmtTemp(temp)}</div>
          <div className="text-[11px] text-text-secondary mt-0.5 truncate">{stateRu}</div>
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
          <div className="text-sm text-text-secondary mt-1 truncate">{stateRu}</div>
          {showApparent && (
            <div className="text-[11px] text-text-tertiary mt-0.5">
              Ощущается как {fmtTemp(apparent)}
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
            💨 {Math.round(wind)} м/с{windBearing !== undefined && ` ${windDirRu(windBearing)}`}
          </span>
        )}
        {show('pressure') && pressure !== undefined && (
          <span>📊 {Math.round(pressure)} {pressureUnit === 'mmHg' ? 'мм' : pressureUnit}</span>
        )}
        {show('uv') && uv !== undefined && uv >= 1 && <span>☀️ УФ {Math.round(uv)}</span>}
      </div>

      {showExtended && (
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-text-tertiary shrink-0">
          {show('gust') && windGust !== undefined && wind !== undefined && windGust > wind + 1 && (
            <span>⚡ Порывы {Math.round(windGust)} м/с</span>
          )}
          {show('visibility') && visibility !== undefined && <span>👁 {Math.round(visibility)} км</span>}
          {show('cloud') && cloud !== undefined && <span>☁️ {Math.round(cloud)}%</span>}
          {show('dew_point') && dewPoint !== undefined && <span>💧 точка росы {fmtTemp(dewPoint)}</span>}
        </div>
      )}

      {showForecast && (
        <div className="flex mt-auto pt-2 border-t border-black/10 dark:border-white/10 justify-between items-end gap-1 overflow-hidden">
          {forecast.slice(0, 5).map((day, i) => {
            const dt = day.datetime ? new Date(day.datetime) : null;
            const dayLabel = i === 0 ? 'Сегодня' : dt ? WEEKDAY_RU[dt.getDay()] : '?';
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
