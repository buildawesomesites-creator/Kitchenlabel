self.addEventListener('install', e => {
  e.waitUntil(
    caches.open('kitchen-cache').then(cache => {
      return cache.addAll([
        './index.html',
        './manifest.json',
        './products.json',
        './icon-192.png',
        './icon-512.png'
      ]);
    })
  );
});
self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(response => response || fetch(e.request))
  );
});
