import assert from "node:assert/strict";
import { test } from "node:test";
import { createGame, placePiece } from "../js/game.js";
import { searchHand } from "../js/solver.js";
import { moveFeedback } from "../js/feedback.js";

function intersection() {
  const game = { ...createGame(), hand: [0, 25, 26] };
  for (let i = 0; i < 8; i++) {
    game.board[24 + i] = 1;
    game.board[i * 8 + 5] = 1;
  }
  game.board[29] = null;
  return game;
}

function replay(game, sequence) {
  let state = game;
  return sequence.map(({ id, x, y }) => {
    const result = placePiece(state, state.hand.indexOf(id), x, y);
    assert.ok(result, `legal witness move ${id} at ${x},${y}`);
    state = result.game;
    return result;
  });
}

test("one simultaneous all-clear pays one bonus, queues one celebration and keeps the tray", () => {
  const initial = intersection();
  assert.equal(placePiece(initial, 0, 4, 3), null);
  const result = placePiece(initial, 0, 5, 3);
  assert.deepEqual(result.rows, [3]);
  assert.deepEqual(result.columns, [5]);
  assert.equal(result.fullBoardClear, true);
  assert.equal(result.bonus, 100);
  assert.equal(result.points, 126);
  assert.equal(result.game.theme, "tidal");
  assert.equal(result.game.material, "yarn");
  assert.deepEqual(result.game.hand, [null, 25, 26]);
  assert.deepEqual(moveFeedback({ lines: 2, combo: 1, fullBoardClear: true }).sounds, [{ name: "allClear" }]);
  const next = placePiece(result.game, 1, 0, 0);
  assert.equal(next.fullBoardClear, false);
  assert.equal(next.bonus, 0);
  assert.equal(next.game.theme, "tidal");
  const solution = searchHand(initial.board, initial.hand, { goal: "allClear" });
  assert.equal(solution.status, "solvable");
  assert.equal(replay(initial, solution.sequence)[0].fullBoardClear, true);
});

test("a two-step all-clear requires an intermediate line clear and allows a third placement", () => {
  const game = { ...createGame(), hand: [0, 25, 26] };
  game.board.fill(1, 0, 7);
  for (let y = 5; y <= 7; y++) game.board[y * 8] = 1;
  // The single completes row 1 and releases the top cell of column 1 for the five-bar.
  const solution = searchHand(game.board, game.hand, { goal: "allClear" });
  assert.equal(solution.status, "solvable");
  const results = replay(game, solution.sequence);
  assert.equal(results[0].rows.length, 1);
  assert.equal(results[0].fullBoardClear, false);
  assert.equal(results[1].fullBoardClear, true);
  assert.equal(results[2].game.hand.every(id => id === null), true);
});

test("minimum occupancy can occur earlier than maximum end-of-hand reduction", () => {
  const game = intersection();
  const minimum = searchHand(game.board, game.hand, { goal: "minimum" });
  const reduction = searchHand(game.board, game.hand, { goal: "reduction" });
  assert.equal(minimum.minimumOccupied, 0);
  assert.ok(reduction.finalOccupied > 0);
  assert.equal(reduction.reduction, 14 - reduction.finalOccupied);
  assert.equal(searchHand(game.board, game.hand, { goal: "cleanup" }).status, "solvable");
  assert.equal(searchHand(game.board, game.hand, { goal: "line", maxChecks: 0 }).status, "timeout");
  assert.equal(searchHand(createGame().board, [0, 0, 0], { goal: "allClear" }).status, "unmet");
});

test("restore keeps an all-clear's world and unplayed slots before the next deal", async () => {
  const { loadProgress, saveProgress } = await import("../js/storage.js");
  const first = placePiece(intersection(), 0, 5, 3);
  let saved;
  const storage = { setItem(_, value) { saved = value; }, getItem() { return saved; } };
  saveProgress(first.game, first.game.score, storage);
  const restored = loadProgress(storage).game;
  assert.deepEqual(restored, first.game);
  const next = placePiece(restored, 1, 0, 0);
  assert.equal(next.game.theme, first.game.theme);
  assert.equal(next.bonus, 0);
});

test("objective search keeps input immutable; tight analytical budgets stay inconclusive", () => {
  const game = intersection();
  Object.freeze(game.board);
  Object.freeze(game.hand);
  assert.equal(searchHand(game.board, game.hand, { goal: "reduction", maxChecks: 1 }).status, "timeout");
  assert.equal(searchHand(game.board, game.hand, { goal: "reduction" }).status, "solvable");
  assert.equal(game.board[29], null);
});

test("a duplicate-piece all-clear can require the entire hand", () => {
  const game = { ...createGame(), hand: [1, 3, 3] };
  const solution = searchHand(game.board, game.hand, { goal: "allClear" });
  assert.equal(solution.status, "solvable");
  assert.deepEqual(replay(game, solution.sequence).map(result => result.fullBoardClear), [false, false, true]);
});
