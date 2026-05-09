/**
 * Импорт устройств из Lovelace-конфига HA.
 *
 * Стратегия: вместо попытки конвертировать каждый тип карточки (mushroom,
 * bubble, apexcharts — десятки community-cards со своими schemas), мы
 * рекурсивно обходим конфиг и вытаскиваем все entity_id, которые в нём
 * упомянуты. Затем сверяемся со states HA — отсеиваем false-positive типа
 * `light.toggle` (это сервис, не entity), оставляем только реальные сущности.
 *
 * Дальше группируем entity_id по domain и создаём Glance-виджеты:
 * light → LightToggle, climate → Climate и т.д. Это не воспроизводит
 * структуру дашборда, но даёт стартовый набор виджетов из реальных
 * устройств пользователя — за минуты вместо часов ручной настройки.
 */

import type { WidgetConfig } from '@/lib/widgets/types';
import type { StatesMap } from '@/lib/ha/types';
import { flowLayout } from '@/lib/layout/flow';

const ENTITY_RE = /^([a-z_]+)\.([a-z0-9_]+)$/;

/** Извлекает уникальные entity_id из произвольного JSON-объекта Lovelace. */
export function extractEntities(node: unknown, found: Set<string> = new Set()): Set<string> {
  if (typeof node === 'string') {
    if (ENTITY_RE.test(node)) found.add(node);
    return found;
  }
  if (Array.isArray(node)) {
    for (const item of node) extractEntities(item, found);
    return found;
  }
  if (node && typeof node === 'object') {
    for (const [, v] of Object.entries(node as Record<string, unknown>)) {
      extractEntities(v, found);
    }
  }
  return found;
}

/** Маппинг domain → тип Glance-виджета (наш `meta.type`). */
const DOMAIN_TO_WIDGET: Record<string, string> = {
  light: 'light_toggle',
  switch: 'switch_toggle',
  climate: 'climate',
  media_player: 'media_player',
  camera: 'camera',
  cover: 'cover',
  person: 'person',
  weather: 'weather',
  sensor: 'sensor_value',
  binary_sensor: 'sensor_value',
  script: 'quick_action',
  scene: 'quick_action',
  button: 'quick_action',
  automation: 'quick_action',
  input_boolean: 'switch_toggle',
  input_button: 'quick_action',
};

/**
 * Дефолтные размеры по типу виджета (совпадают с meta.defaultSize, но
 * продублированы здесь чтобы не тащить регистр в импортер — он работает
 * до того как widgets/index.tsx стартует lazy-init).
 */
const WIDGET_SIZES: Record<string, { w: number; h: number }> = {
  light_toggle: { w: 4, h: 3 },
  switch_toggle: { w: 4, h: 3 },
  climate: { w: 5, h: 4 },
  media_player: { w: 5, h: 4 },
  camera: { w: 5, h: 4 },
  cover: { w: 4, h: 4 },
  person: { w: 4, h: 2 },
  weather: { w: 5, h: 4 },
  sensor_value: { w: 4, h: 3 },
  quick_action: { w: 3, h: 3 },
};

export interface ImportPlan {
  widgets: WidgetConfig[];
  /** Все обнаруженные entity_id, включая отфильтрованные. */
  totalFound: number;
  /** Сколько entity осталось после проверки на наличие в HA states. */
  validCount: number;
  /** Сколько entity не получило виджет (домен не поддерживается). */
  skippedDomains: Record<string, number>;
}

/** Создаёт план импорта: WidgetConfig[] из реально существующих entity. */
export function buildImportPlan(
  rawEntities: Set<string>,
  states: StatesMap,
  cols = 9
): ImportPlan {
  const valid: string[] = [];
  for (const id of rawEntities) {
    if (states[id]) valid.push(id);
  }
  // Сортируем стабильно: сначала по domain (порядок DOMAIN_TO_WIDGET),
  // потом по имени — чтобы похожие виджеты шли рядом в layout.
  const domainOrder = Object.keys(DOMAIN_TO_WIDGET);
  valid.sort((a, b) => {
    const da = a.split('.')[0];
    const db = b.split('.')[0];
    const ia = domainOrder.indexOf(da);
    const ib = domainOrder.indexOf(db);
    if (ia !== ib) return ia - ib;
    return a.localeCompare(b);
  });

  const skipped: Record<string, number> = {};
  const widgets: WidgetConfig[] = [];

  for (const entityId of valid) {
    const m = entityId.match(ENTITY_RE);
    if (!m) continue;
    const domain = m[1];
    const widgetType = DOMAIN_TO_WIDGET[domain];
    if (!widgetType) {
      skipped[domain] = (skipped[domain] ?? 0) + 1;
      continue;
    }
    const size = WIDGET_SIZES[widgetType] ?? { w: 4, h: 3 };
    widgets.push({
      i: `${widgetType}-${entityId.replace(/\./g, '_')}-${widgets.length}`,
      type: widgetType,
      x: 0,
      y: 0,
      w: size.w,
      h: size.h,
      params: { entity: entityId },
    });
  }

  // Раскладываем через flowLayout — он умеет упаковывать в grid с заданным cols.
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

  return {
    widgets,
    totalFound: rawEntities.size,
    validCount: valid.length,
    skippedDomains: skipped,
  };
}
