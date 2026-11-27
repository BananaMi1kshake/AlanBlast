import assert from "node:assert/strict";
import { test } from "node:test";
import { scorePlacement } from "../js/scoring.js";

const inactive = { combo: 0, comboWindow: 0 };

test("simultaneous clears increase the award per line", () => {
  for (const [lines, points] of [[1, 10], [2, 25], [3, 45], [4, 70], [5, 100]]) {
    assert.deepEqual(scorePlacement(4, lines, inactive, false), {
      points: points + 4, combo: 1, comboWindow: 3, bonus: 0,
    });
  }
});

test("combos beyond five multiply only line and simultaneous-clear points", () => {
  assert.deepEqual(scorePlacement(2, 2, { combo: 12, comboWindow: 3 }, true), {
    points: 427, combo: 13, comboWindow: 3, bonus: 100,
  });
});

for (const misses of [1, 2, 3]) {
  test(`a clear after ${misses} non-clearing placements ${misses < 3 ? "continues" : "restarts"} the combo`, () => {
    let progress = scorePlacement(1, 1, { combo: 5, comboWindow: 1 }, false);
    for (let move = 1; move <= misses; move++) {
      progress = scorePlacement(4, 0, progress, false);
      assert.equal(progress.points, 4);
      assert.equal(progress.comboWindow, 3 - move);
      assert.equal(progress.combo, move === 3 ? 0 : 6);
    }
    const clear = scorePlacement(1, 1, progress, false);
    assert.equal(clear.points, misses === 3 ? 11 : 71);
    assert.equal(clear.comboWindow, 3);
  });
}

test("Classic audit scoring examples follow configured values", () => {
  const fresh = { combo: 0, comboWindow: 0 };
  assert.equal(scorePlacement(5, 0, fresh, false).points, 5);
  assert.equal(scorePlacement(3, 1, fresh, false).points, 13);
  assert.equal(scorePlacement(2, 2, { combo: 3, comboWindow: 1 }, true).points, 202);
  assert.equal(scorePlacement(5, 4, { combo: 6, comboWindow: 3 }, false).points, 495);
});
