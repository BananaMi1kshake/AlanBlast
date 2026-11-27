import assert from "node:assert/strict";
import { test } from "node:test";
import { canPlace, createGame, drawHand, isGameOver, placePiece, SHAPES, SIZE } from "../js/game.js";

const empty = () => Array(SIZE ** 2).fill(null);
const initial = (board, hand = [0, 1, 2]) => ({ board, hand, bag: [3, 4, 5], score: 0 });
const seeded = () => {
  let state = 1729;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 2 ** 32;
  };
};

test("each complete bag contains every orientation once across hand boundaries", () => {
  const random = seeded();
  let bag = [];
  const stream = [];
  while (stream.length < SHAPES.length * 3) {
    const deal = drawHand(bag, random);
    assert.equal(deal.hand.length, 3);
    stream.push(...deal.hand);
    bag = deal.bag;
  }
  const ids = SHAPES.map((_, index) => index);
  for (let i = 0; i < SHAPES.length * 3; i += SHAPES.length) {
    const shuffled = stream.slice(i, i + SHAPES.length);
    assert.notDeepEqual(shuffled, ids);
    assert.deepEqual(shuffled.sort((a, b) => a - b), ids);
  }
});

test("the new game is empty, has three playable pieces and starts at zero", () => {
  const game = createGame(seeded());
  assert.deepEqual(game.board, empty());
  assert.equal(game.score, 0);
  assert.equal(game.hand.length, 3);
  assert.ok(game.hand.every(id => canPlace(game.board, SHAPES[id], 0, 0)));
  assert.equal(isGameOver(game), false);
});

test("placement respects shape holes, occupancy, edges and integer coordinates", () => {
  const board = empty();
  const corner = SHAPES[9];
  board[SIZE + 1] = 0;
  assert.equal(canPlace(board, corner, 0, 0), true);
  board[1] = 0;
  assert.equal(canPlace(board, corner, 0, 0), false);
  for (const [x, y] of [[-1, 0], [0, -1], [7, 0], [0, 7], [.5, 0]]) {
    assert.equal(canPlace(board, corner, x, y), false);
  }
  assert.equal(canPlace(board, corner, 6, 6), true);
});

test("an illegal move preserves board, hand, bag and score", () => {
  const board = empty();
  board[0] = 0;
  const game = initial(board, [0, 1, null]);
  const before = structuredClone(game);
  assert.equal(placePiece(game, 0, 0, 0), null);
  assert.equal(placePiece(game, 2, 1, 1), null);
  assert.deepEqual(game, before);
});

test("hand refills after the third placement and carries over the bag order", () => {
  const game = initial(empty());
  const first = placePiece(game, 0, 0, 0);
  assert.deepEqual(first.game.hand, [null, 1, 2]);
  assert.equal(first.game.score, 1);
  const second = placePiece(first.game, 1, 1, 0);
  assert.deepEqual(second.game.hand, [null, null, 2]);
  const third = placePiece(second.game, 2, 3, 0);
  assert.deepEqual(third.game.hand, [3, 4, 5]);
  assert.deepEqual(third.game.bag, []);
  assert.equal(third.game.score, 5);
  assert.deepEqual(game, initial(empty()));
});

test("a completed row clears without disturbing unrelated cells", () => {
  const board = empty();
  board.fill(1, 0, SIZE - 1);
  board[9] = 2;
  const result = placePiece(initial(board), 0, 7, 0);
  assert.deepEqual(result.rows, [0]);
  assert.deepEqual(result.columns, []);
  assert.deepEqual(result.game.board.slice(0, SIZE), Array(SIZE).fill(null));
  assert.equal(result.game.board[9], 2);
  assert.equal(result.points, 11);
});

test("a completed column clears without disturbing unrelated cells", () => {
  const board = empty();
  for (let y = 0; y < SIZE - 1; y++) board[y * SIZE + 4] = 1;
  board[8] = 1;
  const result = placePiece(initial(board), 0, 4, 7);
  assert.deepEqual(result.rows, []);
  assert.deepEqual(result.columns, [4]);
  assert.ok(result.game.board.every((cell, i) => i === 8 ? cell === 1 : cell === null));
  assert.equal(result.points, 11);
});

test("intersecting lines are discovered together, clear their union and each score", () => {
  const board = empty();
  for (let i = 0; i < SIZE; i++) {
    board[3 * SIZE + i] = 1;
    board[i * SIZE + 5] = 1;
  }
  board[3 * SIZE + 5] = null;
  board[0] = 6;
  const result = placePiece(initial(board), 0, 5, 3);
  assert.deepEqual(result.rows, [3]);
  assert.deepEqual(result.columns, [5]);
  assert.equal(result.cleared.length, 15);
  assert.equal(new Set(result.cleared).size, 15);
  assert.ok(result.game.board.every((cell, i) => i === 0 ? cell === 6 : cell === null));
  assert.equal(result.game.score, 21);
});

test("game over checks every remaining shape and ignores consumed slots", () => {
  const board = empty().map((_, i) => (i % SIZE + Math.floor(i / SIZE)) % 2 ? null : 0);
  assert.equal(isGameOver(initial(board, [null, 1, 2])), true);
  assert.equal(isGameOver(initial(board, [null, 1, 0])), false);
});

test("game over can occur on a newly dealt hand", () => {
  const board = empty().map((_, i) => (i % SIZE + Math.floor(i / SIZE)) % 2 ? null : 0);
  const result = placePiece(initial(board, [null, 0, null]), 1, 1, 0);
  assert.deepEqual(result.game.hand, [3, 4, 5]);
  assert.equal(isGameOver(result.game), true);
});
