import { drawCandidate, HAND_SIZE, SHAPES, SIZE } from "./pieces.js";
import { generateHand, proposeAllClear, searchHand } from "./solver.js";

export const STRATEGY_WEIGHTS = Object.freeze({ standard: 40, line: 30, cleanup: 20, allClear: 10 });
export const GENERATION_LIMITS = Object.freeze({
  proposals: 8, checksPerProposal: 2400, goalChecks: 12000, guideChecks: 19000, guideWidth: 5,
  cleanupCells: 4, standardChecks: 120000,
});

export function selectStrategy(random, weights = STRATEGY_WEIGHTS) {
  const entries = Object.keys(STRATEGY_WEIGHTS).map(key => {
    const value = weights[key];
    return [key, Number.isFinite(value) && value > 0 ? value : 0];
  });
  const total = entries.reduce((sum, [, value]) => sum + value, 0);
  if (!total) return "standard";
  let threshold = random() * total;
  for (const [key, value] of entries) {
    threshold -= value;
    if (threshold < 0) return key;
  }
  return "standard";
}

function guidedHand(board, base, random, limits) {
  // The bag's ordering still determines tie-breaks. Open every library shape to the guide.
  const order = [...new Set([...base.bag, ...base.hand, ...SHAPES.keys()])];
  const found = proposeAllClear(board, order, { maxChecks: limits.guideChecks, width: limits.guideWidth });
  if (found.status !== "found") return found;

  const hand = found.sequence.map(move => move.id);
  const bag = [...base.bag];
  for (const id of hand) {
    const index = bag.indexOf(id);
    if (index >= 0) bag.splice(index, 1);
  }
  if (hand.length < HAND_SIZE) hand.push(...base.hand.slice(0, HAND_SIZE - hand.length));
  // Do not expose the discovered order in the tray.
  for (let i = hand.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [hand[i], hand[j]] = [hand[j], hand[i]];
  }
  // The guide has witnessed the prefix. Verify its suffix on the empty board
  // instead of rediscovering the same path after shuffling the tray.
  const suffix = searchHand(Array(SIZE ** 2).fill(null), base.hand.slice(0, HAND_SIZE - found.sequence.length),
    { maxChecks: limits.checksPerProposal });
  if (suffix.status !== "solvable") return { status: "timeout", checks: found.checks + suffix.checks };
  return { status: "found", hand, bag, checks: found.checks + suffix.checks };
}

export function generateHandV2(board, remainder, {
  random = Math.random, weights = STRATEGY_WEIGHTS, strategy, limits = GENERATION_LIMITS,
} = {}) {
  const requested = strategy ?? selectStrategy(random, weights);
  if (!Object.hasOwn(STRATEGY_WEIGHTS, requested)) throw new RangeError("Unknown deal strategy");
  const base = generateHand(board, remainder, { random, maxChecks: limits.standardChecks });
  const stats = { ...base.stats, requested, delivered: "standard", goalFallback: false, goalChecks: 0, goalTimeouts: 0, guided: false };
  if (base.status !== "solvable" || requested === "standard") return { ...base, stats };
  if (requested === "cleanup" && board.filter(cell => cell !== null).length < limits.cleanupCells) {
    stats.goalFallback = true;
    return { ...base, stats };
  }

  let candidate = base;
  for (let i = 0; i < limits.proposals; i++) {
    const maxChecks = Math.min(limits.checksPerProposal, limits.goalChecks - stats.goalChecks);
    if (maxChecks <= 0) break;
    const result = searchHand(board, candidate.hand, {
      goal: requested, maxChecks, cleanupCells: limits.cleanupCells,
    });
    stats.goalChecks += result.checks;
    if (result.status === "solvable") {
      stats.delivered = requested;
      return { hand: candidate.hand, bag: candidate.bag, status: "solvable", stats };
    }
    if (result.status === "timeout") stats.goalTimeouts++;
    if (i > 0) stats.rejected++;
    if (i + 1 < limits.proposals) candidate = drawCandidate(candidate.bag, random);
  }

  if (requested === "allClear" && limits.guideChecks > 0) {
    const result = guidedHand(board, base, random, limits);
    stats.goalChecks += result.checks;
    if (result.status === "found") {
      stats.delivered = requested;
      stats.guided = true;
      return { status: "solvable", hand: result.hand, bag: result.bag, stats };
    }
    if (result.status === "timeout") stats.goalTimeouts++;
  }
  stats.goalFallback = true;
  return { ...base, stats };
}
