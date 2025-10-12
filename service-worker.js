const CACHE_NAME = "synthese-cache-v3";
const APP_SHELL = [
  "index.html",
  "style.css",
  "app.js",
  "manifest.json",
  "Lactalis2023Logo.svg",
  "icons/icon-192.png",
  "icons/icon-512.png"
];

// Installation : mise en cache initiale
self.addEventListener("install", (event) => {
  console.log("Service Worker: installation en cours...");
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

// Activation : suppression anciens caches
self.addEventListener("activate", (event) => {
  console.log("Service Worker: activation et nettoyage...");
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((key) => key !== CACHE_NAME && caches.delete(key)))
    )
  );
  self.clients.claim();
});

// Fetch : d’abord le réseau, sinon le cache
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});

// Mise à jour automatique quand un nouveau SW est publié
self.addEventListener("message", (event) => {
  if (event.data === "skipWaiting") {
    self.skipWaiting();
  }
});
