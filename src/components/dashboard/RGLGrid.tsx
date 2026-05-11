'use client';

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import GridLayout, { type Layout } from 'react-grid-layout';
import { WidgetSkeleton } from '@/components/widgets/_states';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

const useIsoLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

/**
 * Откладывает рендер дочернего узла, пока он не попадёт в viewport.
 * До этого момента возвращает `fallback` (skeleton) — это убирает initial
 * burst из десятков mount'ов одновременно: видимые виджеты рисуются сразу,
 * скрытые ниже скролла подгружаются по мере прокрутки. Снижает Total
 * Blocking Time на первом paint'е.
 *
 * `rootMargin: 400px` — pre-render с запасом, чтобы пустых мест не было
 * видно при быстром скролле. Один раз заинтерсектил → запоминаем
 * (`disconnect()`), повторно не разгружаем.
 *
 * В edit-mode откладывание отключаем: drag/resize требуют, чтобы все
 * виджеты были смонтированы и имели свои handle'ы.
 */
function DeferredViewport({
  children,
  immediate,
}: {
  children: ReactNode;
  immediate?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(immediate ?? false);

  useEffect(() => {
    if (immediate) {
      setVisible(true);
      return;
    }
    if (!ref.current) return;
    if (typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return;
    }
    const ob = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true);
          ob.disconnect();
        }
      },
      { rootMargin: '400px' },
    );
    ob.observe(ref.current);
    return () => ob.disconnect();
  }, [immediate]);

  return (
    <div ref={ref} className="contents">
      {visible ? children : <WidgetSkeleton />}
    </div>
  );
}

export interface RGLItem {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  minH?: number;
}

interface RGLGridProps {
  items: RGLItem[];
  cols: number;
  rowHeight: number;
  gap: number;
  editing: boolean;
  /** На drop / resize / любое перемещение присылаем новый list. */
  onLayoutChange: (next: RGLItem[]) => void;
  renderItem: (item: RGLItem) => ReactNode;
  renderControls?: (item: RGLItem) => ReactNode;
}

/**
 * Сетка виджетов на базе react-grid-layout.
 *
 * Преимущества над прежним FlowGrid (на dnd-kit):
 * - Виджеты имеют ЯВНЫЕ координаты (x, y, w, h) — никакого auto-flow,
 *   никакого «улетания вниз» при reorder.
 * - Live-preview через placeholder-индикатор (полупрозрачный прямоугольник
 *   в месте, куда упадёт виджет) — без перестановки соседей.
 * - Vertical compact: после drop виджеты подтягиваются вверх — никаких дыр.
 * - Resize «из коробки» через свои ручки (south-east угол).
 */
export function RGLGrid(props: RGLGridProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  useIsoLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const measure = () => setContainerWidth(el.clientWidth);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const layout: Layout[] = props.items.map((it) => ({
    i: it.i,
    x: it.x,
    y: it.y,
    w: it.w,
    h: it.h,
    minW: it.minW ?? 1,
    minH: it.minH ?? 1,
  }));

  function applyLayout(next: Layout[]) {
    const map = new Map(next.map((l) => [l.i, l]));
    const updated: RGLItem[] = props.items.map((it) => {
      const l = map.get(it.i);
      if (!l) return it;
      return { ...it, x: l.x, y: l.y, w: l.w, h: l.h };
    });
    // Сравниваем — только если хоть что-то поменялось
    const changed = updated.some((u, i) => {
      const o = props.items[i];
      return o.x !== u.x || o.y !== u.y || o.w !== u.w || o.h !== u.h;
    });
    if (changed) props.onLayoutChange(updated);
  }

  return (
    <div ref={containerRef} className="w-full">
      {containerWidth > 0 && (
        <GridLayout
          className="layout"
          layout={layout}
          cols={props.cols}
          rowHeight={props.rowHeight}
          margin={[props.gap, props.gap]}
          width={containerWidth}
          isDraggable={props.editing}
          isResizable={props.editing}
          compactType="vertical"
          preventCollision={false}
          allowOverlap={false}
          // В режиме редактирования весь виджет накрывается прозрачным
          // overlay-слоем (.rgl-drag-area) — он перехватывает все клики
          // и служит handle для drag. Внутренние кнопки виджета (toggle
          // света и т.п.) под слоем — клики до них не доходят, и виджет
          // полностью «freezed», как иконки в jiggle-режиме iOS.
          // Кнопки управления (X, шестерёнка) ставятся выше через z-index
          // и помечены `.no-drag` чтобы их клик не запускал drag.
          draggableHandle=".rgl-drag-area"
          draggableCancel=".no-drag"
          // Resize-ручка только в правом нижнем углу
          resizeHandles={['se']}
          onLayoutChange={applyLayout}
          // ВАЖНО: useCSSTransforms=false — нам нужно занять `transform`
          // под собственную wiggle-анимацию в edit-режиме. RGL вместо этого
          // использует top/left (немного менее «плавно» на drag, но визуально
          // на дашборде разница незаметна).
          useCSSTransforms={false}
        >
          {props.items.map((item) => (
            <div
              key={item.i}
              // `@container` (Tailwind v4) включает container-query на ячейке
              // → виджеты внутри могут использовать `@[80px]:`, `@[140px]:` и т.п.
              // вместо JS-измерений через ResizeObserver.
              className={`rgl-cell @container widget-fade-in ${props.editing ? 'rgl-cell-wiggle' : ''}`}
            >
              <DeferredViewport immediate={props.editing}>
                {props.renderItem(item)}
              </DeferredViewport>
              {props.editing && props.renderControls?.(item)}
            </div>
          ))}
        </GridLayout>
      )}
    </div>
  );
}
