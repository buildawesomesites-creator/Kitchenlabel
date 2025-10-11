// ✅ Papadums POS — Service Worker (Offline + Auto Update)
const CACHE_NAME = "papadums-pos-v3";
const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
  "./index_function.online.js",
  "./firebase_config.js",
  "./products.json",
  "./kot_browser.html",
  "./invoice_browser.html"
];

// ✅ Install — pre-cache app shell
self.addEventListener("install", (event) => {
  console.log("📦 Installing service worker...");
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

// ✅ Activate — cleanup old caches
self.addEventListener("activate", (event) => {
  console.log("⚡ Activating service worker...");
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// ✅ Fetch — serve from cache first, then network
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  event.respondWith(
    caches.match(req).then((cached) => {
      const fetchPromise = fetch(req)
        .then((networkRes) => {
          if (!networkRes || networkRes.status !== 200) return networkRes;
          const clone = networkRes.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
          return networkRes;
        })
        .catch(() => cached); // fallback to cache if offline
      return cached || fetchPromise;
    })
  );
});

// ✅ Listen for SKIP_WAITING message (for auto-update)
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    console.log("🔄 Skip waiting triggered");
    self.skipWaiting();
  }
});
