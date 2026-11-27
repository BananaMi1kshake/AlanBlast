import assert from "node:assert/strict";
import test from "node:test";
import { boardGeometry, pieceSize } from "../js/geometry.js";
import { boardMoved, dragFrame, grabOffset, INPUT, inputTuning, placementTarget, touchClearance, visualOrigin } from "../js/drag-geometry.js";
import { SHAPES } from "../js/pieces.js";

const grid = boardGeometry({ left: 16, top: 84, width: 320, height: 320 }, 4, 4);

test("visual motion is continuous while preview advances only at a cell boundary", () => {
  const shape = SHAPES[0];
  const size = pieceSize(grid, shape);
  const start = { x: 76, y: 510 };
  const offsets = grabOffset({ left: 64, top: 498, width: 24, height: 24 }, size, start, true, 32, "grab");
  function sample(relative) {
    const frame = dragFrame({ x: grid.left - offsets.endX + relative, y: grid.top - offsets.endY }, offsets, 1);
    const target = placementTarget(grid, frame.left, frame.top);
    return { visual: visualOrigin(frame, grid, shape, target, false), target };
  }
  const initial = sample(1);
  const nudged = sample(1.5);
  const across = sample(grid.stepX / 2 + .3);
  assert.equal(nudged.visual.left - initial.visual.left, .5);
  assert.deepEqual(nudged.target, initial.target);
  assert.deepEqual(across.target, { x: 1, y: 0 });
  assert.deepEqual(visualOrigin(across.visual, grid, shape, across.target, true), { left: grid.left + grid.stepX, top: grid.top });
});

test("pickup begins at the tray and keeps an off-center grab anchored as it scales", () => {
  const size = pieceSize(grid, SHAPES[25]);
  const rect = { left: 40, top: 455, width: size.width * .48, height: size.height * .48 };
  const fractions = { x: .79, y: .25 };
  const point = { x: rect.left + rect.width * fractions.x, y: rect.top + rect.height * fractions.y };
  const offsets = grabOffset(rect, size, point, false, 0, "grab");
  assert.deepEqual(dragFrame(point, offsets, 0), { left: rect.left, top: rect.top, scaleX: .48, scaleY: .48 });
  for (const progress of [.1, .3, .7, 1]) {
    const pointer = { x: point.x + 19.4 * progress, y: point.y - 27 * progress };
    const frame = dragFrame(pointer, offsets, progress);
    assert.ok(Math.abs(frame.left + size.width * frame.scaleX * fractions.x - pointer.x) < 1e-9);
    assert.ok(Math.abs(frame.top + size.height * frame.scaleY * fractions.y - pointer.y) < 1e-9);
  }
});

test("touch clearance scales with cell pitch and leaves room to position the bottom edge", () => {
  assert.equal(touchClearance(grid, 630, INPUT.touchLift), grid.stepY * 1.15);
  assert.equal(touchClearance(grid, grid.bottom + 23, INPUT.touchLift), 19);
  assert.equal(touchClearance(grid, grid.bottom + 2, INPUT.touchLift), 0);
  const shape = SHAPES[26];
  const size = pieceSize(grid, shape);
  const offsets = grabOffset({ left: 75, top: 440, width: 12, height: 68 }, size, { x: 81, y: 473 }, true, 19, "grab");
  const result = dragFrame({ x: grid.left - offsets.endX, y: grid.bottom + 19 }, offsets, 1);
  assert.deepEqual(placementTarget(grid, result.left, result.top), { x: 0, y: 3 });
});

test("optional hysteresis only holds the last cell within the configured band", () => {
  const at = offset => grid.left + grid.stepX * offset;
  const previous = { x: 0, y: 0 };
  assert.equal(placementTarget(grid, at(.56), grid.top, previous).x, 1);
  assert.equal(placementTarget(grid, at(.56), grid.top, previous, .1).x, 0);
  assert.equal(placementTarget(grid, at(.62), grid.top, previous, .1).x, 1);
  assert.equal(placementTarget(grid, at(2.1), grid.top, previous, .1).x, 2);
});

test("the geometry check tolerates fractional layout noise but sees a moved board", () => {
  assert.equal(boardMoved(grid, { ...grid, left: grid.left + .24 }), false);
  assert.equal(boardMoved(grid, { ...grid, top: grid.top + 2 }), true);
  assert.equal(boardMoved(grid, { ...grid, stepY: grid.stepY - .75 }), true);
});

test("lab values are bounded and live defaults are continuous with no hysteresis", () => {
  assert.deepEqual(inputTuning(), INPUT);
  const tuned = inputTuning({ touchLift: 7, pickupMs: -5, hysteresis: .8, previewOpacity: Infinity, snapVisual: true });
  assert.equal(tuned.touchLift, 2.5);
  assert.equal(tuned.pickupMs, 0);
  assert.equal(tuned.hysteresis, .3);
  assert.equal(tuned.previewOpacity, INPUT.previewOpacity);
  assert.equal(tuned.snapVisual, true);
  assert.equal(INPUT.snapVisual, false);
  assert.equal(INPUT.hysteresis, 0);
});
