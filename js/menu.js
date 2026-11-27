import { saveTutorial, tutorialStatus } from "./challenges.js";
import { bindInstall } from "./install.js";
import { loadAdventure } from "./adventure-storage.js";
import { levelUrl } from "./adventure-view.js";
import { createAudio } from "./audio.js";
import { loadCampaign } from "./campaign.js";
import { bindFeedbackLifecycle, createFeedback } from "./feedback.js";
import { isGameOver } from "./game.js";
import { createHaptics } from "./haptics.js";
import { restoreDiscoveries } from "./profile.js";
import { registerOffline } from "./pwa.js";
import { bindSettings, createMotionPreference, loadSettings } from "./settings.js";
import { loadProgress } from "./storage.js";
import { WORLDS } from "./themes.js";
import { paintWorld } from "./world-art.js";

const $ = id => document.getElementById(id);
const settings = loadSettings();
const preference = createMotionPreference(settings);
const audio = createAudio();
const haptics = createHaptics();
const feedback = createFeedback(audio, haptics, settings);
bindFeedbackLifecycle(audio, haptics);
bindSettings(settings, preference, {
  onOpen() {}, onRestart() {}, vibrationSupported: haptics.supported,
  onChange: event => { feedback.configure(); if (event.isTrusted) audio.activate(); },
  onInteraction: () => feedback.cue("ui"),
});
registerOffline();
bindInstall();

$("skip-tutorial").addEventListener("click", () => {
  saveTutorial("skipped");
  $("tutorial-invitation").hidden = true;
});

async function render() {
  $("tutorial-invitation").hidden = tutorialStatus() !== null;
  const classic = loadProgress();
  $("classic-best").textContent = classic.highScore;
  const ended = classic.game && isGameOver(classic.game);
  const classicLink = $("classic-link");
  classicLink.textContent = classic.game && !ended ? "Continue Classic" : "Play Classic";
  classicLink.href = ended ? "./play.html?new=1" : "./play.html";
  paintWorld($("classic-art"), WORLDS.mint, ["sky", "mint", "sun", "mint"]);
  try {
    const levels = await loadCampaign();
    const { completed, current } = loadAdventure(levels);
    restoreDiscoveries(levels, completed);
    const frontier = levels.find(level => !completed.includes(level.id)) ?? levels.at(-1);
    paintWorld($("adventure-art"), WORLDS[frontier.world]);
    $("adventure-progress").textContent = `${completed.length} of ${levels.length} levels complete`;
    const resume = $("resume-adventure");
    resume.hidden = current?.run.status !== "playing";
    if (!resume.hidden) {
      resume.href = levelUrl(current.levelId);
      resume.textContent = "Resume " + levels.find(level => level.id === current.levelId).name;
    }
  } catch {
    $("adventure-progress").textContent = "Adventure levels could not be loaded.";
  }
}
addEventListener("pageshow", render);
