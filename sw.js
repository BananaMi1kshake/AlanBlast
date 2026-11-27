const prefix = `alanblox:${self.registration.scope}:shell-`;
const cacheName = `${prefix}8`;
const shell = [
  "./index.html",
  "./styles.css",
  "./themes.css",
  "./materials.css",
  "./interface.css",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/apple-touch-icon.png",
  "./js/main.js",
  "./js/audio.js",
  "./js/sound-bank.js",
  "./js/feedback.js",
  "./js/haptics.js",
  "./audio/sounds.json",
  "./js/motion.js",
  "./js/effects.js",
  "./js/game.js",
  "./js/geometry.js",
  "./js/pieces.js",
  "./js/solver.js",
  "./js/hand-request.js",
  "./js/hand-worker.js",
  "./js/scoring.js",
  "./js/themes.js",
  "./js/input.js",
  "./js/view.js",
  "./js/storage.js",
  "./js/settings.js",
];
const textures = [
  "./assets/materials/yarn.svg",
  "./assets/materials/wood.svg",
  "./assets/materials/ice.svg",
  "./assets/materials/wafer.svg",
];
const shellUrls = new Set([...shell, ...textures].map(path => new URL(path, self.registration.scope).href));
const home = self.registration.scope;
const index = new URL("./index.html", home).href;
const audioDirectory = new URL("./audio/", home).href;

async function cacheCustomSounds(cache) {
  try {
    const manifest = await cache.match(new URL("sounds.json", audioDirectory));
    const data = await manifest.json();
    const variants = Object.values(data.materials ?? {});
    const files = new Set([data, ...variants].flatMap(set => Object.values(set)).flat());
    await Promise.all([...files].map(async file => {
      if (typeof file !== "string" || !file || file.startsWith("/") || file.includes("..") || !/^[\w./ -]+$/.test(file)) return;
      const request = new Request(new URL(file, audioDirectory), { cache: "reload", mode: "same-origin", redirect: "error" });
      try {
        const response = await fetch(request);
        if (response.ok) await cache.put(request, response);
      } catch {
        // Custom sounds are optional. A missing file leaves the app installable.
      }
    }));
  } catch {
    // An invalid manifest leaves every event on its procedural default.
  }
}

self.addEventListener("install", event => {
  event.waitUntil((async () => {
    const cache = await caches.open(cacheName);
    await cache.addAll(shell.map(path => new Request(new URL(path, home), { cache: "reload" })));
    await Promise.all([
      cacheCustomSounds(cache),
      ...textures.map(path => cache.add(new Request(new URL(path, home), { cache: "reload" })).catch(() => {
        // The CSS surface remains visible if an optional overlay is missing.
      })),
    ]);
  })());
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
  } else if (shellUrls.has(url.href) || url.href.startsWith(audioDirectory)) {
    event.respondWith(caches.open(cacheName).then(cache => cache.match(request))
      .then(response => response ?? fetch(request)));
  }
});
