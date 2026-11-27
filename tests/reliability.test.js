import assert from "node:assert/strict";
import test from "node:test";
import { createSaveBuffer } from "../js/save-buffer.js";
import { memoryStorage } from "../js/sandbox.js";
import { canPresentStartup, LAUNCH_TIMING } from "../js/startup.js";

test("cold startup plays once, respects motion and avoids replay on internal navigation", () => {
  const fresh = { reduced: false, hidden: false, visited: false, internalNavigation: false };
  assert.ok(canPresentStartup(fresh));
  for (const reason of Object.keys(fresh)) {
    assert.equal(canPresentStartup({ ...fresh, [reason]: true }), false, reason);
  }
  assert.equal(LAUNCH_TIMING.studio + LAUNCH_TIMING.game, 1150);
  assert.ok(LAUNCH_TIMING.limit <= 2000);
});

test("stale gameplay tabs cannot overwrite newer progress or add its rewards", () => {
  const store = memoryStorage();
  const newTab = createSaveBuffer(store);
  const oldTab = createSaveBuffer(store);
  oldTab.getItem("game");
  oldTab.getItem("profile");
  newTab.setItem("game", "winner");
  newTab.setItem("profile", "one clear");
  assert.equal(newTab.flush(), "saved");
  assert.equal(oldTab.check(), false);
  oldTab.setItem("game", "stale");
  oldTab.setItem("profile", "two clears");
  assert.equal(oldTab.flush(), "conflict");
  assert.equal(store.getItem("game"), "winner");
  assert.equal(store.getItem("profile"), "one clear");
});

test("quota failure rolls back the game and retains one staged award in memory", () => {
  const store = memoryStorage();
  store.setItem("game", "before");
  let fails = true;
  const buffer = createSaveBuffer({ ...store, setItem(key, value) {
    if (key === "profile" && fails) throw new Error("Quota exceeded");
    store.setItem(key, value);
  } });
  buffer.setItem("game", "after");
  buffer.setItem("profile", "one clear");
  assert.equal(buffer.flush(), "memory");
  assert.equal(store.getItem("game"), "before");
  assert.equal(store.getItem("profile"), null);
  assert.equal(buffer.getItem("game"), "after");
  assert.equal(buffer.getItem("profile"), "one clear");
  fails = false;
  assert.equal(buffer.flush(), "saved");
  assert.equal(store.getItem("game"), "after");
  assert.equal(store.getItem("profile"), "one clear");
});

test("unavailable storage preserves an exportable in-memory session", () => {
  const buffer = createSaveBuffer({ getItem() { throw Error("blocked"); } });
  assert.equal(buffer.getItem("game"), null);
  buffer.setItem("game", "memory only");
  assert.equal(buffer.flush(), "memory");
  assert.equal(buffer.getItem("game"), "memory only");
});
