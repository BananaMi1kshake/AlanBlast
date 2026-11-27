import assert from "node:assert/strict";
import { test } from "node:test";
import { loadSettings, saveSettings } from "../js/settings.js";

test("settings are stored independently of the gameplay save", () => {
  const entries = new Map([["alanblox.save.v1", "game state"]]);
  const storage = { getItem: key => entries.get(key), setItem: (key, value) => entries.set(key, value) };
  const preferences = { sound: false, vibration: false, reducedMotion: true };
  saveSettings(preferences, storage);
  assert.deepEqual(loadSettings(storage), preferences);
  assert.equal(entries.get("alanblox.save.v1"), "game state");
});

test("missing, malformed, and blocked settings fall back to defaults", () => {
  const defaults = { sound: true, vibration: true, reducedMotion: false };
  assert.deepEqual(loadSettings({ getItem: () => null }), defaults);
  assert.deepEqual(loadSettings({ getItem: () => "{" }), defaults);
  assert.deepEqual(loadSettings({ getItem: () => '{"sound":0,"vibration":false}' }), {
    ...defaults, vibration: false,
  });
  const blocked = { getItem() { throw Error("blocked"); }, setItem() { throw Error("blocked"); } };
  assert.deepEqual(loadSettings(blocked), defaults);
  assert.doesNotThrow(() => saveSettings(defaults, blocked));
});
