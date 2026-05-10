'use client';

import { useEffect } from 'react';

/**
 * Регистрирует service worker для PWA-установки.
 * SW нужен только в production-сборке — иначе иконки/манифест Next.js
 * пересчитываются на каждом запросе и кэш в SW мешает.
 */
export function SwRegister() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator)) return;
    if (process.env.NODE_ENV !== 'production') return;
    // Под HA Ingress SW не нужен (HA сам — PWA-host) и активно вреден:
    // он кэширует абсолютные пути типа `/_next/static/...`, которые под
    // ingress указывают на корень HA, а не на add-on. Старый закешированный
    // 404 будет отдаваться поверх любых обновлений add-on. Поэтому здесь
    // не регистрируем — а ниже выгружаем уже зарегистрированный SW, чтобы
    // починить апгрейд с предыдущих версий.
    if (window.location.pathname.includes('/api/hassio_ingress/')) {
      navigator.serviceWorker.getRegistrations().then((regs) => {
        regs.forEach((r) => r.unregister());
        if ('caches' in window) {
          caches.keys().then((keys) => keys.forEach((k) => caches.delete(k)));
        }
      });
      return;
    }
    navigator.serviceWorker
      .register('sw.js', { scope: './' })
      .catch((err) => console.warn('SW register failed:', err));
  }, []);
  return null;
}
