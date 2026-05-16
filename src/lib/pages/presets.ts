/**
 * Готовые preset-страницы для быстрого добавления через PageManagerSheet.
 * Сейчас один пресет — «Сахар» (мониторинг CGM/глюкозы).
 */

import type { Page } from './types';
import type { WidgetConfig } from '@/lib/widgets/types';

function rnd(): string {
  // Достаточно случайный id для виджета — не пересечётся с другими.
  return Math.random().toString(36).slice(2, 10);
}

/**
 * Раскладка страницы «Сахар» — mobile-first: каждый виджет на всю ширину
 * (9 колонок), один под другим. На мобиле всё читается, на десктопе при
 * желании пользователь сам перетащит. На узких экранах CGM-данные важнее
 * красивой сетки.
 */
export function buildGlucosePage(): Omit<Page, 'id'> {
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
        label: 'Глюкоза',
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
        label: 'Динамика',
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
        label: 'За 24 часа',
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
        label: 'За 7 дней',
      },
    },
  ];

  return {
    title: 'Сахар',
    icon: '🩸',
    kind: 'grid',
    widgets,
  };
}
