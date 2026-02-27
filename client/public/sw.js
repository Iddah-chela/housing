const CACHE_NAME = 'campuscrib-v2';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/icons/icon-192.png',
  '/manifest.json',
];

// Install — cache shell assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Activate — clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// Fetch strategy:
//   API calls        → browser handles (no SW interference)
//   HTML navigations → network-first, no caching, fallback to /index.html shell
//   Static assets    → cache-first with network fallback
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET and cross-origin requests entirely
  if (request.method !== 'GET' || url.origin !== location.origin) return;

  // API calls — let the browser handle these directly, no SW involvement
  if (url.pathname.startsWith('/api')) return;

  // HTML navigations — always go to network so Vite/server can return fresh index.html.
  // Never cache these: every path is just an alias for index.html and Vite rewrites
  // script hashes on each restart, so a cached nav response causes blank pages on reload.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() =>
        caches.match('/index.html').then((cached) => cached || caches.match('/'))
      )
    );
    return;
  }

  // Static assets (JS, CSS, images, fonts) — cache-first
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      });
    })
  );
});
