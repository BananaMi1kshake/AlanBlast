import assert from "node:assert/strict";
import test from "node:test";
import { createGame, placePiece, SHAPES, SIZE } from "../js/game.js";
import { closeHandWorker, requestHand } from "../js/hand-request.js";
import { pageItems } from "../js/pager.js";
import { createPreviewState, PREVIEW } from "../js/preview-state.js";
import { canvasFootprint } from "../tools/canvas-renderer.js";

test("cached preview flags agree with committed placements, including intersecting lines", () => {
  const preview = createPreviewState();
  const flags = new Uint8Array(SIZE * SIZE);
  const empty = createGame().board;
  const intersection = empty.map((_, i) => i !== 63 && (i % SIZE === 7 || i >= 56) ? 0 : null);
  const uneven = empty.map((_, i) => (17 * i + 5) % 23 < 7 ? 1 : null);

  for (const board of [empty, intersection, uneven, empty]) {
    for (const [id, shape] of SHAPES.entries()) {
      const game = { ...createGame(), board, hand: [id, null, null] };
      for (let y = -1; y <= SIZE; y++) {
        for (let x = -1; x <= SIZE; x++) {
          const committed = placePiece(game, 0, x, y);
          assert.equal(preview(board, shape, x, y, flags), Boolean(committed), `${id} at ${x},${y}`);
          const expected = new Uint8Array(flags.length);
          for (const [left, top] of canvasFootprint(shape, x, y, 1)) {
            if (left >= 0 && left < SIZE && top >= 0 && top < SIZE) {
              expected[top * SIZE + left] = committed ? PREVIEW.valid : PREVIEW.invalid;
            }
          }
          for (const index of committed?.cleared ?? []) expected[index] |= PREVIEW.line;
          assert.deepEqual(flags, expected);
        }
      }
    }
  }
});

test("pagination keeps every material and level reachable, including partial pages", () => {
  for (const [count, size] of [[24, 8], [6, 4], [13, 4], [0, 4]]) {
    const items = Array.from({ length: count }, (_, i) => i);
    const { pages } = pageItems(items, 0, size);
    assert.deepEqual(Array.from({ length: pages }, (_, page) => pageItems(items, page, size).items).flat(), items);
    assert.equal(pageItems(items, -20, size).page, 0);
    assert.equal(pageItems(items, pages + 20, size).page, pages - 1);
  }
});

test("recently completed hand workers are reused and cancelled replies stay isolated", () => {
  const original = globalThis.Worker;
  const instances = [];
  globalThis.Worker = class extends EventTarget {
    constructor() { super(); instances.push(this); }
    postMessage(request) { this.request = request; }
    terminate() { this.terminated = true; }
    reply(data) { this.dispatchEvent(new MessageEvent("message", { data })); }
  };
  try {
    const reply = { status: "ok", hand: [0, 1, 2] };
    const answers = [];
    requestHand([0], [1], result => answers.push(result), 1000);
    instances[0].reply(reply);
    const cancel = requestHand([1], [2], () => assert.fail("Cancelled reply"), 1000);
    assert.equal(instances.length, 1);
    assert.deepEqual(instances[0].request, { board: [1], bag: [2] });
    cancel();
    assert.equal(instances[0].terminated, true);
    requestHand([2], [3], result => answers.push(result), 1000);
    instances[0].reply(reply);
    instances[1].reply(reply);
    assert.deepEqual(answers, [reply, reply]);
    closeHandWorker();
    assert.equal(instances[1].terminated, true);
  } finally {
    closeHandWorker();
    if (original === undefined) delete globalThis.Worker;
    else globalThis.Worker = original;
  }
});
