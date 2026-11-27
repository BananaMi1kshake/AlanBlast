import { createGame, isGameOver, placePiece } from "./game.js";
import { bindInput } from "./input.js";
import { loadProgress, saveProgress } from "./storage.js";
import { createView } from "./view.js";

const view = createView();
const playAgain = document.querySelector("#play-again");
const restored = loadProgress();
let game = restored.game ?? createGame();
let highScore = restored.highScore;

const input = bindInput(view, () => game, (slot, x, y) => {
  const result = placePiece(game, slot, x, y);
  if (!result) return false;
  input.reset();
  game = result.game;
  const over = update(result.cleared);
  const lines = result.rows.length + result.columns.length;
  const summary = lines ? `Cleared ${lines} ${lines === 1 ? "line" : "lines"}. ` : "";
  view.announce(`${summary}Scored ${result.points} points.${over ? " Game over. No remaining piece fits." : ""}`);
  if (over) playAgain.focus({ preventScroll: true });
  return true;
});

function update(cleared) {
  highScore = Math.max(highScore, game.score);
  const over = isGameOver(game);
  view.render(game, highScore, over, cleared);
  saveProgress(game, highScore);
  return over;
}

function restart() {
  input.reset();
  game = createGame();
  update();
  view.announce("New game.");
  view.slots[0].focus({ preventScroll: true });
}

document.querySelector("#restart").addEventListener("click", restart);
playAgain.addEventListener("click", restart);
update();

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register(new URL("../sw.js", import.meta.url)).catch(error => {
    console.warn("Offline setup failed.", error);
  });
}
