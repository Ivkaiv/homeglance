// Минимальный service worker для PWA-установки Glance.
// Кэширует статические ассеты, остальное идёт сетью с фолбэком на кэш.
const CACHE = 'glance-v2';
const STATIC = [
  '/',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-maskable-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(STATIC).catch(() => {})));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

// Network-first для HTML/API, cache-first для статики.
self.addEventListener('fetch', (e) => {
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
