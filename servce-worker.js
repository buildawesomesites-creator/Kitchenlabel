const CACHE_NAME = "papadums-blue-layout7-v1.0.4";
const APP_SHELL = [
  "./",
  "index.html",
  "index_function.js",
  "products.json",
  "manifest.json",
  "icon-192.png",
  "icon-512.png",
  "invoice.html",
  "kot_browser.html",
  "service-worker.js"
];

// ✅ Install: cache app shell
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

// ✅ Activate: clear old caches
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ✅ Fetch: network-first for HTML, cache-first for assets
self.addEventListener("fetch", event => {
  const req = event.request;
  const url = new URL(req.url);

  if (req.method !== "GET") return;

  // Network-first for HTML pages
  if (req.headers.get("accept")?.includes("text/html")) {
    event.respondWith(
      fetch(req)
        .then(resp => {
          const clone = resp.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(req, clone));
          return resp;
        })
        .catch(() => caches.match(req).then(r => r || caches.match("./")))
    );
    return;
  }

  // Cache-first for everything else (JS, CSS, images, JSON)
  event.respondWith(
    caches.match(req).then(
      cached =>
        cached ||
        fetch(req).then(resp => {
          const clone = resp.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(req, clone));
          return resp;
        })
    )
  );
});

// ✅ Handle skipWaiting (when new version installed)
self.addEventListener("message", event => {
  if (event.data && event.data.action === "skipWaiting") {
    self.skipWaiting();
  }
});
