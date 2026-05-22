/**
 * Готовые preset-страницы для быстрого добавления через PageManagerSheet.
 * Сейчас один пресет — «Сахар» (мониторинг CGM/глюкозы).
 */

import type { Page } from './types';
import type { WidgetConfig } from '@/lib/widgets/types';
import type { TFunction } from '@/lib/i18n/I18nProvider';

function rnd(): string {
  // Достаточно случайный id для виджета — не пересечётся с другими.
  return Math.random().toString(36).slice(2, 10);
}

/**
 * Раскладка страницы «Сахар» — mobile-first: каждый виджет на всю ширину
 * (9 колонок), один под другим. На мобиле всё читается, на десктопе при
 * желании пользователь сам перетащит. На узких экранах CGM-данные важнее
 * красивой сетки.
 *
 * Заголовки виджетов НЕ задаём (`label` не передаём) — каждый виджет сам
 * подставит свой локализованный заголовок и будет следовать выбранному
 * языку интерфейса. Заголовок страницы переводим один раз при создании
 * (имя страницы — это пользовательские данные, оно «застывает»).
 */
export function buildGlucosePage(t: TFunction): Omit<Page, 'id'> {
  const widgets: WidgetConfig[] = [
    // Главная карточка глюкозы — 9×3, полная ширина, крупное значение со
    // стрелкой и цветом зоны. Высота 3 row достаточна для всего layout'а.
    {
      i: `glucose-main-${rnd()}`,
      type: 'glucose',
      x: 0,
      y: 0,
      w: 9,
      h: 3,
      params: {
        entity: 'sensor.blood_sugar',
      },
    },
    // График динамики — широкий 9×5, чтобы линия и зоны хорошо читались
    {
      i: `glucose-chart-${rnd()}`,
      type: 'glucose_chart',
      x: 0,
      y: 3,
      w: 9,
      h: 5,
      params: {
        entity: 'sensor.blood_sugar',
        rangeEntity: 'input_select.glucose_range',
        defaultHours: 6,
      },
    },
    // Статистика за 24 часа — 9×4, тайлы получают полную ширину
    {
      i: `glucose-stats-24h-${rnd()}`,
      type: 'glucose_stats',
      x: 0,
      y: 8,
      w: 9,
      h: 4,
      params: {
        period: '24h',
      },
    },
    // Статистика за 7 дней — 9×4, под 24h
    {
      i: `glucose-stats-7d-${rnd()}`,
      type: 'glucose_stats',
      x: 0,
      y: 12,
      w: 9,
      h: 4,
      params: {
        period: '7d',
      },
    },
  ];

  return {
    title: t('page.preset.glucose.title'),
    icon: '🩸',
    kind: 'grid',
    widgets,
  };
}
