'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';

const useIsoLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

/**
 * Текст с авто-прокруткой — если содержимое не помещается в контейнер,
 * прокручивается слева-направо бесконечной лентой. Если помещается — статично.
 *
 * Замер делается через скрытый span с «натуральной» шириной текста, чтобы не
 * попасть в петлю «marquee добавляет padding+дубль → ширина растёт → marquee
 * остаётся включён».
 */
export function MarqueeText({
  children,
  className,
  speedPxPerSec = 30,
}: {
  children: React.ReactNode;
  className?: string;
  /** Скорость прокрутки в пикселях в секунду */
  speedPxPerSec?: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLSpanElement>(null);
  const [overflow, setOverflow] = useState(false);
  const [duration, setDuration] = useState(15);

  useIsoLayoutEffect(() => {
    const container = containerRef.current;
    const measureEl = measureRef.current;
    if (!container || !measureEl) return;
    const measure = () => {
      const cw = container.clientWidth;
      const tw = measureEl.scrollWidth;
      const overflows = tw > cw + 1;
      setOverflow(overflows);
      if (overflows) {
        setDuration(Math.max(6, tw / speedPxPerSec));
      }
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(container);
    return () => ro.disconnect();
  }, [children, speedPxPerSec]);

  return (
    <div ref={containerRef} className={`overflow-hidden relative ${className ?? ''}`}>
      {/* Скрытый эталон для измерения натуральной ширины текста */}
      <span
        ref={measureRef}
        aria-hidden="true"
        className="whitespace-nowrap"
        style={{
          position: 'absolute',
          visibility: 'hidden',
          pointerEvents: 'none',
          left: 0,
          top: 0,
        }}
      >
        {children}
      </span>
      {overflow ? (
        <span
          className="glance-marquee"
          style={{ ['--marquee-duration' as any]: `${duration}s` }}
        >
          {children}
          <span aria-hidden="true" style={{ paddingLeft: '2rem' }}>
            {children}
          </span>
        </span>
      ) : (
        <span className="inline-block whitespace-nowrap">{children}</span>
      )}
    </div>
  );
}
