/**
 * Базовые типы виджет-системы Glance.
 */

import { ComponentType } from 'react';

export interface WidgetSize {
  w: number;
  h: number;
}

/** Категории — для группировки в каталоге «+ Виджет» */
export type WidgetCategory =
  | 'lights'
  | 'switches'
  | 'sensors'
  | 'climate'
  | 'media'
  | 'cameras'
  | 'rooms'
  | 'health'
  | 'misc';

export interface ParamField {
  key: string;
  label: string;
  kind:
    | 'entity'
    | 'multi-entity'
    | 'text'
    | 'number'
    | 'boolean'
    | 'color'
    | 'select'
    | 'multi-select'
    | 'icon'
    | 'entity-icons';
  domain?: string;
  options?: { value: string; label: string }[];
  required?: boolean;
  default?: any;
  placeholder?: string;
  hint?: string;
  /** Для kind='number': шаг ввода. По умолчанию 'any' (любые дроби).
   *  Указать число (например 0.1) — чтобы input округлял до этого шага. */
  step?: number | 'any';
  /** Для kind='number': границы значения. */
  min?: number;
  max?: number;
  /** Для kind='entity-icons': key другого multi-entity-поля, чьи entities используются */
  linkedKey?: string;
  /** Логическая группа поля — для аккордеонов в ConfigSheet.
   *  Поля с одинаковым `group` рендерятся в одну секцию, в порядке как в массиве.
   *  Пустая или undefined группа = «Основное» (всегда раскрыта). */
  group?: string;
}

/** Описание группы полей для ConfigSheet. Опционально — если виджет хочет
 *  кастомный порядок групп / иконки / collapsed-by-default. */
export interface ParamGroup {
  /** Идентификатор группы — должен совпадать с `group` в ParamField. */
  id: string;
  /** Что отображается в заголовке секции. */
  label: string;
  /** Эмодзи перед заголовком. */
  icon?: string;
  /** По умолчанию ли свёрнута. Если null/undefined — раскрыта. */
  collapsed?: boolean;
  /** Описание под заголовком. */
  hint?: string;
}

export interface WidgetMeta {
  type: string;
  name: string;
  emoji: string;
  description: string;
  category: WidgetCategory;
  defaultSize: WidgetSize;
  minSize: WidgetSize;
  paramSchema: ParamField[];
  /** Опционально: упорядоченный список групп с метаданными.
   *  Если не задан — группы выводятся в порядке первого появления в schema,
   *  без иконок, в раскрытом виде. */
  paramGroups?: ParamGroup[];
}

export interface WidgetConfig {
  /** Уникальный id экземпляра */
  i: string;
  type: string;
  x: number;
  y: number;
  w: number;
  h: number;
  params: Record<string, any>;
}

/**
 * Запись в реестре виджетов.
 *
 * Дженерик `P` — тип параметров конкретного виджета. При регистрации каждый
 * виджет указывает свой `WidgetEntry<MyParams>` и Component получает
 * типобезопасные `params: MyParams`. Реестр в runtime хранит их как
 * `WidgetEntry<any>`, поскольку тип определяется по `meta.type` уже на этапе
 * выполнения (и Dashboard не знает типа в compile-time).
 */
export interface WidgetEntry<P = Record<string, any>> {
  meta: WidgetMeta;
  Component: ComponentType<{ params: P }>;
  /**
   * Опционально: вычисление **динамического** minSize виджета на основе его
   * параметров. Полезно когда контент-нагрузка варьируется: например,
   * RoomHubWidget — если в нём только кнопки и температура, хватает 3×3, а
   * если добавлены плеер, climate-степперы и сенсорные чипы — уже 4×4 или 5×5.
   *
   * Если функция не задана — используется статический `meta.minSize`.
   */
  computeMinSize?: (params: P) => { w: number; h: number };
}
