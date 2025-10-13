// ===============================
// SERVICE WORKER - SYNTHÈSE LACTALIS
// ===============================

const CACHE_NAME = "synthese-lactalis-v23";
const FILES_TO_CACHE = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./manifest.json"
];

// INSTALLATION DU SERVICE WORKER
self.addEventListener("install", (event) => {
  console.log("🧩 Installation du Service Worker...");
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("✅ Fichiers mis en cache");
      return cache.addAll(FILES_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// ACTIVATION ET NETTOYAGE DES ANCIENNES VERSIONS
self.addEventListener("activate", (event) => {
  console.log("⚙️ Activation du nouveau Service Worker");
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log("🧹 Suppression de l'ancien cache :", key);
            return caches.delete(key);
          }
        })
      )
    )
  );
  self.clients.claim();
});

// INTERCEPTION DES REQUÊTES
self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // ✅ Renvoie la ressource depuis le cache si dispo
      if (cachedResponse) {
        return cachedResponse;
      }
      // 🔄 Sinon, récupère en ligne et met à jour le cache
      return fetch(event.request)
        .then((response) => {
          if (!response || response.status !== 200 || response.type !== "basic") {
            return response;
          }
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
          return response;
        })
        .catch(() => caches.match("./index.html"));
    })
  );
});
