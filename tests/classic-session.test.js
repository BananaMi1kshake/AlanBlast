import assert from "node:assert/strict";
import { test } from "node:test";
import { createClassicSession } from "../js/classic.js";
import { createGame } from "../js/game.js";
import { memoryStorage } from "../js/sandbox.js";
import { saveProgress } from "../js/storage.js";

test("Classic resumes the original save, refills only a spent tray, and keeps its best when restarted", () => {
  const storage = memoryStorage();
  const initial = { ...createGame(), hand: [0, null, null], score: 12 };
  saveProgress(initial, 20, storage);
  const session = createClassicSession(storage);
  assert.equal(session.waiting, false);
  assert.equal(session.play(0, 0, 0).game.score, 13);
  assert.equal(session.waiting, true);
  session.applyDeal({ status: "solvable", hand: [1, 2, 3], bag: [0] });
  session.persist();
  assert.deepEqual(createClassicSession(storage).game.hand, [1, 2, 3]);
  session.restart();
  assert.equal(session.game.score, 0);
  assert.equal(session.best, 20);
});

test("equipping a material preserves the current run and its automatic all-clear order", () => {
  const storage = memoryStorage();
  const initial = { ...createGame(), hand: [0, 1, 2], bag: [3, 4], score: 12, combo: 2, comboWindow: 1 };
  initial.board.fill(0, 0, 7);
  saveProgress(initial, 20, storage);
  const session = createClassicSession(storage);
  assert.equal(session.equipMaterial("unknown"), false);
  assert.equal(session.equipMaterial("glitter"), true);
  assert.deepEqual(session.game, { ...initial, material: "glitter", palette: "desert" });
  assert.equal(session.equipMaterial("glitter"), false);
  assert.equal(session.best, 20);
  session.persist();

  const restored = createClassicSession(storage);
  assert.deepEqual(restored.game, session.game);
  const result = restored.play(0, 7, 0);
  assert.equal(result.fullBoardClear, true);
  assert.equal(result.game.score, 143);
  assert.equal(result.game.theme, "tidal");
  assert.equal(result.game.material, "yarn");
  assert.equal(result.game.palette, undefined);
});

test("equipping an active fixed run lasts through a clear and leaves its next-run favorite in place", () => {
  const storage = memoryStorage();
  const game = { ...createGame(), hand: [0, 1, 2], fixedAppearance: true };
  game.board.fill(0, 0, 7);
  saveProgress(game, 0, storage);
  const session = createClassicSession(storage, { mode: "fixed", material: "wood" });
  assert.equal(session.equipMaterial("jelly"), true);
  const result = session.play(0, 7, 0);
  assert.equal(result.game.material, "jelly");
  assert.equal(result.game.palette, "desert");
  session.restart();
  assert.equal(session.game.material, "wood");
});
