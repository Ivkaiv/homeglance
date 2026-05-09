'use client';

import { useCallback, useState } from 'react';

export interface ElSize {
  w: number;
  h: number;
  /** false до первого замера. Виджеты не должны рисовать контент пока false,
   *  иначе на первом frame видно tier='tiny' (emoji в центре) и потом резкая
   *  «прыжок» в medium/large — выглядит как анимация. */
  measured: boolean;
}

// Один WeakMap на все ResizeObserver'ы.
const observers = new WeakMap<Element, ResizeObserver>();

/**
 * Меряет размер DOM-элемента через ResizeObserver. Используется для виджетов
 * со сложной layout-логикой, зависящей одновременно от ширины и высоты —
 * там CSS-only @container queries недостаточны (Tailwind v4 не поддерживает
 * height-CQ из коробки, а кастомные ch-* классы плохо стыкуются с
 * множественными вариантами layout'a).
 *
 * Простые виджеты (toggle, time, note, person, sensor, cover, quick-action)
 * адаптируются через `@[80px]:`/`@[140px]:` классы — там этот хук не нужен.
 */
export function useWidgetSize(): [
  (node: HTMLElement | null) => void,
  ElSize,
] {
  const [size, setSize] = useState<ElSize>({ w: 0, h: 0, measured: false });

  const refCb = useCallback((node: HTMLElement | null) => {
    if (!node) return;
    const measure = () => {
      const w = node.clientWidth;
      const h = node.clientHeight;
      setSize((prev) =>
        prev.w === w && prev.h === h && prev.measured ? prev : { w, h, measured: true }
      );
    };
    measure();
    const prev = observers.get(node);
    if (prev) prev.disconnect();
    const ro = new ResizeObserver(measure);
    ro.observe(node);
    observers.set(node, ro);
  }, []);

  return [refCb, size];
}

export function sizeTier(size: ElSize): 'tiny' | 'small' | 'medium' | 'large' {
  const a = size.w * size.h;
  if (size.w < 80 || size.h < 70) return 'tiny';
  if (a < 14000 || size.w < 140) return 'small';
  if (a < 28000 || size.w < 220) return 'medium';
  return 'large';
}
