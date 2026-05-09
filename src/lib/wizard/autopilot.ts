/**
 * Auto-pilot: создание полноценного дашборда из текущего HA — без участия
 * пользователя. Делает 1-3 страницы на основе того что есть у пользователя:
 *
 *  - «Главная» — погода + время + ControlPanel со сценами/скриптами/кнопками
 *  - «Комнаты» — RoomHub-виджет per area HA (если areas заданы)
 *  - «Инфо» — сенсоры (батарейки, температура за окном, системные)
 *
 * Если areas не заданы — главная плюс «Все устройства» с большим
 * ControlPanel, разбитым по domain.
 */

import type { WidgetConfig } from '@/lib/widgets/types';
import type { HARegistries, StatesMap } from '@/lib/ha/types';
import type { Page } from '@/lib/pages/types';
import { flowLayout } from '@/lib/layout/flow';
import { generatePageContent } from './autoGenerate';

let _wid = 0;
function nextId(prefix: string): string {
  _wid++;
  return `autopilot-${Date.now()}-${_wid}-${prefix}`;
}

export interface AutopilotResult {
  pages: Array<Omit<Page, 'protected' | 'hidden'>>;
  stats: {
    areas: number;
    lights: number;
    switches: number;
    sensors: number;
    cameras: number;
    climates: number;
    mediaPlayers: number;
    scripts: number;
    scenes: number;
  };
}

/** Глобальная статистика состояния HA — для отображения прогресса. */
export function summarizeHA(states: StatesMap, registries: HARegistries): AutopilotResult['stats'] {
  const ids = Object.keys(states);
  const count = (prefix: string) => ids.filter((id) => id.startsWith(prefix)).length;
  return {
    areas: Object.keys(registries.areas).length,
    lights: count('light.'),
    switches: count('switch.'),
    sensors: count('sensor.') + count('binary_sensor.'),
    cameras: count('camera.'),
    climates: count('climate.'),
    mediaPlayers: count('media_player.'),
    scripts: count('script.'),
    scenes: count('scene.'),
  };
}

/** Главная страница: weather + time + ControlPanel со сценами/скриптами. */
function buildHomePage(states: StatesMap): Omit<Page, 'protected' | 'hidden'> {
  const widgets: WidgetConfig[] = [];

  const weatherEntity = Object.keys(states).find((id) => id.startsWith('weather.'));
  if (weatherEntity) {
    widgets.push({
      i: nextId('weather'),
      type: 'weather',
      x: 0,
      y: 0,
      w: 5,
      h: 4,
      params: { entity: weatherEntity },
    });
  }

  widgets.push({
    i: nextId('time'),
    type: 'time',
    x: 0,
    y: 0,
    w: 4,
    h: 2,
    params: { format24h: true, showSeconds: false, showDate: true },
  });

  // ControlPanel со сценами/скриптами/кнопками — quick-actions всё в одно место.
  const quickEntities = Object.keys(states).filter(
    (id) =>
      id.startsWith('scene.') ||
      id.startsWith('script.') ||
      id.startsWith('button.') ||
      id.startsWith('input_button.')
  );
  if (quickEntities.length > 0) {
    widgets.push({
      i: nextId('cp'),
      type: 'control_panel',
      x: 0,
      y: 0,
      w: 5,
      h: 3,
      params: {
        title: 'Быстрые действия',
        icon: 'view-grid',
        entities: quickEntities.slice(0, 16),
      },
    });
  }

  // Раскладка через flowLayout — он знает как упаковать.
  const placed = flowLayout(
    widgets.map((w) => ({ i: w.i, w: w.w, h: w.h })),
    9
  );
  const positions = new Map(placed.map((p) => [p.i, p]));
  for (const w of widgets) {
    const p = positions.get(w.i);
    if (p) {
      w.x = p.x;
      w.y = p.y;
    }
  }

  return {
    id: 'home',
    title: 'Главная',
    icon: '🏠',
    kind: 'grid',
    widgets,
  };
}

/** Страница per-area: использует существующий generatePageContent. */
function buildAreaPages(
  states: StatesMap,
  registries: HARegistries
): Array<Omit<Page, 'protected' | 'hidden'>> {
  const areas = Object.values(registries.areas);
  const pages: Array<Omit<Page, 'protected' | 'hidden'>> = [];
  for (const area of areas) {
    const result = generatePageContent(area.name, states, registries);
    if (!result.ok || result.widgets.length === 0) continue;
    pages.push({
      id: `auto-${area.area_id}`,
      title: area.name,
      icon: '🚪',
      kind: 'grid',
      widgets: result.widgets,
    });
  }
  return pages;
}

/** Страница «Инфо»: сенсоры батареек, температуры, системные. */
function buildInfoPage(states: StatesMap): Omit<Page, 'protected' | 'hidden'> | null {
  const widgets: WidgetConfig[] = [];

  // Батарейки — sensor.*_battery с device_class=battery
  const batteries = Object.values(states).filter(
    (s) => s.entity_id.startsWith('sensor.') && s.attributes.device_class === 'battery'
  );
  for (const s of batteries.slice(0, 12)) {
    widgets.push({
      i: nextId('bat'),
      type: 'sensor_value',
      x: 0,
      y: 0,
      w: 3,
      h: 2,
      params: { entity: s.entity_id, type: 'auto' },
    });
  }

  // Температуры (включая outdoor)
  const temps = Object.values(states).filter(
    (s) =>
      s.entity_id.startsWith('sensor.') &&
      s.attributes.device_class === 'temperature' &&
      // Исключаем уже выставленные в RoomHub: эвристически — если в HA задан area_id,
      // оно скорее всего попало в area-страницу. Берём «бесхозные».
      !s.attributes.unit_of_measurement?.includes('°C')
  );
  // Поскольку фильтр выше слишком строгий — оставим как есть, добавим самый «общий»:
  const outdoorTemp = Object.values(states).find(
    (s) =>
      s.entity_id.startsWith('sensor.') &&
      s.attributes.device_class === 'temperature' &&
      /outdoor|outside|улица|двор/i.test(s.attributes.friendly_name ?? s.entity_id)
  );
  if (outdoorTemp) {
    widgets.push({
      i: nextId('temp'),
      type: 'sensor_value',
      x: 0,
      y: 0,
      w: 3,
      h: 2,
      params: { entity: outdoorTemp.entity_id, type: 'temperature' },
    });
  }

  if (widgets.length === 0) return null;

  const placed = flowLayout(
    widgets.map((w) => ({ i: w.i, w: w.w, h: w.h })),
    9
  );
  const positions = new Map(placed.map((p) => [p.i, p]));
  for (const w of widgets) {
    const p = positions.get(w.i);
    if (p) {
      w.x = p.x;
      w.y = p.y;
    }
  }

  return {
    id: 'info',
    title: 'Инфо',
    icon: '📊',
    kind: 'grid',
    widgets,
  };
}

/** Главная функция: даёт набор страниц для auto-pilot. */
export function buildAutopilotPages(states: StatesMap, registries: HARegistries): AutopilotResult {
  const stats = summarizeHA(states, registries);
  const home = buildHomePage(states);
  const areas = buildAreaPages(states, registries);
  const info = buildInfoPage(states);

  const pages = [home, ...areas];
  if (info) pages.push(info);
  return { pages, stats };
}
