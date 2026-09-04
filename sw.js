const CACHE = 'task-city-github-v2';
const PATCH_SCRIPT = './fix-v08.js';
const CORE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './assets/hh.png',
  './assets/hl.png',
  './assets/lh.png',
  './assets/ll.png',
  PATCH_SCRIPT
];

async function injectPatch(response) {
  const text = await response.text();
  const injected = text.includes('fix-v08.js')
    ? text
    : text.replace('</body>', `<script src="${PATCH_SCRIPT}"></script></body>`);
  const headers = new Headers(response.headers);
  headers.set('content-type', 'text/html; charset=utf-8');
  headers.delete('content-length');
  return new Response(injected, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(CORE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const response = await fetch(event.request, { cache: 'no-store' });
        const copy = response.clone();
        caches.open(CACHE).then(cache => cache.put('./index.html', copy));
        return injectPatch(response);
      } catch (e) {
        const cached = await caches.match('./index.html');
        if (cached) return injectPatch(cached);
        throw e;
      }
    })());
    return;
  }

  // Network first so uploaded fixes are picked up; cache remains the offline fallback.
  event.respondWith(
    fetch(event.request)
      .then(response => {
        if (response && response.ok) {
          const copy = response.clone();
          caches.open(CACHE).then(cache => cache.put(event.request, copy));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
