import { browserStorage, createSaveBuffer } from "./save-buffer.js";
import { takePlayAccess } from "./play-access.js";
import { bindSaveControls } from "./save-controls.js";
import { bindInstall } from "./install.js";
import { createAdventureSession } from "./adventure-storage.js";
import { createAdventureView } from "./adventure-view.js";
import { createAudio } from "./audio.js";
import { loadCampaign } from "./campaign.js";
import { createDailySession, createTutorialSession, currentDay, loadChallenges } from "./challenges.js";
import { createClassicSession } from "./classic.js";
import { bindFeedbackLifecycle, createFeedback } from "./feedback.js";
import { closeHandWorker, requestHand } from "./hand-request.js";
import { createHaptics } from "./haptics.js";
import { bindInput } from "./input.js";
import { adventureProgress, completedDailyDates, loadProfile, recordGameplay, restoreDiscoveries } from "./profile.js";
import { SHAPES } from "./pieces.js";
import { registerOffline } from "./pwa.js";
import { isLoopback, memoryStorage } from "./sandbox.js";
import { bindSettings, createMotionPreference, loadSettings } from "./settings.js";
import { createView } from "./view.js";

const DEAL_TIMEOUT = 10000;
const RETRY_TIMEOUT = 30000;
const params = new URLSearchParams(location.search);
const requestedMode = params.get("mode");
const sandbox = params.has("lab") || params.has("editor");
const toolAccess = sandbox && window.parent !== window && isLoopback(location.hostname);
const buffer = sandbox ? null : createSaveBuffer(browserStorage());
const storage = sandbox ? memoryStorage() : buffer;
const $ = id => document.getElementById(id);

addEventListener("pagehide", closeHandWorker);

function mount(session, levels, mode = levels ? "adventure" : "classic", newAttempt = session.newlyStarted) {
  const settings = loadSettings(sandbox ? storage : browserStorage());
  const audio = createAudio();
  const haptics = createHaptics();
  const feedback = createFeedback(audio, haptics, settings, () => session.game.material);
  bindFeedbackLifecycle(audio, haptics);
  const preference = createMotionPreference(settings);
  document.documentElement.dataset.mode = mode;
  const view = createView(preference.motion);
  const pending = $("hand-pending");
  const retryHand = $("retry-hand");
  const playAgain = $("play-again");
  const adventure = levels ? createAdventureView(session, levels, restart, sandbox, mode) : null;
  document.body.classList.toggle("adventure-play", !!adventure);
  if (sandbox) {
    $("mode-back").hidden = true;
    document.querySelectorAll("[data-normal-only]").forEach(element => { element.hidden = true; });
  }
  let lastMove;
  let cancelDeal;
  let notificationTimer;
  let inputTrace;

  function reportSave(state) {
    const notice = $("save-notice");
    notice.hidden = state === "saved";
    $("save-conflict-refresh").hidden = state !== "conflict";
    $("save-notice-message").textContent = state === "conflict"
      ? "This saved game changed in another tab. Reload to continue."
      : state === "memory" ? "Changes are in memory. Export a save from Settings before closing this tab." : "";
    if (state === "conflict") input.reset();
  }

  function mayWrite() {
    if (!buffer || buffer.check()) return true;
    reportSave("conflict");
    return false;
  }

  function record(event) {
    if (sandbox || mode === "tutorial") return;
    const context = mode === "adventure" && event.result?.won ? adventureProgress(levels, session.completed)
      : mode === "daily" && event.result?.won ? { dailyDates: completedDailyDates(storage) } : {};
    const earned = recordGameplay(mode, event, context, storage);
    if (!earned.length) return;
    clearTimeout(notificationTimer);
    const toast = $("achievement-toast");
    toast.textContent = "Achievement unlocked · " + earned.join(" · ");
    toast.hidden = false;
    notificationTimer = setTimeout(() => { toast.hidden = true; }, 3800);
  }

  const input = bindInput(view, () => session.game, (slot, x, y) => {
    if (!mayWrite()) return false;
    const material = session.game.material;
    const theme = session.game.theme;
    const shape = SHAPES[session.game.hand[slot]];
    const result = session.play(slot, x, y);
    if (!result) return false;
    input.reset();
    lastMove = { result, slot, x, y };
    const over = update(result.refill, { type: "move", result, shape, over: session.over });
    const { game, fullBoardClear } = result;
    const lines = result.rows.length + result.columns.length;
    const gems = result.gemsCollected?.length ?? 0;
    feedback.move({ lines, combo: game.combo, fullBoardClear, record: result.firstRecord,
      over, material, gems, won: result.won });
    const summary = lines ? `Cleared ${lines} ${lines === 1 ? "line" : "lines"}. ` : "";
    const combo = lines ? ` Combo ${game.combo}, ${game.combo} times line points.` : "";
    const bonus = fullBoardClear ? ` Full-board clear! ${result.bonus} bonus points${theme === game.theme && material === game.material ? "." : " and a new world."}` : "";
    const gemText = gems ? ` Collected ${gems} ${gems === 1 ? "gem" : "gems"}.` : "";
    const end = adventure ? (result.won ? " Level complete." : over ? " Level failed." : "")
      : over ? " Game over. No remaining piece fits." : "";
    view.announce(`${summary}Scored ${result.points} points.${result.record ? " New high score." : ""}${combo}${bonus}${gemText}${end}`);
    if (over) {
      if (adventure) adventure.focusResult();
      else playAgain.focus({ preventScroll: true });
    }
    if (session.waiting) deal();
    return true;
  }, feedback.cue, { inspect: toolAccess && !adventure ? frame => inputTrace?.(frame) : undefined });

  function update(refill = false, event) {
    const over = session.over;
    session.persist();
    if (event) record(event);
    if (buffer) reportSave(buffer.flush());
    adventure?.render();
    view.render(session.game, session.best, over, lastMove, refill, adventure && {
      gems: session.run.gems, gemTarget: adventure.gemTarget(),
    });
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
      if (!mayWrite()) return;
      if (result.status === "timeout" || result.status === "error") {
        pending.textContent = result.status === "timeout" ? "The hand search timed out." : "The hand search could not run.";
        view.announce(pending.textContent);
        retryHand.hidden = false;
        return;
      }
      pending.hidden = true;
      session.applyDeal(result);
      if (result.status === "impossible") {
        update(false, { type: "end" });
        view.announce("Game over. No solvable hand exists.");
        feedback.cue("gameOver");
        playAgain.focus({ preventScroll: true });
        return;
      }
      update(true);
      if (focusTray || view.board.contains(document.activeElement)) view.slots[0].focus({ preventScroll: true });
    }, timeout);
  }

  function resetFeedback() {
    cancelDeal?.();
    input.reset();
    view.resetFeedback();
    lastMove = undefined;
  }

  function restart() {
    if (!mayWrite()) return;
    resetFeedback();
    session.restart();
    update(false, { type: "start" });
    view.announce(adventure ? "Level restarted." : "New game.");
    feedback.restart();
    if (session.waiting) deal(DEAL_TIMEOUT, true);
    else view.slots.find(button => !button.disabled)?.focus({ preventScroll: true });
  }

  retryHand.addEventListener("click", () => {
    feedback.cue("ui");
    deal(RETRY_TIMEOUT, true);
  });
  bindSettings(settings, preference, {
    onOpen: input.reset, onRestart: restart, storage: sandbox ? storage : undefined,
    onChange: event => {
      feedback.configure();
      if (event.isTrusted) audio.activate();
    },
    onInteraction: () => feedback.cue("ui"), vibrationSupported: haptics.supported,
  });
  playAgain.addEventListener("click", restart);
  $("save-conflict-refresh").addEventListener("click", () => location.reload());
  addEventListener("alanblox-save-replaced", () => {
    buffer.invalidate();
    reportSave("conflict");
  });
  update(false, newAttempt ? { type: "start" } : null);
  if (session.waiting) deal();

  if (toolAccess && !adventure) {
    window.alanbloxLab = {
      snapshot: () => structuredClone({ game: session.game, highScore: session.best }),
      tuneInput(values, onFrame) {
        inputTrace = onFrame;
        return input.configure(values);
      },
      load(next, { holdDeal = false } = {}) {
        resetFeedback();
        audio.stop();
        haptics.stop();
        session.load(next);
        pending.hidden = true;
        retryHand.hidden = true;
        view.tray.removeAttribute("aria-busy");
        update();
        if (!holdDeal && session.waiting) deal();
      },
    };
  }
  if (toolAccess && adventure) {
    window.alanbloxAdventureEditor = {
      load(level, history = []) {
        resetFeedback();
        audio.stop();
        haptics.stop();
        session.load(level, history);
        update();
      },
      snapshot: () => structuredClone(session.run),
    };
  }
}

