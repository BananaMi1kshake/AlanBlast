import { MATERIALS } from "./themes.js";
import { MOTION } from "./motion.js";

export const SETTINGS_KEY = "alanblox.settings.v1";
export const APPEARANCE_MODES = ["automatic", "starting", "fixed"];
const defaults = { sound: true, volume: .65, vibration: true, reducedMotion: false,
  materialMode: "automatic", favoriteMaterial: "classic" };

export function loadSettings(storage) {
  const settings = { ...defaults };
  try {
    const saved = JSON.parse((storage ?? localStorage).getItem(SETTINGS_KEY));
    for (const key of ["sound", "vibration", "reducedMotion"]) {
      if (typeof saved?.[key] === "boolean") settings[key] = saved[key];
    }
    if (APPEARANCE_MODES.includes(saved?.materialMode)) settings.materialMode = saved.materialMode;
    if (Object.hasOwn(MATERIALS, saved?.favoriteMaterial)) settings.favoriteMaterial = saved.favoriteMaterial;
    if (Number.isFinite(saved?.volume)) settings.volume = Math.min(1, Math.max(0, saved.volume));
  } catch {
    // Private browsing and storage failures leave defaults usable.
  }
  return settings;
}

export function saveSettings(settings, storage) {
  try {
    (storage ?? localStorage).setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // Preferences still apply for the current page.
  }
}

export function createMotionPreference(settings) {
  const system = matchMedia("(prefers-reduced-motion: reduce)");
  const motion = new EventTarget();
  function sync() {
    const matches = settings.reducedMotion || system.matches;
    if (motion.matches === matches) return;
    motion.matches = matches;
    document.documentElement.toggleAttribute("data-reduced-motion", matches);
    motion.dispatchEvent(new Event("change"));
  }
  system.addEventListener("change", sync);
  sync();
  return { motion, sync };
}

export function bindSettings(settings, preference, { onOpen, onRestart, onChange, onInteraction, vibrationSupported, storage }) {
  const dialog = document.querySelector("#settings");
  const opener = document.querySelector("#open-settings");
  const panel = document.querySelector("#settings-panel");
  const confirmation = document.querySelector("#restart-confirm");
  const resume = document.querySelector("#resume");
  const requestRestart = document.querySelector("#request-restart");
  const confirmRestart = document.querySelector("#confirm-restart");
  const cancelRestart = document.querySelector("#cancel-restart");
  let closing;

  function confirm(visible) {
    panel.hidden = visible;
    confirmation.hidden = !visible;
    (visible ? cancelRestart : requestRestart).focus();
  }

  function finish() {
    closing?.cancel();
    closing = null;
    dialog.close();
    dialog.classList.remove("closing");
  }

  function close() {
    if (closing) return;
    if (preference.motion.matches) {
      finish();
      return;
    }
    dialog.classList.add("closing");
    dialog.getAnimations().forEach(animation => animation.cancel());
    closing = dialog.animate([
      { opacity: 1, transform: "translateY(0) scale(1)" },
      { opacity: 0, transform: "translateY(10px) scale(.985)" },
    ], { duration: MOTION.settingsClose, easing: "ease-in", fill: "forwards" });
    closing.onfinish = finish;
  }

  opener.addEventListener("click", () => {
    onOpen();
    panel.hidden = false;
    confirmation.hidden = true;
    dialog.showModal();
    resume.focus();
    if (!preference.motion.matches) {
      dialog.animate([
        { opacity: 0, transform: "translateY(12px) scale(.985)" },
        { opacity: 1, transform: "translateY(0) scale(1)" },
      ], { duration: MOTION.settingsOpen, easing: "ease-out" });
    }
  });

  resume.addEventListener("click", close);
  dialog.addEventListener("cancel", event => {
    event.preventDefault();
    if (!confirmation.hidden) confirm(false);
    else close();
  });
  requestRestart.addEventListener("click", () => confirm(true));
  cancelRestart.addEventListener("click", () => confirm(false));
  confirmRestart.addEventListener("click", () => {
    finish();
    onRestart();
  });
  preference.motion.addEventListener("change", () => {
    if (!preference.motion.matches) return;
    if (closing) finish();
    else dialog.getAnimations().forEach(animation => animation.cancel());
  });

  const slider = dialog.querySelector("#sound-volume");
  const volumeValue = dialog.querySelector("#volume-value");
  const soundToggle = dialog.querySelector('[data-preference="sound"]');
  const vibrationToggle = dialog.querySelector('[data-preference="vibration"]');
  if (!vibrationSupported) {
    vibrationToggle.disabled = true;
    dialog.querySelector("#haptics-status").textContent = "Unavailable in this browser. Sound and visuals still work.";
  }
  slider.value = String(Math.round(settings.volume * 100));
  slider.disabled = !settings.sound;
  volumeValue.value = `${slider.value}%`;

  function commit(event) {
    saveSettings(settings, storage);
    preference.sync();
    onChange(event);
  }

  for (const input of dialog.querySelectorAll("[data-preference]")) {
    const key = input.dataset.preference;
    input.checked = settings[key];
    input.addEventListener("change", event => {
      settings[key] = input.checked;
      slider.disabled = !soundToggle.checked;
      commit(event);
      onInteraction();
    });
  }
  slider.addEventListener("input", event => {
    settings.volume = Number(slider.value) / 100;
    volumeValue.value = `${slider.value}%`;
    commit(event);
  });
  slider.addEventListener("change", onInteraction);

  opener.addEventListener("click", onInteraction);
  dialog.addEventListener("click", event => {
    if (event.target.closest("button, summary") && !event.target.closest("#confirm-restart")) onInteraction();
  });
}
