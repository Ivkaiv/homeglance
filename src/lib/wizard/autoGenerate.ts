/**
 * Авто-генератор содержимого страницы из HA по area.
 *
 * Создаёт **несколько виджетов** под разные сущности — чтобы заполнить
 * страницу красиво и показать возможности панели:
 * - RoomHub-виджет с лампами/переключателями + температура/влажность в шапке
 * - Отдельные ClimateWidget на каждый climate.*
 * - CameraWidget на камеру
 * - SensorValueWidget на каждый интересный сенсор
 * - MediaPlayerWidget на медиаплеер
 */
import type { WidgetConfig } from '@/lib/widgets/types';
import type { StatesMap, HARegistries } from '@/lib/ha/types';

export interface MagicResult {
  ok: boolean;
  message: string;
  widgets: WidgetConfig[];
}

const COLS = 9; // mobile-default

function norm(s: string): string {
  return s.toLowerCase().replace(/[\s\-_]/g, '').trim();
}

function findArea(pageTitle: string, areas: HARegistries['areas']) {
  const want = norm(pageTitle);
  if (!want) return null;
  const list = Object.values(areas);
  for (const a of list) if (norm(a.name) === want) return a;
  for (const a of list) {
    const an = norm(a.name);
    if (an.includes(want) || want.includes(an)) return a;
  }
  return null;
}

/** Простой layout-builder: пакует виджеты в 9-колоночную сетку. */
class GridPlacer {
  private rows: number[] = []; // высота, занятая каждой колонкой (cumulative y per col)
  constructor(private cols = COLS) {
    this.rows = Array(cols).fill(0);
  }

  /** Пытается разместить виджет шириной w и высотой h. Возвращает {x, y}. */
  place(w: number, h: number): { x: number; y: number } {
    w = Math.min(w, this.cols);
    let bestX = 0;
    let bestY = Infinity;
    for (let x = 0; x + w <= this.cols; x++) {
      // y этой позиции = max(rows[x..x+w-1])
      let y = 0;
      for (let i = 0; i < w; i++) y = Math.max(y, this.rows[x + i]);
      if (y < bestY) {
        bestY = y;
        bestX = x;
      }
    }
    // Обновляем занятые столбцы
    for (let i = 0; i < w; i++) this.rows[bestX + i] = bestY + h;
    return { x: bestX, y: bestY };
  }
}

let _wid = 0;
function nextId(prefix: string): string {
  _wid++;
  return `auto-${Date.now()}-${_wid}-${prefix}`;
}

