import { BRANDING } from "./branding-assets.js";

export const STARTUP_KEY = "alanblox.startup.v1";
export const LAUNCH_TIMING = Object.freeze({ studio: 360, game: 500, limit: 1350 });

export function canPresentStartup({ reduced, hidden, visited, internalNavigation }) {
  return !reduced && !hidden && !visited && !internalNavigation;
}

export function applyBranding(root, assets = BRANDING) {
  for (const [type, source] of [["studio", assets.studioLogo], ["game", assets.gameLogo]]) {
    if (!source) continue;
    for (const target of root.querySelectorAll(`[data-brand-art="${type}"]`)) {
      const image = document.createElement("img");
      image.alt = type === "studio" ? "Alan Studio" : "AlanBlox";
      image.decoding = "async";
      image.addEventListener("load", () => target.replaceChildren(image), { once: true });
      image.src = source;
    }
  }
  if (assets.splashBackground) {
    root.style.setProperty("--brand-backdrop", `url("${assets.splashBackground}")`);
  }
}

export async function presentStartup(ready, { assets = BRANDING, timing = LAUNCH_TIMING } = {}) {
  const root = document.documentElement;
  const launch = document.querySelector("#launch");
  const content = document.querySelector("#menu-content");
  const motion = matchMedia("(prefers-reduced-motion: reduce)");
  let visited = false;
  try {
    visited = sessionStorage.getItem(STARTUP_KEY) === "1";
    sessionStorage.setItem(STARTUP_KEY, "1");
  } catch { /* Same-origin navigation also suppresses repeat presentations. */ }
  const internalNavigation = document.referrer &&
    new URL(document.referrer).origin === location.origin &&
    new URL(document.referrer).pathname.startsWith(new URL("./", location.href).pathname);
  if (!canPresentStartup({ reduced: motion.matches || root.hasAttribute("data-reduced-motion"),
    hidden: document.hidden, visited, internalNavigation })) return;
  const studioArtwork = assets.studioLogo ? document.querySelector('[data-brand-art="studio"]') : null;
  const started = performance.now();
  const cancellable = new AbortController();
  const signal = cancellable.signal;
  let complete = false;
  let timeouts = [];
  const wait = delay => new Promise(resolve => {
    if (signal.aborted) { resolve(); return; }
    const timer = setTimeout(resolve, Math.max(0, delay));
    timeouts.push(timer);
    signal.addEventListener("abort", () => { clearTimeout(timer); resolve(); }, { once: true });
  });
  const abort = () => cancellable.abort();
  addEventListener("keydown", abort, { once: true, signal });
  document.addEventListener("visibilitychange", () => { if (document.hidden) abort(); }, { signal });
  motion.addEventListener("change", () => { if (motion.matches) abort(); }, { signal });
  launch.addEventListener("click", abort, { once: true, signal });

  const ok = Promise.resolve(ready).catch(() => {}).then(() => {
    complete = true;
    launch.removeAttribute("data-loading");
  });

  launch.style.setProperty("--studio-time", `${timing.studio}ms`);
  root.setAttribute("data-launching", "");
  content.inert = true;
  launch.hidden = false;
  try {
    if (studioArtwork) {
      launch.dataset.stage = "studio";
      await wait(timing.studio);
    }
    if (signal.aborted) return;
    launch.dataset.stage = "game";
    const fade = Math.min(140, timing.game);
    await wait(timing.game - fade);
    if (complete && !signal.aborted) launch.setAttribute("data-leaving", "");
    await wait(fade);
    if (!complete && !signal.aborted) {
      launch.setAttribute("data-loading", "");
      await Promise.race([ok, wait(timing.limit - (performance.now() - started))]);
    }
  } finally {
    abort();
    timeouts.forEach(clearTimeout);
    launch.hidden = true;
    content.inert = false;
    launch.removeAttribute("data-loading");
    launch.removeAttribute("data-leaving");
    root.removeAttribute("data-launching");
  }
}
