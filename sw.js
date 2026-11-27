const prefix = `alanblox:${self.registration.scope}:shell-`;
const cacheName = `${prefix}15`;
const shell = [
  "./index.html",
  "./play.html",
  "./adventure.html",
  "./progress.html",
  "./daily.html",
  "./js/challenges.js",
  "./js/daily-view.js",
  "./challenges/daily-v1.json",
  "./challenges/tutorial.json",
  "./js/profile.js",
  "./js/progress-view.js",
  "./modes.css",
  "./design.css",
  "./gameplay.css",
  "./settings.css",
  "./viewport.css",
  "./js/pager.js",
  "./js/play-viewport.js",
  "./home.css",
  "./launch.css",
  "./js/branding-assets.js",
  "./assets/branding/runtime/studio-logo.webp",
  "./assets/branding/runtime/game-logo.webp",
  "./assets/branding/runtime/splash-background.webp",
  "./js/startup.js",
  "./adventure/levels.json",
  "./js/menu.js",
  "./js/world-select.js",
  "./js/world-art.js",
  "./js/pwa.js",
  "./js/campaign.js",
  "./js/adventure.js",
  "./js/adventure-storage.js",
  "./js/adventure-view.js",
  "./styles.css",
  "./themes.css",
  "./materials.css",
  "./interface.css",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/favicon.png",
  "./icons/icon-maskable-192.png",
  "./icons/icon-maskable-512.png",
  "./js/install.js",
  "./js/backup.js",
  "./js/save-controls.js",
  "./js/play-access.js",
  "./js/save-buffer.js",
  "./icons/icon-512.png",
  "./icons/apple-touch-icon.png",
  "./js/main.js",
  "./js/classic.js",
  "./js/sandbox.js",
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
  "./js/generator.js",
  "./js/hand-request.js",
  "./js/hand-worker.js",
  "./js/scoring.js",
  "./js/themes.js",
  "./js/material-library.js",
  "./js/material-rotation.js",
  "./js/material-picker.js",
  "./js/input.js",
  "./js/drag-geometry.js",
  "./js/view.js",
  "./js/preview-state.js",
  "./js/storage.js",
  "./js/settings.js",
];
const textures = [
  "./assets/materials/yarn.svg",
  "./assets/materials/wood.svg",
  "./assets/materials/ice.svg",
  "./assets/materials/wafer.svg",
  "./assets/materials/paper.svg",
  "./assets/materials/denim.svg",
  "./assets/materials/metal.svg",
  "./assets/materials/marble.svg",
  "./assets/materials/stained-glass.svg",
  "./assets/materials/plush.svg",
  "./assets/materials/sand.svg",
  "./assets/materials/terrazzo.svg",
  "./assets/materials/circuit.svg",
  "./assets/materials/brick.svg",
  "./assets/materials/clay.svg",
  "./assets/materials/honeycomb.svg",
  "./assets/materials/galaxy.svg",
  "./assets/materials/wicker.svg",
  "./assets/materials/glitter.svg",
];
const shellUrls = new Set([...shell, ...textures].map(path => new URL(path, self.registration.scope).href));
const home = self.registration.scope;
const index = new URL("./index.html", home).href;
const pages = new Set([index, new URL("./play.html", home).href, new URL("./adventure.html", home).href, new URL("./progress.html", home).href, new URL("./daily.html", home).href]);
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
    await cache.addAll([...shell, ...textures].map(path => new Request(new URL(path, home), { cache: "reload" })));
    await cacheCustomSounds(cache);
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
    if (url.href === home || pages.has(url.href)) {
      event.respondWith(caches.open(cacheName).then(cache => cache.match(url.href === home ? index : url.href))
        .then(response => response ?? fetch(request)));
    }
  } else if (shellUrls.has(url.href) || url.href.startsWith(audioDirectory)) {
    event.respondWith(caches.open(cacheName).then(cache => cache.match(request))
      .then(response => response ?? fetch(request)));
  }
});
