import { placePiece } from "../js/game.js";
import { generateExperimental } from "../js/experimental-generator.js";
import { generateHandV2 } from "../js/generator.js";
import { generateHand, searchHand } from "../js/solver.js";
import { inspectSequences } from "./analysis-core.js";
import { randomFrom } from "./player-strategies.js";

function deal(game, version, { seed, strategy, weights }) {
  const start = performance.now();
  const random = randomFrom(seed);
  const result = version === "v1"
    ? generateHand(game.board, game.bag, { random, maxChecks: 120000 })
    : (version === "experimental" ? generateExperimental : generateHandV2)(game.board, game.bag, { random, strategy, weights });
  return { ...result, version, ms: performance.now() - start };
}

self.addEventListener("message", ({ data: { game, action, options } }) => {
  const generations = action === "compare"
    ? [deal(game, "v1", options), deal(game, "v2", options)]
    : action === "experiment" ? [deal(game, "v2", options), deal(game, "experimental", options)]
      : action === "deal" ? [deal(game, "v2", options)] : [];
  const last = generations.at(-1);
  if (last?.status === "solvable") game = { ...game, hand: last.hand, bag: last.bag };
  const inspection = !last || last.status === "solvable"
    ? searchHand(game.board, game.hand.filter(id => id !== null), { goal: options.goal, maxChecks: 300000 })
    : null;
  const completions = action === "inspect" ? inspectSequences(game) : null;
  const states = [game];
  for (const { id, x, y } of inspection?.sequence ?? []) {
    const result = placePiece(game, game.hand.indexOf(id), x, y);
    game = result.game;
    states.push(game);
  }
  self.postMessage({ generations, inspection, states, completions });
});
