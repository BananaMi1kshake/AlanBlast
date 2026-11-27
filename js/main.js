import { createGame, isGameOver, needsHand, placePiece } from "./game.js";
import { requestHand } from "./hand-request.js";
import { bindInput } from "./input.js";
import { loadProgress, saveProgress } from "./storage.js";
import { createView } from "./view.js";

const DEAL_TIMEOUT = 10000;
const RETRY_TIMEOUT = 30000;
const view = createView();
const playAgain = document.querySelector("#play-again");
const pending = document.querySelector("#hand-pending");
const retryHand = document.querySelector("#retry-hand");
const restored = loadProgress();
let game = restored.game ?? createGame();
let highScore = restored.highScore;
let lastMove;
let cancelDeal;

const input = bindInput(view, () => game, (slot, x, y) => {
  const result = placePiece(game, slot, x, y);
  if (!result) return false;
  input.reset();
  game = result.game;
  lastMove = result;
  const over = update();
  const lines = result.rows.length + result.columns.length;
  const summary = lines ? `Cleared ${lines} ${lines === 1 ? "line" : "lines"}. ` : "";
  const combo = lines ? ` Combo ${game.combo}, ${game.combo} times line points.` : "";
  const bonus = result.fullBoardClear ? ` Full-board clear! ${result.bonus} bonus points and a new palette.` : "";
  view.announce(`${summary}Scored ${result.points} points.${combo}${bonus}${over ? " Game over. No remaining piece fits." : ""}`);
  if (over) playAgain.focus({ preventScroll: true });
  if (needsHand(game)) deal();
  return true;
});

function update() {
  highScore = Math.max(highScore, game.score);
  const over = isGameOver(game);
  view.render(game, highScore, over, lastMove);
  saveProgress(game, highScore);
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
      playAgain.focus({ preventScroll: true });
      return;
    }
    game = { ...game, hand: result.hand, bag: result.bag };
    update();
    if (focusTray || view.board.contains(document.activeElement)) view.slots[0].focus({ preventScroll: true });
  }, timeout);
}

function restart() {
  cancelDeal?.();
  input.reset();
  game = createGame();
  lastMove = undefined;
  update();
  view.announce("New game.");
  deal(DEAL_TIMEOUT, true);
}

retryHand.addEventListener("click", () => deal(RETRY_TIMEOUT, true));
document.querySelector("#restart").addEventListener("click", restart);
playAgain.addEventListener("click", restart);
update();
if (needsHand(game)) deal();

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register(new URL("../sw.js", import.meta.url)).catch(error => {
    console.warn("Offline setup failed.", error);
  });
}
