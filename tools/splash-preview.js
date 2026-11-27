import { BRANDING } from "../js/branding-assets.js";
import { isLoopback } from "../js/sandbox.js";
import { applyBranding, LAUNCH_TIMING } from "../js/startup.js";

if (isLoopback(location.hostname)) {
  applyBranding(document.documentElement, Object.fromEntries(Object.entries(BRANDING).map(([key, path]) =>
    [key, path && new URL("../" + path, location.href).href])));
  const params = new URLSearchParams(location.search);
  const stage = params.get("stage") === "studio" ? "studio" : "game";
  const launch = document.querySelector("#launch");
  if (stage === "studio" && !BRANDING.studioLogo) {
    document.querySelector("#menu-content").hidden = false;
  } else {
    launch.dataset.stage = stage;
    launch.hidden = false;
    if (!matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const duration = Math.min(2000, Math.max(100, Number(params.get("ms")) || LAUNCH_TIMING[stage]));
      launch.querySelector(`[data-brand-art="${stage}"]`).style.animationDuration = `${duration}ms`;
      if (stage === "studio") setTimeout(() => { launch.hidden = true; }, duration);
    }
  }
}
