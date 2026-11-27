import { previewStorage } from "./sandbox.js";
import { isUnlocked, loadAdventure } from "./adventure-storage.js";
import { levelUrl } from "./adventure-view.js";
import { loadCampaign } from "./campaign.js";
import { createPager } from "./pager.js";
import { registerOffline } from "./pwa.js";
import { createMotionPreference, loadSettings } from "./settings.js";
import { WORLDS } from "./themes.js";
import { paintWorld } from "./world-art.js";

const $ = id => document.getElementById(id);
const preview = previewStorage();
const pager = createPager($("screen-pager"));
const params = new URLSearchParams(location.search);
const requested = params.get("world");
const world = Object.hasOwn(WORLDS, requested) ? requested : null;
createMotionPreference(loadSettings(preview));
if (!preview) registerOffline();

function worldUrl(id) {
  const query = new URLSearchParams();
  if (id) query.set("world", id);
  if (preview) query.set("preview", "1");
  return "./adventure.html" + (query.size ? "?" + query : "");
}

function worldTile(id, entries, done, active) {
  const link = document.createElement("a");
  link.className = "world-card world-tile";
  link.href = worldUrl(id);
  link.toggleAttribute("data-current", active === id);
  const art = document.createElement("span");
  art.className = "world-art";
  art.setAttribute("aria-hidden", "true");
  paintWorld(art, WORLDS[id]);
  const label = document.createElement("span");
  const title = document.createElement("strong");
  const count = document.createElement("small");
  title.textContent = WORLDS[id].name;
  count.textContent = `${entries.filter(level => done.includes(level.id)).length}/${entries.length} cleared`;
  label.append(title, count);
  link.append(art, label);
  return link;
}

function levelTile(level, completed, levels) {
  const done = completed.includes(level.id);
  const unlocked = isUnlocked(levels, completed, level.id);
  const tile = document.createElement(unlocked ? "a" : "div");
  tile.className = "level-row";
  tile.dataset.levelId = level.id;
  const name = document.createElement("strong");
  name.textContent = `${levels.indexOf(level) + 1}. ${level.name}`;
  const status = document.createElement("span");
  status.textContent = done ? "Replay" : unlocked ? "Play" : "Locked";
  tile.dataset.status = done ? "complete" : unlocked ? "available" : "locked";
  if (unlocked) tile.href = levelUrl(level.id, { replay: done });
  tile.append(name, status);
  return tile;
}

async function render() {
  try {
    const levels = await loadCampaign();
    const { completed, current } = loadAdventure(levels, preview);
    const frontier = levels.find(level => !completed.includes(level.id)) ?? levels.at(-1);
    const active = current?.run.status === "playing" ? levels.find(level => level.id === current.levelId) : frontier;
    $("current-world").textContent = completed.length === levels.length
      ? "Campaign complete" : `Current world · ${WORLDS[active.world].name}`;
    $("progress-label").textContent = `${completed.length} of ${levels.length} levels complete`;
    $("campaign-progress").max = levels.length;
    $("campaign-progress").value = completed.length;
    const resume = $("resume-level");
    resume.hidden = current?.run.status !== "playing" || (world !== null && active.world !== world);
    if (!resume.hidden) {
      resume.href = levelUrl(current.levelId);
      resume.textContent = "Resume " + active.name;
    }
    const list = $("world-list");
    if (world) {
      $("world-title").textContent = WORLDS[world].name;
      $("world-back").href = worldUrl();
      $("world-back").textContent = "← Worlds";
      $("current-world").textContent = "Adventure levels";
      list.className = "level-page";
      pager.update(levels.filter(level => level.world === world), 4, items => {
        list.replaceChildren(...items.map(level => levelTile(level, completed, levels)));
      });
    } else {
      list.replaceChildren(...Object.keys(WORLDS).map(id => worldTile(id,
        levels.filter(level => level.world === id), completed, active.world)));
    }
  } catch (error) {
    $("current-world").textContent = error.message;
  }
}
addEventListener("pageshow", render);
