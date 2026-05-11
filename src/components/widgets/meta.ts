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

// ── WeatherRoom: общие константы ─────────────────────────────────────────────
const WEATHER_ROOM_FIELD_OPTIONS = [
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
  name: 'Датчик',
  emoji: '📊',
  description:
    'Универсальный виджет датчика. Авто-распознавание типа: температура, влажность, давление, свет, мощность, напряжение, дверь, окно, движение и др.',
  category: 'sensors',
  defaultSize: { w: 4, h: 3 },
  minSize: { w: 2, h: 2 },
  paramGroups: [
    { id: '_basic', label: 'Основное' },
    {
      id: 'override',
      label: 'Переопределить отображение',
      icon: '🎨',
      collapsed: true,
      hint: 'Если авто-определение не угадало — задайте вручную',
    },
  ],
  paramSchema: [
    {
      key: 'entity',
      label: 'Какой датчик показать?',
      kind: 'entity',
      required: true,
      hint: 'sensor.* (число) или binary_sensor.* (двери, окна, движение, занятость, розетки)',
    },
    {
      key: 'type',
      label: 'Тип датчика',
      kind: 'select',
      default: 'auto',
      options: [
        { value: 'auto', label: '⚙ Авто (определить самому)' },
        { value: 'temperature', label: '🌡 Температура' },
        { value: 'humidity', label: '💧 Влажность' },
        { value: 'pressure', label: '📊 Давление' },
        { value: 'illuminance', label: '💡 Освещённость' },
        { value: 'power', label: '⚡ Мощность (Вт)' },
        { value: 'voltage', label: '🔌 Напряжение (В)' },
        { value: 'current', label: '🔃 Сила тока (А)' },
        { value: 'energy', label: '🔋 Энергия (кВт·ч)' },
        { value: 'co2', label: '🌬 CO₂' },
        { value: 'gas', label: '🔥 Газ (м³)' },
        { value: 'door', label: '🚪 Дверь' },
        { value: 'window', label: '🪟 Окно' },
        { value: 'motion', label: '🚶 Движение' },
        { value: 'occupancy', label: '👤 Присутствие' },
        { value: 'plug', label: '🔌 Розетка вкл/выкл' },
        { value: 'numeric', label: '🔢 Просто число' },
      ],
      hint: 'Авто читает device_class. Если не угадал — выберите вручную.',
    },
    { key: 'label', label: 'Подпись', kind: 'text', hint: 'По умолчанию используется имя из Home Assistant' },
    { key: 'icon', label: 'Иконка', kind: 'icon', group: 'override', hint: 'Только если хочется отличную от автомата' },
    { key: 'unit', label: 'Единица измерения', kind: 'text', group: 'override', placeholder: '°C', hint: 'Например, м³, мВт, %' },
    { key: 'decimals', label: 'Знаков после запятой', kind: 'number', group: 'override', placeholder: '1' },
  ],
};

// ── Light Toggle ─────────────────────────────────────────────────────────────
export const LIGHT_TOGGLE_META: WidgetMeta = {
  type: 'light_toggle',
  name: 'Кнопка света',
  emoji: '💡',
  description: 'Включение/выключение лампы или группы освещения',
  category: 'lights',
  defaultSize: { w: 4, h: 3 },
  minSize: { w: 2, h: 2 },
  paramSchema: [
    { key: 'entity', label: 'Какой светильник / лампа?', kind: 'entity', domain: 'light.', required: true },
    { key: 'label', label: 'Название', kind: 'text', hint: 'По умолчанию — имя из HA' },
    { key: 'icon', label: 'Иконка', kind: 'icon', default: 'lightbulb' },
    { key: 'color', label: 'Цвет свечения когда включена', kind: 'color', default: '#fbbf24' },
  ],
};

