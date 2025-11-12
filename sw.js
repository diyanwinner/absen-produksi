/* Service Worker: network-first + auto reload */
const VERSION   = (self.APP_VERSION || '2025-11-13-01');
const CACHE_KEY = `absen-prod-cache::${VERSION}`;

const CORE_ASSETS = [
  // inti yang harus cepat tersedia; sisanya network-first
  './',
  './index.html',
  './sw-register.js'
];

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE_KEY).then((c) => c.addAll(CORE_ASSETS)));
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k.startsWith('absen-prod-cache::') && k !== CACHE_KEY)
                         .map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Network-first untuk semua GET
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;

  e.respondWith((async () => {
    try {
      const fresh = await fetch(req);
      const cache = await caches.open(CACHE_KEY);
      cache.put(req, fresh.clone());
      return fresh;
    } catch {
      const cache = await caches.open(CACHE_KEY);
      const cached = await cache.match(req);
      if (cached) return cached;
      // fallback minimal ke index (SPA)
      if (req.mode === 'navigate') {
        return cache.match('./index.html');
      }
      throw new Error('Network error & no cache');
    }
  })());
});
