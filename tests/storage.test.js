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
  const fresh = { ...createGame(), hand: [0, 1, 2], bag: [3, 4, 5] };
  const { game } = placePiece(fresh, 0, 0, 0);
  saveProgress(game, 42, storage);
  assert.deepEqual(loadProgress(storage), { game, highScore: 42 });
});

test("restarting saves a new game while retaining the record", () => {
  const storage = memoryStorage();
  const fresh = { ...createGame(), hand: [0, 1, 2], bag: [3, 4, 5] };
  const { game } = placePiece(fresh, 0, 0, 0);
  saveProgress(game, game.score, storage);
  saveProgress(fresh, game.score, storage);
  assert.deepEqual(loadProgress(storage), { game: fresh, highScore: game.score });
});

test("invalid game data is discarded and a valid high score survives", () => {
  const storage = memoryStorage();
  const broken = { ...createGame(), bag: [2, 2] };
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
  assert.doesNotThrow(() => saveProgress(createGame(), 0, inaccessible));
});

test("Phase 1 saves preserve their score, shape IDs and old bag order", () => {
  const storage = memoryStorage();
  const legacy = {
    board: Array.from({ length: 64 }, (_, i) => i === 7 ? 24 : null),
    hand: [22, null, 19],
    bag: [24, 0],
    score: 37,
  };
  storage.setItem("alanblox.save.v1", JSON.stringify({ game: legacy, highScore: 51 }));
  assert.deepEqual(loadProgress(storage), {
    game: { ...legacy, combo: 0, comboWindow: 0, exhausted: false, theme: "mint" },
    highScore: 51,
  });
});

test("a restored combo and theme continue affecting subsequent play", () => {
  const storage = memoryStorage();
  const game = { ...createGame(), combo: 4, comboWindow: 1, theme: "orchard", score: 120, hand: [0, 1, 2] };
  game.board.fill(1, 0, 7);
  saveProgress(game, 150, storage);
  const restored = loadProgress(storage);
  assert.deepEqual(restored, { game, highScore: 150 });
  const result = placePiece(restored.game, 0, 7, 0);
  assert.equal(result.game.score, 271);
  assert.equal(result.game.combo, 5);
  assert.equal(result.game.comboWindow, 3);
  assert.equal(result.game.theme, "dusk");
});

test("Phase 2 active combos migrate with a fresh three-placement window", () => {
  const storage = memoryStorage();
  const { comboWindow, exhausted, ...legacy } = { ...createGame(), combo: 8, theme: "dusk", hand: [0, null, 3] };
  storage.setItem("alanblox.save.v1", JSON.stringify({ game: legacy, highScore: 200 }));
  assert.deepEqual(loadProgress(storage), {
    game: { ...legacy, comboWindow: 3, exhausted: false }, highScore: 200,
  });
});

test("saved pending deals can resume and proven exhaustion can be restored", () => {
  const storage = memoryStorage();
  const pending = { ...createGame(), score: 42, combo: 9, comboWindow: 2, bag: [3, 7] };
  for (const exhausted of [false, true]) {
    const game = { ...pending, exhausted };
    saveProgress(game, 100, storage);
    assert.deepEqual(loadProgress(storage), { game, highScore: 100 });
  }
});
