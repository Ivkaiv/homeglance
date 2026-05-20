import type { WidgetConfig } from '@/lib/widgets/types';

/** Какие секции показывать на странице погоды */
export interface WeatherPageSections {
  /** Шапка: большая температура + чарт */
  header: boolean;
  /** Метеопредупреждения (оранжевые/жёлтые) */
  alerts: boolean;
  /** Прогноз на 24 часа (горизонтальная лента) */
  hourly: boolean;
  /** Прогноз на неделю (список дней) */
  daily: boolean;
  /** Прочие датчики (УФ, порывы, озон) */
  extras: boolean;
  /** Грозы: счётчик, дистанция, азимут */
  lightning: boolean;
  /** Шторм: движение */
  storm: boolean;
}

/** Настройки страницы типа «Погода» */
export interface WeatherPageConfig {
  /** Сущность поставщика погоды (weather.*) */
  weatherEntity: string;
  /** Опционально — уличный датчик температуры (для шапки и графика) */
  outdoorTempEntity?: string;
  /** Опционально — свой сенсор «Ощущается как» (sensor.*) */
  apparentTempEntity?: string;
  /** Сущности метеопредупреждений (sensor.*) */
  alertEntities?: string[];
  /** Сущности доп. датчиков для секции «Прочее» */
  extraSensors?: string[];
  /** Сущности грозовых датчиков (счётчик/дистанция/азимут) */
  lightningSensors?: string[];
  /** Сущность движения шторма */
  stormEntity?: string;
  /** Расстояние до ближайшей грозы (sensor.* в км) */
  stormDistanceEntity?: string;
  /** Направление до ближайшей грозы (sensor.* в градусах) */
  stormBearingEntity?: string;
  /** Геомагнитная активность сейчас (sensor.* в Kp) */
  magneticStormEntity?: string;
  /** Прогноз геомагнитной активности на завтра */
  magneticStormTomorrowEntity?: string;
  /** Прогноз геомагнитной активности на послезавтра */
  magneticStormAfterTomorrowEntity?: string;
  /** Какие секции показывать */
  sections: WeatherPageSections;
  /** Единицы температуры */
  tempUnit?: 'C' | 'F';
  /** Единицы скорости ветра */
  windUnit?: 'm/s' | 'km/h' | 'mph';
  /** Единицы давления */
  pressureUnit?: 'mmHg' | 'hPa' | 'inHg';
}

/** Настройки страницы типа «Музыка» (плеер Music Assistant).
 *  Подключение к Music Assistant глобальное, поэтому конфиг минимальный. */
export interface MusicPageConfig {
  /** Устройство вывода по умолчанию (player_id Music Assistant). */
  defaultPlayerId?: string;
}

export interface Page {
  id: string;
  title: string;
  /** Эмодзи или mdi-имя иконки (mdi:home, etc.) */
  icon: string;
  /** Тип страницы. По умолчанию 'grid' (сетка виджетов). */
  kind?: 'grid' | 'weather' | 'music';
  /** Виджеты — для kind='grid' */
  widgets: WidgetConfig[];
  /** Конфигурация — для kind='weather' */
  weather?: WeatherPageConfig;
  /** Конфигурация — для kind='music' */
  music?: MusicPageConfig;
  /** Защита от случайного удаления */
  protected?: boolean;
  /** Скрыта в dock-баре (но остаётся в редакторе страниц) */
  hidden?: boolean;
}

/** Дефолт-конфиг для новой страницы погоды */
export const DEFAULT_WEATHER_SECTIONS: WeatherPageSections = {
  header: true,
  alerts: true,
  hourly: true,
  daily: true,
  extras: true,
  lightning: false,
  storm: false,
};
