const CACHE_NAME = 'patakeja-v8';
const STATIC_ASSETS = [
  '/icons/icon-192.png',
  '/icons/badge-mono.png',
  '/manifest.json',
];

// Install -> cache shell assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Activate -> clean old caches
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
//   API calls        -> browser handles (no SW interference)
//   HTML navigations -> network-first, no caching, fallback to /index.html shell
//   Static assets    -> cache-first with network fallback
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET and cross-origin requests entirely
  if (request.method !== 'GET' || url.origin !== location.origin) return;

  // API calls -> let the browser handle these directly, no SW involvement
  if (url.pathname.startsWith('/api')) return;

  // HTML navigations -> always go to network so Vite/server can return fresh index.html.
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

  // Static assets (JS, CSS, images, fonts) � cache-first
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

// -- Push Notifications -------------------------------------------------
self.addEventListener('push', (event) => {
  if (!event.data) return;

  try {
    const data = event.data.json();
    // Support custom actions passed in payload (e.g. nudge yes/no)
    const defaultActions = [{ action: 'open', title: 'Open' }, { action: 'dismiss', title: 'Dismiss' }];
    const options = {
      body: data.body || '',
      icon: data.icon || '/icons/icon-192.png',
      badge: '/icons/badge-mono.png',
      tag: data.tag || undefined,
      data: { url: data.url || '/', actionUrls: data.actionUrls || {} },
      vibrate: [100, 50, 100],
      actions: data.actions || defaultActions
    };

    event.waitUntil(
      self.registration.showNotification(data.title || 'PataKeja', options)
    );
  } catch (e) {
    // Fallback for plain text push
    event.waitUntil(
      self.registration.showNotification('PataKeja', {
        body: event.data.text(),
        icon: '/icons/icon-192.png',
        badge: '/icons/badge-mono.png'
      })
    );
  }
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') return;

  const actionUrls = event.notification.data?.actionUrls || {};
  const actionUrl  = actionUrls[event.action];

  // Background actions (prefix 'bg-'): silently fetch the API, show confirmation, never open app
  if (event.action && event.action.startsWith('bg-') && actionUrl) {
    event.waitUntil(
      fetch(actionUrl)
        .then(() => {
          const messages = {
            'bg-yes':     { title: 'Done',     body: "Confirmed! We'll update your record." },
            'bg-no':      { title: 'Noted',      body: 'No worries - you can update later in the app.' },
            'bg-confirm': { title: 'Accepted', body: 'Viewing confirmed. The renter will be notified.' },
            'bg-decline': { title: 'Declined',   body: 'Request declined. The renter will be notified.' },
          };
          const msg = messages[event.action] || { title: 'Done', body: 'Action recorded.' };
          return self.registration.showNotification(msg.title, {
            body: msg.body,
            icon: '/icons/icon-192.png',
            tag: 'bg-action-done',
            vibrate: [100]
          });
        })
        .catch(() => {
          return self.registration.showNotification('Error', {
            body: 'Could not complete the action. Please try in the app.',
            icon: '/icons/icon-192.png'
          });
        })
    );
    return;
  }

  // Normal click / named action with URL: open/focus window
  const url = actionUrl || event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin)) {
          client.navigate(url);
          return client.focus();
        }
      }
      return clients.openWindow(url);
    })
  );
});
