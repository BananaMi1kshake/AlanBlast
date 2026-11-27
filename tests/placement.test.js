import assert from "node:assert/strict";
import { test } from "node:test";
import { boardGeometry, footprint, pieceSize } from "../js/geometry.js";
import { canPlace, createGame, placePiece, SHAPES, SIZE } from "../js/game.js";
import { dragFrame, grabOffset, placementTarget, touchClearance } from "../js/drag-geometry.js";
import { solveHand } from "../js/solver.js";

const viewportSizes = [271.25, 343.5, 464, 528.75];

for (const [id, shape] of SHAPES.entries()) {
  test(`${shape.name} snaps at every corner and fits its exact footprint`, () => {
    assert.equal(Math.max(...shape.cells.map(([x]) => x)) + 1, shape.width);
    assert.equal(Math.max(...shape.cells.map(([, y]) => y)) + 1, shape.height);
    assert.equal(Math.min(...shape.cells.map(([x]) => x)), 0);
    assert.equal(Math.min(...shape.cells.map(([, y]) => y)), 0);
    for (const x of [0, SIZE - shape.width]) {
      for (const y of [0, SIZE - shape.height]) {
        const indices = footprint(shape, x, y).map(([column, row]) => row * SIZE + column);
        // Fill the candidate rectangle outside the exact shape, including any interior gaps.
        const tight = Array(SIZE ** 2).fill(1);
        for (const index of indices) tight[index] = null;
        assert.ok(canPlace(tight, shape, x, y));
        assert.equal(solveHand(tight, [id]), "solvable");
        const blocked = [...tight];
        blocked[indices[0]] = 1;
        assert.equal(solveHand(blocked, [id]), "impossible");
        assert.equal(canPlace(blocked, shape, x, y), false);

        const game = { ...createGame(), hand: [id, 0, 0] };
        assert.ok(placePiece({ ...game, board: tight }, 0, x, y));
        assert.equal(placePiece({ ...game, board: blocked }, 0, x, y), null);
        const placed = placePiece(game, 0, x, y);
        assert.deepEqual(placed.game.board.flatMap((cell, i) => cell === id ? [i] : []), indices);
        for (const width of viewportSizes) {
          const grid = boardGeometry({ left: 13.125, top: 84.375, width, height: width }, 3.75, 3.75);
          const size = pieceSize(grid, shape);
          const left = grid.left + x * grid.stepX;
          const top = grid.top + y * grid.stepY;
          const rect = { left: 18, top: grid.bottom + 16, width: size.width / 2, height: size.height / 2 };
          const start = { x: rect.left + rect.width * .38, y: rect.top + rect.height * .62 };
          for (const reach of [grid.bottom + 15, grid.bottom + 82]) {
            for (const touch of [true, false]) {
              const clearance = touchClearance(grid, reach, 1.15);
              const offsets = grabOffset(rect, size, start, touch, clearance, "grab");
              const pointer = { x: left - offsets.endX + .12, y: top - offsets.endY - .12 };
              const visual = dragFrame(pointer, offsets, 1);
              assert.deepEqual(placementTarget(grid, visual.left, visual.top), { x, y });
              if (touch) assert.ok(pointer.y <= reach, "bottom row can be reached inside the viewport");
            }
          }
        }
      }
    }
    const board = createGame().board;
    for (const [x, y] of [[-1, 0], [0, -1], [SIZE - shape.width + 1, 0], [0, SIZE - shape.height + 1]]) {
      assert.equal(canPlace(board, shape, x, y), false);
    }
  });
}
