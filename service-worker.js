self.addEventListener('install', e => {
  e.waitUntil(
    caches.open('synthese-cache-v1').then(cache => {
      return cache.addAll([
        './',
        './index.html',
        './app.js',
        './style.css',
        './manifest.json',
        './icons/icon-192.png',
        './icons/icon-512.png'
      ]);
    })
  );
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(response => {
      return response || fetch(e.request);
    })
  );
});
