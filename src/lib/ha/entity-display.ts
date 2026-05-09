/**
 * Преобразует entity_id в человеко-читаемое имя.
 * Источники в порядке приоритета:
 *  1. Entity registry: name (заданное пользователем в HA)
 *  2. State attribute: friendly_name
 *  3. Имя устройства из device registry + device_class из entity registry
 *  4. Преобразование entity_id (последний сегмент в Title Case)
 *
 * Также возвращает имя area (если устройство привязано к комнате) — для группировки.
 */

import type { HAState, HARegistries, EntityId } from './types';

export interface EntityDisplay {
  /** Главное имя для показа в каталоге */
  name: string;
  /** Имя комнаты (если есть) — для группировки */
  area: string | null;
  /** Имя устройства (если есть) — для подписи */
  device: string | null;
  /** entity_id — для технического показа */
  entityId: EntityId;
  /** Domain (light, switch, sensor, ...) */
  domain: string;
  /** Текущее значение state — для подсказки */
  state: string;
}

const DEVICE_CLASS_RU: Record<string, string> = {
  temperature: 'Температура',
  humidity: 'Влажность',
  pressure: 'Давление',
  battery: 'Батарея',
  illuminance: 'Освещённость',
  power: 'Мощность',
  energy: 'Энергия',
  voltage: 'Напряжение',
  current: 'Ток',
  motion: 'Движение',
  occupancy: 'Присутствие',
  door: 'Дверь',
  window: 'Окно',
  smoke: 'Дым',
  gas: 'Газ',
  moisture: 'Утечка',
  sound: 'Звук',
  light: 'Свет',
  signal_strength: 'Уровень сигнала',
  timestamp: 'Время',
  duration: 'Длительность',
  speed: 'Скорость',
  distance: 'Дистанция',
  weight: 'Вес',
  volume: 'Объём',
  carbon_dioxide: 'CO₂',
  pm25: 'Пыль PM2.5',
  pm10: 'Пыль PM10',
};

function titleCase(s: string): string {
  return s
    .split('_')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export function getEntityDisplay(
  state: HAState | undefined,
  registries: HARegistries,
  entityId: EntityId
): EntityDisplay {
  const eReg = registries.entities[entityId];
  const dReg = eReg?.device_id ? registries.devices[eReg.device_id] : undefined;
  const aId = eReg?.area_id ?? dReg?.area_id ?? null;
  const aReg = aId ? registries.areas[aId] : undefined;

  const deviceName = dReg?.name_by_user || dReg?.name || null;
  const areaName = aReg?.name || null;
  const domain = entityId.split('.')[0];

  // Источники имени, по приоритету
  let name: string;
  if (eReg?.name) {
    name = eReg.name;
  } else if (state?.attributes.friendly_name) {
    name = state.attributes.friendly_name;
  } else {
    // Генерируем из entity_id и device_class
    const objectId = entityId.split('.')[1] ?? '';
    const deviceClass = state?.attributes.device_class || eReg?.device_class;
    const deviceClassRu = deviceClass ? DEVICE_CLASS_RU[deviceClass] : null;
    if (deviceClassRu && (deviceName || areaName)) {
      name = `${deviceClassRu} · ${deviceName || areaName}`;
    } else if (deviceName) {
      name = deviceName;
    } else {
      name = titleCase(objectId);
    }
  }

  return {
    name,
    area: areaName,
    device: deviceName,
    entityId,
    domain,
    state: state?.state ?? 'unknown',
  };
}

/** Группировка списка entity по area для UI. Без area → группа "Без комнаты". */
export interface EntityGroup {
  areaName: string;
  areaId: string | null;
  entities: EntityDisplay[];
}

export function groupByArea(entities: EntityDisplay[]): EntityGroup[] {
  const map = new Map<string, EntityGroup>();
  for (const e of entities) {
    const key = e.area ?? '__no_area__';
    if (!map.has(key)) {
      map.set(key, {
        areaName: e.area ?? 'Без комнаты',
        areaId: e.area,
        entities: [],
      });
    }
    map.get(key)!.entities.push(e);
  }
  // Сортируем: сначала комнаты по имени, потом без комнаты
  const groups = Array.from(map.values());
  groups.sort((a, b) => {
    if (a.areaId === null) return 1;
    if (b.areaId === null) return -1;
    return a.areaName.localeCompare(b.areaName, 'ru');
  });
  for (const g of groups) {
    g.entities.sort((a, b) => a.name.localeCompare(b.name, 'ru'));
  }
  return groups;
}
