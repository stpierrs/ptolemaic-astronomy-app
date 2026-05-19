// Service worker — cache-first strategy for the Ptolemaic Astronomy & Astrology.
//
// Strategy
//   assets/    — cache-first  (textures, vendor libs, geojson never change mid-session)
//   JS / CSS   — stale-while-revalidate (returns cached copy, fetches in background)
//   HTML       — network-first with cached fallback (always picks up fresh deploys)
//
// Bump CACHE_ASSETS / CACHE_CODE version strings when you ship breaking asset changes.

const CACHE_VERSION = 'ptol-v10';
const CACHE_ASSETS  = 'ptol-assets-v3';
const CACHE_CODE    = 'ptol-code-v3';

// Critical-path files to pre-cache on install.
const PRECACHE = [
  './',
  './index.html',
  './css/styles.min.css',
  './js/main.js',
  './assets/vendor/three.module.min.js',
  './assets/ne_110m_land.geojson',
];

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_ASSETS).then((c) => c.addAll(PRECACHE).catch(() => {}))
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys.filter((k) => k !== CACHE_ASSETS && k !== CACHE_CODE)
          .map((k) => caches.delete(k))
    );
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  if (url.origin !== self.location.origin) return;

  // assets/ — cache-first
  if (url.pathname.includes('/assets/')) {
    e.respondWith(
      caches.match(e.request).then((hit) =>
        hit || fetch(e.request).then((res) => {
          const clone = res.clone();
          caches.open(CACHE_ASSETS).then((c) => c.put(e.request, clone));
          return res;
        })
      )
    );
    return;
  }

  // JS / CSS — stale-while-revalidate
  if (url.pathname.match(/\.(js|css)$/)) {
    e.respondWith(
      caches.open(CACHE_CODE).then(async (c) => {
        const hit = await c.match(e.request);
        const fetchPromise = fetch(e.request).then((res) => {
          c.put(e.request, res.clone());
          return res;
        });
        return hit || fetchPromise;
      })
    );
    return;
  }

  // HTML — network-first with cache fallback
  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request))
  );
});
