import assert from "node:assert/strict";
import { test } from "node:test";
import { createGame } from "../js/game.js";
import { GENERATION_LIMITS, generateHandV2, selectStrategy } from "../js/generator.js";
import { referenceSolves } from "./reference-solver.js";
import { randomFrom } from "../tools/player-strategies.js";

const board = createGame().board;
const cross = [...board];
for (let i = 0; i < 8; i++) {
  cross[24 + i] = 1;
  cross[i * 8 + 5] = 1;
}
cross[29] = null;

test("fixed default weight boundaries and configurable overrides", () => {
  assert.deepEqual([.01, .3999, .4, .6999, .7, .8999, .9, .9999].map(draw => selectStrategy(() => draw)),
    ["standard", "standard", "line", "line", "cleanup", "cleanup", "allClear", "allClear"]);
  assert.equal(selectStrategy(() => .99, { line: 25 }), "line");
  assert.equal(selectStrategy(() => .99, { line: -1, allClear: Infinity }), "standard");
});

for (const strategy of ["standard", "line", "cleanup", "allClear"]) {
  test(`${strategy} returns a legal hand with the configured objective`, () => {
    const result = generateHandV2(cross, [0, 25, 26, 1, 5], { strategy, random: randomFrom(2) });
    assert.equal(result.stats.delivered, strategy);
    assert.equal(result.status, "solvable");
    assert.ok(referenceSolves(cross, result.hand, { goal: strategy === "standard" ? "completion" : strategy }));
  });
}

test("a failed or budget-stopped goal falls back to the reserved solvable hand", () => {
  const limits = { ...GENERATION_LIMITS, proposals: 1, guideChecks: 0 };
  const deal = generateHandV2(board, [0, 1, 2, 3], { strategy: "allClear", limits });
  assert.equal(deal.stats.goalFallback, true);
  assert.deepEqual(deal.hand, [0, 1, 2]);
  assert.deepEqual(deal.bag, [3]);
  const missed = generateHandV2(cross, [0, 25, 26, 3], {
    strategy: "allClear", limits: { ...limits, checksPerProposal: 1 },
  });
  assert.equal(missed.stats.goalTimeouts, 1);
  assert.equal(missed.stats.goalFallback, true);
  assert.ok(referenceSolves(cross, missed.hand));
});

test("guide can construct an all-clear and never strands the other tray pieces", () => {
  const limits = { ...GENERATION_LIMITS, proposals: 0 };
  const result = generateHandV2(cross, [4, 3, 2, 1], {
    strategy: "allClear", limits, random: randomFrom(71),
  });
  assert.equal(result.stats.guided, true);
  assert.ok(referenceSolves(cross, result.hand, { goal: "allClear" }));
  assert.ok(result.stats.goalChecks <= limits.guideChecks + limits.checksPerProposal);
});

test("base timeout is distinct from proven impossibility and exposes no hand", () => {
  const full = board.map(() => 0);
  const impossible = generateHandV2(full, [], { strategy: "allClear", random: randomFrom(5) });
  assert.equal(impossible.status, "impossible");
  const timeout = generateHandV2(full, [], { strategy: "allClear",
    limits: { ...GENERATION_LIMITS, standardChecks: 0 }, random: randomFrom(5) });
  assert.equal(timeout.status, "timeout");
  assert.equal(timeout.hand, undefined);
});
