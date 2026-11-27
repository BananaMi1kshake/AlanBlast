const prefix = `alanblox:${self.registration.scope}:shell-`;
const cacheName = `${prefix}2`;
const shell = [
  "./index.html",
  "./styles.css",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/apple-touch-icon.png",
  "./js/main.js",
  "./js/game.js",
  "./js/scoring.js",
  "./js/themes.js",
  "./js/input.js",
  "./js/view.js",
  "./js/storage.js",
];
const shellUrls = new Set(shell.map(path => new URL(path, self.registration.scope).href));
const home = self.registration.scope;
const index = new URL("./index.html", home).href;

self.addEventListener("install", event => {
  event.waitUntil(caches.open(cacheName).then(cache =>
    cache.addAll(shell.map(path => new Request(new URL(path, home), { cache: "reload" })))
  ));
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter(name => name.startsWith(prefix) && name !== cacheName)
      .map(name => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", event => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (request.mode === "navigate") {
    url.search = "";
    if (url.href === home || url.href === index) {
      event.respondWith(caches.open(cacheName).then(cache => cache.match(index))
        .then(response => response ?? fetch(request)));
    }
  } else if (shellUrls.has(url.href)) {
    event.respondWith(caches.open(cacheName).then(cache => cache.match(request))
      .then(response => response ?? fetch(request)));
  }
});
