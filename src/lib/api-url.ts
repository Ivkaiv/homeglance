/**
 * Helper для построения URL внутрисерверных API.
 *
 * Зачем: Homeglance может работать в двух режимах:
 *
 *  1. Standalone (Docker / Add-on без ingress) — всё на корне `/`. Запросы
 *     `fetch('/api/glance/connection')` работают как обычно.
 *
 *  2. HA Ingress — HA проксирует через путь
 *     `/api/hassio_ingress/<token>/...`, токен меняется при каждом
 *     рестарте. Абсолютные `/api/glance/...` ломаются: они уходят на HA,
 *     а не в add-on.
 *
 * Решение — использовать **относительные URL**: `fetch('api/glance/x')`
 * (без leading slash). Браузер резолвит их относительно текущего
 * `document.baseURI`. Это работает в обоих режимах:
 *   - В standalone baseURI = `https://host:3040/` → URL = `https://host:3040/api/glance/x`
 *   - В ingress baseURI = `https://hass/api/hassio_ingress/<t>/` → URL внутри ingress
 */

/** Превращает абсолютный API-путь (`/api/glance/...`) в relative (`api/glance/...`). */
export function apiUrl(path: string): string {
  // Принимаем только пути начинающиеся с '/', иначе оставляем как есть.
  if (!path.startsWith('/')) return path;
  return path.slice(1);
}
