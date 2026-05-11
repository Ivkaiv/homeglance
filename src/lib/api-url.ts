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

/**
 * Возвращает абсолютный URL для fetch — резолвит относительно <base href>
 * (который RootLayout эмитит абсолютным: `/` или `/api/hassio_ingress/<t>/`).
 *
 * Чисто relative-пути (без leading `/`) под HA Ingress в некоторых WebView
 * не подхватывают `<base>` для fetch (в отличие от `<script src>`),
 * запросы уходят не на add-on, а в пустоту. Поэтому собираем URL руками.
 */
export function apiUrl(path: string): string {
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  if (typeof document === 'undefined') return '/' + cleanPath;
  const base = document.querySelector('base')?.getAttribute('href') ?? '/';
  // base всегда абсолютный (см. RootLayout): `/` или `/api/hassio_ingress/<t>/`.
  return base.endsWith('/') ? base + cleanPath : base + '/' + cleanPath;
}
