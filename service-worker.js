// === Service Worker Synthèse Production Lactalis ===

const CACHE_NAME = "synthese-production-v32";
const urlsToCache = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];

// === Installation et mise en cache initiale ===
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("[ServiceWorker] Mise en cache des fichiers de l'application");
      return cache.addAll(urlsToCache);
    })
  );
  self.skipWaiting();
});

// === Activation : nettoyage des anciens caches ===
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME) {
            console.log("[ServiceWorker] Suppression ancien cache :", name);
            return caches.delete(name);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// === Stratégie de récupération ===
self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      // Si trouvé dans le cache, renvoie le cache
      if (response) {
        return response;
      }
      // Sinon, on fait une requête réseau
      return fetch(event.request).then((networkResponse) => {
        // Mise à jour du cache avec la nouvelle ressource
        return caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, networkResponse.clone());
          return networkResponse;
        });
      });
    }).catch(() => {
      // En cas d'échec réseau, renvoyer la page principale si possible
      return caches.match("./index.html");
    })
  );
});

// === Écoute de l'événement d'installation de la PWA ===
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
