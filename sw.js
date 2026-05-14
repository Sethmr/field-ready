// FieldReady service worker — offline support.
//
// Strategy:
//   - On install, pre-cache the critical app shell (HTML, JSX, JSON, icon).
//   - On fetch, cache-first for everything except /api/* (which we let fail
//     when offline — fire-and-forget sync that doesn't retry is the design).
//   - CDN deps (React, Babel, ts-fsrs, Google Fonts) get cached on first
//     successful fetch so subsequent loads work offline.
//   - Images (~158 MB total) are NOT pre-cached. They land in the cache as
//     the user encounters them. After a week of regular use, almost everything
//     is in cache.
//   - Bump CACHE_VERSION when you ship a change you want to force-refresh.

const CACHE_VERSION = "fr-v2";
const APP_CACHE = `${CACHE_VERSION}-app`;
const ASSET_CACHE = `${CACHE_VERSION}-assets`;

const PRECACHE_URLS = [
  "./",
  "./index.html",
  "./cards-data.js",
  "./state.jsx",
  "./views.jsx",
  "./app.jsx",
  "./stamps.jsx",
  "./manifest.json",
  "./icon.svg",
];

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(APP_CACHE);
    // Don't fail the whole install if one URL is unreachable — try each.
    await Promise.allSettled(
      PRECACHE_URLS.map(url => cache.add(url).catch(() => null))
    );
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter(k => !k.startsWith(CACHE_VERSION))
        .map(k => caches.delete(k))
    );
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;                 // never cache POST/etc.

  const url = new URL(req.url);

  // /api/* — never cache, never fall back. Sync is fire-and-forget by design.
  if (url.pathname.startsWith("/api/")) return;

  // Decide which cache (app shell vs general assets) the response belongs in.
  const isSameOrigin = url.origin === location.origin;
  const isCDN = (
    url.host === "unpkg.com" ||
    url.host === "esm.sh" ||
    url.host === "fonts.googleapis.com" ||
    url.host === "fonts.gstatic.com"
  );
  if (!isSameOrigin && !isCDN) return;              // let unknown origins through

  const cacheName = isSameOrigin && PRECACHE_URLS.some(p => url.pathname.endsWith(p.replace(/^\.\//, "/")) || url.pathname === "/")
    ? APP_CACHE
    : ASSET_CACHE;

  event.respondWith((async () => {
    // 1. Try cache.
    const cached = await caches.match(req);
    if (cached) return cached;

    // 2. Fetch from network, opportunistically cache.
    try {
      const fresh = await fetch(req);
      // Only cache successful or opaque responses. opaque = no-cors, can't read
      // status — usually fine for CDN assets the browser handles.
      if (fresh && (fresh.ok || fresh.type === "opaque")) {
        const clone = fresh.clone();
        caches.open(cacheName).then(cache => cache.put(req, clone)).catch(() => {});
      }
      return fresh;
    } catch (err) {
      // 3. Offline + not in cache. For the navigation request, fall back to
      //    the precached index. For everything else, surface the failure.
      if (req.mode === "navigate") {
        const indexCached = await caches.match("./index.html");
        if (indexCached) return indexCached;
      }
      throw err;
    }
  })());
});
