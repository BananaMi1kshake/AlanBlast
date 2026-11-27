import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";
import { SHAPES, SIZE } from "../js/pieces.js";
import { generateHand } from "../js/solver.js";
import { generateHandV2 } from "../js/generator.js";
import { clearLines, referenceSolves } from "../tests/reference-solver.js";

const version = process.argv[2] ?? "v1";
if (!["v1", "v2"].includes(version)) throw new Error("Use v1 or v2.");
const generate = version === "v2" ? generateHandV2 : generateHand;
let seed = 20251127;
function random() {
  seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  return seed / 2 ** 32;
}

function sampleBoard(occupied) {
  const board = Array(SIZE ** 2).fill(null);
  const indices = board.map((_, i) => i);
  for (let i = 0; i < occupied; i++) {
    const index = i + Math.floor(random() * (indices.length - i));
    [indices[i], indices[index]] = [indices[index], indices[i]];
    board[indices[i]] = 0;
  }
  return clearLines(board);
}

function stressBoard(i) {
  const pattern = i % 3;
  return Array.from({ length: SIZE ** 2 }, (_, index) => {
    const x = index % SIZE;
    const y = Math.floor(index / SIZE);
    if (pattern === 0) return x === (y + i / 3) % SIZE ? null : 0;
    // A single extra hole creates domino placements that compete for the same cell.
    const hole = (x + y) % 2 === 1 || (pattern === 2 && x === 3 && y === 3);
    return hole ? null : 0;
  });
}

const scenarios = [
  ["Empty", 3000, () => Array(SIZE ** 2).fill(null)],
  ["Partially occupied", 3500, () => sampleBoard(18 + Math.floor(random() * 21))],
  ["Congested", 3000, () => sampleBoard(42 + Math.floor(random() * 11))],
  ["Pathological (checker/diagonal/conflict)", 500, stressBoard],
  ["Full (no legal move)", 250, () => Array(SIZE ** 2).fill(0)],
];

const distribution = Array(SHAPES.length).fill(0);
const totals = { cases: 0, generated: 0, rejected: 0, fallbacks: 0, provenImpossible: 0, invalid: 0, timeouts: 0 };
const timings = [];
const report = [];
const validatedGoals = {};
let goalFallbacks = 0;
for (const [name, cases, makeBoard] of scenarios) {
  let remainder = [];
  const counts = { cases, generated: 0, rejected: 0, fallbacks: 0, provenImpossible: 0, invalid: 0, timeouts: 0 };
  const elapsed = [];
  for (let i = 0; i < cases; i++) {
    const board = makeBoard(i);
    const start = performance.now();
    const result = generate(board, remainder, { random });
    elapsed.push(performance.now() - start);
    counts.rejected += result.stats.rejected;
    counts.fallbacks += result.stats.fallbacks;
    if (result.status === "solvable") {
      counts.generated++;
      remainder = result.bag;
      if (!referenceSolves(board, result.hand)) counts.invalid++;
      const goal = result.stats.delivered;
      goalFallbacks += Number(!!result.stats.goalFallback);
      if (goal && goal !== "standard" && (validatedGoals[goal] ?? 0) < 20) {
        assert.ok(referenceSolves(board, result.hand, { goal }), `independent ${goal} validation`);
        validatedGoals[goal] = (validatedGoals[goal] ?? 0) + 1;
      }
      for (const id of result.hand) distribution[id]++;
    } else if (result.status === "impossible") {
      assert.ok(board.every(cell => cell !== null), "unexpected proof of unsolvability on a playable board");
      counts.provenImpossible++;
    } else {
      counts.timeouts++;
    }
  }
  for (const key of Object.keys(totals)) totals[key] += counts[key];
  timings.push(...elapsed);
  report.push({ scenario: name, ...counts, ...latency(elapsed) });
}

function latency(values) {
  const sorted = values.toSorted((a, b) => a - b);
  return {
    meanMs: Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(3)),
    p95Ms: Number(sorted[Math.floor(0.95 * sorted.length)].toFixed(3)),
    worstMs: Number(sorted.at(-1).toFixed(3)),
  };
}

const bySize = {};
distribution.forEach((count, index) => {
  const size = SHAPES[index].cells.length;
  bySize[size] = (bySize[size] ?? 0) + count;
});
console.table([...report, { scenario: "Total", ...totals, ...latency(timings) }]);
console.log("Independent objective checks", validatedGoals, "goal fallbacks:", goalFallbacks);
console.log("Filtered piece counts by size", bySize);
console.log("Filtered piece counts by orientation");
for (const [id, shape] of SHAPES.entries()) console.log(`${shape.name}: ${distribution[id]}`);
assert.equal(totals.generated, 10000);
assert.equal(totals.provenImpossible, 250);
assert.equal(totals.invalid, 0);
assert.equal(totals.timeouts, 0);
