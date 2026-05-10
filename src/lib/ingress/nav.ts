'use client';

/**
 * Навигация под HA Ingress.
 *
 * `next/navigation` router работает в терминах абсолютных путей `/onboarding`,
 * `/settings`. Под ingress URL имеет префикс `/api/hassio_ingress/<token>/`,
 * и роутер не знает об этом — `router.push('/onboarding')` ломает iframe,
 * браузер уходит на корень HA, который отвечает 404.
 *
 * `nav()` читает <base href> из document (его эмитит RootLayout по
 * X-Ingress-Path) и делает hard-navigation через `window.location.assign`
 * с правильным абсолютным URL под текущим ingress.
 *
 * Без ingress (прямой доступ или dev) base="./" → используем относительные
 * пути от текущей страницы.
 */
export function nav(target: string): void {
  if (typeof window === 'undefined') return;
  const path = target.replace(/^\//, '');
  const base = document.querySelector('base')?.getAttribute('href') ?? '/';
  // base всегда абсолютный (`/` или `/api/hassio_ingress/<token>/`),
  // поэтому простая конкатенация даёт корректный URL под обоим случаям.
  window.location.assign(base + path);
}
