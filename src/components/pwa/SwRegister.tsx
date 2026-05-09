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
    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .catch((err) => console.warn('SW register failed:', err));
  }, []);
  return null;
}
