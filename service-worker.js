const CACHE_NAME = "papsdumskitchen-v2";
const FILES_TO_CACHE = [
  "./",
  "./index.html",
  "./print.html",
  "./manifest.json",
  "./products.json",
  "./icon-192.png",
  "./icon-512.png"
];

// Install event – cache all files
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(FILES_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Activate event – cleanup old caches
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      );
    })
  );
  self.clients.claim();
});

// Fetch event – serve from cache first, then network fallback
self.addEventListener("fetch", event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return (
        response ||
        fetch(event.request).catch(() =>
          caches.match("./index.html")
        )
      );
    })
  );
});
