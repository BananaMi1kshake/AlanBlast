import assert from "node:assert/strict";
import test from "node:test";
import { createClassicSession } from "../js/classic.js";
import { createGame } from "../js/game.js";
import { freshProfile, loadProfile, recordGameplay, restoreDiscoveries } from "../js/profile.js";
import { SHAPES } from "../js/pieces.js";
import { memoryStorage } from "../js/sandbox.js";
import { saveProgress } from "../js/storage.js";

const freshBoard = () => Object.assign(createGame(), {
  board: Array.from({ length: 64 }, (_, i) => i === 0 ? null : (i < 8 || i % 8 === 0 ? 0 : null)),
  hand: [0, 1, 2],
});

test("statistics count committed blocks, intersecting lines and all-clears once and retain achievements", () => {
  const storage = memoryStorage();
  const session = createClassicSession(storage);
  session.load(freshBoard());
  recordGameplay("classic", { type: "start" }, {}, storage);
  const result = session.play(0, 0, 0);
  session.persist();
  const event = { type: "move", result, shape: SHAPES[0] };
  assert.deepEqual(recordGameplay("classic", event, {}, storage), ["First Line", "Double Take", "Clean Slate"]);
  assert.equal(createClassicSession(storage).newlyStarted, false);
  assert.deepEqual(loadProfile(storage).classic, { started: 1, completed: 0, blocks: 1, lines: 2,
    allClears: 1, combo: 1, simultaneous: 2, points: 126, bestRun: 126 });
  assert.deepEqual(loadProfile(storage).materials, ["classic", "yarn", "sand"]);
  assert.deepEqual(recordGameplay("classic", { type: "end" }, {}, storage), []);
  assert.equal(loadProfile(storage).classic.completed, 1);
});

test("legacy Adventure completions restore discovery without creating historical counters", () => {
  const storage = memoryStorage();
  const levels = [{ id: "loom", material: "yarn" }, { id: "ice", material: "ice" }];
  restoreDiscoveries(levels, ["ice"], storage);
  assert.deepEqual(loadProfile(storage), { ...freshProfile(), materials: ["classic", "ice", "paper"] });
});

test("Adventure and Daily use separate authoritative stats and result-based achievements", () => {
  const storage = memoryStorage();
  const result = { rows: [1], columns: [], game: { score: 80, combo: 2, material: "wood" }, gemsCollected: [7], won: true };
  recordGameplay("adventure", { type: "start" }, {}, storage);
  assert.deepEqual(recordGameplay("adventure", { type: "move", result }, { firstWorld: true }, storage), ["Ocean Explorer"]);
  assert.deepEqual(recordGameplay("daily", { type: "move", result }, {}, storage), ["Daily Debut"]);
  const profile = loadProfile(storage);
  assert.deepEqual(profile.adventure, { attempts: 1, gems: 1, lines: 1, combo: 2 });
  assert.equal(profile.daily.bestRun, 80);
  assert.equal(profile.daily.wins, 1);
  assert.deepEqual(profile.materials, ["classic", "wood", "stained-glass"]);
});

test("Classic favorite appearance retains identical scores and geometry in all three modes", () => {
  for (const [mode, resultMaterial] of [["automatic", "yarn"], ["starting", "crystal"], ["fixed", "wood"]]) {
    const storage = memoryStorage();
    const session = createClassicSession(storage, { mode, material: "wood" });
    const { theme, material, fixedAppearance } = session.game;
    saveProgress({ ...freshBoard(), theme, material, fixedAppearance }, 0, storage);
    const restored = createClassicSession(storage);
    const result = restored.play(0, 0, 0);
    assert.equal(result.game.material, resultMaterial);
    assert.equal(result.points, 126);
    assert.deepEqual(result.game.board, Array(64).fill(null));
  }
});
