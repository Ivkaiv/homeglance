/**
 * Утилки для работы с температурой в climate-виджетах.
 *
 * Зачем: при шаге 0.1 виджеты Math.round(target) превращали «22.3°» в «22°»,
 * и пользователь, нажимая +/−, не видел изменений (значение менялось, но
 * отображалось округлённым до целого). Плюс прямое `target + 0.1` много
 * раз даёт float-хвосты типа 22.30000000000001 — HA принимает, но в логах
 * выглядит грязно и иногда тригерит «лишние» события.
 */

function precisionFromStep(step: number): number {
  if (step >= 1) return 0;
  if (step >= 0.1) return 1;
  return 2;
}

/** Форматирует значение температуры с точностью, подходящей под шаг. */
export function formatTemp(value: number, step: number): string {
  return value.toFixed(precisionFromStep(step));
}

/** Округляет значение до точности шага — убирает float-хвосты при многократном +/−. */
export function applyStep(value: number, step: number): number {
  const p = precisionFromStep(step) + 1;
  return Number(value.toFixed(p));
}
