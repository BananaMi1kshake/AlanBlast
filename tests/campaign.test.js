import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { replayLevel } from "../js/adventure.js";
import { ADVENTURE_KEY, isUnlocked, loadAdventure } from "../js/adventure-storage.js";
import { validateLevel } from "../js/level-solver.js";
import { memoryStorage } from "../js/sandbox.js";
import { WORLDS } from "../js/themes.js";
import { verifyWitness } from "./reference-adventure.js";

const { levels } = JSON.parse(await readFile(new URL("../adventure/levels.json", import.meta.url), "utf8"));

test("the expanded campaign preserves completed Phase 6 levels and the saved active transcript", () => {
  const legacyIds = ["ocean-first-gap", "ocean-two-tides", "loom-pair", "loom-open-seam", "wood-crosscut",
    "wood-double-board", "jelly-bounce-back", "jelly-second-serving", "geode-diagonal", "geode-five-points",
    "kiln-twin-flues", "kiln-three-firings", "ice-narrow-thaw", "ice-whiteout", "bakery-layer-cake", "bakery-long-table"];
  assert.deepEqual(levels.slice(0, legacyIds.length).map(level => level.id), legacyIds);
  const storage = memoryStorage();
  const level = levels[15];
  const history = level.validation.witness.slice(0, 2);
  storage.setItem(ADVENTURE_KEY, JSON.stringify({ version: 1, completed: legacyIds,
    current: { levelId: level.id, history } }));
  const restored = loadAdventure(levels, storage);
  assert.deepEqual(restored.completed, legacyIds);
  assert.deepEqual(restored.current.run.history, history);
  assert.ok(isUnlocked(levels, restored.completed, levels[16].id));
  assert.ok(!isUnlocked(levels, restored.completed, levels[17].id));
  assert.ok(levels.slice(16).every(entry => entry.chapter === 2));
});

test("the catalog has unique IDs, all eight worlds, and every objective type", () => {
  assert.equal(new Set(levels.map(level => level.id)).size, levels.length);
  assert.deepEqual(new Set(levels.map(level => level.world)), new Set(Object.keys(WORLDS)));
  assert.deepEqual(new Set(levels.flatMap(level => level.objectives.map(goal => goal.type))),
    new Set(["score", "gems", "rows", "columns", "lines", "allClear", "combo"]));
});

for (const level of levels) {
  test(`${level.name} has a legal independently replayable completion witness`, () => {
    assert.equal(level.validation.version, 1);
    const reference = verifyWitness(level);
    assert.equal(validateLevel(level, { maxNodes: 0 }).method, "replay");
    const run = replayLevel(level, level.validation.witness);
    assert.equal(run.status, "won");
    assert.equal(run.game.score, reference.score);
    assert.equal(run.collected, reference.gems);
    assert.equal(run.game.material, level.material);
  });
}
