const CACHE_NAME = 'synthese-cache-v3';
const FILES_TO_CACHE = [
  '/index.html',
  '/style.css',
  '/app.js',
  '/Lactalis2023Logo.svg',
  '/manifest.json'
];

// Installation du Service Worker
self.addEventListener('install', event => {
  console.log('[SW] Installation...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(FILES_TO_CACHE))
      .then(() => self.skipWaiting())
  );
});

// Activation et suppression des anciens caches
self.addEventListener('activate', event => {
  console.log('[SW] Activation et nettoyage des anciennes versions...');
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)))
    )
  );
  self.clients.claim();
});

// Gestion des requêtes
self.addEventListener('fetch', event => {
  // Mode réseau d'abord : on essaye le réseau puis on retombe sur le cache
  event.respondWith(
    fetch(event.request)
      .then(response => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});

// Mise à jour automatique des clients (navigateur + PWA)
self.addEventListener('message', event => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }
});
