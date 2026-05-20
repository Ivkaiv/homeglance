/**
 * Откуда Glance берёт адрес Music Assistant.
 *
 * Два режима:
 *  - Прямое подключение (dev): переменные NEXT_PUBLIC_MA_URL + NEXT_PUBLIC_MA_TOKEN.
 *    Браузер открывает WS прямо на MA. Работает только по HTTP (без mixed-content).
 *  - Через прокси (production, HA Add-on): server.js поднимает мост
 *    `/api/glance/ma-ws` и сам авторизуется в MA — токен в браузер не уходит.
 *    Клиент подключается к same-origin WS, token не нужен.
 */

export interface MAConnectionConfig {
  /** Полный ws://-URL для подключения. */
  wsUrl: string;
  /** Токен для auth-команды. null — когда авторизуется серверный прокси. */
  token: string | null;
}

export function getMAConfig(): MAConnectionConfig | null {
  if (typeof window === 'undefined') return null;

  const directUrl = process.env.NEXT_PUBLIC_MA_URL;
  const directToken = process.env.NEXT_PUBLIC_MA_TOKEN;
  if (directUrl && directToken) {
    const ws = directUrl.replace(/^http/, 'ws').replace(/\/+$/, '');
    return { wsUrl: `${ws}/ws`, token: directToken };
  }

  // Production: same-origin прокси. base href учитывает HA Ingress-путь.
  const baseHref = document.querySelector('base')?.getAttribute('href') ?? '/';
  const baseUrl = new URL(baseHref, window.location.href);
  const wsUrl = new URL('api/glance/ma-ws', baseUrl).href.replace(/^http/, 'ws');
  return { wsUrl, token: null };
}

/**
 * URL обложки через серверный прокси Glance. Нужен, потому что MA отдаёт
 * http://-ссылки на imageproxy (mixed-content под https-Ingress), а прямые
 * CDN-ссылки кросс-доменные. Путь относительный — чтобы корректно
 * резолвился под HA Ingress (см. <base href> в layout.tsx).
 */
export function maImageProxy(url?: string | null): string | null {
  if (!url) return null;
  // Часть обложек плейлистов Звука содержат плейсхолдер {size} в пути —
  // без подстановки конкретного размера такая картинка не загрузится.
  const resolved = url.replace('{size}', '600x600');
  return `api/glance/ma-image?url=${encodeURIComponent(resolved)}`;
}
