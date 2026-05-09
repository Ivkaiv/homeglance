/**
 * Готовые шаблоны раскладок для First-run wizard.
 *
 * Шаблон — это «рецепт»: набор страниц с типами виджетов и фильтрами того,
 * что они должны показать. На этапе применения шаблон выбирает реальные
 * сущности из states и заполняет их в виджеты.
 */

import type { WidgetConfig } from '@/lib/widgets/types';
import type { StatesMap, HARegistries } from '@/lib/ha/types';
import type { Page } from '@/lib/pages/types';
import { flowLayout } from '@/lib/layout/flow';
import { buildAutopilotPages } from './autopilot';

let _wid = 0;
function id(prefix: string): string {
  _wid++;
  return `tmpl-${Date.now()}-${_wid}-${prefix}`;
}

export interface Template {
  id: string;
  emoji: string;
  title: string;
  description: string;
  /** Краткий список того что появится на дашборде — для preview-карточки. */
  preview: string[];
  /** Применить шаблон: создаёт массив страниц на основе текущего HA. */
  apply: (states: StatesMap, registries: HARegistries) => Array<Omit<Page, 'protected' | 'hidden'>>;
}

function findFirst(states: StatesMap, prefix: string): string | undefined {
  return Object.keys(states).find((k) => k.startsWith(prefix));
}

function placeAndFinalize(widgets: WidgetConfig[], cols = 9): WidgetConfig[] {
  const placed = flowLayout(
    widgets.map((w) => ({ i: w.i, w: w.w, h: w.h })),
    cols
  );
  const positions = new Map(placed.map((p) => [p.i, p]));
  for (const w of widgets) {
    const p = positions.get(w.i);
    if (p) {
      w.x = p.x;
      w.y = p.y;
    }
  }
  return widgets;
}

// ── Шаблон «Минимум» ─────────────────────────────────────────────────────────
const minimal: Template = {
  id: 'minimal',
  emoji: '✨',
  title: 'Минимум',
  description: 'Часы, погода и быстрые сцены — самое необходимое на одной странице.',
  preview: ['Часы', 'Погода', 'Быстрые действия'],
  apply: (states) => {
    const widgets: WidgetConfig[] = [];

    const weather = findFirst(states, 'weather.');
    if (weather) {
      widgets.push({
        i: id('w'), type: 'weather', x: 0, y: 0, w: 5, h: 4,
        params: { entity: weather },
      });
    }
    widgets.push({
      i: id('t'), type: 'time', x: 0, y: 0, w: 4, h: 2,
      params: { format24h: true, showSeconds: false, showDate: true },
    });

    const quick = Object.keys(states).filter(
      (k) => k.startsWith('scene.') || k.startsWith('script.') || k.startsWith('button.')
    );
    if (quick.length > 0) {
      widgets.push({
        i: id('cp'), type: 'control_panel', x: 0, y: 0, w: 5, h: 3,
        params: { title: 'Быстрые действия', icon: 'view-grid', entities: quick.slice(0, 12) },
      });
    }

    return [
      { id: 'home', title: 'Главная', icon: '✨', kind: 'grid', widgets: placeAndFinalize(widgets) },
    ];
  },
};

// ── Шаблон «Семейная» ────────────────────────────────────────────────────────
const family: Template = {
  id: 'family',
  emoji: '👨‍👩‍👧',
  title: 'Семейная',
  description: 'Главная с погодой и быстрыми действиями + комнаты по областям HA + страница с камерами.',
  preview: ['Главная (погода + сцены)', 'Комнаты по областям', 'Камеры'],
  apply: (states, registries) => {
    // Используем auto-pilot как основу, добавляем отдельную страницу с камерами.
    const { pages } = buildAutopilotPages(states, registries);

    const cameras = Object.keys(states).filter((k) => k.startsWith('camera.'));
    if (cameras.length > 0) {
      const camWidgets: WidgetConfig[] = cameras.slice(0, 6).map((cid) => ({
        i: id('cam'), type: 'camera', x: 0, y: 0, w: 4, h: 4,
        params: { entity: cid, refreshSec: 10 },
      }));
      pages.push({
        id: 'cameras',
        title: 'Камеры',
        icon: '📷',
        kind: 'grid',
        widgets: placeAndFinalize(camWidgets),
      });
    }

    return pages;
  },
};

// ── Шаблон «Студия» ──────────────────────────────────────────────────────────
const studio: Template = {
  id: 'studio',
  emoji: '🎛',
  title: 'Студия',
  description: 'Одна страница со всем сразу: свет, климат, медиа, погода. Для маленьких квартир.',
  preview: ['Одна страница со всем'],
  apply: (states) => {
    const widgets: WidgetConfig[] = [];

    const weather = findFirst(states, 'weather.');
    if (weather) {
      widgets.push({ i: id('w'), type: 'weather', x: 0, y: 0, w: 5, h: 4, params: { entity: weather } });
    }
    widgets.push({
      i: id('t'), type: 'time', x: 0, y: 0, w: 4, h: 2,
      params: { format24h: true, showSeconds: false, showDate: true },
    });

    // Все лампы и переключатели — в один большой ControlPanel
    const lightsAndSwitches = Object.keys(states).filter(
      (k) => k.startsWith('light.') || k.startsWith('switch.')
    );
    if (lightsAndSwitches.length > 0) {
      widgets.push({
        i: id('cp'), type: 'control_panel', x: 0, y: 0, w: 6, h: 5,
        params: {
          title: 'Свет и переключатели',
          icon: 'lightbulb',
          entities: lightsAndSwitches.slice(0, 24),
        },
      });
    }

    // Все climate
    for (const cid of Object.keys(states).filter((k) => k.startsWith('climate.')).slice(0, 4)) {
      widgets.push({
        i: id('cl'), type: 'climate', x: 0, y: 0, w: 5, h: 4, params: { entity: cid, step: 1 },
      });
    }

    // Медиа — первый плеер
    const player = findFirst(states, 'media_player.');
    if (player) {
      widgets.push({ i: id('mp'), type: 'media_player', x: 0, y: 0, w: 5, h: 4, params: { entity: player } });
    }

    return [
      { id: 'studio', title: 'Студия', icon: '🎛', kind: 'grid', widgets: placeAndFinalize(widgets) },
    ];
  },
};

