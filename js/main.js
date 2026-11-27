import { createAudio } from "./audio.js";
import { bindFeedbackLifecycle, createFeedback } from "./feedback.js";
import { createHaptics } from "./haptics.js";
import { createGame, isGameOver, needsHand, placePiece } from "./game.js";
import { requestHand } from "./hand-request.js";
import { bindInput } from "./input.js";
import { loadProgress, saveProgress } from "./storage.js";
import { bindSettings, createMotionPreference, loadSettings } from "./settings.js";
import { createView } from "./view.js";

const DEAL_TIMEOUT = 10000;
const RETRY_TIMEOUT = 30000;
const labMode = new URLSearchParams(location.search).has("lab");
const labAccess = labMode && window.parent !== window && ["localhost", "127.0.0.1", "[::1]"].includes(location.hostname);
const labData = labMode ? new Map() : null;
const labStorage = labData ? { getItem: key => labData.get(key), setItem: (key, value) => labData.set(key, value) } : undefined;
const settings = loadSettings(labStorage);
const audio = createAudio();
const haptics = createHaptics();
const feedback = createFeedback(audio, haptics, settings, () => game.material);
bindFeedbackLifecycle(audio, haptics);
const preference = createMotionPreference(settings);
const view = createView(preference.motion);
const playAgain = document.querySelector("#play-again");
const pending = document.querySelector("#hand-pending");
const retryHand = document.querySelector("#retry-hand");
const restored = loadProgress(labStorage);
let game = restored.game ?? createGame();
let highScore = restored.highScore;
let lastMove;
let cancelDeal;

const input = bindInput(view, () => game, (slot, x, y) => {
  const result = placePiece(game, slot, x, y);
  if (!result) return false;
  input.reset();
  const record = result.game.score > highScore;
  const firstRecord = record && !game.record;
  const material = game.material;
  game = result.game;
  if (record) game.record = true;
  lastMove = { result, slot, x, y };
  const over = update();
  const lines = result.rows.length + result.columns.length;
  feedback.move({ lines, combo: game.combo, fullBoardClear: result.fullBoardClear, record: firstRecord, over, material });
  const summary = lines ? `Cleared ${lines} ${lines === 1 ? "line" : "lines"}. ` : "";
  const combo = lines ? ` Combo ${game.combo}, ${game.combo} times line points.` : "";
  const bonus = result.fullBoardClear ? ` Full-board clear! ${result.bonus} bonus points and a new world.` : "";
  view.announce(`${summary}Scored ${result.points} points.${record ? " New high score." : ""}${combo}${bonus}${over ? " Game over. No remaining piece fits." : ""}`);
  if (over) playAgain.focus({ preventScroll: true });
  if (needsHand(game)) deal();
  return true;
}, feedback.cue);

function update(refill = false) {
  highScore = Math.max(highScore, game.score);
  const over = isGameOver(game);
  saveProgress(game, highScore, labStorage);
  view.render(game, highScore, over, lastMove, refill);
  return over;
}

function deal(timeout = DEAL_TIMEOUT, focusTray = false) {
  pending.textContent = "Finding a playable hand…";
  pending.hidden = false;
  retryHand.hidden = true;
  view.tray.setAttribute("aria-busy", "true");
  cancelDeal = requestHand(game.board, game.bag, result => {
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
      game = { ...game, exhausted: true };
      update();
      view.announce("Game over. No solvable hand exists.");
      feedback.cue("gameOver");
      playAgain.focus({ preventScroll: true });
      return;
    }
    game = { ...game, hand: result.hand, bag: result.bag };
    update(true);
    if (focusTray || view.board.contains(document.activeElement)) view.slots[0].focus({ preventScroll: true });
  }, timeout);
}

function restart() {
  cancelDeal?.();
  input.reset();
  view.resetFeedback();
  game = createGame();
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
if (needsHand(game)) deal();

if (labAccess) {
  window.alanbloxLab = {
    snapshot: () => structuredClone({ game, highScore }),
    load(next, { holdDeal = false } = {}) {
      cancelDeal?.();
      input.reset();
      view.resetFeedback();
      audio.stop();
      haptics.stop();
      game = structuredClone(next);
      highScore = game.score;
      lastMove = undefined;
      pending.hidden = true;
      retryHand.hidden = true;
      view.tray.removeAttribute("aria-busy");
      update();
      if (!holdDeal && needsHand(game)) deal();
    },
  };
}

if (!labMode && "serviceWorker" in navigator) {
  navigator.serviceWorker.register(new URL("../sw.js", import.meta.url)).catch(error => {
    console.warn("Offline setup failed.", error);
  });
}
