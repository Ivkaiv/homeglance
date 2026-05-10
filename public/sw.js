// Минимальный service worker для PWA-установки Glance.
// Кэширует статические ассеты, остальное идёт сетью с фолбэком на кэш.
const CACHE = 'glance-v4';
const STATIC = [
  '/',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-maskable-512.png',
];

// Под HA Ingress SW не нужен и вреден (см. SwRegister.tsx). Если SW
// установился из под ingress (предыдущие версии) — на activate выгружаем
// сами себя и стираем все кэши, чтобы не отдавать stale 404 поверх
// обновлений add-on.
const isIngress = self.registration.scope.includes('/api/hassio_ingress/');

self.addEventListener('install', (e) => {
  if (isIngress) {
    self.skipWaiting();
    return;
  }
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(STATIC).catch(() => {})));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  if (isIngress) {
    e.waitUntil(
      caches
        .keys()
        .then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
        .then(() => self.registration.unregister())
        .then(() => self.clients.matchAll().then((cs) => cs.forEach((c) => c.navigate(c.url))))
    );
    return;
  }
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

// Network-first для HTML/API, cache-first для статики.
self.addEventListener('fetch', (e) => {
  // Под ingress SW обнуляется на activate — на всякий случай не перехватываем.
  if (isIngress) return;
  const url = new URL(e.request.url);

  // Не трогаем WebSocket и API-эндпоинты — они не должны кэшироваться.
  if (
    e.request.headers.get('upgrade') === 'websocket' ||
    url.pathname.startsWith('/api/') ||
    e.request.method !== 'GET'
  ) {
    return;
  }

  // Статические ассеты — cache-first
  if (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname === '/manifest.json'
  ) {
    e.respondWith(
      caches.match(e.request).then(
        (hit) =>
          hit ||
          fetch(e.request).then((res) => {
            const copy = res.clone();
            caches
              .open(CACHE)
              .then((c) => c.put(e.request, copy))
              .catch(() => {});
            return res;
          })
      )
    );
    return;
  }

  // HTML / прочее — network-first с фолбэком на кэш
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        const copy = res.clone();
        caches
          .open(CACHE)
          .then((c) => c.put(e.request, copy))
          .catch(() => {});
        return res;
      })
      .catch(() => caches.match(e.request).then((hit) => hit || caches.match('/')))
  );
});