// ── Шаблон «Только мониторинг» ───────────────────────────────────────────────
const monitor: Template = {
  id: 'monitor',
  emoji: '📊',
  title: 'Только мониторинг',
  description: 'Без управления, только показатели: погода, температура, влажность, батарейки.',
  preview: ['Погода', 'Температуры', 'Батарейки'],
  apply: (states) => {
    const widgets: WidgetConfig[] = [];

    const weather = findFirst(states, 'weather.');
    if (weather) {
      widgets.push({ i: id('w'), type: 'weather', x: 0, y: 0, w: 5, h: 4, params: { entity: weather } });
    }

    // Все температуры
    const temps = Object.values(states).filter(
      (s) => s.entity_id.startsWith('sensor.') && s.attributes.device_class === 'temperature'
    );
    for (const t of temps.slice(0, 8)) {
      widgets.push({
        i: id('temp'), type: 'sensor_value', x: 0, y: 0, w: 3, h: 2,
        params: { entity: t.entity_id, type: 'temperature' },
      });
    }
    // Влажности
    const hums = Object.values(states).filter(
      (s) => s.entity_id.startsWith('sensor.') && s.attributes.device_class === 'humidity'
    );
    for (const h of hums.slice(0, 6)) {
      widgets.push({
        i: id('hum'), type: 'sensor_value', x: 0, y: 0, w: 3, h: 2,
        params: { entity: h.entity_id, type: 'humidity' },
      });
    }
    // Батарейки
    const bats = Object.values(states).filter(
      (s) => s.entity_id.startsWith('sensor.') && s.attributes.device_class === 'battery'
    );
    for (const b of bats.slice(0, 12)) {
      widgets.push({
        i: id('bat'), type: 'sensor_value', x: 0, y: 0, w: 3, h: 2,
        params: { entity: b.entity_id, type: 'auto' },
      });
    }

    return [
      { id: 'home', title: 'Мониторинг', icon: '📊', kind: 'grid', widgets: placeAndFinalize(widgets) },
    ];
  },
};

// ── Шаблон «Спальня» ─────────────────────────────────────────────────────────
const bedroom: Template = {
  id: 'bedroom',
  emoji: '🛏',
  title: 'Спальня',
  description: 'Лампы, климат и медиа для одной комнаты. Найдёт сущности с упоминанием «спальня/bedroom».',
  preview: ['Лампы спальни', 'Климат спальни', 'Плеер'],
  apply: (states) => {
    const matches = (id: string, attrs: { friendly_name?: string }) => {
      const name = (attrs.friendly_name ?? id).toLowerCase();
      return /спальн|bedroom/i.test(name);
    };
    const widgets: WidgetConfig[] = [];

    const lights = Object.values(states)
      .filter((s) => s.entity_id.startsWith('light.') && matches(s.entity_id, s.attributes))
      .map((s) => s.entity_id);
    const switches = Object.values(states)
      .filter((s) => s.entity_id.startsWith('switch.') && matches(s.entity_id, s.attributes))
      .map((s) => s.entity_id);
    if (lights.length + switches.length > 0) {
      widgets.push({
        i: id('hub'), type: 'room_hub', x: 0, y: 0, w: 6, h: 4,
        params: {
          name: 'Спальня', icon: 'bed', lights, switches,
          showTemp: true, showHumidity: true,
        },
      });
    }

    const climate = Object.values(states).find(
      (s) => s.entity_id.startsWith('climate.') && matches(s.entity_id, s.attributes)
    );
    if (climate) {
      widgets.push({
        i: id('cl'), type: 'climate', x: 0, y: 0, w: 5, h: 4,
        params: { entity: climate.entity_id, step: 1 },
      });
    }

    const player = Object.values(states).find(
      (s) => s.entity_id.startsWith('media_player.') && matches(s.entity_id, s.attributes)
    );
    if (player) {
      widgets.push({
        i: id('mp'), type: 'media_player', x: 0, y: 0, w: 5, h: 4,
        params: { entity: player.entity_id },
      });
    }

    if (widgets.length === 0) {
      // Нет ничего «спалёнского» — fallback на минимум.
      return minimal.apply(states, {} as HARegistries);
    }

    return [
      { id: 'bedroom', title: 'Спальня', icon: '🛏', kind: 'grid', widgets: placeAndFinalize(widgets) },
    ];
  },
};

export const TEMPLATES: Template[] = [minimal, family, studio, bedroom, monitor];

export function getTemplate(templateId: string): Template | undefined {
  return TEMPLATES.find((t) => t.id === templateId);
}
