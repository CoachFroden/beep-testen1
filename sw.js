const CACHE_NAME = "beeptest-v7";

const APP_SHELL = [
  "./",
  "./index.html",
  "./beepTest.css?v=7",
  "./beepTest.js?v=7",
  "./audioGuard.js?v=7",
  "./uiEnhancements.js?v=7",
  "./manifest.json",
  "./icon-180.png",
  "./icon-192.png",
  "./icon-512.png",
  "./beep.wav",
  "./startbeeptest.mp3",
  "./nedtelling.mp3",
  "./startbeeps.mp3",
  "./niva-1.mp3",
  "./niva-2.mp3",
  "./niva-3.mp3",
  "./niva-4.mp3",
  "./niva-5.mp3",
  "./niva-6.mp3",
  "./niva-7.mp3",
  "./niva-8.mp3",
  "./niva-9.mp3",
  "./niva-10.mp3",
  "./niva-11.mp3",
  "./niva-12.mp3",
  "./niva-13.mp3",
  "./niva-14.mp3",
  "./niva-15.mp3"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const request = event.request;

  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then(response => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put("./index.html", copy));
          return response;
        })
        .catch(() => caches.match("./index.html"))
    );
    return;
  }

  const isCodeAsset = /\.(?:js|css)$/.test(url.pathname);

  if (isCodeAsset) {
    event.respondWith(
      fetch(request)
        .then(response => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached;

      return fetch(request).then(response => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
        }
        return response;
      });
    })
  );
});