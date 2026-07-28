// New Project — Service Worker (playbook §16)
// Bump CACHE_VERSION on every SW behavior change.
const CACHE_VERSION = 'sw-v2.10-tpp-logo-ink';
const STATIC_CACHE = `static-${CACHE_VERSION}`;

// Pre-cache only offline shell + tiny static assets (never HTML routes like / or /shop)
const STATIC_ASSETS = [
  '/offline',
  '/logo.png',
  '/manifest.json',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(STATIC_ASSETS).catch(() => undefined))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== STATIC_CACHE)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET') return;
  if (!url.protocol.startsWith('http')) return;

  // Network-only: HTML / navigations / Next data
  if (
    request.mode === 'navigate' ||
    request.headers.get('accept')?.includes('text/html') ||
    url.pathname.startsWith('/_next/data')
  ) {
    event.respondWith(
      fetch(request).catch(() => caches.match('/offline'))
    );
    return;
  }

  // Network-only: storage / uploads / API mutating surfaces
  if (
    url.pathname.startsWith('/storage/') ||
    url.pathname.startsWith('/uploads/') ||
    url.pathname.startsWith('/rest/') ||
    url.pathname.startsWith('/auth/v1') ||
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/admin')
  ) {
    return;
  }

  // Cache-first for hashed static assets (never cache HTML as JS/CSS)
  if (
    url.pathname.startsWith('/_next/static') ||
    url.pathname.match(/\.(js|css|woff2?|ttf|eot)$/) ||
    url.hostname === 'fonts.googleapis.com' ||
    url.hostname === 'fonts.gstatic.com' ||
    url.hostname === 'cdn.jsdelivr.net'
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          const ct = response.headers.get('content-type') || '';
          if (response.ok && !ct.includes('text/html')) {
            const clone = response.clone();
            caches.open(STATIC_CACHE).then((cache) => cache.put(request, clone));
          }
          return response;
        });
      })
    );
  }
});
