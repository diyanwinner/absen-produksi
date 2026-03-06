/* Service Worker: STALE-WHILE-REVALIDATE (Instan Load) */
const VERSION   = '2026-03-06-FIX-V2'; // Ganti versi biar cache lama dibuang
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

// STRATEGI: Hanya cache file statis milik app (HTML, JS, icon)
// API calls ke Supabase TIDAK dicache biar data selalu fresh!
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // ⚠️ SKIP: Jangan intercept request ke luar domain (Supabase, CDN, dsb)
  // Kalau dicache, data bisa stale / salah saat pertama buka!
  if (url.origin !== self.location.origin) return;

  // Hanya cache aset statis (bukan dynamic data)
  const isStaticAsset = /\.(html|js|css|png|jpg|svg|ico|webmanifest)$/.test(url.pathname) || url.pathname === '/';
  if (!isStaticAsset) return;

  e.respondWith((async () => {
    const cache = await caches.open(CACHE_KEY);
    const cachedResp = await cache.match(req);

    // Update cache di background (stale-while-revalidate untuk file statis)
    const networkFetch = fetch(req).then(fresh => {
      if (fresh.ok) cache.put(req, fresh.clone());
      return fresh;
    }).catch(() => null);

    // Kalau ada cache → tampilkan langsung, update di background
    // Kalau belum ada cache → tunggu network
    return cachedResp || await networkFetch;
  })());
});
