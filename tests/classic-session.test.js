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
