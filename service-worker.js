const CACHE_VERSION = "bagrescore-v0.19.0";
const PRECACHE_URLS = [
  "./",
  "./index.html",
  "./style.css?v=0.19.0",
  "./app.js?v=0.19.0",
  "./manifest.json?v=0.19.0",
  "./assets/icons/icon-192.png?v=0.19.0",
  "./assets/icons/icon-512.png?v=0.19.0",
  "./assets/icons/icon-maskable-512.png?v=0.19.0",
  "./assets/icons/apple-touch-icon.png?v=0.19.0",
  "./assets/icons/bagrescore-logo.png",
  "./assets/icons/bagrescore-logo-header.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames
            .filter((cacheName) => cacheName !== CACHE_VERSION)
            .map((cacheName) => caches.delete(cacheName))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;

  if (request.method !== "GET") {
    return;
  }

  const requestUrl = new URL(request.url);

  if (requestUrl.origin !== self.location.origin) {
    return;
  }

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(request)
        .then((networkResponse) => {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(request, responseClone));
          return networkResponse;
        })
        .catch(() => caches.match("./index.html"));
    })
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
