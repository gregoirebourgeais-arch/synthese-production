self.addEventListener('install', e => {
  e.waitUntil(
    caches.open('synthese-cache-v1').then(cache => {
      return cache.addAll([
        '/index.html',
        '/style.css',
        '/app.js',
        '/Lactalis2023Logo.svg',
        '/manifest.json'
      ]);
    })
  );
  console.log('Service Worker installé');
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(response => response || fetch(e.request))
  );
});
