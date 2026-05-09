'use client';

import { useCallback, useRef } from 'react';

/** Параметры хука */
interface Options {
  /** Через сколько мс срабатывает long-press. По умолчанию 500. */
  threshold?: number;
  /** Допустимое смещение пальца до срабатывания, px. Если палец сдвинулся
   *  дальше — отменяем (это тап с вариативностью или скролл). */
  moveThreshold?: number;
  /** Запрашивать виброотклик у устройства при срабатывании. */
  haptics?: boolean;
}

/**
 * Хук обработки long-press для тач- и мышь-устройств. Возвращает
 * пропсы для прокидывания в JSX-элемент.
 *
 * @param onLongPress — вызывается с координатами события (для контекстного меню).
 *
 * Использование:
 * ```tsx
 * const lp = useLongPress((e) => openMenu(e.clientX, e.clientY));
 * return <div {...lp}>...</div>;
 * ```
 *
 * Учёт особенностей:
 * - Отмена по pointermove (если палец сдвинулся > moveThreshold)
 * - Отмена по pointercancel/pointerleave/pointerup до threshold
 * - Не сработает если pointer вообще не trigger'ил pointerdown (например, фокус с клавиатуры)
 */
export function useLongPress(
  onLongPress: (e: { clientX: number; clientY: number }) => void,
  opts: Options = {}
) {
  const threshold = opts.threshold ?? 500;
  const moveThreshold = opts.moveThreshold ?? 8;
  const haptics = opts.haptics ?? true;

  const timerRef = useRef<number | null>(null);
  const startPos = useRef<{ x: number; y: number } | null>(null);
  const fired = useRef(false);

  const cancel = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    startPos.current = null;
  }, []);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      // Только основная кнопка / тач / pen.
      if (e.button !== 0 && e.pointerType === 'mouse') return;
      fired.current = false;
      startPos.current = { x: e.clientX, y: e.clientY };
      const x = e.clientX;
      const y = e.clientY;
      timerRef.current = window.setTimeout(() => {
        fired.current = true;
        if (haptics && typeof navigator !== 'undefined' && navigator.vibrate) {
          // Двойной тык — короткий + чуть длиннее, чувствуется как «двойной щелчок»
          // и заметнее одиночного 15ms на современных телефонах.
          navigator.vibrate([20, 30, 50]);
        }
        onLongPress({ clientX: x, clientY: y });
      }, threshold);
    },
    [onLongPress, threshold, haptics]
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      const start = startPos.current;
      if (!start) return;
      const dx = Math.abs(e.clientX - start.x);
      const dy = Math.abs(e.clientY - start.y);
      if (dx > moveThreshold || dy > moveThreshold) cancel();
    },
    [cancel, moveThreshold]
  );

  const onPointerUp = useCallback(
    (_e: React.PointerEvent) => {
      cancel();
    },
    [cancel]
  );

  const onPointerCancel = useCallback(() => cancel(), [cancel]);
  const onPointerLeave = useCallback(() => cancel(), [cancel]);

  // contextmenu: на десктопе right-click тоже считается за «контекст».
  // Мы открываем меню на pointer-долгий-тап. Чтобы оба пути работали,
  // ловим и contextmenu тоже — превращая в long-press-callback.
  const onContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      cancel(); // на всякий случай
      fired.current = true;
      onLongPress({ clientX: e.clientX, clientY: e.clientY });
    },
    [cancel, onLongPress]
  );

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel,
    onPointerLeave,
    onContextMenu,
  };
}
