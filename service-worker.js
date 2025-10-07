// Kitchenlabel Service Worker
const CACHE_NAME = 'kitchenlabel-v3.';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './products.json',
  './icon-192.png',
  './icon-512.png'
];

// ✅ Install event – cache essential files
self.addEventListener('install', event => {
  console.log('🟢 Installing service worker...');
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// ✅ Activate event – clear old caches
self.addEventListener('activate', event => {
  console.log('⚙️ Activating service worker...');
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// ✅ Fetch event – serve from cache first, then network
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return; // only cache GET requests
  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      if (cachedResponse) return cachedResponse;
      return fetch(event.request)
        .then(response => {
          // Cache a copy of fetched file
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseClone));
          return response;
        })
        .catch(() => caches.match('./index.html')); // fallback if offline
    })
  );
});
