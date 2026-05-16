/**
 * Авто-определение типа сенсора и его пресета (иконка/единица/цвет/децимали).
 * Используется в SensorValueWidget и SensorChip (компактный вариант для room hub).
 */
import type { HAState } from '@/lib/ha/types';

export type SensorType =
  | 'auto'
  | 'temperature'
  | 'humidity'
  | 'pressure'
  | 'illuminance'
  | 'power'
  | 'voltage'
  | 'current'
  | 'energy'
  | 'co2'
  | 'gas'
  | 'glucose'
  | 'door'
  | 'window'
  | 'motion'
  | 'occupancy'
  | 'plug'
  | 'numeric';

export interface SensorPreset {
  icon: string;
  unit: string;
  decimals: number;
  /** Цвет акцента — Tailwind text-class (напр. `text-orange-700 dark:text-orange-300`). */
  accent: string;
  /** Только для бинарных — варианты «активного» состояния. */
  binary?: {
    onIcon: string;
    onLabel: string;
    offLabel: string;
    onAccent: string;
  };
}

export const SENSOR_PRESETS: Record<Exclude<SensorType, 'auto' | 'numeric'>, SensorPreset> = {
  temperature: {
    icon: 'thermometer',
    unit: '°C',
    decimals: 1,
    accent: 'text-orange-700 dark:text-orange-300',
  },
  humidity: {
    icon: 'water-percent',
    unit: '%',
    decimals: 0,
    accent: 'text-sky-700 dark:text-sky-300',
  },
  pressure: {
    icon: 'gauge',
    unit: 'мм',
    decimals: 0,
    accent: 'text-cyan-700 dark:text-cyan-300',
  },
  illuminance: {
    icon: 'lightbulb-on-outline',
    unit: 'лк',
    decimals: 0,
    accent: 'text-amber-700 dark:text-amber-300',
  },
  power: {
    icon: 'flash',
    unit: 'Вт',
    decimals: 0,
    accent: 'text-yellow-700 dark:text-yellow-300',
  },
  voltage: {
    icon: 'lightning-bolt',
    unit: 'В',
    decimals: 1,
    accent: 'text-violet-700 dark:text-violet-300',
  },
  current: {
    icon: 'current-ac',
    unit: 'А',
    decimals: 2,
    accent: 'text-red-700 dark:text-red-300',
  },
  energy: {
    icon: 'lightning-bolt-circle',
    unit: 'кВт·ч',
    decimals: 2,
    accent: 'text-emerald-700 dark:text-emerald-300',
  },
  co2: {
    icon: 'molecule-co2',
    unit: 'ppm',
    decimals: 0,
    accent: 'text-teal-700 dark:text-teal-300',
  },
  gas: {
    icon: 'gas-cylinder',
    unit: 'м³',
    decimals: 2,
    accent: 'text-amber-700 dark:text-amber-300',
  },
  glucose: {
    icon: 'diabetes',
    unit: 'ммоль/л',
    decimals: 1,
    accent: 'text-rose-700 dark:text-rose-300',
  },
  // Бинарные
  door: {
    icon: 'door-closed',
    unit: '',
    decimals: 0,
    accent: 'text-text-secondary',
    binary: {
      onIcon: 'door-open',
      onLabel: 'Открыта',
      offLabel: 'Закрыта',
      onAccent: 'text-amber-600 dark:text-amber-300',
    },
  },
  window: {
    icon: 'window-closed-variant',
    unit: '',
    decimals: 0,
    accent: 'text-text-secondary',
    binary: {
      onIcon: 'window-open-variant',
      onLabel: 'Открыто',
      offLabel: 'Закрыто',
      onAccent: 'text-amber-600 dark:text-amber-300',
    },
  },
  motion: {
    icon: 'motion-sensor-off',
    unit: '',
    decimals: 0,
    accent: 'text-text-secondary',
    binary: {
      onIcon: 'walk',
      onLabel: 'Движение',
      offLabel: 'Тихо',
      onAccent: 'text-emerald-600 dark:text-emerald-300',
    },
  },
  occupancy: {
    icon: 'account-outline',
    unit: '',
    decimals: 0,
    accent: 'text-text-secondary',
    binary: {
      onIcon: 'account',
      onLabel: 'Есть',
      offLabel: 'Нет',
      onAccent: 'text-emerald-600 dark:text-emerald-300',
    },
  },
  plug: {
    icon: 'power-plug-off',
    unit: '',
    decimals: 0,
    accent: 'text-text-secondary',
    binary: {
      onIcon: 'power-plug',
      onLabel: 'Включено',
      offLabel: 'Выключено',
      onAccent: 'text-emerald-600 dark:text-emerald-300',
    },
  },
};

