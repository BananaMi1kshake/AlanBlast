import { createGame, isGameOver, needsHand, placePiece } from "./game.js";
import { loadProgress, saveProgress } from "./storage.js";

export function createClassicSession(storage) {
  const restored = loadProgress(storage);
  let game = restored.game ?? createGame();
  let best = restored.highScore;

  return {
    get game() { return game; },
    get best() { return best; },
    get over() { return isGameOver(game); },
    get waiting() { return needsHand(game); },
    play(slot, x, y) {
      const result = placePiece(game, slot, x, y);
      if (!result) return null;
      const record = result.game.score > best;
      const firstRecord = record && !game.record;
      game = result.game;
      if (record) game.record = true;
      best = Math.max(best, game.score);
      return { ...result, record, firstRecord };
    },
    applyDeal(result) {
      game = result.status === "impossible" ? { ...game, exhausted: true }
        : { ...game, hand: result.hand, bag: result.bag };
    },
    restart() { game = createGame(); },
    persist() { saveProgress(game, best, storage); },
    load(next) {
      game = structuredClone(next);
      best = game.score;
    },
  };
}
