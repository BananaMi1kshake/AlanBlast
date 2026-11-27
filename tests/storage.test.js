import assert from "node:assert/strict";
import { test } from "node:test";
import { createGame, placePiece } from "../js/game.js";
import { loadProgress, saveProgress } from "../js/storage.js";

function memoryStorage() {
  const data = new Map();
  return {
    getItem(key) { return data.get(key) ?? null; },
    setItem(key, value) { data.set(key, value); },
  };
}

test("storage restores board, partially used hand, exact bag order and high score", () => {
  const storage = memoryStorage();
  const fresh = createGame(() => 0);
  const { game } = placePiece(fresh, 0, 0, 0);
  saveProgress(game, 42, storage);
  assert.deepEqual(loadProgress(storage), { game, highScore: 42 });
});

test("restarting saves a new game while retaining the record", () => {
  const storage = memoryStorage();
  const fresh = createGame(() => 0);
  const { game } = placePiece(fresh, 0, 0, 0);
  saveProgress(game, game.score, storage);
  saveProgress(fresh, game.score, storage);
  assert.deepEqual(loadProgress(storage), { game: fresh, highScore: game.score });
});

test("invalid game data is discarded and a valid high score survives", () => {
  const storage = memoryStorage();
  const broken = { ...createGame(() => 0), bag: [2, 2] };
  saveProgress(broken, 12, storage);
  assert.deepEqual(loadProgress(storage), { game: null, highScore: 12 });
});

test("missing, corrupt and inaccessible browser storage allow a fresh start", () => {
  const empty = { game: null, highScore: 0 };
  assert.deepEqual(loadProgress(memoryStorage()), empty);
  assert.deepEqual(loadProgress({ getItem: () => "{" }), empty);
  const inaccessible = {
    getItem() { throw new Error("Blocked"); },
    setItem() { throw new Error("Blocked"); },
  };
  assert.deepEqual(loadProgress(inaccessible), empty);
  assert.doesNotThrow(() => saveProgress(createGame(() => 0), 0, inaccessible));
});
