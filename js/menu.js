import { previewStorage } from "./sandbox.js";
import { applyBranding, presentStartup } from "./startup.js";
import { bindSaveControls } from "./save-controls.js";
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

const $ = id => document.getElementById(id);
const preview = previewStorage();
const settings = loadSettings(preview);
const preference = createMotionPreference(settings);
const audio = createAudio();
const haptics = createHaptics();
const feedback = createFeedback(audio, haptics, settings);
bindFeedbackLifecycle(audio, haptics);
bindSettings(settings, preference, {
  onOpen() {}, onRestart() {}, storage: preview, vibrationSupported: haptics.supported,
  onChange: event => { feedback.configure(); if (event.isTrusted) audio.activate(); },
  onInteraction: () => feedback.cue("ui"),
});
if (!preview) registerOffline();
if (!preview) {
  bindInstall();
  bindSaveControls();
} else {
  $("install-panel").hidden = true;
  $("save-controls").hidden = true;
}

$("skip-tutorial").addEventListener("click", () => {
  saveTutorial("skipped", preview);
  $("tutorial-invitation").hidden = true;
});

async function render() {
  $("tutorial-invitation").hidden = tutorialStatus(preview) !== null;
  const classic = loadProgress(preview);
  const ended = classic.game && isGameOver(classic.game);
  const classicLink = $("classic-link");
  $("classic-action").textContent = classic.game && !ended ? "Continue Classic" : "Play Classic";
  classicLink.href = ended ? "./play.html?new=1" : "./play.html";
  try {
    const levels = await loadCampaign();
    const { completed, current } = loadAdventure(levels, preview);
    restoreDiscoveries(levels, completed, preview);
    const resume = $("resume-adventure");
    resume.hidden = current?.run.status !== "playing";
    if (!resume.hidden) {
      resume.href = levelUrl(current.levelId);
      resume.textContent = "Resume " + levels.find(level => level.id === current.levelId).name;
    }
  } catch {
    $("resume-adventure").hidden = true;
  }
}
applyBranding(document.documentElement);
const ready = render();
if (!preview) presentStartup(ready);
addEventListener("pageshow", event => { if (event.persisted) render(); });
