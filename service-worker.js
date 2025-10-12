const CACHE_NAME = "synthese-cache-v2"; // <== version modifiée à chaque mise à jour
const urlsToCache = [
  "index.html",
  "style.css",
  "app.js",
  "manifest.json",
  "Lactalis2023Logo.svg",
  "icons/icon-192.png",
  "icons/icon-512.png"
];

// Installation (mise en cache)
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
  );
  self.skipWaiting(); // force le nouveau SW à s’activer
});

// Activation (nettoyage ancien cache)
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(key => key !== CACHE_NAME && caches.delete(key)))
    )
  );
  self.clients.claim();
});

// Fetch (réponse réseau ou cache)
self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request).then(fetchRes => {
        return caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, fetchRes.clone());
          return fetchRes;
        });
      });
    })
  );
});
