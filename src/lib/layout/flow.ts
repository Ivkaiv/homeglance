/**
 * Reading-order auto-flow layout engine.
 *
 * Виджеты лежат в массиве в порядке отображения (reading-order: слева-направо,
 * сверху-вниз). Каждый виджет имеет свой size {w, h} в grid-cells.
 *
 * Алгоритм flow: для каждого виджета по порядку находим первую свободную
 * позицию, куда он влезает (сканируя сверху-вниз, слева-направо). Помещаем
 * туда, помечаем клетки как занятые, идём к следующему.
 *
 * Это дает iOS-style auto-pack: нет дыр, виджеты "стекают" к верху-левому,
 * порядок = массив, drag = реордер в массиве.
 */

export interface SizedItem {
  i: string;
  w: number;
  h: number;
}

export interface PlacedItem extends SizedItem {
  x: number;
  y: number;
}

/** Поместить виджеты в авто-flow раскладку с заданным числом колонок. */
export function flowLayout<T extends SizedItem>(items: T[], cols: number): Array<T & { x: number; y: number }> {
  // Грид занятости: 2D массив. Расширяем по вертикали по мере необходимости.
  const occupied: boolean[][] = []; // occupied[y][x]

  function cellFree(x: number, y: number, w: number, h: number): boolean {
    if (x < 0 || y < 0 || x + w > cols) return false;
    for (let yy = y; yy < y + h; yy++) {
      const row = occupied[yy];
      if (!row) continue;
      for (let xx = x; xx < x + w; xx++) {
        if (row[xx]) return false;
      }
    }
    return true;
  }

  function fill(x: number, y: number, w: number, h: number) {
    for (let yy = y; yy < y + h; yy++) {
      while (occupied.length <= yy) occupied.push(new Array(cols).fill(false));
      for (let xx = x; xx < x + w; xx++) {
        occupied[yy][xx] = true;
      }
    }
  }

  const placed: Array<T & { x: number; y: number }> = [];
  for (const item of items) {
    const w = Math.max(1, Math.min(cols, item.w));
    const h = Math.max(1, item.h);
    let found: { x: number; y: number } | null = null;

    // Сканируем grid: построчно сверху-вниз, в каждой строке слева-направо.
    // Лимит на безопасность — 200 строк.
    outer: for (let y = 0; y < 200; y++) {
      for (let x = 0; x <= cols - w; x++) {
        if (cellFree(x, y, w, h)) {
          found = { x, y };
          break outer;
        }
      }
    }
    if (!found) found = { x: 0, y: 0 };
    fill(found.x, found.y, w, h);
    placed.push({ ...item, x: found.x, y: found.y, w, h });
  }
  return placed;
}

/**
 * Найти "слот" — индекс в массиве items, на чьё место поставить элемент при drop в (cellX, cellY).
 * Логика: ищем виджет, чья область содержит (cellX, cellY). Если есть — возвращаем его индекс.
 * Если нет — возвращаем индекс «после последнего, чья y+h <= cellY ИЛИ y == cellY и x+w <= cellX».
 */
export function findSlot(
  positions: PlacedItem[],
  draggedId: string,
  cellX: number,
  cellY: number
): number {
  const others = positions.filter((p) => p.i !== draggedId);
  // Прямое попадание в виджет
  const hit = others.find(
    (p) => p.x <= cellX && cellX < p.x + p.w && p.y <= cellY && cellY < p.y + p.h
  );
  if (hit) {
    return positions.findIndex((p) => p.i === hit.i);
  }
  // Иначе — ищем индекс куда вставить (между виджетами в reading-order)
  // Reading-order: считаем "приоритет" по позиции (y * 1000 + x)
  const draggedIdx = positions.findIndex((p) => p.i === draggedId);
  const targetPriority = cellY * 1000 + cellX;
  // Найти индекс первого виджета (среди others), у которого priority > target
  let insertAt = others.length;
  for (let i = 0; i < others.length; i++) {
    const p = others[i];
    const priority = p.y * 1000 + p.x;
    if (priority > targetPriority) {
      insertAt = i;
      break;
    }
  }
  // Конвертируем индекс в массиве `others` в индекс в массиве `positions`
  // (учитывая что dragged исключён)
  if (insertAt >= others.length) return positions.length - 1;
  const targetItem = others[insertAt];
  return positions.findIndex((p) => p.i === targetItem.i);
}
