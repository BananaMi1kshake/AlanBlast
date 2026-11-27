import assert from "node:assert/strict";
import { test } from "node:test";
import { comboMultiplier, scorePlacement } from "../js/scoring.js";

test("simultaneous clears increase the award per line", () => {
  for (const [lines, points] of [[1, 10], [2, 25], [3, 45], [4, 70], [5, 100]]) {
    assert.deepEqual(scorePlacement(4, lines, 0, false), { points: points + 4, combo: 1, bonus: 0 });
  }
});

test("combo multiplier rises with the combo and caps at five while the combo count grows", () => {
  assert.deepEqual([0, 1, 2, 3, 4, 5, 6].map(comboMultiplier), [1, 1, 2, 3, 4, 5, 5]);
  assert.deepEqual(scorePlacement(2, 2, 12, true), { points: 227, combo: 13, bonus: 100 });
  assert.deepEqual(scorePlacement(2, 0, 12, false), { points: 2, combo: 0, bonus: 0 });
});
