 // ================================================================
// SERVICE WORKER — فطار الشغل
// Strategy:
//   Static assets  → cache-first (serve instantly, update in bg)
//   GAS API calls  → network-only (need live data; show offline msg on fail)
// ================================================================

const CACHE_NAME = 'fattar-v2';

const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './css/style.css',
  './js/config.js',
  './js/api.js',
  './js/app.js',
  './js/manager.js',
  './js/screens.js',
  './js/utils.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

// ── Install: pre-cache all static assets ──────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// ── Activate: delete old caches ───────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

// ── Fetch: route requests ──────────────────────────────────────
self.addEventListener('fetch', event => {
  const url = event.request.url;

  // GAS API → always network; if offline return JSON error
  if (url.includes('script.google.com')) {
    event.respondWith(
      fetch(event.request).catch(() =>
        new Response(
          JSON.stringify({ ok: false, error: 'أنت offline — تأكد من الإنترنت' }),
          { status: 503, headers: { 'Content-Type': 'application/json' } }
        )
      )
    );
    return;
  }

  // Static assets → cache-first, then network (stale-while-revalidate style)
  event.respondWith(
    caches.match(event.request).then(cached => {
      const networkFetch = fetch(event.request).then(response => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      });
      return cached || networkFetch;
    }).catch(() => caches.match('./index.html'))
  );
});
