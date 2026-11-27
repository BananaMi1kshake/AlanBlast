import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { replayLevel } from "../js/adventure.js";
import { validateLevel } from "../js/level-solver.js";
import { WORLDS } from "../js/themes.js";
import { verifyWitness } from "./reference-adventure.js";

const { levels } = JSON.parse(await readFile(new URL("../adventure/levels.json", import.meta.url), "utf8"));

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
