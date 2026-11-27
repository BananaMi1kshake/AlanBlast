import assert from "node:assert/strict";
import test from "node:test";
import { createClassicSession } from "../js/classic.js";
import { createGame } from "../js/game.js";
import { ALL_MATERIALS, LEGACY_MATERIALS, newRotation, rotateMaterial, validRotation } from "../js/material-rotation.js";
import { EXPANDED_MATERIALS } from "../js/material-library.js";
import { freshProfile, restoreDiscoveries } from "../js/profile.js";
import { memoryStorage } from "../js/sandbox.js";
import { loadProgress, saveProgress } from "../js/storage.js";

test("rotation visits each cosmetic before refilling and never repeats the current material", () => {
  const legacy = newRotation(LEGACY_MATERIALS, 1942);
  assert.equal(legacy, undefined);
  let previous = "classic";
  let rotation = newRotation(ALL_MATERIALS, 1942);
  const seen = new Set();
  for (let i = 0; i < 120; i++) {
    const next = rotateMaterial(previous, rotation);
    assert.ok(validRotation(next.rotation));
    if (i < 24) seen.add(next.material);
    assert.notEqual(next.material, previous);
    previous = next.material;
    rotation = next.rotation;
  }
  assert.deepEqual(seen, new Set(ALL_MATERIALS));
});

test("cosmetic RNG changes no scores, combo, board, hand or gameplay bag and survives reload", () => {
  const board = Array.from({ length: 64 }, (_, i) => i === 0 ? null : i < 8 || i % 8 === 0 ? 4 : null);
  const base = { ...createGame(), board, hand: [0, 1, 2], bag: [5, 7], combo: 4, comboWindow: 1 };
  const snapshots = [];
  const random = Math.random;
  Math.random = () => { throw Error("Cosmetics used the gameplay randomness source"); };
  try {
    for (const seed of [42, 4234, undefined]) {
      const storage = memoryStorage();
      const rotation = seed ? newRotation(ALL_MATERIALS, seed) : undefined;
      saveProgress({ ...base, ...(rotation && { rotation }) }, 0, storage);
      const s = createClassicSession(storage);
      const { game, points } = s.play(0, 0, 0);
      s.persist();
      assert.deepEqual(loadProgress(storage).game.rotation, game.rotation);
      snapshots.push({ board: game.board, hand: game.hand, bag: game.bag, points, combo: game.combo });
    }
  } finally { Math.random = random; }
  assert.deepEqual(snapshots[0], snapshots[2]);
  assert.deepEqual(snapshots[1], snapshots[2]);
});

test("expanded discovery rules can all be earned without additional Classic all-clears", () => {
  const context = { levelCount: 48, dailyDates: 5 };
  const profile = freshProfile();
  Object.assign(profile.classic, { lines: 8, combo: 6, blocks: 40 });
  profile.daily.wins = 5;
  assert.ok(Object.values(EXPANDED_MATERIALS).every(rule => rule.earns(profile, context)));
  const store = memoryStorage();
  const levels = [{ id: "level", material: "yarn" }];
  const result = restoreDiscoveries(levels, ["level"], store);
  assert.ok(result.materials.includes("yarn"));
  assert.ok(result.materials.includes("paper"));
  assert.equal(result.classic.allClears, 0);
});
