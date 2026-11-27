import assert from "node:assert/strict";
import { test } from "node:test";
import { canPlace, createGame, drawHand, isGameOver, placePiece, SHAPES, SIZE } from "../js/game.js";
import { DEFAULT_THEME, THEMES } from "../js/themes.js";

const empty = () => Array(SIZE ** 2).fill(null);
const initial = (board, hand = [0, 1, 2]) => ({ board, hand, bag: [3, 4, 5], score: 0, combo: 0, theme: DEFAULT_THEME });
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
  assert.equal(game.combo, 0);
  assert.equal(game.theme, DEFAULT_THEME);
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
  game.combo = 4;
  game.theme = THEMES[2];
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
  assert.equal(result.game.score, 26);
  assert.equal(result.game.combo, 1);
  assert.equal(result.fullBoardClear, false);
  assert.equal(result.game.theme, DEFAULT_THEME);
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

test("five-cell bars, rectangles, elbows and the cross extend a unique catalog", () => {
  const geometries = new Set(SHAPES.map(shape => JSON.stringify(shape.cells)));
  assert.equal(SHAPES.length, 38);
  assert.equal(geometries.size, SHAPES.length);
  assert.equal(SHAPES.filter(shape => shape.width === 5 || shape.height === 5).length, 2);
  assert.equal(SHAPES.filter(shape => shape.name.endsWith("rectangle")).length, 2);
  assert.equal(SHAPES.filter(shape => shape.name.startsWith("Elbow")).length, 8);
  assert.equal(SHAPES.find(shape => shape.name === "Cross").cells.length, 5);
});

test("shuffled orientations are distributed across every position in the bag", () => {
  const random = seeded();
  const size = SHAPES.length;
  const samples = 12000;
  const counts = Array.from({ length: size }, () => Array(size).fill(0));
  let remainder = [];
  let position = 0;
  // A whole multiple of both bag and hand sizes includes every hand-boundary alignment.
  for (let i = 0; i < samples * size / 3; i++) {
    const { hand, bag } = drawHand(remainder, random);
    remainder = bag;
    for (const id of hand) {
      counts[position][id]++;
      position = (position + 1) % size;
    }
  }

  const expected = samples / size;
  const chiSquare = counts.flat().reduce((sum, count) => sum + (count - expected) ** 2 / expected, 0);
  // Rows and columns have fixed totals. The generous bound flags material bias, and the seed makes it repeatable.
  const degreesOfFreedom = (size - 1) ** 2;
  assert.ok(chiSquare < 1.25 * degreesOfFreedom, `chi-square statistic: ${chiSquare}`);
});

test("consecutive clearing placements build one combo per move across a hand refill", () => {
  const board = empty();
  for (let y = 0; y < 4; y++) board.fill(1, y * SIZE, (y + 1) * SIZE - 1);
  board[63] = 7;
  let game = { ...initial(board, [0, 0, 0]), bag: [0, 5, 6] };

  for (let y = 0; y < 4; y++) {
    const result = placePiece(game, y % 3, 7, y);
    assert.deepEqual(result.rows, [y]);
    assert.equal(result.game.combo, y + 1);
    assert.equal(result.points, 1 + 10 * (y + 1));
    game = result.game;
  }

  const quietMove = placePiece(game, 1, 0, 5);
  assert.equal(quietMove.points, 4);
  assert.equal(quietMove.game.combo, 0);
  const later = quietMove.game;
  later.board.fill(1, 6 * SIZE, 7 * SIZE - 1);
  later.hand[2] = 0;
  const newCombo = placePiece(later, 2, 7, 6);
  assert.equal(newCombo.game.combo, 1);
  assert.equal(newCombo.points, 11);
});

test("a full-board clear adds a fixed bonus, advances the palette, and wraps after six themes", () => {
  assert.equal(new Set(THEMES).size, 6);
  let theme = DEFAULT_THEME;
  for (let i = 0; i < THEMES.length; i++) {
    const board = empty();
    board.fill(1, 0, SIZE - 1);
    const game = { ...initial(board), combo: 1, theme };
    const result = placePiece(game, 0, 7, 0);
    assert.equal(result.fullBoardClear, true);
    assert.equal(result.bonus, 100);
    assert.equal(result.points, 121);
    assert.equal(result.game.combo, 2);
    assert.deepEqual(result.game.board, empty());
    assert.equal(result.game.theme, THEMES[(i + 1) % THEMES.length]);
    theme = result.game.theme;
  }
  const firstPlacement = placePiece(initial(empty()), 0, 0, 0);
  assert.equal(firstPlacement.fullBoardClear, false);
  assert.equal(firstPlacement.bonus, 0);
});

test("a multi-line board clear advances the combo only once", () => {
  const board = empty();
  for (let y = 0; y < 3; y++) board.fill(1, y * SIZE, (y + 1) * SIZE - 1);
  const game = { ...initial(board, [4, 0, 1]), combo: 2 };
  const result = placePiece(game, 0, 7, 0);
  assert.deepEqual(result.rows, [0, 1, 2]);
  assert.equal(result.game.combo, 3);
  assert.equal(result.points, 3 + 45 * 3 + 100);
});

test("any distinct orientation can follow the first with near-equal frequency", () => {
  const random = seeded();
  const size = SHAPES.length;
  const samples = 24000;
  const counts = Array.from({ length: size }, () => Array(size).fill(0));
  for (let i = 0; i < samples; i++) {
    const { hand: [first, second] } = drawHand([], random);
    counts[first][second]++;
  }
  const expected = samples / (size * (size - 1));
  let chiSquare = 0;
  for (let first = 0; first < size; first++) {
    assert.equal(counts[first][first], 0);
    for (let second = 0; second < size; second++) {
      if (first === second) continue;
      chiSquare += (counts[first][second] - expected) ** 2 / expected;
    }
  }
  assert.ok(chiSquare < 1.25 * (size * (size - 1) - 1), `chi-square statistic: ${chiSquare}`);
});

test("refills are independent of the board, score, combo and theme", () => {
  const fresh = { ...initial(empty(), [0, null, null]), bag: [11, 10] };
  const board = empty();
  board.fill(1, 0, 7);
  const progressed = { ...fresh, board, score: 900, combo: 6, theme: THEMES[2] };
  const ordinaryMove = placePiece(fresh, 0, 7, 0, seeded());
  const clearingMove = placePiece(progressed, 0, 7, 0, seeded());
  assert.equal(ordinaryMove.fullBoardClear, false);
  assert.equal(clearingMove.fullBoardClear, true);
  assert.deepEqual(clearingMove.game.hand, ordinaryMove.game.hand);
  assert.deepEqual(clearingMove.game.bag, ordinaryMove.game.bag);
});
