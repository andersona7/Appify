const CACHE_NAME = 'appgen-cache-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/favicon.ico',
  '/manifest.json'
];

// 1. Install SW & cache base files
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// 2. Active SW & clean old caches
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// 3. Intercept fetch & serve cache if offline
self.addEventListener('fetch', (e) => {
  // Only intercept HTTP/GET requests
  if (e.request.method !== 'GET' || !e.request.url.startsWith(self.location.origin)) {
    return;
  }

  e.respondWith(
    caches.match(e.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(e.request).then((networkResponse) => {
        // Cache new static assets dynamically
        const url = new URL(e.request.url);
        if (
          networkResponse.status === 200 &&
          (url.pathname.endsWith('.css') || url.pathname.endsWith('.js') || url.pathname.startsWith('/_next/static/'))
        ) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(e.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => {
        // Fallback for offline API responses
        if (e.request.headers.get('accept')?.includes('text/html')) {
          return caches.match('/');
        }
        return new Response(JSON.stringify({ error: 'You are currently offline. Local cache served.' }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' }
        });
      });
    })
  );
});
