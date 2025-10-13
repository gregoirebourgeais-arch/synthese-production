// ==================================
// 🧠 SERVICE WORKER — V27 STABILISÉE
// ==================================

const CACHE_NAME = "synthese-production-v27";
const ASSETS = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];

// 📦 INSTALLATION — mise en cache initiale
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("📥 Mise en cache initiale...");
      return cache.addAll(ASSETS);
    })
  );
});

// ♻️ ACTIVATION — suppression des anciens caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  console.log("✅ Service Worker actif — V27 !");
});

// 🌐 FETCH — lecture depuis le cache (offline)
self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return (
        response ||
        fetch(event.request).then((resp) => {
          const clone = resp.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          return resp;
        })
      );
    })
  );
});
