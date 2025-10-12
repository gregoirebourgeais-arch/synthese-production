const CACHE_NAME="synthese-cache-v4";
const FILES=[
  "index.html","style.css","app.js","manifest.json",
  "Lactalis2023Logo.svg","icons/icon-192.png","icons/icon-512.png"
];

self.addEventListener("install",e=>{
  e.waitUntil(caches.open(CACHE_NAME).then(c=>c.addAll(FILES)));
  self.skipWaiting();
});

self.addEventListener("activate",e=>{
  e.waitUntil(caches.keys().then(keys=>Promise.all(keys.map(k=>k!==CACHE_NAME&&caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener("fetch",e=>{
  if(e.request.method!=="GET")return;
  e.respondWith(fetch(e.request).then(r=>{
    const clone=r.clone();
    caches.open(CACHE_NAME).then(c=>c.put(e.request,clone));
    return r;
  }).catch(()=>caches.match(e.request)));
});
