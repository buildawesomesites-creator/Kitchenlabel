self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open('kitchen-v1').then((cache) => {
      return cache.addAll([
        './',
        './index.html',
        './manifest.json',
        './icon-512.png',
        './icon-192.png'
      ]);
    })
  );
});

self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((response) => response || fetch(e.request))
  );
});
