import assert from "node:assert/strict";
import { test } from "node:test";
import { canPlace, createGame, isGameOver, placePiece } from "../js/game.js";
import { SHAPES, SIZE } from "../js/pieces.js";
import { generateHand, solveHand } from "../js/solver.js";
import { referenceSolves } from "./reference-solver.js";

const empty = () => Array(SIZE ** 2).fill(null);
const diagonal = () => empty().map((_, i) => i % SIZE === Math.floor(i / SIZE) ? null : 0);
const checker = () => empty().map((_, i) => (i % SIZE + Math.floor(i / SIZE)) % 2 ? null : 0);

test("solves a hand with repeated shapes without modifying board or hand", () => {
  const board = Object.freeze(empty());
  const hand = Object.freeze([8, 8, 8]);
  assert.equal(solveHand(board, hand), "solvable");
  assert.ok(referenceSolves(board, hand));
});

test("pieces that individually fit can compete for the same cells and leave no solution", () => {
  const board = checker();
  board[3 * SIZE + 3] = null;
  assert.ok(canPlace(board, SHAPES[1], 2, 3));
  assert.ok(canPlace(board, SHAPES[0], 0, 1));
  assert.equal(solveHand(board, [1, 1, 0]), "impossible");
  assert.equal(referenceSolves(board, [1, 1, 0]), false);
});

test("a near-full board requires reordering and an intermediate simultaneous row and column clear", () => {
  const board = diagonal();
  const hand = [25, 26, 0];
  assert.equal(referenceSolves(board, hand, { fixedOrder: true }), false);
  assert.equal(referenceSolves(board, [0, 25, 26], { fixedOrder: true }), true);
  assert.equal(referenceSolves(board, hand, { clear: false }), false);
  assert.equal(solveHand(board, hand), "solvable");
});

test("a poor placement can strand a piece from a previously solvable hand", () => {
  const board = checker();
  board[3 * SIZE + 3] = null;
  const hand = [1, 0, 0];
  assert.ok(referenceSolves(board, hand));
  assert.equal(solveHand(board, hand), "solvable");
  const first = placePiece({ ...createGame(), board, hand }, 1, 3, 3);
  const second = placePiece(first.game, 2, 0, 1);
  assert.deepEqual(second.game.hand, [1, null, null]);
  assert.equal(isGameOver(second.game), true);
});

test("bounded proposals fall back deterministically over all shapes including duplicates", () => {
  const board = checker();
  const options = { attempts: 1 };
  const bag = Object.freeze([1, 2, 3, 27, 28, 29]);
  const result = generateHand(board, bag, options);
  assert.deepEqual(result, {
    status: "solvable", hand: [0, 0, 0], bag: [27, 28, 29],
    stats: { rejected: 1, fallbacks: 1 },
  });
  assert.ok(referenceSolves(board, result.hand));
  assert.deepEqual(generateHand(board, bag, options), result);
});

test("timeout is distinct from proven impossibility and never yields a hand", () => {
  const full = empty().fill(0);
  assert.equal(solveHand(full, [1, 2, 3], { maxChecks: 1 }), "timeout");
  assert.equal(solveHand(full, [1, 2, 3]), "impossible");
  assert.deepEqual(generateHand(full, [], { attempts: 0, maxChecks: 1 }), {
    status: "timeout", stats: { rejected: 0, fallbacks: 1 },
  });
  assert.deepEqual(generateHand(full, [], { attempts: 0 }), {
    status: "impossible", stats: { rejected: 0, fallbacks: 1 },
  });
  assert.deepEqual(generateHand(full, [1, 2, 3], { maxChecks: 1 }), {
    status: "timeout", stats: { rejected: 0, fallbacks: 0 },
  });
});
