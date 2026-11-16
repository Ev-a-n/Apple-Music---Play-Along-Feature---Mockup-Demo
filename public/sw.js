// Keeps the app and the songs' clips and covers on the device after the first
// visit, so later opens are near-instant. Hashed build assets and Apple's media
// are served from the cache first; the page itself is fetched fresh when
// possible so a new deploy shows up straight away.
const CACHE = 'play-along-v1';
const MEDIA_HOSTS = /(itunes-assets|mzstatic\.com|itunes\.apple\.com)$/;

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  const own = url.origin === self.location.origin;
  if (own && url.pathname.includes('/assets/')) event.respondWith(cacheFirst(request));
  else if (!own && MEDIA_HOSTS.test(url.host)) event.respondWith(cacheFirst(request));
  else if (own) event.respondWith(networkFirst(request));
});

async function cacheFirst(request) {
  const cache = await caches.open(CACHE);
  const hit = await cache.match(request, { ignoreVary: true });
  if (hit) return hit;
  const reply = await fetch(request);
  if (reply.ok) cache.put(request, reply.clone()).catch(() => {});
  return reply;
}

async function networkFirst(request) {
  const cache = await caches.open(CACHE);
  try {
    const reply = await fetch(request);
    if (reply.ok) cache.put(request, reply.clone()).catch(() => {});
    return reply;
  } catch {
    const hit = await cache.match(request, { ignoreVary: true, ignoreSearch: true });
    if (hit) return hit;
    throw new Error('offline');
  }
}
