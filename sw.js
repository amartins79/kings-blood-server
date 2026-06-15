/**
 * King's Blood — Service Worker
 * Place this file at /sw.js alongside kings-blood.html
 * Update manifest.json start_url to match your file name.
 */
const CACHE_NAME = 'kings-blood-v2';
const CORE_ASSETS = [
  './',
  './kings-blood.html',
  './manifest.json',
  'https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700;900&family=Inter:wght@300;400;500;600&display=swap',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(CORE_ASSETS).catch(() => {}))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  // Network-first for Socket.IO and server calls; cache-first for everything else
  const url = new URL(event.request.url);
  if (url.pathname.includes('socket.io') || url.hostname.includes('YOUR-SERVER')) {
    // Always try network; fall back silently
    event.respondWith(fetch(event.request).catch(() => new Response('', { status: 503 })));
    return;
  }
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
        }
        return response;
      }).catch(() => caches.match('./kings-blood.html'));
    })
  );
});

// Ping endpoint for connectivity check
self.addEventListener('fetch', event => {
  if (new URL(event.request.url).pathname === '/ping') {
    event.respondWith(new Response('pong', { status: 200 }));
  }
});
