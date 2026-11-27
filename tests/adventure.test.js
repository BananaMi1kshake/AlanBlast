import assert from "node:assert/strict";
import { test } from "node:test";
import { levelError, objectiveProgress, playLevel, remainingMoves, startLevel } from "../js/adventure.js";
import { createAdventureSession, isUnlocked, loadAdventure } from "../js/adventure-storage.js";
import { validateLevel } from "../js/level-solver.js";
import { createClassicSession } from "../js/classic.js";
import { memoryStorage } from "../js/sandbox.js";

const empty = Array(8).fill("........");
const cross = empty.map((row, i) => i === 3 ? "AAAAA.AA" : ".....A..");
const fixture = {
  id: "cross", name: "Crystal Junction", world: "dusk", material: "crystal", palette: "dusk", difficulty: "Intro",
  board: cross, gems: [28, 21], hands: [[0, 1, 2]], objectives: [
    { type: "gems", target: 2 }, { type: "lines", target: 2 }, { type: "allClear", target: 1 },
    { type: "score", target: 126 }, { type: "combo", target: 1 },
  ], maxMoves: 1,
};

test("simultaneous clears collect each marked cell once, retain Adventure material, and beat the limit", () => {
  assert.equal(levelError(fixture), null);
  const run = startLevel(fixture);
  assert.equal(playLevel(fixture, run, 0, 4, 3), null);
  const result = playLevel(fixture, run, 0, 5, 3);
  assert.deepEqual(result.rows, [3]);
  assert.deepEqual(result.columns, [5]);
  assert.deepEqual(result.gemsCollected, [28, 21]);
  assert.equal(new Set(result.cleared).size, 15);
  assert.equal(result.points, 126);
  assert.equal(result.game.material, "crystal");
  assert.equal(result.game.theme, "dusk");
  assert.equal(result.run.status, "won");
  assert.ok(objectiveProgress(fixture, result.run).every(goal => goal.complete));
  assert.equal(remainingMoves(fixture, result.run), 0);
  assert.deepEqual(result.game.hand, [null, 1, 2]);
  assert.equal(playLevel(fixture, result.run, 1, 0, 0), null);
});

test("Adventure can fail by limit, tray supply, or blocked geometry", () => {
  const limit = playLevel(fixture, startLevel(fixture), 0, 0, 0);
  assert.equal(limit.run.reason, "limit");
  const supply = { ...fixture, hands: [[0]], maxMoves: undefined };
  assert.equal(playLevel(supply, startLevel(supply), 0, 0, 0).run.reason, "supply");
  const board = Array.from({ length: 8 }, (_, y) => y % 2 ? ".A.A.A.A" : "A.A.A.A.");
  const blocked = { ...fixture, board, gems: [], maxMoves: undefined,
    objectives: [{ type: "score", target: 500 }], hands: [[0, 8, 8]] };
  assert.equal(playLevel(blocked, startLevel(blocked), 0, 1, 0).run.reason, "blocked");
  const blockedOpening = { ...blocked, hands: [[8, 8]] };
  assert.equal(startLevel(blockedOpening).reason, "blocked");
});

test("specific trays refill in order and combo objectives keep achieved progress", () => {
  const level = { ...fixture, hands: [[0], [0]], objectives: [{ type: "combo", target: 2 }], maxMoves: 2,
    board: ["AAAAAAA.", "AAAAAAA.", ...empty.slice(2)], gems: [] };
  const first = playLevel(level, startLevel(level), 0, 7, 0);
  assert.equal(first.refill, true);
  assert.deepEqual(first.game.hand, [0, null, null]);
  const second = playLevel(level, first.run, 0, 7, 1);
  assert.equal(second.won, true);
  assert.equal(objectiveProgress(level, second.run)[0].value, 2);
});

test("Adventure unlocks the next level and replay cannot erase progression or Classic state", () => {
  const storage = memoryStorage();
  const classic = createClassicSession(storage);
  classic.applyDeal({ status: "solvable", hand: [0, 1, 2], bag: [3] });
  classic.play(0, 0, 0);
  classic.persist();
  const levels = [fixture, { ...fixture, id: "next" }];
  assert.equal(createAdventureSession(levels, "next", storage), null);
  const session = createAdventureSession(levels, fixture.id, storage);
  session.play(0, 5, 3);
  session.persist();
  const saved = loadAdventure(levels, storage);
  assert.ok(isUnlocked(levels, saved.completed, "next"));
  assert.equal(saved.current.run.status, "won");
  const replay = createAdventureSession(levels, fixture.id, storage);
  replay.restart();
  replay.persist();
  assert.deepEqual(loadAdventure(levels, storage).completed, ["cross"]);
  assert.equal(createClassicSession(storage).game.score, 1);
});

test("the validator returns a replayable witness and distinguishes invalid, impossible and timeout", () => {
  assert.equal(validateLevel({ ...fixture, gems: [0] }).status, "invalid");
  assert.equal(validateLevel(fixture, { maxNodes: 0 }).status, "timeout");
  const proof = validateLevel(fixture);
  assert.equal(proof.status, "solvable");
  assert.deepEqual(proof.witness, [{ slot: 0, x: 5, y: 3 }]);
  assert.equal(validateLevel({ ...fixture, objectives: [{ type: "score", target: 500 }] }).status, "impossible");
});
