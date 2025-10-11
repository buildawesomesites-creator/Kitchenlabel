// ✅ Papadums POS Service Worker
const SW_VERSION = "Kitchen.POS.V.9";
const CACHE_NAME = "papadums-blue-layout7-v8";
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
  event.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(APP_SHELL)));
  self.skipWaiting();
});

// ✅ Activate
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ✅ Fetch
self.addEventListener("fetch", event => {
  const req = event.request;
  if (req.method !== "GET") return;

  if (req.headers.get("accept")?.includes("text/html")) {
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

// ✅ Message handler (skipWaiting + version request)
self.addEventListener("message", event => {
  if (event.data && event.data.action === "skipWaiting") {
    self.skipWaiting();
  } else if (event.data === "getVersion") {
    event.source.postMessage({ version: SW_VERSION });
  }
});