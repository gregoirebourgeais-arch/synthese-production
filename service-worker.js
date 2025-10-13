// Nom du cache
const CACHE_NAME = "synthese-lactalis-v21";
const urlsToCache = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];

// Installation du service worker et mise en cache initiale
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("Mise en cache initiale des fichiers...");
      return cache.addAll(urlsToCache);
    })
  );
  self.skipWaiting();
});

// Activation et suppression des anciens caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log("Suppression de l'ancien cache :", cache);
            return caches.delete(cache);
          }
        })
      )
    )
  );
  self.clients.claim();
});

// Interception des requêtes réseau
self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      // Fichier déjà en cache → on l'utilise
      if (response) return response;

      // Sinon on essaie de le récupérer en ligne et on le met en cache
      return fetch(event.request)
        .then((fetchResponse) => {
          if (!fetchResponse || fetchResponse.status !== 200 || fetchResponse.type !== "basic") {
            return fetchResponse;
          }
          const responseToCache = fetchResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
          return fetchResponse;
        })
        .catch(() => {
          // Si offline et fichier non trouvé → retourne la page principale
          return caches.match("./index.html");
        });
    })
  );
});
