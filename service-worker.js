const CACHE_NAME = "synthese-atlier-v1";
const ASSETS = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];

// Installation du Service Worker
self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("Mise en cache initiale");
      return cache.addAll(ASSETS);
    })
  );
});

// Activation et nettoyage du cache
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((k) => (k === CACHE_NAME ? null : caches.delete(k))))
    )
  );
});

// Interception des requêtes
self.addEventListener("fetch", (e) => {
  e.respondWith(
    caches.match(e.request).then(
      (response) =>
        response ||
        fetch(e.request).then((resp) => {
          const clone = resp.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(e.request, clone));
          return resp;
        })
    )
  );
});
