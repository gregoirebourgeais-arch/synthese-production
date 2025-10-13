const CACHE_NAME = "synthese-production-v19";
const ASSETS = [
  "index.html",
  "style.css",
  "app.js",
  "manifest.json",
  "Lactalis2023Logo.svg",
  "icons/icon-192.png",
  "icons/icon-512.png"
];

// Installation du service worker
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  console.log("✅ Service Worker installé !");
});

// Activation (nettoyage anciens caches)
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys => 
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  console.log("🧹 Service Worker activé !");
});

// Interception des requêtes réseau
self.addEventListener("fetch", event => {
  event.respondWith(
    caches.match(event.request).then(resp => 
      resp || fetch(event.request).catch(() => caches.match("index.html"))
    )
  );
});