// ── Switch Toggle ────────────────────────────────────────────────────────────
export const SWITCH_TOGGLE_META: WidgetMeta = {
  type: 'switch_toggle',
  name: 'Переключатель',
  emoji: '🔌',
  description: 'Розетка, реле, любой switch — вкл/выкл',
  category: 'switches',
  defaultSize: { w: 4, h: 3 },
  minSize: { w: 2, h: 2 },
  paramSchema: [
    { key: 'entity', label: 'Что переключаем?', kind: 'entity', domain: 'switch.', required: true,
      hint: 'Розетка, реле, вентилятор и т.п.' },
    { key: 'label', label: 'Название', kind: 'text', hint: 'По умолчанию — имя из HA' },
    { key: 'icon', label: 'Иконка', kind: 'icon', default: 'toggle-switch' },
  ],
};

// ── Time ─────────────────────────────────────────────────────────────────────
export const TIME_META: WidgetMeta = {
  type: 'time',
  name: 'Часы',
  emoji: '🕐',
  description: 'Текущее время и дата',
  category: 'misc',
  defaultSize: { w: 4, h: 3 },
  minSize: { w: 2, h: 2 },
  paramSchema: [
    { key: 'format24h', label: '24-часовой формат', kind: 'boolean', default: true },
    { key: 'showSeconds', label: 'Показывать секунды', kind: 'boolean', default: false },
    { key: 'showDate', label: 'Показывать дату', kind: 'boolean', default: true },
  ],
};

// ── Note ─────────────────────────────────────────────────────────────────────
export const NOTE_META: WidgetMeta = {
  type: 'note',
  name: 'Заметка',
  emoji: '📝',
  description: 'Просто текстовая заметка с эмодзи',
  category: 'misc',
  defaultSize: { w: 4, h: 3 },
  minSize: { w: 3, h: 2 },
  paramSchema: [
    {
      key: 'text',
      label: 'Текст заметки',
      kind: 'text',
      placeholder: 'Купить молоко',
      hint: 'Просто памятка — не интерактивная',
    },
    { key: 'icon', label: 'Иконка слева', kind: 'icon' },
    { key: 'color', label: 'Цвет полосы слева (для категорий)', kind: 'color' },
  ],
};

// ── Climate ──────────────────────────────────────────────────────────────────
export const CLIMATE_META: WidgetMeta = {
  type: 'climate',
  name: 'Климат',
  emoji: '🌡',
  description: 'Термостат: текущая температура + регулировка задания',
  category: 'climate',
  defaultSize: { w: 5, h: 4 },
  minSize: { w: 3, h: 2 },
  paramSchema: [
    { key: 'entity', label: 'Какой термостат / климат?', kind: 'entity', domain: 'climate.', required: true,
      hint: 'Тёплый пол, бойлер, кондиционер — всё что в HA как climate.*' },
    { key: 'label', label: 'Название', kind: 'text', hint: 'По умолчанию — имя из Home Assistant' },
    { key: 'icon', label: 'Иконка', kind: 'icon', default: 'thermometer' },
    { key: 'step', label: 'Шаг кнопок −/+', kind: 'number', default: 1, hint: 'На сколько градусов меняется при одном нажатии' },
  ],
};

