import { createGame, isGameOver, needsHand, placePiece } from "./game.js";
import { loadProgress, saveProgress } from "./storage.js";
import { WORLDS } from "./themes.js";

function newGame(appearance) {
  const game = createGame();
  const entry = Object.entries(WORLDS).find(([, world]) => world.material === appearance?.material);
  if (entry && ["starting", "fixed"].includes(appearance.mode)) {
    const [theme, { material }] = entry;
    return { ...game, theme, material, ...(appearance.mode === "fixed" && { fixedAppearance: true }) };
  }
  return game;
}

export function createClassicSession(storage, appearance) {
  const restored = loadProgress(storage);
  let game = restored.game ?? newGame(appearance);
  let best = restored.highScore;

  return {
    get newlyStarted() { return !restored.game; },
    get game() { return game; },
    get best() { return best; },
    get over() { return isGameOver(game); },
    get waiting() { return needsHand(game); },
    play(slot, x, y) {
      const result = placePiece(game, slot, x, y);
      if (!result) return null;
      const record = result.game.score > best;
      const firstRecord = record && !game.record;
      if (game.fixedAppearance === true) {
        result.game.theme = game.theme;
        result.game.material = game.material;
      }
      game = result.game;
      if (record) game.record = true;
      best = Math.max(best, game.score);
      return { ...result, record, firstRecord };
    },
    applyDeal(result) {
      game = result.status === "impossible" ? { ...game, exhausted: true }
        : { ...game, hand: result.hand, bag: result.bag };
    },
    restart() { game = newGame(appearance); },
    persist() { saveProgress(game, best, storage); },
    load(next) {
      game = structuredClone(next);
      best = game.score;
    },
  };
}