export const NUMERIC_DEFAULT: SensorPreset = {
  icon: 'gauge',
  unit: '',
  decimals: 1,
  accent: 'text-text-secondary',
};

/**
 * Определяет тип сенсора по entity_id, device_class и unit_of_measurement.
 * Возвращает один из ключей SENSOR_PRESETS или 'numeric'.
 */
export function detectSensorType(e: HAState | undefined): SensorType {
  if (!e) return 'numeric';
  const dc = (e.attributes.device_class as string | undefined)?.toLowerCase();
  const unit = (e.attributes.unit_of_measurement as string | undefined)?.toLowerCase();
  const id = e.entity_id.toLowerCase();

  if (id.startsWith('binary_sensor.')) {
    if (dc === 'door' || id.includes('door')) return 'door';
    if (dc === 'window' || id.includes('window')) return 'window';
    if (dc === 'motion' || id.includes('motion') || id.includes('movement')) return 'motion';
    if (dc === 'occupancy' || dc === 'presence' || id.includes('presence')) return 'occupancy';
    if (dc === 'plug' || dc === 'power' || id.includes('plug')) return 'plug';
    return 'occupancy';
  }

  if (dc) {
    if (dc === 'temperature') return 'temperature';
    if (dc === 'humidity') return 'humidity';
    if (dc === 'atmospheric_pressure' || dc === 'pressure') return 'pressure';
    if (dc === 'illuminance') return 'illuminance';
    if (dc === 'power' || dc === 'apparent_power') return 'power';
    if (dc === 'voltage') return 'voltage';
    if (dc === 'current') return 'current';
    if (dc === 'energy' || dc === 'energy_storage') return 'energy';
    if (dc === 'carbon_dioxide') return 'co2';
    if (dc === 'gas') return 'gas';
    if (dc === 'blood_glucose_concentration') return 'glucose';
  }

  // По id — раньше device_class, чтобы поймать template-сенсоры nightscout
  // (sensor.blood_sugar, sensor.glucose_*) у которых device_class пустой,
  // но имя явно про глюкозу.
  if (
    id.includes('blood_glucose') ||
    id.includes('blood_sugar') ||
    id.includes('glucose') ||
    id.includes('sahar')
  ) {
    return 'glucose';
  }

  if (unit) {
    if (unit === '°c' || unit === '°f' || unit === 'k') return 'temperature';
    if (unit === '%' && (id.includes('humidity') || id.includes('влажност'))) return 'humidity';
    if (unit.includes('hpa') || unit.includes('mmhg') || unit === 'мм' || unit === 'mbar') return 'pressure';
    if (unit === 'lx' || unit === 'лк') return 'illuminance';
    if (unit === 'w' || unit === 'kw' || unit === 'вт' || unit === 'квт') return 'power';
    if (unit === 'v' || unit === 'в') return 'voltage';
    if (unit === 'a' || unit === 'ма' || unit === 'ma') return 'current';
    if (unit === 'kwh' || unit === 'wh' || unit === 'квт·ч') return 'energy';
    if (unit === 'ppm') return 'co2';
    if (unit === 'm³' || unit === 'м³') return 'gas';
    if (unit === 'mmol/l' || unit === 'ммоль/л' || unit === 'mg/dl' || unit === 'мг/дл') return 'glucose';
  }

  return 'numeric';
}

/** Возвращает preset для уже-определённого типа (или numeric default). */
export function getSensorPreset(type: SensorType): SensorPreset {
  if (type === 'numeric' || type === 'auto') return NUMERIC_DEFAULT;
  return SENSOR_PRESETS[type] ?? NUMERIC_DEFAULT;
}
