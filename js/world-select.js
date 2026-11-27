import { previewStorage } from "./sandbox.js";
import { isUnlocked, loadAdventure } from "./adventure-storage.js";
import { levelUrl } from "./adventure-view.js";
import { loadCampaign } from "./campaign.js";
import { registerOffline } from "./pwa.js";
import { createMotionPreference, loadSettings } from "./settings.js";
import { MATERIALS, WORLDS } from "./themes.js";
import { paintWorld } from "./world-art.js";

const $ = id => document.getElementById(id);
const preview = previewStorage();
createMotionPreference(loadSettings(preview));
if (!preview) registerOffline();

function worldCard(world, entries, completed, levels, activeLevel) {
  const section = document.createElement("section");
  section.className = "world-card";
  section.toggleAttribute("data-current", entries.includes(activeLevel));
  const header = document.createElement("header");
  const art = document.createElement("div");
  art.className = "world-art";
  art.setAttribute("aria-hidden", "true");
  paintWorld(art, WORLDS[world]);
  const text = document.createElement("div");
  const title = document.createElement("h2");
  title.textContent = WORLDS[world].name;
  const material = document.createElement("p");
  material.textContent = MATERIALS[WORLDS[world].material].name;
  text.append(title, material);
  header.append(art, text);
  section.append(header);
  const list = document.createElement("ol");
  for (const level of entries) {
    const item = document.createElement("li");
    const done = completed.includes(level.id);
    const unlocked = isUnlocked(levels, completed, level.id);
    const row = document.createElement(unlocked ? "a" : "span");
    row.className = "level-row";
    const name = document.createElement("strong");
    name.textContent = `${levels.indexOf(level) + 1}. ${level.name}`;
    const status = document.createElement("span");
    status.textContent = done ? "Completed · Replay" : unlocked ? "Available" : "Locked";
    row.dataset.status = done ? "complete" : unlocked ? "available" : "locked";
    if (unlocked) row.href = levelUrl(level.id, { replay: done });
    row.append(name, status);
    item.append(row);
    list.append(item);
  }
  section.append(list);
  return section;
}

async function render() {
  try {
    const levels = await loadCampaign();
    const { completed, current } = loadAdventure(levels, preview);
    const frontier = levels.find(level => !completed.includes(level.id)) ?? levels.at(-1);
    const activeLevel = current?.run.status === "playing"
      ? levels.find(level => level.id === current.levelId) : frontier;
    $("current-world").textContent = completed.length === levels.length
      ? "Campaign complete" : `Current world · ${WORLDS[activeLevel.world].name}`;
    $("progress-label").textContent = `${completed.length} of ${levels.length} levels complete`;
    $("campaign-progress").max = levels.length;
    $("campaign-progress").value = completed.length;
    const resume = $("resume-level");
    resume.hidden = current?.run.status !== "playing";
    if (!resume.hidden) {
      resume.href = levelUrl(current.levelId);
      resume.textContent = "Resume " + activeLevel.name;
    }
    const chapters = [...new Set(levels.map(level => level.chapter ?? 1))];
    $("world-list").replaceChildren(...chapters.flatMap(chapter => {
      const title = document.createElement("h2");
      title.className = "chapter-title";
      title.textContent = chapter === 1 ? "First tour" : "Second tour";
      const entries = levels.filter(level => (level.chapter ?? 1) === chapter);
      return [title, ...[...new Set(entries.map(level => level.world))].map(world =>
        worldCard(world, entries.filter(level => level.world === world), completed, levels, activeLevel))];
    }));
  } catch (error) {
    $("current-world").textContent = error.message;
  }
}
addEventListener("pageshow", render);
