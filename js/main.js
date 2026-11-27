import { createAudio } from "./audio.js";
import { bindFeedbackLifecycle, createFeedback } from "./feedback.js";
import { createHaptics } from "./haptics.js";
import { createClassicSession } from "./classic.js";
import { isLoopback, memoryStorage } from "./sandbox.js";
import { requestHand } from "./hand-request.js";
import { bindInput } from "./input.js";
import { bindSettings, createMotionPreference, loadSettings } from "./settings.js";
import { createView } from "./view.js";

const DEAL_TIMEOUT = 10000;
const RETRY_TIMEOUT = 30000;
const labMode = new URLSearchParams(location.search).has("lab");
const labAccess = labMode && window.parent !== window && isLoopback(location.hostname);
const labStorage = labMode ? memoryStorage() : undefined;
const session = createClassicSession(labStorage);
const settings = loadSettings(labStorage);
const audio = createAudio();
const haptics = createHaptics();
const feedback = createFeedback(audio, haptics, settings, () => session.game.material);
bindFeedbackLifecycle(audio, haptics);
const preference = createMotionPreference(settings);
const view = createView(preference.motion);
const playAgain = document.querySelector("#play-again");
const pending = document.querySelector("#hand-pending");
const retryHand = document.querySelector("#retry-hand");
let lastMove;
let cancelDeal;

const input = bindInput(view, () => session.game, (slot, x, y) => {
  const material = session.game.material;
  const result = session.play(slot, x, y);
  if (!result) return false;
  input.reset();
  const { record, firstRecord, game } = result;
  lastMove = { result, slot, x, y };
  const over = update();
  const lines = result.rows.length + result.columns.length;
  feedback.move({ lines, combo: game.combo, fullBoardClear: result.fullBoardClear, record: firstRecord, over, material });
  const summary = lines ? `Cleared ${lines} ${lines === 1 ? "line" : "lines"}. ` : "";
  const combo = lines ? ` Combo ${game.combo}, ${game.combo} times line points.` : "";
  const bonus = result.fullBoardClear ? ` Full-board clear! ${result.bonus} bonus points and a new world.` : "";
  view.announce(`${summary}Scored ${result.points} points.${record ? " New high score." : ""}${combo}${bonus}${over ? " Game over. No remaining piece fits." : ""}`);
  if (over) playAgain.focus({ preventScroll: true });
  if (session.waiting) deal();
  return true;
}, feedback.cue);

function update(refill = false) {
  const over = session.over;
  session.persist();
  view.render(session.game, session.best, over, lastMove, refill);
  return over;
}

function deal(timeout = DEAL_TIMEOUT, focusTray = false) {
  pending.textContent = "Finding a playable hand…";
  pending.hidden = false;
  retryHand.hidden = true;
  view.tray.setAttribute("aria-busy", "true");
  cancelDeal = requestHand(session.game.board, session.game.bag, result => {
    cancelDeal = undefined;
    view.tray.removeAttribute("aria-busy");
    if (result.status === "timeout" || result.status === "error") {
      pending.textContent = result.status === "timeout" ? "The hand search timed out." : "The hand search could not run.";
      view.announce(pending.textContent);
      retryHand.hidden = false;
      return;
    }
    pending.hidden = true;
    if (result.status === "impossible") {
      session.applyDeal(result);
      update();
      view.announce("Game over. No solvable hand exists.");
      feedback.cue("gameOver");
      playAgain.focus({ preventScroll: true });
      return;
    }
    session.applyDeal(result);
    update(true);
    if (focusTray || view.board.contains(document.activeElement)) view.slots[0].focus({ preventScroll: true });
  }, timeout);
}

function restart() {
  cancelDeal?.();
  input.reset();
  view.resetFeedback();
  session.restart();
  lastMove = undefined;
  update();
  view.announce("New game.");
  feedback.restart();
  deal(DEAL_TIMEOUT, true);
}

retryHand.addEventListener("click", () => {
  feedback.cue("ui");
  deal(RETRY_TIMEOUT, true);
});
bindSettings(settings, preference, {
  onOpen: input.reset, onRestart: restart, storage: labStorage,
  onChange: event => {
    feedback.configure();
    if (event.isTrusted) audio.activate();
  },
  onInteraction: () => feedback.cue("ui"), vibrationSupported: haptics.supported,
});
playAgain.addEventListener("click", restart);
update();
if (session.waiting) deal();

if (labAccess) {
  window.alanbloxLab = {
    snapshot: () => structuredClone({ game: session.game, highScore: session.best }),
    load(next, { holdDeal = false } = {}) {
      cancelDeal?.();
      input.reset();
      view.resetFeedback();
      audio.stop();
      haptics.stop();
      session.load(next);
      lastMove = undefined;
      pending.hidden = true;
      retryHand.hidden = true;
      view.tray.removeAttribute("aria-busy");
      update();
      if (!holdDeal && session.waiting) deal();
    },
  };
}

if (!labMode && "serviceWorker" in navigator) {
  navigator.serviceWorker.register(new URL("../sw.js", import.meta.url)).catch(error => {
    console.warn("Offline setup failed.", error);
  });
}
