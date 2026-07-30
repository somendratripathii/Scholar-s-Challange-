/* =========================================================
   sw.js — offline support for GitHub Pages deployment

   Network-first: always tries to fetch the latest version
   first, and only falls back to the cached copy if the
   network is unavailable. This means edits you make to any
   file always show up on your next reload — the cache is a
   safety net for offline use, not the primary source.
   ========================================================= */
const CACHE_NAME = "scholars-challenge-v2";
const ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./css/styles.css",
  "./js/storage.js",
  "./js/particles.js",
  "./js/audio.js",
  "./js/questions.js",
  "./js/game.js",
  "./icons/icon.svg"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
   
