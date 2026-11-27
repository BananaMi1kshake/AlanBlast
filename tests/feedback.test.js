import assert from "node:assert/strict";
import { test } from "node:test";
import { createFeedback, moveFeedback } from "../js/feedback.js";
import { createHaptics } from "../js/haptics.js";

test("actual line counts and combo events choose the correct cues", () => {
  const base = { lines: 0, combo: 5 };
  assert.deepEqual(moveFeedback(base).sounds, [{ name: "place", combo: 5 }]);
  assert.deepEqual(moveFeedback({ ...base, lines: 1, combo: 1 }).sounds, [{ name: "clear1", combo: 1 }]);
  assert.deepEqual(moveFeedback({ ...base, lines: 2 }).sounds.map(n => n.name), ["clear2", "combo"]);
  assert.equal(moveFeedback({ ...base, lines: 3 }).vibration, "clear3");
  assert.deepEqual(moveFeedback({ ...base, lines: 5, combo: 9, record: true }).sounds.map(n => n.name), ["clear4", "combo", "record"]);
  assert.equal(moveFeedback({ ...base, lines: 4, combo: 9 }).vibration, "combo");
});

test("all-clear takes precedence over other celebration cues and restart cancels existing feedback", () => {
  const events = [];
  const audio = { configure() {}, play(entries) { events.push(...entries.map(s => s.name)); }, stop() { events.push("audioStop"); } };
  const haptic = { configure() {}, play(name) { events.push(name + "Vibration"); }, stop() { events.push("hapticStop"); } };
  const feedback = createFeedback(audio, haptic, {});
  feedback.move({ lines: 4, combo: 9, fullBoardClear: true, record: true, over: true });
  feedback.restart();
  feedback.move({ lines: 0, combo: 5, over: true });
  feedback.cue("invalid");
  assert.deepEqual(events, ["allClear", "allClearVibration", "audioStop", "hapticStop", "newGame",
    "gameOver", "placeVibration", "invalid", "invalidVibration"]);
});

test("unsupported and denied vibration requests are harmless", () => {
  const unsupported = createHaptics({
    device: {},
    now() { assert.fail("Unavailable vibration should skip scheduling"); },
  });
  const preference = { vibration: false };
  assert.equal(unsupported.supported, false);
  unsupported.configure(preference);
  unsupported.setVisible(false);
  unsupported.setVisible(true);
  assert.equal(unsupported.play("place"), false);
  unsupported.configure({ vibration: true });
  assert.equal(unsupported.play("allClear"), false);
  unsupported.stop();
  assert.deepEqual(preference, { vibration: false });
  const denied = createHaptics({ device: { vibrate() { throw Error("denied"); } } });
  assert.equal(denied.play("place"), false);
});

test("rapid vibration is throttled, major cues take priority and mute cancels active patterns", () => {
  let time = 0;
  const calls = [];
  const haptics = createHaptics({ now: () => time, device: { vibrate: ms => { calls.push(ms); return true; } } });
  assert.equal(haptics.play("place"), true);
  time = 20;
  assert.equal(haptics.play("place"), false);
  assert.equal(haptics.play("allClear"), true);
  time = 95;
  assert.equal(haptics.play("clear3"), false);
  haptics.configure({ vibration: false });
  assert.equal(haptics.play("place"), false);
  assert.equal(calls.length, 3);
  assert.equal(calls[2], 0);
});
