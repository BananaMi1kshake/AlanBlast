import assert from "node:assert/strict";
import { test } from "node:test";
import { createCounter } from "../js/motion.js";

function counter() {
  const queued = new Map();
  const values = [];
  let id = 0;
  const update = createCounter(value => values.push(value), {
    request(callback) { queued.set(++id, callback); return id; },
    cancel(frame) { queued.delete(frame); },
    duration: 100,
  });
  return { update, values, queued, tick(time) {
    const callbacks = [...queued.values()];
    queued.clear();
    callbacks.forEach(callback => callback(time));
  } };
}

test("a rapid score update retargets the running counter from its current display", () => {
  const { update, values, queued, tick } = counter();
  update(0);
  update(120);
  tick(0);
  tick(40);
  const mid = values.at(-1);
  assert.ok(mid > 0 && mid < 120);
  update(400);
  update(400);
  assert.equal(queued.size, 1);
  tick(45);
  assert.equal(values.at(-1), mid);
  tick(145);
  assert.equal(values.at(-1), 400);
  assert.equal(queued.size, 0);
});

test("restart and reduced motion commit an exact value and cancel queued frames", () => {
  const { update, values, queued, tick } = counter();
  update(80);
  update(100);
  tick(1);
  update(0, false);
  tick(200);
  assert.equal(values.at(-1), 0);
  update(500);
  update(500, false);
  assert.equal(queued.size, 0);
  assert.equal(values.at(-1), 500);
});
