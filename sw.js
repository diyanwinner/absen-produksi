/* Service Worker: STALE-WHILE-REVALIDATE (Instan Load) */
const VERSION   = '2026-01-14-PERF-V1'; // Ganti versi biar cache lama dibuang
const CACHE_KEY = `absen-prod-cache::${VERSION}`;

const CORE_ASSETS = [
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
    // Hapus cache versi lama biar ga numpuk
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

// STRATEGI BARU: Cek Cache dulu -> Tampilkan -> Update Background
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;

  e.respondWith((async () => {
    const cache = await caches.open(CACHE_KEY);
    const cachedResp = await cache.match(req);

    // Fetch network untuk update cache di masa depan
    const networkFetch = fetch(req).then(fresh => {
      cache.put(req, fresh.clone());
      return fresh;
    }).catch(() => {
      // Kalau offline, ya sudah diam saja
    });

    // Kalau ada di cache, kasih langsung (NGEBUT!)
    // Kalau ga ada, baru tunggu network
    return cachedResp || networkFetch;
  })());
});
