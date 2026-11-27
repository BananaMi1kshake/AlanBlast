import { levelError, playLevel, replayLevel, startLevel } from "./adventure.js";
import { canPlace, SHAPES, SIZE } from "./game.js";

export function validateLevel(level, { maxNodes = 40000 } = {}) {
  const error = levelError(level);
  if (error) return { status: "invalid", error };
  const supplied = level.validation?.witness;
  if (Array.isArray(supplied) && supplied.length <= 90 && replayLevel(level, supplied)?.status === "won") {
    return { status: "solvable", witness: supplied, checked: 0, method: "replay" };
  }

  const dead = new Set();
  let checked = 0;
  let timedOut = false;
  function search(run) {
    if (run.status === "won") return run.history;
    if (run.status === "failed") return null;
    const { game } = run;
    const key = [
      game.board.map(id => id === null ? 0 : 1).join(""), game.hand.join(","), run.nextHand,
      run.gems.join(","), game.score, game.combo, game.comboWindow, run.peakCombo,
      run.rows, run.columns, run.allClear, run.history.length,
    ].join("|");
    if (dead.has(key)) return null;
    const candidates = [];
    const seen = new Set();
    for (const [slot, id] of game.hand.entries()) {
      if (id === null || seen.has(id)) continue;
      seen.add(id);
      const shape = SHAPES[id];
      for (let y = 0; y <= SIZE - shape.height; y++) {
        for (let x = 0; x <= SIZE - shape.width; x++) {
          if (!canPlace(game.board, shape, x, y)) continue;
          if (checked >= maxNodes) { timedOut = true; return null; }
          checked++;
          const result = playLevel(level, run, slot, x, y);
          if (result.won) return result.run.history;
          if (result.run.status === "playing") candidates.push(result);
        }
      }
    }
    candidates.sort((a, b) => b.gemsCollected.length - a.gemsCollected.length || b.cleared.length - a.cleared.length);
    for (const { run: next } of candidates) {
      const result = search(next);
      if (result || timedOut) return result;
    }
    dead.add(key);
    return null;
  }

  const witness = search(startLevel(level));
  return witness ? { status: "solvable", witness, checked, method: "search" }
    : { status: timedOut ? "timeout" : "impossible", checked };
}
