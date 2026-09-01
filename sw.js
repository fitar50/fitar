// ================================================================
// SERVICE WORKER — فطار الشغل
// Strategy:
//   Static assets  → cache-first (serve instantly, update in bg)
//   GAS API calls  → network-only with timeout (need live data)
// ================================================================

const CACHE_NAME = 'fattar-v4'; // bumped from v3: fixed offline-error format bug

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

  // GAS API → network-only with 15 s timeout; if offline/timeout → JSON error
  if (url.includes('script.google.com')) {
    event.respondWith(
      (() => {
        const controller = new AbortController();
        const timeoutId  = setTimeout(() => controller.abort(), 15000);
        return fetch(event.request, { signal: controller.signal })
          .then(r => { clearTimeout(timeoutId); return r; })
          .catch(() => {
            clearTimeout(timeoutId);
            return new Response(
              JSON.stringify({ success: false, error: 'أنت offline — تأكد من الإنترنت' }),
              { status: 503, headers: { 'Content-Type': 'application/json' } }
            );
          });
      })()
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