export function generatePageContent(
  pageTitle: string,
  states: StatesMap,
  registries: HARegistries
): MagicResult {
  const area = findArea(pageTitle, registries.areas);
  if (!area) {
    return {
      ok: false,
      message: `Не нашёл в Home Assistant зону «${pageTitle}». Переименуйте страницу в имя зоны (например, «Кухня»).`,
      widgets: [],
    };
  }

  const inArea = (e: typeof registries.entities[string]): boolean => {
    if (e.area_id === area.area_id) return true;
    if (e.area_id) return false;
    if (!e.device_id) return false;
    const dev = registries.devices[e.device_id];
    return dev?.area_id === area.area_id;
  };

  const all = Object.values(registries.entities)
    .filter(inArea)
    .filter((e) => !e.hidden_by && !e.disabled_by)
    .map((e) => e.entity_id)
    .filter((id) => states[id]);

  const lights = all.filter((id) => id.startsWith('light.'));
  const switches = all.filter((id) => id.startsWith('switch.'));
  const climates = all.filter((id) => id.startsWith('climate.'));
  const mediaPlayers = all.filter((id) => id.startsWith('media_player.'));
  const cameras = all.filter((id) => id.startsWith('camera.'));
  const numericSensors = all.filter((id) => id.startsWith('sensor.'));
  const binarySensors = all.filter((id) => id.startsWith('binary_sensor.'));

  const tempSensor = numericSensors.find(
    (id) => states[id]?.attributes.device_class === 'temperature'
  );
  const humSensor = numericSensors.find(
    (id) => states[id]?.attributes.device_class === 'humidity'
  );

  // Полезные числовые → отдельные виджеты
  const interestingNumeric = numericSensors.filter((id) => {
    if (id === tempSensor || id === humSensor) return false;
    const dc = states[id]?.attributes.device_class;
    return [
      'pressure',
      'atmospheric_pressure',
      'illuminance',
      'co2',
      'power',
      'voltage',
      'current',
      'energy',
    ].includes(dc as string);
  });

  // Полезные бинарные — оставляем в RoomHub-шапке
  const usefulBinary = binarySensors.filter((id) => {
    const dc = states[id]?.attributes.device_class;
    return ['door', 'window', 'motion', 'occupancy', 'plug'].includes(dc as string);
  });

  // Если совсем пусто — отказываемся
  if (
    lights.length === 0 &&
    switches.length === 0 &&
    climates.length === 0 &&
    mediaPlayers.length === 0 &&
    cameras.length === 0 &&
    interestingNumeric.length === 0 &&
    !tempSensor &&
    !humSensor
  ) {
    return {
      ok: false,
      message: `В зоне «${area.name}» нет управляемых устройств или сенсоров.`,
      widgets: [],
    };
  }

  const placer = new GridPlacer(COLS);
  const widgets: WidgetConfig[] = [];

  // 1) RoomHub — лампы + температура/влажность + до 3 бинарных датчиков
  //    (door/window/motion) в шапке для статуса. Больше 3 → лишний шум.
  const binaryInHub = usefulBinary.slice(0, 3);
  const binaryStandalone = usefulBinary.slice(3);

  if (lights.length > 0 || tempSensor || humSensor || binaryInHub.length > 0) {
    const btnSlots = lights.length;
    const h = btnSlots > 5 ? 4 : 3;
    const w = COLS;
    const pos = placer.place(w, h);
    widgets.push({
      i: nextId('hub'),
      type: 'room_hub',
      x: pos.x,
      y: pos.y,
      w,
      h,
      params: {
        name: area.name,
        icon: area.icon || '🏠',
        tempEntity: tempSensor,
        humidityEntity: humSensor,
        showTemp: !!tempSensor,
        showHumidity: !!humSensor,
        lights,
        switches: [],
        sensorEntities: binaryInHub,
        climateStep: 1,
      },
    });
  }

  // 1b) Переключатели: если больше 3 — собираем в ControlPanel (одна сетка кнопок).
  //     Меньше — отдельные SwitchToggleWidget по 3×2.
  if (switches.length >= 4) {
    const pos = placer.place(COLS, 3);
    widgets.push({
      i: nextId('panel'),
      type: 'control_panel',
      x: pos.x,
      y: pos.y,
      w: COLS,
      h: 3,
      params: {
        title: 'Переключатели',
        icon: 'toggle-switch',
        entities: switches,
      },
    });
  } else {
    for (const sid of switches) {
      const pos = placer.place(3, 2);
      widgets.push({
        i: nextId('sw'),
        type: 'switch_toggle',
        x: pos.x,
        y: pos.y,
        w: 3,
        h: 2,
        params: { entity: sid },
      });
    }
  }

  // 2) ClimateWidgets — каждая climate.* в отдельной карточке (5×3)
  for (const cid of climates) {
    const pos = placer.place(5, 3);
    widgets.push({
      i: nextId('clim'),
      type: 'climate',
      x: pos.x,
      y: pos.y,
      w: 5,
      h: 3,
      params: {
        entity: cid,
        step: 1,
      },
    });
  }

  // 3) MediaPlayer — отдельной картой 9×2 (если есть)
  if (mediaPlayers[0]) {
    const pos = placer.place(9, 2);
    widgets.push({
      i: nextId('media'),
      type: 'media_player',
      x: pos.x,
      y: pos.y,
      w: 9,
      h: 2,
      params: { entity: mediaPlayers[0] },
    });
  }

  // 4) Камера — крупная карта 6×5
  if (cameras[0]) {
    const pos = placer.place(6, 5);
    widgets.push({
      i: nextId('cam'),
      type: 'camera',
      x: pos.x,
      y: pos.y,
      w: 6,
      h: 5,
      params: { entity: cameras[0] },
    });
  }

  // 5) Сенсорные виджеты — каждый интересный numeric → 3×2
  for (const sid of interestingNumeric) {
    const pos = placer.place(3, 2);
    widgets.push({
      i: nextId('sens'),
      type: 'sensor_value',
      x: pos.x,
      y: pos.y,
      w: 3,
      h: 2,
      params: { entity: sid, type: 'auto' },
    });
  }

  // 6) Лишние бинарные сенсоры (которые не вошли в RoomHub-шапку, > 3 шт)
  //    → отдельные SensorValueWidget. Обычно их 0 — большинство уже в RoomHub.
  for (const sid of binaryStandalone) {
    const pos = placer.place(3, 2);
    widgets.push({
      i: nextId('bin'),
      type: 'sensor_value',
      x: pos.x,
      y: pos.y,
      w: 3,
      h: 2,
      params: { entity: sid, type: 'auto' },
    });
  }

  // 7) Time-виджет — внизу, добавляет время и дату. Универсален, всегда уместен.
  {
    const pos = placer.place(4, 2);
    widgets.push({
      i: nextId('time'),
      type: 'time',
      x: pos.x,
      y: pos.y,
      w: 4,
      h: 2,
      params: { format24h: true, showSeconds: false, showDate: true },
    });
  }

  // 8) Weather-виджет — если в HA есть weather.* (любой провайдер), добавим
  //    маленький погодный виджет. Полезно особенно для outdoor-зон.
  const weatherEntity = Object.keys(states).find((id) => id.startsWith('weather.'));
  if (weatherEntity) {
    const pos = placer.place(5, 4);
    widgets.push({
      i: nextId('weather'),
      type: 'weather',
      x: pos.x,
      y: pos.y,
      w: 5,
      h: 4,
      params: {
        entity: weatherEntity,
        city: area.name,
      },
    });
  }

  // Сообщение
  const partsAdded: string[] = [];
  const hubAdded = widgets.find((w) => w.type === 'room_hub');
  if (hubAdded) {
    const t = [];
    if (lights.length) t.push(`${lights.length} ламп`);
    if (tempSensor) t.push('темп.');
    if (humSensor) t.push('влажн.');
    if (binaryInHub.length) t.push(`${binaryInHub.length} бин.`);
    partsAdded.push(`комната (${t.join(', ')})`);
  }
  if (switches.length >= 4) partsAdded.push('панель переключателей');
  else if (switches.length) partsAdded.push(`${switches.length} переключ.`);
  if (climates.length) partsAdded.push(`${climates.length} климат`);
  if (mediaPlayers[0]) partsAdded.push('плеер');
  if (cameras[0]) partsAdded.push('камера');
  if (interestingNumeric.length) partsAdded.push(`${interestingNumeric.length} датчик(ов)`);
  if (binaryStandalone.length) partsAdded.push(`+${binaryStandalone.length} бин.`);
  partsAdded.push('часы');
  if (weatherEntity) partsAdded.push('погода');

  return {
    ok: true,
    message: `Зона «${area.name}»: ${partsAdded.join(' + ')}. Всего ${widgets.length} виджет(ов).`,
    widgets,
  };
}
