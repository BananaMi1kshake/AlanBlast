import { previewStorage } from "./sandbox.js";
import { loadAdventure } from "./adventure-storage.js";
import { loadCampaign } from "./campaign.js";
import { ACHIEVEMENTS, adventureProgress, MATERIAL_ORDER, restoreDiscoveries, STAT_NAMES } from "./profile.js";
import { createPager } from "./pager.js";
import { registerOffline } from "./pwa.js";
import { createMotionPreference, loadSettings, saveSettings } from "./settings.js";
import { loadProgress } from "./storage.js";
import { EXPANDED_MATERIALS } from "./material-library.js";
import { MATERIALS, WORLDS } from "./themes.js";
import { paintWorld } from "./world-art.js";

const $ = id => document.getElementById(id);
const preview = previewStorage();
const settings = loadSettings(preview);
const type = new URLSearchParams(location.search).get("view");
const view = ["stats", "achievements"].includes(type) ? type : "materials";
const fragment = $("progress-content");
const pager = createPager($("screen-pager"));
const compact = matchMedia("(orientation: landscape) and (max-height: 480px)");
const number = new Intl.NumberFormat();
createMotionPreference(settings);
if (!preview) registerOffline();

function node(tag, text, className) {
  const result = document.createElement(tag);
  if (className) result.className = className;
  if (text) result.textContent = text;
  return result;
}

function materialCard(profile, id) {
  const extra = EXPANDED_MATERIALS[id];
  const world = extra ? { ...WORLDS[extra.world], material: id } : Object.values(WORLDS).find(entry => entry.material === id);
  const card = node("button", "", "world-card collection-card");
  card.type = "button";
  card.dataset.materialId = id;
  const art = node("span", "", "world-art");
  art.setAttribute("aria-hidden", "true");
  paintWorld(art, world);
  const details = node("span");
  details.append(node("strong", MATERIALS[id].name), node("small", profile.materials.includes(id) ? "Discovered" : "Locked"));
  card.append(art, details);
  card.addEventListener("click", () => {
    $("material-name").textContent = MATERIALS[id].name;
    const index = MATERIAL_ORDER.indexOf(id);
    $("material-requirement").textContent = extra?.requirement ?? (index
      ? `Complete an Adventure level in ${world.name}, or earn Classic all-clear number ${index}.`
      : "Available from the start.");
    paintWorld($("material-art"), world);
    $("material-detail").showModal();
  });
  return card;
}

function materials(profile) {
  $("progress-title").textContent = "Material collection";
  $("progress-description").textContent = `${profile.materials.length} of ${MATERIAL_ORDER.length} discovered`;
  fragment.classList.add("material-grid");
  const appearance = $("appearance-controls");
  const toggle = $("appearance-toggle");
  toggle.hidden = false;
  toggle.setAttribute("aria-expanded", String(!appearance.hidden));
  toggle.onclick = () => {
    appearance.hidden = !appearance.hidden;
    fragment.hidden = !appearance.hidden;
    $("screen-pager").hidden = !appearance.hidden;
    toggle.textContent = appearance.hidden ? "Classic appearance" : "Back to collection";
    toggle.setAttribute("aria-expanded", String(!appearance.hidden));
  };
  const mode = $("appearance-mode");
  const favorite = $("favorite-material");
  mode.value = settings.materialMode;
  favorite.replaceChildren(...MATERIAL_ORDER.filter(id => profile.materials.includes(id))
    .map(id => new Option(MATERIALS[id].name, id)));
  favorite.value = profile.materials.includes(settings.favoriteMaterial) ? settings.favoriteMaterial : "classic";
  favorite.disabled = mode.value === "automatic";
  appearance.onchange = () => {
    settings.materialMode = mode.value;
    settings.favoriteMaterial = favorite.value;
    favorite.disabled = mode.value === "automatic";
    saveSettings(settings, preview);
  };
  pager.update(MATERIAL_ORDER, 8, items => fragment.replaceChildren(...items.map(id => materialCard(profile, id))));
  if (!appearance.hidden) $("screen-pager").hidden = true;
}

let statMode = 0;
let refreshStats;
function statistics(profile, levels, completed) {
  $("progress-title").textContent = "Personal statistics";
  $("progress-description").textContent = "Lifetime counters began in Phase 7.";
  const panels = [
    ["Classic", { "Personal best": loadProgress(preview).highScore, "Materials discovered": profile.materials.length }],
    ["Adventure", { "Levels completed": completed.length, "Worlds completed": adventureProgress(levels, completed).worlds.length }],
    ["Daily", {}],
  ];
  const tabs = $("stats-tabs");
  tabs.hidden = false;
  const buttons = panels.map(([title], index) => {
    const button = node("button", title, "secondary");
    button.type = "button";
    button.addEventListener("click", () => {
      statMode = index;
      pager.reset();
      update();
    });
    return button;
  });
  tabs.replaceChildren(...buttons);
  function update() {
    buttons.forEach((button, index) => button.setAttribute("aria-pressed", String(index === statMode)));
    const mode = Object.keys(STAT_NAMES)[statMode];
    const fields = { ...panels[statMode][1] };
    for (const [key, label] of Object.entries(STAT_NAMES[mode])) {
      if (mode !== "classic" || key !== "bestRun") fields[label] = profile[mode][key];
    }
    pager.update(Object.entries(fields), compact.matches ? 3 : 6, items => {
      const list = node("dl", "", "stat-list world-card");
      for (const [label, value] of items) list.append(node("dt", label), node("dd", number.format(value)));
      fragment.replaceChildren(list);
    });
  }
  refreshStats = update;
  update();
}

function achievements(profile) {
  $("progress-title").textContent = "Achievements";
  $("progress-description").textContent = `${profile.achievements.length} of ${ACHIEVEMENTS.length} earned`;
  fragment.classList.add("achievement-grid");
  pager.update(ACHIEVEMENTS, 4, items => fragment.replaceChildren(...items.map(([id, title, requirement]) => {
    const card = node("section", "", "world-card achievement-card");
    const earned = profile.achievements.includes(id);
    card.dataset.achievementId = id;
    card.dataset.earned = String(earned);
    card.append(node("h2", title), node("p", requirement), node("strong", earned ? "Earned" : "Locked"));
    return card;
  })));
}

compact.addEventListener("change", () => refreshStats?.());
document.querySelector(`[data-tab="${view}"]`).setAttribute("aria-current", "page");
addEventListener("pageshow", async () => {
  try {
    const levels = await loadCampaign();
    const { completed } = loadAdventure(levels, preview);
    const profile = restoreDiscoveries(levels, completed, preview);
    if (view === "materials") materials(profile);
    else if (view === "achievements") achievements(profile);
    else statistics(profile, levels, completed);
  } catch (error) {
    $("progress-description").textContent = error.message;
  }
});
