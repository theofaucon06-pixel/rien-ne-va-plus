// Service worker: the heavy, rarely changing files (Three.js, textures, icons) are served from the cache
// first, so the second launch is instant; the game code itself is fetched from the network first and only
// falls back to the cache when offline, so a deploy is never mixed with stale scripts.
// Bump VERSION when a cache-first file changes under the same name (regenerated textures, new Three.js).
const VERSION = 'rnvp-v4-2026-09-21';
const CACHE_FIRST = /\/(vendor|assets)\//;
const isLocal = self.location.hostname === 'localhost' || self.location.hostname === '127.0.0.1';

self.addEventListener('install', (e) => { self.skipWaiting(); });
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  // Live room streams and authenticated responses must never enter the offline cache.
  if (new URL(req.url).pathname.startsWith('/api/')) return;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  if (CACHE_FIRST.test(req.url) && !isLocal) e.respondWith(cacheFirst(req));
  else e.respondWith(networkFirst(req));
});

async function cacheFirst(req) {
  const cache = await caches.open(VERSION);
  const hit = await cache.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok) cache.put(req, res.clone());
  return res;
}
async function networkFirst(req) {
  const cache = await caches.open(VERSION);
  try {
    const res = await fetch(req);
    if (res.ok) cache.put(req, res.clone());
    return res;
  } catch (err) {
    const hit = await cache.match(req, { ignoreSearch: true });
    if (hit) return hit;
    if (req.mode === 'navigate') { const shell = await cache.match('./index.html', { ignoreSearch: true }); if (shell) return shell; }
    throw err;
  }
}
