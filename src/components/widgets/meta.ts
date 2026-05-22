/**
 * Метаданные всех встроенных виджетов в одном месте.
 *
 * Этот файл — лёгкие данные (без React-компонентов и зависимостей виджетов),
 * чтобы Webpack/Next мог положить тяжёлые виджет-компоненты в отдельные
 * chunk'и. registerBuiltinWidgets импортирует meta синхронно (для каталога
 * «+ Виджет»), а Component каждого виджета подгружается лениво через
 * next/dynamic при первом рендере.
 *
 * Если меняется meta какого-то виджета — правьте здесь, не в самом виджет-файле.
 */

import type { WidgetMeta } from '@/lib/widgets/types';

// ── Weather: общие константы ─────────────────────────────────────────────────
const WEATHER_ALL_FIELDS = [
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

const WEATHER_FIELD_OPTIONS = [
  { value: 'apparent', label: 'wm.weather.fld.fields.opt.apparent' },
  { value: 'humidity', label: 'wm.weather.fld.fields.opt.humidity' },
  { value: 'wind', label: 'wm.weather.fld.fields.opt.wind' },
  { value: 'pressure', label: 'wm.weather.fld.fields.opt.pressure' },
  { value: 'uv', label: 'wm.weather.fld.fields.opt.uv' },
  { value: 'gust', label: 'wm.weather.fld.fields.opt.gust' },
  { value: 'visibility', label: 'wm.weather.fld.fields.opt.visibility' },
  { value: 'cloud', label: 'wm.weather.fld.fields.opt.cloud' },
  { value: 'dew_point', label: 'wm.weather.fld.fields.opt.dew_point' },
  { value: 'forecast', label: 'wm.weather.fld.fields.opt.forecast' },
];

// ── WeatherRoom: общие константы ─────────────────────────────────────────────
const WEATHER_ROOM_FIELD_OPTIONS = [
  { value: 'apparent', label: 'wm.weather_room.fld.fields.opt.apparent' },
  { value: 'humidity', label: 'wm.weather_room.fld.fields.opt.humidity' },
  { value: 'wind', label: 'wm.weather_room.fld.fields.opt.wind' },
  { value: 'wind_gust', label: 'wm.weather_room.fld.fields.opt.wind_gust' },
  { value: 'pressure', label: 'wm.weather_room.fld.fields.opt.pressure' },
  { value: 'uv', label: 'wm.weather_room.fld.fields.opt.uv' },
  { value: 'visibility', label: 'wm.weather_room.fld.fields.opt.visibility' },
  { value: 'cloud', label: 'wm.weather_room.fld.fields.opt.cloud' },
  { value: 'dew_point', label: 'wm.weather_room.fld.fields.opt.dew_point' },
  { value: 'forecast', label: 'wm.weather_room.fld.fields.opt.forecast' },
];

const WEATHER_ROOM_DEFAULT_FIELDS = [
  'apparent',
  'humidity',
  'wind',
  'pressure',
  'uv',
  'forecast',
];

// ── Sensor Value ─────────────────────────────────────────────────────────────
export const SENSOR_VALUE_META: WidgetMeta = {
  type: 'sensor_value',
  name: 'wm.sensor_value.name',
  emoji: '📊',
  description: 'wm.sensor_value.desc',
  category: 'sensors',
  defaultSize: { w: 4, h: 3 },
  minSize: { w: 2, h: 2 },
  paramGroups: [
    { id: '_basic', label: 'wm.common.basic' },
    {
      id: 'override',
      label: 'wm.sensor_value.grp.override',
      icon: '🎨',
      collapsed: true,
      hint: 'wm.sensor_value.grp.override.hint',
    },
  ],
  paramSchema: [
    {
      key: 'entity',
      label: 'wm.sensor_value.fld.entity',
      kind: 'entity',
      required: true,
      hint: 'wm.sensor_value.fld.entity.hint',
    },
    {
      key: 'type',
      label: 'wm.sensor_value.fld.type',
      kind: 'select',
      default: 'auto',
      options: [
        { value: 'auto', label: 'wm.sensor_value.fld.type.opt.auto' },
        { value: 'temperature', label: 'wm.sensor_value.fld.type.opt.temperature' },
        { value: 'humidity', label: 'wm.sensor_value.fld.type.opt.humidity' },
        { value: 'pressure', label: 'wm.sensor_value.fld.type.opt.pressure' },
        { value: 'illuminance', label: 'wm.sensor_value.fld.type.opt.illuminance' },
        { value: 'power', label: 'wm.sensor_value.fld.type.opt.power' },
        { value: 'voltage', label: 'wm.sensor_value.fld.type.opt.voltage' },
        { value: 'current', label: 'wm.sensor_value.fld.type.opt.current' },
        { value: 'energy', label: 'wm.sensor_value.fld.type.opt.energy' },
        { value: 'co2', label: 'wm.sensor_value.fld.type.opt.co2' },
        { value: 'gas', label: 'wm.sensor_value.fld.type.opt.gas' },
        { value: 'glucose', label: 'wm.sensor_value.fld.type.opt.glucose' },
        { value: 'door', label: 'wm.sensor_value.fld.type.opt.door' },
        { value: 'window', label: 'wm.sensor_value.fld.type.opt.window' },
        { value: 'motion', label: 'wm.sensor_value.fld.type.opt.motion' },
        { value: 'occupancy', label: 'wm.sensor_value.fld.type.opt.occupancy' },
        { value: 'plug', label: 'wm.sensor_value.fld.type.opt.plug' },
        { value: 'numeric', label: 'wm.sensor_value.fld.type.opt.numeric' },
      ],
      hint: 'wm.sensor_value.fld.type.hint',
    },
    { key: 'label', label: 'wm.sensor_value.fld.label', kind: 'text', hint: 'wm.sensor_value.fld.label.hint' },
    { key: 'icon', label: 'wm.sensor_value.fld.icon', kind: 'icon', group: 'override', hint: 'wm.sensor_value.fld.icon.hint' },
    { key: 'unit', label: 'wm.sensor_value.fld.unit', kind: 'text', group: 'override', placeholder: 'wm.sensor_value.fld.unit.ph', hint: 'wm.sensor_value.fld.unit.hint' },
    { key: 'decimals', label: 'wm.sensor_value.fld.decimals', kind: 'number', group: 'override', placeholder: 'wm.sensor_value.fld.decimals.ph' },
  ],
};

// ── Light Toggle ─────────────────────────────────────────────────────────────
export const LIGHT_TOGGLE_META: WidgetMeta = {
  type: 'light_toggle',
  name: 'wm.light_toggle.name',
  emoji: '💡',
  description: 'wm.light_toggle.desc',
  category: 'lights',
  defaultSize: { w: 4, h: 3 },
  minSize: { w: 2, h: 2 },
  paramSchema: [
    { key: 'entity', label: 'wm.light_toggle.fld.entity', kind: 'entity', domain: 'light.', required: true },
    { key: 'label', label: 'wm.light_toggle.fld.label', kind: 'text', hint: 'wm.light_toggle.fld.label.hint' },
    { key: 'icon', label: 'wm.light_toggle.fld.icon', kind: 'icon', default: 'lightbulb' },
    { key: 'color', label: 'wm.light_toggle.fld.color', kind: 'color', default: '#fbbf24' },
  ],
};

// ── Switch Toggle ────────────────────────────────────────────────────────────
export const SWITCH_TOGGLE_META: WidgetMeta = {
  type: 'switch_toggle',
  name: 'wm.switch_toggle.name',
  emoji: '🔌',
  description: 'wm.switch_toggle.desc',
  category: 'switches',
  defaultSize: { w: 4, h: 3 },
  minSize: { w: 2, h: 2 },
  paramSchema: [
    { key: 'entity', label: 'wm.switch_toggle.fld.entity', kind: 'entity', domain: 'switch.', required: true,
      hint: 'wm.switch_toggle.fld.entity.hint' },
    { key: 'label', label: 'wm.switch_toggle.fld.label', kind: 'text', hint: 'wm.switch_toggle.fld.label.hint' },
    { key: 'icon', label: 'wm.switch_toggle.fld.icon', kind: 'icon', default: 'toggle-switch' },
    { key: 'color', label: 'wm.switch_toggle.fld.color', kind: 'color', default: '#34d399',
      hint: 'wm.switch_toggle.fld.color.hint' },
  ],
};

// ── Time ─────────────────────────────────────────────────────────────────────
export const TIME_META: WidgetMeta = {
  type: 'time',
  name: 'wm.time.name',
  emoji: '🕐',
  description: 'wm.time.desc',
  category: 'misc',
  defaultSize: { w: 4, h: 3 },
  minSize: { w: 2, h: 2 },
  paramSchema: [
    { key: 'format24h', label: 'wm.time.fld.format24h', kind: 'boolean', default: true },
    { key: 'showSeconds', label: 'wm.time.fld.showSeconds', kind: 'boolean', default: false },
    { key: 'showDate', label: 'wm.time.fld.showDate', kind: 'boolean', default: true },
  ],
};

// ── Note ─────────────────────────────────────────────────────────────────────
export const NOTE_META: WidgetMeta = {
  type: 'note',
  name: 'wm.note.name',
  emoji: '📝',
  description: 'wm.note.desc',
  category: 'misc',
  defaultSize: { w: 4, h: 3 },
  minSize: { w: 3, h: 2 },
  paramSchema: [
    {
      key: 'text',
      label: 'wm.note.fld.text',
      kind: 'text',
      placeholder: 'wm.note.fld.text.ph',
      hint: 'wm.note.fld.text.hint',
    },
    { key: 'icon', label: 'wm.note.fld.icon', kind: 'icon' },
    { key: 'color', label: 'wm.note.fld.color', kind: 'color' },
  ],
};

// ── Climate ──────────────────────────────────────────────────────────────────
export const CLIMATE_META: WidgetMeta = {
  type: 'climate',
  name: 'wm.climate.name',
  emoji: '🌡',
  description: 'wm.climate.desc',
  category: 'climate',
  defaultSize: { w: 5, h: 4 },
  minSize: { w: 3, h: 2 },
  paramSchema: [
    { key: 'entity', label: 'wm.climate.fld.entity', kind: 'entity', domain: 'climate.', required: true,
      hint: 'wm.climate.fld.entity.hint' },
    { key: 'label', label: 'wm.climate.fld.label', kind: 'text', hint: 'wm.climate.fld.label.hint' },
    { key: 'icon', label: 'wm.climate.fld.icon', kind: 'icon', default: 'thermometer' },
    { key: 'step', label: 'wm.climate.fld.step', kind: 'number', default: 0.5, step: 0.1, min: 0.1, max: 5,
      hint: 'wm.climate.fld.step.hint' },
  ],
};

// ── Weather ──────────────────────────────────────────────────────────────────
export const WEATHER_META: WidgetMeta = {
  type: 'weather',
  name: 'wm.weather.name',
  emoji: '☀️',
  description: 'wm.weather.desc',
  category: 'misc',
  defaultSize: { w: 5, h: 4 },
  minSize: { w: 3, h: 3 },
  paramGroups: [
    { id: '_basic', label: 'wm.common.basic' },
    { id: 'display', label: 'wm.weather.grp.display', icon: '👁', collapsed: true,
      hint: 'wm.weather.grp.display.hint' },
  ],
  paramSchema: [
    {
      key: 'entity',
      label: 'wm.weather.fld.entity',
      kind: 'entity',
      domain: 'weather.',
      required: true,
      hint: 'wm.weather.fld.entity.hint',
    },
    { key: 'city', label: 'wm.weather.fld.city', kind: 'text', placeholder: 'wm.weather.fld.city.ph',
      hint: 'wm.weather.fld.city.hint' },
    { key: 'label', label: 'wm.weather.fld.label', kind: 'text',
      hint: 'wm.weather.fld.label.hint' },
    {
      key: 'fields',
      label: 'wm.weather.fld.fields',
      kind: 'multi-select',
      options: WEATHER_FIELD_OPTIONS,
      default: WEATHER_ALL_FIELDS,
      hint: 'wm.weather.fld.fields.hint',
      group: 'display',
    },
  ],
};

export const weatherComputeMinSize = (params: any): { w: number; h: number } => {
  const fields = params.fields ?? WEATHER_ALL_FIELDS;
  const has = (k: string) => fields.includes(k);
  let w = 3,
    h = 3;
  const baseExtras = ['humidity', 'wind', 'pressure', 'uv'].filter(has).length;
  if (baseExtras >= 2) w = 4;
  if (has('apparent')) h = 4;
  const extExtras = ['gust', 'visibility', 'cloud', 'dew_point'].filter(has).length;
  if (extExtras >= 1) {
    w = Math.max(w, 5);
    h = Math.max(h, 4);
  }
  if (has('forecast')) {
    w = Math.max(w, 5);
    h = Math.max(h, 5);
  }
  return { w, h };
};

// ── Quick Action ─────────────────────────────────────────────────────────────
export const QUICK_ACTION_META: WidgetMeta = {
  type: 'quick_action',
  name: 'wm.quick_action.name',
  emoji: '⚡',
  description: 'wm.quick_action.desc',
  category: 'misc',
  defaultSize: { w: 3, h: 3 },
  minSize: { w: 2, h: 2 },
  paramSchema: [
    {
      key: 'entity',
      label: 'wm.quick_action.fld.entity',
      kind: 'entity',
      required: true,
      hint: 'wm.quick_action.fld.entity.hint',
    },
    { key: 'label', label: 'wm.quick_action.fld.label', kind: 'text' },
    { key: 'icon', label: 'wm.quick_action.fld.icon', kind: 'icon', default: 'flash' },
    { key: 'color', label: 'wm.quick_action.fld.color', kind: 'color', default: '#a855f7' },
  ],
};

// ── Cover ────────────────────────────────────────────────────────────────────
export const COVER_META: WidgetMeta = {
  type: 'cover',
  name: 'wm.cover.name',
  emoji: '🪟',
  description: 'wm.cover.desc',
  category: 'misc',
  defaultSize: { w: 4, h: 4 },
  minSize: { w: 2, h: 2 },
  paramSchema: [
    { key: 'entity', label: 'wm.cover.fld.entity', kind: 'entity', domain: 'cover.', required: true,
      hint: 'wm.cover.fld.entity.hint' },
    { key: 'label', label: 'wm.cover.fld.label', kind: 'text', hint: 'wm.cover.fld.label.hint' },
    { key: 'icon', label: 'wm.cover.fld.icon', kind: 'icon', default: 'window-shutter' },
  ],
};

// ── Person ───────────────────────────────────────────────────────────────────
export const PERSON_META: WidgetMeta = {
  type: 'person',
  name: 'wm.person.name',
  emoji: '👤',
  description: 'wm.person.desc',
  category: 'misc',
  defaultSize: { w: 4, h: 2 },
  minSize: { w: 2, h: 2 },
  paramSchema: [
    { key: 'entity', label: 'wm.person.fld.entity', kind: 'entity', domain: 'person.', required: true,
      hint: 'wm.person.fld.entity.hint' },
    { key: 'label', label: 'wm.person.fld.label', kind: 'text', hint: 'wm.person.fld.label.hint' },
    { key: 'icon', label: 'wm.person.fld.icon', kind: 'icon', default: 'account' },
  ],
};

// ── Media Player ─────────────────────────────────────────────────────────────
export const MEDIA_PLAYER_META: WidgetMeta = {
  type: 'media_player',
  name: 'wm.media_player.name',
  emoji: '🎵',
  description: 'wm.media_player.desc',
  category: 'media',
  defaultSize: { w: 5, h: 4 },
  minSize: { w: 3, h: 2 },
  paramSchema: [
    { key: 'entity', label: 'wm.media_player.fld.entity', kind: 'entity', domain: 'media_player.', required: true,
      hint: 'wm.media_player.fld.entity.hint' },
    { key: 'label', label: 'wm.media_player.fld.label', kind: 'text', hint: 'wm.media_player.fld.label.hint' },
    { key: 'icon', label: 'wm.media_player.fld.icon', kind: 'icon', default: 'music' },
    {
      key: 'radio',
      label: 'wm.media_player.fld.radio',
      kind: 'boolean',
      default: false,
      hint: 'wm.media_player.fld.radio.hint',
    },
    {
      key: 'radioBitrate',
      label: 'wm.media_player.fld.radioBitrate',
      kind: 'select',
      default: '128k',
      options: [
        { value: '48k', label: 'wm.media_player.fld.radioBitrate.opt.48k' },
        { value: '128k', label: 'wm.media_player.fld.radioBitrate.opt.128k' },
        { value: '256k', label: 'wm.media_player.fld.radioBitrate.opt.256k' },
      ],
      hint: 'wm.media_player.fld.radioBitrate.hint',
    },
  ],
};

// ── Music Assistant ──────────────────────────────────────────────────────────
// Музыкальный плеер на базе Music Assistant (отдельный музыкальный сервер).
// Glance общается с ним по WebSocket. Источники музыки (Звук и др.) и
// устройства вывода настраиваются в самом Music Assistant; виджет показывает
// «что играет», управление и позволяет выбрать выход.
export const MUSIC_ASSISTANT_META: WidgetMeta = {
  type: 'music_assistant',
  name: 'wm.music_assistant.name',
  emoji: '🎶',
  description: 'wm.music_assistant.desc',
  category: 'media',
  defaultSize: { w: 5, h: 3 },
  minSize: { w: 3, h: 2 },
  paramSchema: [
    {
      key: 'label',
      label: 'wm.music_assistant.fld.label',
      kind: 'text',
      placeholder: 'wm.music_assistant.fld.label.ph',
      hint: 'wm.music_assistant.fld.label.hint',
    },
  ],
};

// ── Camera ───────────────────────────────────────────────────────────────────
export const CAMERA_META: WidgetMeta = {
  type: 'camera',
  name: 'wm.camera.name',
  emoji: '📹',
  description: 'wm.camera.desc',
  category: 'cameras',
  defaultSize: { w: 5, h: 4 },
  minSize: { w: 3, h: 3 },
  paramSchema: [
    { key: 'entity', label: 'wm.camera.fld.entity', kind: 'entity', domain: 'camera.', required: true,
      hint: 'wm.camera.fld.entity.hint' },
    { key: 'label', label: 'wm.camera.fld.label', kind: 'text', placeholder: 'wm.camera.fld.label.ph', hint: 'wm.camera.fld.label.hint' },
    {
      key: 'mode',
      label: 'wm.camera.fld.mode',
      kind: 'select',
      default: 'auto',
      options: [
        { value: 'auto', label: 'wm.camera.fld.mode.opt.auto' },
        { value: 'stream', label: 'wm.camera.fld.mode.opt.stream' },
        { value: 'snapshot', label: 'wm.camera.fld.mode.opt.snapshot' },
      ],
      hint: 'wm.camera.fld.mode.hint',
    },
    {
      key: 'muted',
      label: 'wm.camera.fld.muted',
      kind: 'boolean',
      default: true,
      hint: 'wm.camera.fld.muted.hint',
    },
    {
      key: 'refreshSec',
      label: 'wm.camera.fld.refreshSec',
      kind: 'number',
      default: 10,
      hint: 'wm.camera.fld.refreshSec.hint',
    },
  ],
};

// ── Control Panel ────────────────────────────────────────────────────────────
export const CONTROL_PANEL_META: WidgetMeta = {
  type: 'control_panel',
  name: 'wm.control_panel.name',
  emoji: '🎛',
  description: 'wm.control_panel.desc',
  category: 'misc',
  defaultSize: { w: 5, h: 3 },
  minSize: { w: 3, h: 3 },
  paramSchema: [
    { key: 'title', label: 'wm.control_panel.fld.title', kind: 'text', placeholder: 'wm.control_panel.fld.title.ph' },
    { key: 'icon', label: 'wm.control_panel.fld.icon', kind: 'icon', default: 'view-grid' },
    {
      key: 'entities',
      label: 'wm.control_panel.fld.entities',
      kind: 'multi-entity',
      hint: 'wm.control_panel.fld.entities.hint',
    },
    {
      key: 'entityIcons',
      label: 'wm.control_panel.fld.entityIcons',
      kind: 'entity-icons',
      linkedKey: 'entities',
    },
  ],
};

export const controlPanelComputeMinSize = (params: any): { w: number; h: number } => {
  const n = params.entities?.length ?? 0;
  if (n <= 4) return { w: 3, h: 3 };
  if (n <= 9) return { w: 4, h: 3 };
  if (n <= 16) return { w: 5, h: 4 };
  return { w: 6, h: 5 };
};

// ── Room Hub ─────────────────────────────────────────────────────────────────
export const ROOM_HUB_META: WidgetMeta = {
  type: 'room_hub',
  name: 'wm.room_hub.name',
  emoji: '🏠',
  description: 'wm.room_hub.desc',
  category: 'rooms',
  defaultSize: { w: 6, h: 4 },
  minSize: { w: 3, h: 3 },
  paramGroups: [
    { id: '_basic', label: 'wm.common.basic', icon: '🏷' },
    { id: 'climate-header', label: 'wm.room_hub.grp.climate-header', icon: '🌡',
      hint: 'wm.room_hub.grp.climate-header.hint' },
    { id: 'controls', label: 'wm.room_hub.grp.controls', icon: '💡',
      hint: 'wm.room_hub.grp.controls.hint' },
    { id: 'media', label: 'wm.room_hub.grp.media', icon: '🎵', collapsed: true,
      hint: 'wm.room_hub.grp.media.hint' },
    { id: 'climate-controls', label: 'wm.room_hub.grp.climate-controls', icon: '♨️', collapsed: true,
      hint: 'wm.room_hub.grp.climate-controls.hint' },
    { id: 'extra-sensors', label: 'wm.room_hub.grp.extra-sensors', icon: '📊', collapsed: true,
      hint: 'wm.room_hub.grp.extra-sensors.hint' },
  ],
  paramSchema: [
    { key: 'name', label: 'wm.room_hub.fld.name', kind: 'text', required: true, placeholder: 'wm.room_hub.fld.name.ph' },
    { key: 'icon', label: 'wm.room_hub.fld.icon', kind: 'icon', default: 'home', hint: 'wm.room_hub.fld.icon.hint' },

    { key: 'tempEntity', label: 'wm.room_hub.fld.tempEntity', kind: 'entity', domain: 'sensor.', group: 'climate-header' },
    { key: 'showTemp', label: 'wm.room_hub.fld.showTemp', kind: 'boolean', default: true,
      hint: 'wm.room_hub.fld.showTemp.hint', group: 'climate-header' },
    { key: 'tempDecimals', label: 'wm.room_hub.fld.tempDecimals', kind: 'number',
      default: 0, step: 1, min: 0, max: 3,
      hint: 'wm.room_hub.fld.tempDecimals.hint',
      group: 'climate-header' },
    { key: 'humidityEntity', label: 'wm.room_hub.fld.humidityEntity', kind: 'entity', domain: 'sensor.', group: 'climate-header' },
    { key: 'showHumidity', label: 'wm.room_hub.fld.showHumidity', kind: 'boolean', default: true,
      hint: 'wm.room_hub.fld.showHumidity.hint', group: 'climate-header' },
    { key: 'humidityDecimals', label: 'wm.room_hub.fld.humidityDecimals', kind: 'number',
      default: 0, step: 1, min: 0, max: 3,
      hint: 'wm.room_hub.fld.humidityDecimals.hint',
      group: 'climate-header' },

    { key: 'lights', label: 'wm.room_hub.fld.lights', kind: 'multi-entity', domain: 'light.', hint: 'wm.room_hub.fld.lights.hint', group: 'controls' },
    { key: 'lightIcons', label: 'wm.room_hub.fld.lightIcons', kind: 'entity-icons', linkedKey: 'lights', group: 'controls' },
    { key: 'lightColors', label: 'wm.room_hub.fld.lightColors', kind: 'entity-colors', linkedKey: 'lights',
      hint: 'wm.room_hub.fld.lightColors.hint', group: 'controls' },
    { key: 'switches', label: 'wm.room_hub.fld.switches', kind: 'multi-entity', domain: 'switch.', hint: 'wm.room_hub.fld.switches.hint', group: 'controls' },
    { key: 'switchIcons', label: 'wm.room_hub.fld.switchIcons', kind: 'entity-icons', linkedKey: 'switches', group: 'controls' },
    { key: 'switchColors', label: 'wm.room_hub.fld.switchColors', kind: 'entity-colors', linkedKey: 'switches',
      hint: 'wm.room_hub.fld.switchColors.hint', group: 'controls' },

    { key: 'mediaPlayerEntity', label: 'wm.room_hub.fld.mediaPlayerEntity', kind: 'entity', domain: 'media_player.',
      hint: 'wm.room_hub.fld.mediaPlayerEntity.hint', group: 'media' },

    { key: 'climateEntities', label: 'wm.room_hub.fld.climateEntities', kind: 'multi-entity', domain: 'climate.',
      hint: 'wm.room_hub.fld.climateEntities.hint', group: 'climate-controls' },
    { key: 'climateStep', label: 'wm.room_hub.fld.climateStep', kind: 'number', default: 0.5, step: 0.1, min: 0.1, max: 5,
      hint: 'wm.room_hub.fld.climateStep.hint',
      group: 'climate-controls' },
    { key: 'climateSteps', label: 'wm.room_hub.fld.climateSteps', kind: 'entity-numbers',
      linkedKey: 'climateEntities', step: 0.1, min: 0.1, max: 5,
      hint: 'wm.room_hub.fld.climateSteps.hint',
      group: 'climate-controls' },

    { key: 'sensorEntities', label: 'wm.room_hub.fld.sensorEntities', kind: 'multi-entity',
      hint: 'wm.room_hub.fld.sensorEntities.hint',
      group: 'extra-sensors' },
    { key: 'sensorDecimals', label: 'wm.room_hub.fld.sensorDecimals', kind: 'entity-numbers',
      linkedKey: 'sensorEntities', step: 1, min: 0, max: 3,
      hint: 'wm.room_hub.fld.sensorDecimals.hint',
      group: 'extra-sensors' },
  ],
};

export const roomHubComputeMinSize = (params: any): { w: number; h: number } => {
  const lights = params.lights?.length ?? 0;
  const switches = params.switches?.length ?? 0;
  const totalBtns = lights + switches;
  const climates = params.climateEntities?.length ?? 0;
  const allSensors = params.sensorEntities ?? [];
  const numericSensors = allSensors.filter(
    (id: string) => !id.startsWith('binary_sensor.')
  ).length;
  const hasMedia = !!params.mediaPlayerEntity;

  let w = 3;
  if (totalBtns >= 4) w = 4;
  if (totalBtns >= 6) w = 5;
  if (totalBtns >= 10) w = 6;
  if (climates > 0) w = Math.max(w, 4);
  if (climates >= 2) w = Math.max(w, 5);
  if (hasMedia) w = Math.max(w, 5);
  if (numericSensors >= 2) w = Math.max(w, 4);

  const PAD_PX = 20;
  const HEADER_PX = 24;
  const GAP = 10;
  let heightPx = HEADER_PX + PAD_PX;
  if (hasMedia) heightPx += 64 + GAP;
  if (numericSensors > 0) heightPx += 28 + GAP;

  const ASSUMED_COLS = Math.max(w, 9);
  const availPx = ASSUMED_COLS * 60 - PAD_PX;
  let lines = 0;
  let usedPx = 0;
  let remainBtn = totalBtns;
  let remainClim = climates;
  while (remainBtn > 0 || remainClim > 0) {
    const fitsClim = remainClim > 0 && usedPx + 136 <= availPx;
    const fitsBtn = remainBtn > 0 && usedPx + 54 <= availPx;
    if (fitsClim) {
      usedPx += 136;
      remainClim--;
    } else if (fitsBtn) {
      usedPx += 54;
      remainBtn--;
    } else {
      lines++;
      usedPx = 0;
    }
  }
  if (usedPx > 0) lines++;
  if (lines === 0 && (totalBtns > 0 || climates > 0)) lines = 1;
  heightPx += lines * 48 + Math.max(0, lines - 1) * 6;

  const ROW_PX = 42;
  const h = Math.max(3, Math.ceil(heightPx / ROW_PX));

  return { w, h };
};

// ── Weather Room ─────────────────────────────────────────────────────────────
export const WEATHER_ROOM_META: WidgetMeta = {
  type: 'weather_room',
  name: 'wm.weather_room.name',
  emoji: '🌤',
  description: 'wm.weather_room.desc',
  category: 'rooms',
  defaultSize: { w: 6, h: 6 },
  minSize: { w: 5, h: 5 },
  paramGroups: [
    { id: '_basic', label: 'wm.common.basic' },
    { id: 'display', label: 'wm.weather_room.grp.display', icon: '👁',
      hint: 'wm.weather_room.grp.display.hint' },
    { id: 'units', label: 'wm.weather_room.grp.units', icon: '📏', collapsed: true,
      hint: 'wm.weather_room.grp.units.hint' },
  ],
  paramSchema: [
    {
      key: 'entity',
      label: 'wm.weather_room.fld.entity',
      kind: 'entity',
      domain: 'weather.',
      required: true,
      hint: 'wm.weather_room.fld.entity.hint',
    },
    { key: 'city', label: 'wm.weather_room.fld.city', kind: 'text', placeholder: 'wm.weather_room.fld.city.ph' },

    {
      key: 'fields',
      label: 'wm.weather_room.fld.fields',
      kind: 'multi-select',
      options: WEATHER_ROOM_FIELD_OPTIONS,
      default: WEATHER_ROOM_DEFAULT_FIELDS,
      group: 'display',
      hint: 'wm.weather_room.fld.fields.hint',
    },
    {
      key: 'forecastDays',
      label: 'wm.weather_room.fld.forecastDays',
      kind: 'number',
      default: 5,
      group: 'display',
    },

    {
      key: 'tempUnit',
      label: 'wm.weather_room.fld.tempUnit',
      kind: 'select',
      options: [
        { value: 'C', label: 'wm.weather_room.fld.tempUnit.opt.C' },
        { value: 'F', label: 'wm.weather_room.fld.tempUnit.opt.F' },
      ],
      default: 'C',
      group: 'units',
    },
    {
      key: 'windUnit',
      label: 'wm.weather_room.fld.windUnit',
      kind: 'select',
      options: [
        { value: 'm/s', label: 'wm.weather_room.fld.windUnit.opt.ms' },
        { value: 'km/h', label: 'wm.weather_room.fld.windUnit.opt.kmh' },
        { value: 'mph', label: 'wm.weather_room.fld.windUnit.opt.mph' },
      ],
      default: 'm/s',
      group: 'units',
    },
    {
      key: 'pressureUnit',
      label: 'wm.weather_room.fld.pressureUnit',
      kind: 'select',
      options: [
        { value: 'mmHg', label: 'wm.weather_room.fld.pressureUnit.opt.mmHg' },
        { value: 'hPa', label: 'wm.weather_room.fld.pressureUnit.opt.hPa' },
        { value: 'inHg', label: 'wm.weather_room.fld.pressureUnit.opt.inHg' },
      ],
      default: 'mmHg',
      group: 'units',
    },
    {
      key: 'visibilityUnit',
      label: 'wm.weather_room.fld.visibilityUnit',
      kind: 'select',
      options: [
        { value: 'km', label: 'wm.weather_room.fld.visibilityUnit.opt.km' },
        { value: 'mi', label: 'wm.weather_room.fld.visibilityUnit.opt.mi' },
      ],
      default: 'km',
      group: 'units',
    },
  ],
};

export const NOTIFICATION_FEED_META: WidgetMeta = {
  type: 'notification_feed',
  name: 'wm.notification_feed.name',
  emoji: '🔔',
  description: 'wm.notification_feed.desc',
  category: 'misc',
  defaultSize: { w: 3, h: 3 },
  minSize: { w: 2, h: 2 },
  paramSchema: [
    {
      key: 'label',
      label: 'wm.notification_feed.fld.label',
      kind: 'text',
      placeholder: 'wm.notification_feed.fld.label.ph',
    },
    {
      key: 'max',
      label: 'wm.notification_feed.fld.max',
      kind: 'number',
      default: 10,
    },
  ],
};

export const WEBHOOK_META: WidgetMeta = {
  type: 'webhook',
  name: 'wm.webhook.name',
  emoji: '🔗',
  description: 'wm.webhook.desc',
  category: 'misc',
  defaultSize: { w: 2, h: 2 },
  // 2×2 минимум как у всех виджетов (см. reference ha-pwa-lab на NUC):
  // на 9-cols/32px-grid это ~80×64px — иконка + название + индикатор
  // успеха умещаются с воздухом, на 1×1 (~40×32) кнопку трудно даже тапнуть.
  minSize: { w: 2, h: 2 },
  paramSchema: [
    {
      key: 'webhookId',
      label: 'wm.webhook.fld.webhookId',
      kind: 'text',
      required: true,
      placeholder: 'wm.webhook.fld.webhookId.ph',
      hint: 'wm.webhook.fld.webhookId.hint',
    },
    {
      key: 'method',
      label: 'wm.webhook.fld.method',
      kind: 'select',
      options: [
        { value: 'POST', label: 'POST' },
        { value: 'GET', label: 'GET' },
        { value: 'PUT', label: 'PUT' },
      ],
      default: 'POST',
    },
    {
      key: 'body',
      label: 'wm.webhook.fld.body',
      kind: 'text',
      placeholder: 'wm.webhook.fld.body.ph',
      hint: 'wm.webhook.fld.body.hint',
    },
    {
      key: 'label',
      label: 'wm.webhook.fld.label',
      kind: 'text',
      placeholder: 'wm.webhook.fld.label.ph',
    },
    {
      key: 'buttonText',
      label: 'wm.webhook.fld.buttonText',
      kind: 'text',
      placeholder: 'wm.webhook.fld.buttonText.ph',
    },
  ],
};

export const MAP_META: WidgetMeta = {
  type: 'map',
  name: 'wm.map.name',
  emoji: '🗺️',
  description: 'wm.map.desc',
  category: 'misc',
  defaultSize: { w: 3, h: 3 },
  minSize: { w: 2, h: 2 },
  paramSchema: [
    {
      key: 'entity',
      label: 'wm.map.fld.entity',
      kind: 'entity',
      domain: 'person.,device_tracker.',
      required: true,
      hint: 'wm.map.fld.entity.hint',
    },
    {
      key: 'label',
      label: 'wm.map.fld.label',
      kind: 'text',
      placeholder: 'wm.map.fld.label.ph',
    },
    {
      key: 'zoom',
      label: 'wm.map.fld.zoom',
      kind: 'number',
      default: 14,
    },
  ],
};

export const ENERGY_META: WidgetMeta = {
  type: 'energy',
  name: 'wm.energy.name',
  emoji: '⚡',
  description: 'wm.energy.desc',
  category: 'sensors',
  defaultSize: { w: 2, h: 2 },
  // 2×2 минимум как у всех виджетов (см. reference ha-pwa-lab на NUC).
  // На 9-cols/32px-grid это ~80×64px — значение «407 W» крупно + подпись
  // сенсора в две строки. Меньше — текст обрезается.
  minSize: { w: 2, h: 2 },
  paramSchema: [
    {
      key: 'power',
      label: 'wm.energy.fld.power',
      kind: 'entity',
      domain: 'sensor.',
      required: true,
      hint: 'wm.energy.fld.power.hint',
    },
    {
      key: 'todayEnergy',
      label: 'wm.energy.fld.todayEnergy',
      kind: 'entity',
      domain: 'sensor.',
      hint: 'wm.energy.fld.todayEnergy.hint',
    },
    {
      key: 'monthEnergy',
      label: 'wm.energy.fld.monthEnergy',
      kind: 'entity',
      domain: 'sensor.',
      hint: 'wm.energy.fld.monthEnergy.hint',
    },
    {
      key: 'pricePerKwh',
      label: 'wm.energy.fld.pricePerKwh',
      kind: 'number',
      hint: 'wm.energy.fld.pricePerKwh.hint',
    },
    {
      key: 'currency',
      label: 'wm.energy.fld.currency',
      kind: 'text',
      default: '₽',
    },
    {
      key: 'label',
      label: 'wm.energy.fld.label',
      kind: 'text',
      placeholder: 'wm.energy.fld.label.ph',
    },
  ],
};

export const LIGHT_COLOR_META: WidgetMeta = {
  type: 'light_color',
  name: 'wm.light_color.name',
  emoji: '🌈',
  description: 'wm.light_color.desc',
  category: 'lights',
  defaultSize: { w: 2, h: 2 },
  // 2×2 минимум — иконка-toggle, название лампы целиком и статус. На 2×1
  // (~170×80px) название урезается до «Эмби л…» и не остаётся места под
  // brightness % / preset-цвета.
  minSize: { w: 2, h: 2 },
  paramSchema: [
    {
      key: 'entity',
      label: 'wm.light_color.fld.entity',
      kind: 'entity',
      domain: 'light.',
      required: true,
      hint: 'wm.light_color.fld.entity.hint',
    },
    {
      key: 'label',
      label: 'wm.light_color.fld.label',
      kind: 'text',
      placeholder: 'wm.light_color.fld.label.ph',
    },
    {
      key: 'icon',
      label: 'wm.light_color.fld.icon',
      kind: 'icon',
      default: 'lightbulb',
      hint: 'wm.light_color.fld.icon.hint',
    },
  ],
};

export const MULTI_SENSOR_META: WidgetMeta = {
  type: 'multi_sensor',
  name: 'wm.multi_sensor.name',
  emoji: '📊',
  description: 'wm.multi_sensor.desc',
  category: 'sensors',
  defaultSize: { w: 3, h: 2 },
  // 2×2 минимум как у всех виджетов (см. reference ha-pwa-lab на NUC).
  // На 9-cols/32px-grid это ~80×64px — два чипа в строку, у каждого
  // помещается иконка + значение. Подписи появляются при росте.
  minSize: { w: 2, h: 2 },
  paramSchema: [
    {
      key: 'entities',
      label: 'wm.multi_sensor.fld.entities',
      kind: 'multi-entity',
      domain: 'sensor.,binary_sensor.',
      required: true,
      hint: 'wm.multi_sensor.fld.entities.hint',
    },
    {
      key: 'decimals',
      label: 'wm.multi_sensor.fld.decimals',
      kind: 'entity-numbers',
      linkedKey: 'entities',
      step: 1,
      min: 0,
      max: 3,
      hint: 'wm.multi_sensor.fld.decimals.hint',
    },
    {
      key: 'label',
      label: 'wm.multi_sensor.fld.label',
      kind: 'text',
      placeholder: 'wm.multi_sensor.fld.label.ph',
    },
  ],
};

export const IFRAME_META: WidgetMeta = {
  type: 'iframe',
  name: 'wm.iframe.name',
  emoji: '🌐',
  description: 'wm.iframe.desc',
  category: 'misc',
  defaultSize: { w: 3, h: 3 },
  minSize: { w: 2, h: 2 },
  paramSchema: [
    {
      key: 'url',
      label: 'wm.iframe.fld.url',
      kind: 'text',
      required: true,
      placeholder: 'wm.iframe.fld.url.ph',
      hint: 'wm.iframe.fld.url.hint',
    },
    {
      key: 'label',
      label: 'wm.iframe.fld.label',
      kind: 'text',
      hint: 'wm.iframe.fld.label.hint',
    },
    {
      key: 'allowScripts',
      label: 'wm.iframe.fld.allowScripts',
      kind: 'boolean',
      default: false,
      hint: 'wm.iframe.fld.allowScripts.hint',
    },
  ],
};

export const LOCK_META: WidgetMeta = {
  type: 'lock',
  name: 'wm.lock.name',
  emoji: '🔒',
  description: 'wm.lock.desc',
  category: 'switches',
  defaultSize: { w: 2, h: 2 },
  // 2×2 минимум как у всех виджетов (см. reference ha-pwa-lab на NUC).
  // На 1×1 = ~40×32px замок выглядит как точка, нет места под подпись
  // и состояние (locked/unlocked/jammed). 2×2 = ~80×64px.
  minSize: { w: 2, h: 2 },
  paramSchema: [
    {
      key: 'entity',
      label: 'wm.lock.fld.entity',
      kind: 'entity',
      domain: 'lock.',
      required: true,
      hint: 'wm.lock.fld.entity.hint',
    },
    {
      key: 'label',
      label: 'wm.lock.fld.label',
      kind: 'text',
      placeholder: 'wm.lock.fld.label.ph',
    },
    {
      key: 'icon',
      label: 'wm.lock.fld.icon',
      kind: 'icon',
      hint: 'wm.lock.fld.icon.hint',
    },
  ],
};

export const CALENDAR_META: WidgetMeta = {
  type: 'calendar',
  name: 'wm.calendar.name',
  emoji: '📅',
  description: 'wm.calendar.desc',
  category: 'misc',
  defaultSize: { w: 3, h: 3 },
  minSize: { w: 2, h: 2 },
  paramSchema: [
    {
      key: 'entity',
      label: 'wm.calendar.fld.entity',
      kind: 'entity',
      domain: 'calendar.',
      required: true,
      hint: 'wm.calendar.fld.entity.hint',
    },
    {
      key: 'label',
      label: 'wm.calendar.fld.label',
      kind: 'text',
      placeholder: 'wm.calendar.fld.label.ph',
      hint: 'wm.calendar.fld.label.hint',
    },
    {
      key: 'days',
      label: 'wm.calendar.fld.days',
      kind: 'number',
      default: 7,
    },
    {
      key: 'maxEvents',
      label: 'wm.calendar.fld.maxEvents',
      kind: 'number',
      default: 6,
      hint: 'wm.calendar.fld.maxEvents.hint',
    },
  ],
};

// ── Glucose (CGM) ────────────────────────────────────────────────────────────
export const GLUCOSE_META: WidgetMeta = {
  type: 'glucose',
  name: 'wm.glucose.name',
  emoji: '🩸',
  description: 'wm.glucose.desc',
  category: 'health',
  defaultSize: { w: 4, h: 3 },
  minSize: { w: 2, h: 2 },
  paramGroups: [
    { id: '_basic', label: 'wm.common.basic' },
    {
      id: 'thresholds',
      label: 'wm.glucose.grp.thresholds',
      icon: '🎯',
      collapsed: true,
      hint: 'wm.glucose.grp.thresholds.hint',
    },
  ],
  paramSchema: [
    {
      key: 'entity',
      label: 'wm.glucose.fld.entity',
      kind: 'entity',
      domain: 'sensor.',
      default: 'sensor.blood_sugar',
      hint: 'wm.glucose.fld.entity.hint',
    },
    { key: 'label', label: 'wm.glucose.fld.label', kind: 'text', placeholder: 'wm.glucose.fld.label.ph' },
    { key: 'urgentLow', label: 'wm.glucose.fld.urgentLow', kind: 'number', default: 3.0, group: 'thresholds' },
    { key: 'low', label: 'wm.glucose.fld.low', kind: 'number', default: 3.9, group: 'thresholds' },
    { key: 'high', label: 'wm.glucose.fld.high', kind: 'number', default: 10.0, group: 'thresholds' },
    { key: 'urgentHigh', label: 'wm.glucose.fld.urgentHigh', kind: 'number', default: 13.9, group: 'thresholds' },
  ],
};

// ── Glucose Chart ────────────────────────────────────────────────────────────
export const GLUCOSE_CHART_META: WidgetMeta = {
  type: 'glucose_chart',
  name: 'wm.glucose_chart.name',
  emoji: '📈',
  description: 'wm.glucose_chart.desc',
  category: 'health',
  defaultSize: { w: 8, h: 5 },
  minSize: { w: 4, h: 3 },
  paramGroups: [
    { id: '_basic', label: 'wm.common.basic' },
    { id: 'thresholds', label: 'wm.glucose_chart.grp.thresholds', icon: '🎯', collapsed: true },
  ],
  paramSchema: [
    {
      key: 'entity',
      label: 'wm.glucose_chart.fld.entity',
      kind: 'entity',
      domain: 'sensor.',
      default: 'sensor.blood_sugar',
    },
    {
      key: 'rangeEntity',
      label: 'wm.glucose_chart.fld.rangeEntity',
      kind: 'entity',
      domain: 'input_select.',
      default: 'input_select.glucose_range',
      hint: 'wm.glucose_chart.fld.rangeEntity.hint',
    },
    {
      key: 'defaultHours',
      label: 'wm.glucose_chart.fld.defaultHours',
      kind: 'select',
      default: 6,
      options: [
        { value: '3', label: 'wm.glucose_chart.fld.defaultHours.opt.3' },
        { value: '6', label: 'wm.glucose_chart.fld.defaultHours.opt.6' },
        { value: '12', label: 'wm.glucose_chart.fld.defaultHours.opt.12' },
        { value: '24', label: 'wm.glucose_chart.fld.defaultHours.opt.24' },
      ],
    },
    { key: 'label', label: 'wm.glucose_chart.fld.label', kind: 'text', placeholder: 'wm.glucose_chart.fld.label.ph' },
    { key: 'urgentLow', label: 'wm.glucose_chart.fld.urgentLow', kind: 'number', default: 3.0, group: 'thresholds' },
    { key: 'low', label: 'wm.glucose_chart.fld.low', kind: 'number', default: 3.9, group: 'thresholds' },
    { key: 'high', label: 'wm.glucose_chart.fld.high', kind: 'number', default: 10.0, group: 'thresholds' },
    { key: 'urgentHigh', label: 'wm.glucose_chart.fld.urgentHigh', kind: 'number', default: 13.9, group: 'thresholds' },
  ],
};

// ── Glucose Stats ────────────────────────────────────────────────────────────
export const GLUCOSE_STATS_META: WidgetMeta = {
  type: 'glucose_stats',
  name: 'wm.glucose_stats.name',
  emoji: '📊',
  description: 'wm.glucose_stats.desc',
  category: 'health',
  defaultSize: { w: 4, h: 4 },
  minSize: { w: 3, h: 3 },
  paramGroups: [
    { id: '_basic', label: 'wm.common.basic' },
    { id: 'sensors', label: 'wm.glucose_stats.grp.sensors', icon: '🔌', collapsed: true,
      hint: 'wm.glucose_stats.grp.sensors.hint' },
  ],
  paramSchema: [
    {
      key: 'period',
      label: 'wm.glucose_stats.fld.period',
      kind: 'select',
      default: '24h',
      options: [
        { value: '24h', label: 'wm.glucose_stats.fld.period.opt.24h' },
        { value: '7d', label: 'wm.glucose_stats.fld.period.opt.7d' },
      ],
    },
    { key: 'label', label: 'wm.glucose_stats.fld.label', kind: 'text', placeholder: 'wm.glucose_stats.fld.label.ph' },
    { key: 'avgEntity', label: 'wm.glucose_stats.fld.avgEntity', kind: 'entity', domain: 'sensor.', group: 'sensors' },
    { key: 'tirEntity', label: 'wm.glucose_stats.fld.tirEntity', kind: 'entity', domain: 'sensor.', group: 'sensors' },
    { key: 'gmiEntity', label: 'wm.glucose_stats.fld.gmiEntity', kind: 'entity', domain: 'sensor.', group: 'sensors' },
    { key: 'highEntity', label: 'wm.glucose_stats.fld.highEntity', kind: 'entity', domain: 'sensor.', group: 'sensors' },
    { key: 'lowEntity', label: 'wm.glucose_stats.fld.lowEntity', kind: 'entity', domain: 'sensor.', group: 'sensors' },
  ],
};

export const weatherRoomComputeMinSize = (params: any): { w: number; h: number } => {
  const fields = params.fields ?? WEATHER_ROOM_DEFAULT_FIELDS;
  let w = 4,
    h = 4;
  const metrics = fields.filter((f: string) => f !== 'forecast').length;
  if (metrics >= 3) {
    w = 5;
    h = 5;
  }
  if (fields.includes('forecast')) {
    w = 6;
    h = 6;
  }
  return { w, h };
};
