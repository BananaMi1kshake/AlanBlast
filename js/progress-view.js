import { loadAdventure } from "./adventure-storage.js";
import { loadCampaign } from "./campaign.js";
import { ACHIEVEMENTS, adventureProgress, MATERIAL_ORDER, restoreDiscoveries, STAT_NAMES } from "./profile.js";
import { registerOffline } from "./pwa.js";
import { createMotionPreference, loadSettings, saveSettings } from "./settings.js";
import { loadProgress } from "./storage.js";
import { MATERIALS, WORLDS } from "./themes.js";
import { paintWorld } from "./world-art.js";

const $ = id => document.getElementById(id);
const settings = loadSettings();
const type = new URLSearchParams(location.search).get("view");
const view = ["stats", "achievements"].includes(type) ? type : "materials";
const fragment = $("progress-content");
const number = new Intl.NumberFormat();
createMotionPreference(settings);
registerOffline();

function node(tag, text, className) {
  const result = document.createElement(tag);
  if (className) result.className = className;
  if (text) result.textContent = text;
  return result;
}

function materials(profile) {
  $("progress-title").textContent = "Material collection";
  $("progress-description").textContent = `${profile.materials.length} of ${MATERIAL_ORDER.length} materials discovered`;
  $("appearance-controls").hidden = false;
  const mode = $("appearance-mode");
  const favorite = $("favorite-material");
  mode.value = settings.materialMode;
  favorite.replaceChildren(...MATERIAL_ORDER.filter(id => profile.materials.includes(id))
    .map(id => new Option(MATERIALS[id].name, id)));
  favorite.value = profile.materials.includes(settings.favoriteMaterial) ? settings.favoriteMaterial : "classic";
  favorite.disabled = mode.value === "automatic";
  $("appearance-controls").onchange = () => {
    settings.materialMode = mode.value;
    settings.favoriteMaterial = favorite.value;
    favorite.disabled = mode.value === "automatic";
    saveSettings(settings);
  };
  for (const [index, id] of MATERIAL_ORDER.entries()) {
    const world = Object.values(WORLDS).find(entry => entry.material === id);
    const card = node("section", "", "world-card collection-card");
    const art = node("div", "", "world-art");
    art.setAttribute("aria-hidden", "true");
    paintWorld(art, world);
    const details = node("div");
    const status = profile.materials.includes(id) ? "Discovered" : "Undiscovered";
    details.append(node("h2", MATERIALS[id].name), node("strong", status),
      node("p", index ? `Complete an Adventure level in ${world.name}, or earn Classic all-clear number ${index}.` : "Available from the start."));
    card.append(art, details);
    fragment.append(card);
  }
}

function statistics(profile, levels, completed) {
  $("progress-title").textContent = "Personal statistics";
  $("progress-description").textContent = "Lifetime counters began in Phase 7. Earlier best scores and level completions are included.";
  const panels = {
    Classic: { "Personal best": loadProgress().highScore, "Materials discovered": profile.materials.length },
    Adventure: { "Levels completed": completed.length, "Worlds completed": adventureProgress(levels, completed).worlds.length },
    "Daily Challenge": {},
  };
  for (const [index, [title, stats]] of Object.entries(panels).entries()) {
    const mode = Object.keys(STAT_NAMES)[index];
    for (const [key, label] of Object.entries(STAT_NAMES[mode])) {
      if (mode === "classic" && key === "bestRun") continue;
      stats[label] = profile[mode][key];
    }
    const card = node("section", "", "world-card");
    const list = node("dl", "", "stat-list");
    for (const [label, value] of Object.entries(stats)) {
      list.append(node("dt", label), node("dd", number.format(value)));
    }
    card.append(node("h2", title), list);
    fragment.append(card);
  }
}

function achievements(profile) {
  $("progress-title").textContent = "Achievements";
  $("progress-description").textContent = `${profile.achievements.length} of ${ACHIEVEMENTS.length} earned`;
  for (const [id, title, requirement] of ACHIEVEMENTS) {
    const card = node("section", "", "world-card achievement-card");
    const earned = profile.achievements.includes(id);
    card.dataset.earned = String(earned);
    card.append(node("h2", title), node("p", requirement), node("strong", earned ? "Earned" : "Locked"));
    fragment.append(card);
  }
}

document.querySelector(`[data-tab="${view}"]`).setAttribute("aria-current", "page");
addEventListener("pageshow", async () => {
  try {
    const levels = await loadCampaign();
    const { completed } = loadAdventure(levels);
    const profile = restoreDiscoveries(levels, completed);
    fragment.replaceChildren();
    if (view === "materials") materials(profile);
    else if (view === "achievements") achievements(profile);
    else statistics(profile, levels, completed);
  } catch (error) {
    $("progress-description").textContent = error.message;
  }
});
