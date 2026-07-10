/**
 * SmartCheque service worker.
 *
 * Strategy:
 *   - Install: pre-cache the app shell (offline landing).
 *   - Fetch:
 *     - /api/* → network-first, fall back to last cached copy.
 *     - Same-origin static assets (HTML/JS/CSS/SVG/PNG) → cache-first.
 *     - Cross-origin → network-first, no cache.
 *
 * Versioning: bump CACHE_VERSION to invalidate the cache on deploys.
 */
const CACHE_VERSION = 'smartcheque-v1';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const API_CACHE = `${CACHE_VERSION}-api`;

const APP_SHELL = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.svg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => !k.startsWith(CACHE_VERSION))
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // API requests → network-first, fall back to cache.
  if (url.pathname.startsWith('/api/') || url.hostname === 'localhost:8000') {
    event.respondWith(networkFirst(request, API_CACHE));
    return;
  }

  // Same-origin static → cache-first.
  if (url.origin === self.location.origin) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  // Cross-origin (e.g. MinIO presigned URLs) → passthrough, never cache.
  // (Browsers will handle presigned URLs with their own query strings.)
});

async function networkFirst(request, cacheName) {
  try {
    const fresh = await fetch(request);
    if (fresh && fresh.status === 200) {
      const cache = await caches.open(cacheName);
      cache.put(request, fresh.clone()).catch(() => {});
    }
    return fresh;
  } catch (err) {
    const cached = await caches.match(request);
    if (cached) return cached;
    throw err;
  }
}

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const fresh = await fetch(request);
    if (fresh && fresh.status === 200) {
      const cache = await caches.open(cacheName);
      cache.put(request, fresh.clone()).catch(() => {});
    }
    return fresh;
  } catch (err) {
    // Last-ditch: serve the cached app shell for navigations.
    if (request.mode === 'navigate') {
      const shell = await caches.match('/index.html');
      if (shell) return shell;
    }
    throw err;
  }
}