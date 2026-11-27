import { generateHand } from "../js/solver.js";
import { inspectSequences } from "./analysis-core.js";

self.addEventListener("message", ({ data: { game, deal } }) => {
  let generation;
  if (deal) {
    const start = performance.now();
    generation = generateHand(game.board, game.bag, { maxChecks: 250000 });
    generation.ms = performance.now() - start;
    if (generation.status === "solvable") game = { ...game, hand: generation.hand };
  }
  const inspection = !generation || generation.status === "solvable" ? inspectSequences(game) : null;
  self.postMessage({ generation, inspection });
});
