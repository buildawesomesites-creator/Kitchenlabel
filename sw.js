// ✅ Papadums POS Service Worker
const SW_VERSION = "Kitchen.POS.V.1";
const CACHE_NAME = "papadums-blue-layout7-v11";

const APP_SHELL = [
  "./",
  "index.html",
  "index_function.online.js",
  "products.json",
  "manifest.json",
  "icon-192.png",
  "icon-512.png",
  "invoice.html",
  "kot_browser.html",
  "sw.js"
];

// ✅ Install
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

// ✅ Activate
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// ✅ Fetch handler
self.addEventListener("fetch", event => {
  const req = event.request;
  if (req.method !== "GET") return;

  if (req.headers.get("accept")?.includes("text/html")) {
    // Try network first, fallback to cache
    event.respondWith(
      fetch(req)
        .then(resp => {
          const clone = resp.clone();
          caches.open(CACHE_NAME).then(c => c.put(req, clone));
          return resp;
        })
        .catch(() => caches.match(req).then(r => r || caches.match("./")))
    );
  } else {
    // Try cache first, fallback to network
    event.respondWith(
      caches.match(req).then(
        cached =>
          cached ||
          fetch(req).then(resp => {
            const clone = resp.clone();
            caches.open(CACHE_NAME).then(c => c.put(req, clone));
            return resp;
          })
      )
    );
  }
});

// ✅ Message handler
self.addEventListener("message", event => {
  if (event.data === "getVersion") {
    event.source.postMessage({ version: SW_VERSION });
  } else if (event.data?.action === "skipWaiting") {
    self.skipWaiting();
  } else if (event.data === "clearAllCaches") {
    // Optional — clean caches via UI message
    caches.keys().then(keys => keys.forEach(k => caches.delete(k)));
  }
});
