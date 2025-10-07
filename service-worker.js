self.addEventListener('install', event => {
  event.waitUntil(
    caches.open('kitchenlabel-v1').then(cache => {
      return cache.addAll([
        './',
        './index.html',
        './manifest.json',
        './products.json'
      ]);
    })
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => response || fetch(event.request))
  );
});
