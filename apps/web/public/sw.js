// Service worker for the installed (PWA) web app.
//
// It only makes the app shell installable and resilient to a flaky network:
// navigations are network-first with the cached shell as the offline fallback,
// and hashed build assets are cache-first because their names change with
// their content. Everything the backend owns (/api, /rpc, screen streams,
// health) is never intercepted, so auth and realtime keep their exact
// browser semantics.

const CACHE = "hive-shell-v1";
const SHELL = "/";
const PASSTHROUGH_PREFIXES = ["/api/", "/rpc/", "/novnc/", "/health", "/.well-known/", "/sw.js"];

/** "navigation" | "asset" | null (null = let the browser handle it). */
function strategyFor(request) {
  if (request.method !== "GET") return null;
  let url;
  try {
    url = new URL(request.url);
  } catch {
    return null;
  }
  if (url.origin !== self.location.origin) return null;
  if (PASSTHROUGH_PREFIXES.some((prefix) => url.pathname.startsWith(prefix))) return null;
  if (request.mode === "navigate") return "navigation";
  if (url.pathname.startsWith("/assets/")) return "asset";
  return null;
}

function cacheable(response) {
  return Boolean(response?.ok);
}

async function networkFirstShell(request) {
  const cache = await caches.open(CACHE);
  try {
    const response = await fetch(request);
    // Every app route serves the same document, so one shell entry is enough.
    if (cacheable(response)) await cache.put(SHELL, response.clone());
    return response;
  } catch (error) {
    const cached = await cache.match(SHELL);
    if (cached) return cached;
    throw error;
  }
}

async function cacheFirstAsset(request) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (cacheable(response)) await cache.put(request, response.clone());
  return response;
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.add(SHELL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const strategy = strategyFor(event.request);
  if (strategy === "navigation") {
    event.respondWith(networkFirstShell(event.request));
  } else if (strategy === "asset") {
    event.respondWith(cacheFirstAsset(event.request));
  }
});
