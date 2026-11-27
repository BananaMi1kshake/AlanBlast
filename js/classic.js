import { createGame, isGameOver, needsHand, placePiece } from "./game.js";
import { loadProgress, saveProgress } from "./storage.js";
import { MATERIALS, visualProfile } from "./themes.js";
import { appearanceFor, newRotation, rotateMaterial } from "./material-rotation.js";

function newGame(appearance) {
  const game = createGame();
  const picked = ["starting", "fixed"].includes(appearance?.mode) ? appearanceFor(appearance.material) : {};
  if (appearance?.mode === "fixed") return { ...game, ...picked, fixedAppearance: true };
  const rotation = newRotation(appearance?.materials, appearance?.seed);
  return { ...game, ...picked, ...(rotation && { rotation }) };
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
      if (result.fullBoardClear && !game.fixedAppearance) {
        delete result.game.palette;
        if (game.rotation) Object.assign(result.game, rotateMaterial(game.material, game.rotation));
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
    equipMaterial(material) {
      if (!Object.hasOwn(MATERIALS, material) || material === game.material) return false;
      const { palette } = visualProfile(appearanceFor(material));
      game = { ...game, material, palette };
      return true;
    },
    restart() { game = newGame(appearance); },
    persist() { saveProgress(game, best, storage); },
    load(next) {
      game = structuredClone(next);
      best = game.score;
    },
  };
}