// ── Weather ──────────────────────────────────────────────────────────────────
export const WEATHER_META: WidgetMeta = {
  type: 'weather',
  name: 'Погода',
  emoji: '☀️',
  description:
    'Погода с адаптивным наполнением: от иконки до 5-дневного прогноза с давлением, ветром, УФ',
  category: 'misc',
  defaultSize: { w: 5, h: 4 },
  minSize: { w: 3, h: 3 },
  paramGroups: [
    { id: '_basic', label: 'Основное' },
    { id: 'display', label: 'Что показывать в виджете', icon: '👁', collapsed: true,
      hint: 'Отметьте параметры, которые хотите видеть' },
  ],
  paramSchema: [
    {
      key: 'entity',
      label: 'Источник прогноза',
      kind: 'entity',
      domain: 'weather.',
      required: true,
      hint: 'Например, weather.pirateweather, weather.yandex_weather',
    },
    { key: 'city', label: 'Название города/места', kind: 'text', placeholder: 'Ставрополь',
      hint: 'Отображается в заголовке виджета' },
    { key: 'label', label: 'Альтернативная подпись', kind: 'text',
      hint: 'Показывается, если поле «город» не заполнено' },
    {
      key: 'fields',
      label: 'Какие параметры показать',
      kind: 'multi-select',
      options: WEATHER_FIELD_OPTIONS,
      default: WEATHER_ALL_FIELDS,
      hint: 'Снимите галочки с того, что не нужно',
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
  name: 'Кнопка действия',
  emoji: '⚡',
  description: 'Триггер скрипта, автоматизации, сцены или кнопки HA',
  category: 'misc',
  defaultSize: { w: 3, h: 3 },
  minSize: { w: 2, h: 2 },
  paramSchema: [
    {
      key: 'entity',
      label: 'Что запустить нажатием?',
      kind: 'entity',
      required: true,
      hint: 'Сцена, скрипт, автоматизация или кнопка из HA — нажатие виджета её активирует',
    },
    { key: 'label', label: 'Что написано на кнопке', kind: 'text' },
    { key: 'icon', label: 'Иконка', kind: 'icon', default: 'flash' },
    { key: 'color', label: 'Цвет свечения', kind: 'color', default: '#a855f7' },
  ],
};

// ── Cover ────────────────────────────────────────────────────────────────────
export const COVER_META: WidgetMeta = {
  type: 'cover',
  name: 'Шторы / жалюзи',
  emoji: '🪟',
  description: 'Открыть, закрыть, остановить шторы или ворота',
  category: 'misc',
  defaultSize: { w: 4, h: 4 },
  minSize: { w: 2, h: 2 },
  paramSchema: [
    { key: 'entity', label: 'Что открыть/закрыть?', kind: 'entity', domain: 'cover.', required: true,
      hint: 'Шторы, жалюзи, ворота, двери — всё, что в HA как cover.*' },
    { key: 'label', label: 'Название', kind: 'text', hint: 'По умолчанию — имя из HA' },
    { key: 'icon', label: 'Иконка', kind: 'icon', default: 'window-shutter' },
  ],
};

// ── Person ───────────────────────────────────────────────────────────────────
export const PERSON_META: WidgetMeta = {
  type: 'person',
  name: 'Человек',
  emoji: '👤',
  description: 'Статус присутствия дома (дом/не дом + аватар)',
  category: 'misc',
  defaultSize: { w: 4, h: 2 },
  minSize: { w: 2, h: 2 },
  paramSchema: [
    { key: 'entity', label: 'Кого отслеживаем?', kind: 'entity', domain: 'person.', required: true,
      hint: 'person.* из Home Assistant — показывает «дома/в пути/на работе»' },
    { key: 'label', label: 'Имя для виджета', kind: 'text', hint: 'По умолчанию — из HA' },
    { key: 'icon', label: 'Иконка (если у человека нет фото)', kind: 'icon', default: 'account' },
  ],
};

// ── Media Player ─────────────────────────────────────────────────────────────
export const MEDIA_PLAYER_META: WidgetMeta = {
  type: 'media_player',
  name: 'Медиа-плеер',
  emoji: '🎵',
  description: 'Плеер: обложка, play/pause, перемотка, громкость',
  category: 'media',
  defaultSize: { w: 5, h: 4 },
  minSize: { w: 3, h: 2 },
  paramSchema: [
    { key: 'entity', label: 'Какой плеер показать?', kind: 'entity', domain: 'media_player.', required: true,
      hint: 'Например, Яндекс.Станция, AirPlay-приёмник, Sonos' },
    { key: 'label', label: 'Подпись над плеером', kind: 'text', hint: 'По умолчанию — имя плеера из HA' },
    { key: 'icon', label: 'Иконка', kind: 'icon', default: 'music' },
  ],
};

// ── Camera ───────────────────────────────────────────────────────────────────
export const CAMERA_META: WidgetMeta = {
  type: 'camera',
  name: 'Камера',
  emoji: '📹',
  description: 'Снимок с HA-камеры с автообновлением. Клик открывает fullscreen.',
  category: 'cameras',
  defaultSize: { w: 5, h: 4 },
  minSize: { w: 3, h: 3 },
  paramSchema: [
    { key: 'entity', label: 'Какая камера?', kind: 'entity', domain: 'camera.', required: true,
      hint: 'Например, Tenda во дворе, Dahua у двери' },
    { key: 'label', label: 'Название', kind: 'text', placeholder: 'Двор', hint: 'По умолчанию — имя камеры из HA' },
    { key: 'refreshSec', label: 'Как часто обновлять снимок (секунды)', kind: 'number', default: 10,
      hint: 'Меньше = свежее картинка, больше = меньше нагрузка на камеру' },
  ],
};

// ── Control Panel ────────────────────────────────────────────────────────────
export const CONTROL_PANEL_META: WidgetMeta = {
  type: 'control_panel',
  name: 'Панель управления',
  emoji: '🎛',
  description:
    'Гибкая сетка из ламп, переключателей, сценариев, скриптов, кнопок и автоматизаций — без привязки к комнате',
  category: 'misc',
  defaultSize: { w: 5, h: 3 },
  minSize: { w: 3, h: 3 },
  paramSchema: [
    { key: 'title', label: 'Заголовок (можно оставить пустым)', kind: 'text', placeholder: 'Сцены / Свет / Утро' },
    { key: 'icon', label: 'Иконка заголовка', kind: 'icon', default: 'view-grid' },
    {
      key: 'entities',
      label: 'Что добавить в панель?',
      kind: 'multi-entity',
      hint: 'Лампы, переключатели, сцены, скрипты, кнопки, автоматизации — всё в одну сетку',
    },
    {
      key: 'entityIcons',
      label: 'Иконки для каждой кнопки',
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
  name: 'Комната',
  emoji: '🏠',
  description: 'Хаб комнаты: температура, лампы, переключатели',
  category: 'rooms',
  defaultSize: { w: 6, h: 4 },
  minSize: { w: 3, h: 3 },
  paramGroups: [
    { id: '_basic', label: 'Основное', icon: '🏷' },
    { id: 'climate-header', label: 'Погода в комнате', icon: '🌡',
      hint: 'Температура и влажность в шапке виджета' },
    { id: 'controls', label: 'Кнопки управления', icon: '💡',
      hint: 'Лампы и переключатели, которыми хотите управлять' },
    { id: 'media', label: 'Музыкальный плеер', icon: '🎵', collapsed: true,
      hint: 'Полоска play/pause появится, когда что-то играет' },
    { id: 'climate-controls', label: 'Регулятор температуры', icon: '♨️', collapsed: true,
      hint: 'Тёплый пол, бойлер, термостат — кнопки −/+ в карточке' },
    { id: 'extra-sensors', label: 'Информеры (двери, окна, освещённость)', icon: '📊', collapsed: true,
      hint: 'Доп. датчики — определятся автоматически' },
  ],
  paramSchema: [
    { key: 'name', label: 'Название комнаты', kind: 'text', required: true, placeholder: 'Кухня' },
    { key: 'icon', label: 'Иконка', kind: 'icon', default: 'home', hint: 'Эмодзи или MDI-иконка слева от названия' },

    { key: 'tempEntity', label: '🌡 Датчик температуры', kind: 'entity', domain: 'sensor.', group: 'climate-header' },
    { key: 'showTemp', label: 'Показывать температуру в шапке', kind: 'boolean', default: true,
      hint: 'Если выключено — значение скрыто, даже если датчик выбран', group: 'climate-header' },
    { key: 'humidityEntity', label: '💧 Датчик влажности', kind: 'entity', domain: 'sensor.', group: 'climate-header' },
    { key: 'showHumidity', label: 'Показывать влажность в шапке', kind: 'boolean', default: true,
      hint: 'Если выключено — значение скрыто, даже если датчик выбран', group: 'climate-header' },

    { key: 'lights', label: '💡 Лампы', kind: 'multi-entity', domain: 'light.', hint: 'Появятся в виде круглых кнопок', group: 'controls' },
    { key: 'lightIcons', label: 'Иконки для каждой лампы', kind: 'entity-icons', linkedKey: 'lights', group: 'controls' },
    { key: 'switches', label: '🔌 Переключатели', kind: 'multi-entity', domain: 'switch.', hint: 'Розетки, реле, вентиляторы и т.п.', group: 'controls' },
    { key: 'switchIcons', label: 'Иконки для переключателей', kind: 'entity-icons', linkedKey: 'switches', group: 'controls' },

    { key: 'mediaPlayerEntity', label: 'Плеер для встраивания', kind: 'entity', domain: 'media_player.',
      hint: 'Например, Яндекс.Станция в этой комнате', group: 'media' },

    { key: 'climateEntities', label: 'Климат-сущности с регулятором', kind: 'multi-entity', domain: 'climate.',
      hint: 'Каждая получит компактный стэппер с минусом/плюсом', group: 'climate-controls' },
    { key: 'climateStep', label: 'Шаг кнопок −/+', kind: 'number', default: 1,
      hint: 'На сколько градусов меняется при одном нажатии', group: 'climate-controls' },

    { key: 'sensorEntities', label: 'Дополнительные датчики', kind: 'multi-entity',
      hint: 'Двери, окна, движение, давление, CO₂, освещённость и т.п. Виджет сам распознает тип и нарисует чип/иконку.',
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
  name: 'Комната «Погода»',
  emoji: '🌤',
  description:
    'Большой настраиваемый виджет погоды: выбор провайдера, единиц измерения, набора метрик и прогноза',
  category: 'rooms',
  defaultSize: { w: 6, h: 6 },
  minSize: { w: 5, h: 5 },
  paramGroups: [
    { id: '_basic', label: 'Основное' },
    { id: 'display', label: 'Что показывать', icon: '👁',
      hint: 'Отметьте параметры, которые видны в виджете' },
    { id: 'units', label: 'Единицы измерения', icon: '📏', collapsed: true,
      hint: 'Метры, мили, °C/°F и т.д.' },
  ],
  paramSchema: [
    {
      key: 'entity',
      label: 'Источник прогноза',
      kind: 'entity',
      domain: 'weather.',
      required: true,
      hint: 'Например, weather.pirateweather, weather.yandex_weather',
    },
    { key: 'city', label: 'Название города/места', kind: 'text', placeholder: 'Ставрополь' },

    {
      key: 'fields',
      label: 'Какие параметры показать',
      kind: 'multi-select',
      options: WEATHER_ROOM_FIELD_OPTIONS,
      default: WEATHER_ROOM_DEFAULT_FIELDS,
      group: 'display',
      hint: 'Можно убрать ветер, давление, видимость и т.п.',
    },
    {
      key: 'forecastDays',
      label: 'Дней прогноза (1-7)',
      kind: 'number',
      default: 5,
      group: 'display',
    },

    {
      key: 'tempUnit',
      label: 'Температура',
      kind: 'select',
      options: [
        { value: 'C', label: '°C — Цельсий' },
        { value: 'F', label: '°F — Фаренгейт' },
      ],
      default: 'C',
      group: 'units',
    },
    {
      key: 'windUnit',
      label: 'Скорость ветра',
      kind: 'select',
      options: [
        { value: 'm/s', label: 'м/с' },
        { value: 'km/h', label: 'км/ч' },
        { value: 'mph', label: 'миль/ч' },
      ],
      default: 'm/s',
      group: 'units',
    },
    {
      key: 'pressureUnit',
      label: 'Давление',
      kind: 'select',
      options: [
        { value: 'mmHg', label: 'мм рт. ст.' },
        { value: 'hPa', label: 'гПа' },
        { value: 'inHg', label: 'дюймы рт. ст.' },
      ],
      default: 'mmHg',
      group: 'units',
    },
    {
      key: 'visibilityUnit',
      label: 'Видимость',
      kind: 'select',
      options: [
        { value: 'km', label: 'км' },
        { value: 'mi', label: 'миль' },
      ],
      default: 'km',
      group: 'units',
    },
  ],
};

export const MAP_META: WidgetMeta = {
  type: 'map',
  name: 'Карта',
  emoji: '🗺️',
  description:
    'Положение person/device_tracker на OpenStreetMap. Без сторонних API и тяжёлых библиотек',
  category: 'misc',
  defaultSize: { w: 3, h: 3 },
  minSize: { w: 2, h: 2 },
  paramSchema: [
    {
      key: 'entity',
      label: 'Сущность',
      kind: 'entity',
      domain: 'person.,device_tracker.',
      required: true,
      hint: 'Должна содержать атрибуты latitude/longitude',
    },
    {
      key: 'label',
      label: 'Подпись',
      kind: 'text',
      placeholder: 'Где я',
    },
    {
      key: 'zoom',
      label: 'Зум (1–18)',
      kind: 'number',
      default: 14,
    },
  ],
};

export const ENERGY_META: WidgetMeta = {
  type: 'energy',
  name: 'Энергопотребление',
  emoji: '⚡',
  description:
    'Текущая мощность крупно + опционально потребление за день/месяц и стоимость',
  category: 'sensors',
  defaultSize: { w: 2, h: 2 },
  minSize: { w: 1, h: 1 },
  paramSchema: [
    {
      key: 'power',
      label: 'Текущая мощность (W)',
      kind: 'entity',
      domain: 'sensor.',
      required: true,
      hint: 'Sensor с device_class=power, единицы W или kW',
    },
    {
      key: 'todayEnergy',
      label: 'Сегодня (kWh)',
      kind: 'entity',
      domain: 'sensor.',
      hint: 'Опционально — sensor накопленного за день потребления',
    },
    {
      key: 'monthEnergy',
      label: 'Месяц (kWh)',
      kind: 'entity',
      domain: 'sensor.',
      hint: 'Опционально — sensor накопленного за месяц',
    },
    {
      key: 'pricePerKwh',
      label: 'Цена за kWh',
      kind: 'number',
      hint: 'Если указано — покажем оценку стоимости за сегодня',
    },
    {
      key: 'currency',
      label: 'Валюта',
      kind: 'text',
      default: '₽',
    },
    {
      key: 'label',
      label: 'Подпись',
      kind: 'text',
      placeholder: 'Дом',
    },
  ],
};

export const LIGHT_COLOR_META: WidgetMeta = {
  type: 'light_color',
  name: 'Свет (цвет + яркость)',
  emoji: '🌈',
  description:
    'Кнопка цветной лампы. Тап открывает sheet с яркостью, color wheel, цветовой температурой и эффектами в стиле панели',
  category: 'lights',
  defaultSize: { w: 2, h: 1 },
  minSize: { w: 2, h: 1 },
  paramSchema: [
    {
      key: 'entity',
      label: 'Лампа',
      kind: 'entity',
      domain: 'light.',
      required: true,
      hint: 'Должна поддерживать яркость или цвет (см. supported_color_modes)',
    },
    {
      key: 'label',
      label: 'Подпись',
      kind: 'text',
      placeholder: 'Кухня · потолок',
    },
  ],
};

export const MULTI_SENSOR_META: WidgetMeta = {
  type: 'multi_sensor',
  name: 'Несколько сенсоров',
  emoji: '📊',
  description:
    'Компактный блок из нескольких sensor/binary_sensor сущностей — chip-ы с иконкой и значением; тап по числовому открывает график',
  category: 'sensors',
  defaultSize: { w: 3, h: 2 },
  minSize: { w: 2, h: 1 },
  paramSchema: [
    {
      key: 'entities',
      label: 'Сенсоры',
      kind: 'multi-entity',
      domain: 'sensor.,binary_sensor.',
      required: true,
      hint: 'Можно смешивать sensor.* и binary_sensor.*',
    },
    {
      key: 'label',
      label: 'Подпись блока',
      kind: 'text',
      placeholder: 'Метеостанция',
    },
  ],
};

export const IFRAME_META: WidgetMeta = {
  type: 'iframe',
  name: 'Встроенный сайт',
  emoji: '🌐',
  description:
    'Показывает произвольный URL в виджете. Удобно для Grafana, отдельных дашбордов, web-камер',
  category: 'misc',
  defaultSize: { w: 3, h: 3 },
  minSize: { w: 2, h: 2 },
  paramSchema: [
    {
      key: 'url',
      label: 'URL сайта',
      kind: 'text',
      required: true,
      placeholder: 'https://grafana.example.com/d/abc',
      hint: 'Сайт должен разрешать встраивание (X-Frame-Options: SAMEORIGIN/ALLOWALL)',
    },
    {
      key: 'label',
      label: 'Заголовок',
      kind: 'text',
      hint: 'Опциональная шапка над iframe',
    },
    {
      key: 'allowScripts',
      label: 'Разрешить JavaScript внутри',
      kind: 'boolean',
      default: false,
      hint: 'Нужно для интерактивных дашбордов. По умолчанию — sandbox без скриптов',
    },
  ],
};

export const LOCK_META: WidgetMeta = {
  type: 'lock',
  name: 'Замок',
  emoji: '🔒',
  description:
    'Управление замком: тап запирает/отпирает. Янтарный акцент когда открыт — мягкое предупреждение «дверь не заперта»',
  category: 'switches',
  defaultSize: { w: 1, h: 1 },
  minSize: { w: 1, h: 1 },
  paramSchema: [
    {
      key: 'entity',
      label: 'Замок',
      kind: 'entity',
      domain: 'lock.',
      required: true,
      hint: 'Например, lock.front_door',
    },
    {
      key: 'label',
      label: 'Подпись',
      kind: 'text',
      placeholder: 'Входная дверь',
    },
    {
      key: 'icon',
      label: 'Иконка',
      kind: 'icon',
      hint: 'По умолчанию — lock / lock-open-variant в зависимости от состояния',
    },
  ],
};

export const CALENDAR_META: WidgetMeta = {
  type: 'calendar',
  name: 'Календарь',
  emoji: '📅',
  description:
    'События из HA-календаря: сегодняшние и ближайшие на несколько дней вперёд',
  category: 'misc',
  defaultSize: { w: 3, h: 3 },
  minSize: { w: 2, h: 2 },
  paramSchema: [
    {
      key: 'entity',
      label: 'Календарь',
      kind: 'entity',
      domain: 'calendar.',
      required: true,
      hint: 'Например, calendar.personal',
    },
    {
      key: 'label',
      label: 'Заголовок',
      kind: 'text',
      placeholder: 'Календарь',
      hint: 'Отображается над списком событий',
    },
    {
      key: 'days',
      label: 'Сколько дней вперёд показывать',
      kind: 'number',
      default: 7,
    },
    {
      key: 'maxEvents',
      label: 'Максимум событий в виджете',
      kind: 'number',
      default: 6,
      hint: 'Виджет сам обрежет список, если событий больше',
    },
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
