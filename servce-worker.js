const CACHE_NAME = "papadums-pos-v3-" + Date.now();

// ✅ All core files to cache for offline use
const ASSETS = [
  "./",
  "./index.html",
  "./index_function.js",
  "./products.json",
  "./invoice_browser.html",
  "./kot_browser.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
  "https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js",
  "https://www.gstatic.com/firebasejs/10.12.2/firebase-database-compat.js"
];

// ✅ Install event — cache essential assets
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// ✅ Activate event — clean old caches
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k.startsWith("papadums-pos-v3-") && k !== CACHE_NAME)
        .map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// ✅ Fetch strategy: Network-first for JSON/HTML, cache-first for static assets
self.addEventListener("fetch", event => {
  const req = event.request;
  const url = new URL(req.url);

  // ignore chrome-extension or devtools requests
  if (url.origin.includes("chrome-extension")) return;

  // JSON and HTML files — network first (update content)
  if (req.destination === "document" || req.url.endsWith(".json")) {
    event.respondWith(
      fetch(req)
        .then(res => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(req, clone));
          return res;
        })
        .catch(() => caches.match(req))
    );
    return;
  }

  // Static assets — cache first
  event.respondWith(
    caches.match(req).then(cached => cached || fetch(req).then(res => {
      const clone = res.clone();
      caches.open(CACHE_NAME).then(c => c.put(req, clone));
      return res;
    }))
  );
});

// ✅ Background sync (optional, placeholder)
self.addEventListener("sync", event => {
  if (event.tag === "sync-orders") {
    event.waitUntil(syncOfflineOrders());
  }
});

// Example stub for syncing offline data later
async function syncOfflineOrders() {
  console.log("🌀 Background sync triggered");
  // (You can integrate Firebase upload here if needed)
}