if (!sandbox) {
  registerOffline();
  bindInstall();
  bindSaveControls({ gameStorage: buffer });
  addEventListener("pageshow", event => { if (event.persisted) location.reload(); });
}

const hasAccess = sandbox || requestedMode === "tutorial" || await takePlayAccess();
if (!hasAccess) {
  $("play-error").hidden = false;
  $("play-error").textContent = "AlanBlox is playing in another tab. Close that game or return to it.";
} else if (requestedMode === "daily" || requestedMode === "tutorial") {
  try {
    const levels = await loadChallenges(requestedMode);
    if (requestedMode === "daily") {
      const today = currentDay();
      const day = params.get("date") ?? today;
      const session = day <= today ? createDailySession(levels, day, storage) : null;
      if (session) mount(session, [session.level], "daily");
      else location.replace("./daily.html");
    } else {
      mount(createTutorialSession(levels, params.get("level"), storage), levels, "tutorial", false);
    }
  } catch (error) {
    $("play-error").hidden = false;
    $("play-error").textContent = error.message;
  }
} else if (requestedMode === "adventure") {
  try {
    const levels = await loadCampaign();
    const session = createAdventureSession(levels, params.get("level"), storage);
    if (!session) location.replace("./adventure.html");
    else {
      const replay = params.has("replay");
      if (!sandbox) restoreDiscoveries(levels, session.completed, storage);
      if (replay) {
        session.restart();
        params.delete("replay");
        history.replaceState(null, "", `?${params}`);
      }
      mount(session, levels, "adventure", replay || session.newlyStarted);
    }
  } catch (error) {
    $("play-error").hidden = false;
    $("play-error").textContent = error.message;
  }
} else {
  const settings = loadSettings(sandbox ? storage : browserStorage());
  const profile = loadProfile(storage);
  const material = profile.materials.includes(settings.favoriteMaterial) ? settings.favoriteMaterial : "classic";
  const session = createClassicSession(storage, { mode: settings.materialMode, material, materials: profile.materials });
  let newAttempt = session.newlyStarted;
  if (params.has("new") && !sandbox) {
    if (session.over) {
      session.restart();
      newAttempt = true;
    }
    params.delete("new");
    history.replaceState(null, "", location.pathname + (params.size ? `?${params}` : ""));
  }
  mount(session, undefined, "classic", newAttempt);
}
