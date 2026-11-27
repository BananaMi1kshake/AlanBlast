import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { createAdventureSession, loadAdventure } from "../js/adventure-storage.js";
import { BACKUP_LIMIT, exportBackup, prepareImport, parseBackup, resetProgress } from "../js/backup.js";
import { createDailySession, saveTutorial, tutorialStatus } from "../js/challenges.js";
import { createGame } from "../js/game.js";
import { loadProfile, PROFILE_KEY, restoreDiscoveries } from "../js/profile.js";
import { memoryStorage } from "../js/sandbox.js";
import { loadSettings, saveSettings } from "../js/settings.js";
import { CLASSIC_KEY, loadProgress, saveProgress } from "../js/storage.js";

const json = async path => JSON.parse(await readFile(new URL("../" + path, import.meta.url), "utf8"));
const { levels } = await json("adventure/levels.json");
const { levels: daily } = await json("challenges/daily-v1.json");
const exportFrom = storage => exportBackup(levels, daily, storage);

function complete(session) {
  for (const { slot, x, y } of session.level.validation.witness) session.play(slot, x, y);
  session.persist();
}

test("versioned backup transfers all mode state, preferences, unlocks, and tutorial flag", () => {
  const original = memoryStorage();
  saveProgress({ ...createGame(), hand: [0, 1, 2], score: 27, fixedAppearance: true }, 91, original);
  complete(createAdventureSession(levels, undefined, original));
  complete(createDailySession(daily, "2026-11-01", original));
  restoreDiscoveries(levels, ["loom-pair"], original);
  saveSettings({ ...loadSettings(original), sound: false, materialMode: "fixed", favoriteMaterial: "yarn" }, original);
  saveTutorial("completed", original);
  const backup = exportFrom(original);
  const restored = memoryStorage();
  const commit = prepareImport(backup, levels, daily, restored);
  assert.equal(loadProgress(restored).highScore, 0);
  commit();
  assert.deepEqual(JSON.parse(exportFrom(restored)), JSON.parse(backup));
  assert.equal(loadProgress(restored).game.fixedAppearance, true);
  assert.equal(loadProgress(restored).highScore, 91);
  assert.equal(loadAdventure(levels, restored).completed.length, 1);
  assert.ok(createDailySession(daily, "2026-11-01", restored).best > 0);
  assert.equal(loadSettings(restored).favoriteMaterial, "yarn");
  assert.equal(tutorialStatus(restored), "completed");
});

test("older saves export with normalized combo, appearance, and preferences", () => {
  const source = memoryStorage();
  source.setItem(CLASSIC_KEY, JSON.stringify({ game: { board: Array(64).fill(null), score: 2, hand: [1, 2, 3], bag: [] }, highScore: 20 }));
  const value = parseBackup(exportFrom(source), levels, daily);
  assert.equal(value.classic.game.combo, 0);
  assert.equal(value.classic.game.material, "classic");
  assert.equal(value.settings.materialMode, "automatic");
  assert.equal(value.profile.classic.started, 0);
});

test("malformed or unsupported backups leave all existing data intact", () => {
  const store = memoryStorage();
  saveProgress(createGame(), 405, store);
  const before = exportFrom(store);
  const invalidChanges = [
    data => { data.version = 99; },
    data => { delete data.data.settings; },
    data => { data.data.classic.game.board[0] = 10000; },
    data => { data.data.classic.game.extra = "unknown"; },
    data => { data.data.adventure.completed = [levels[3].id]; },
    data => { data.data.adventure.current = { levelId: levels[0].id, history: [{ slot: 0, x: 99, y: 0 }] }; },
    data => { data.data.daily.days["2026-11-31"] = { history: [], best: [] }; },
    data => { data.data.daily.days["2026-11-01"] = { history: [], best: [{ slot: 1, x: 0, y: 0 }] }; },
    data => { data.data.profile.adventure.lines = -1; },
    data => { data.data.settings.favoriteMaterial = "wood"; },
  ];
  for (const change of invalidChanges) {
    const data = JSON.parse(before);
    change(data);
    assert.throws(() => prepareImport(JSON.stringify(data), levels, daily, store));
    assert.equal(exportFrom(store), before);
  }
  for (const input of ["{", "null", " ".repeat(BACKUP_LIMIT + 1)]) {
    assert.throws(() => prepareImport(input, levels, daily, store));
    assert.equal(exportFrom(store), before);
  }
});

test("a failed storage write rolls back the keys already replaced", () => {
  const prior = memoryStorage();
  saveProgress(createGame(), 90, prior);
  const target = memoryStorage();
  saveProgress(createGame(), 40, target);
  const before = exportFrom(target);
  const faulty = { ...target, setItem(key, value) {
    if (key === PROFILE_KEY) throw Error("QuotaExceededError");
    target.setItem(key, value);
  } };
  const commit = prepareImport(exportFrom(prior), levels, daily, faulty);
  assert.throws(commit, /could not save/);
  assert.equal(exportFrom(target), before);
});

test("reset clears player records, retains sound and accessibility settings, and leaves unrelated keys", () => {
  const store = memoryStorage();
  saveProgress(createGame(), 999, store);
  saveSettings({ ...loadSettings(store), vibration: false, reducedMotion: true, materialMode: "starting" }, store);
  saveTutorial("skipped", store);
  store.setItem("unrelated", "keep");
  resetProgress(store);
  assert.equal(loadProgress(store).highScore, 0);
  assert.deepEqual(loadProfile(store).materials, ["classic"]);
  assert.equal(loadSettings(store).materialMode, "automatic");
  assert.equal(loadSettings(store).reducedMotion, true);
  assert.equal(loadSettings(store).vibration, false);
  assert.equal(tutorialStatus(store), null);
  assert.equal(store.getItem("unrelated"), "keep");
});

test("a large Daily archive fits the existing portable backup limit and round-trips", () => {
  const store = memoryStorage();
  const days = {};
  const epoch = Date.parse("2026-11-01");
  for (let i = 0; i < 2048; i++) {
    const day = new Date(epoch + i * 86400000).toISOString().slice(0, 10);
    const best = daily[i % daily.length].validation.witness;
    days[day] = { history: best, best };
  }
  store.setItem("alanblox.daily.v1", JSON.stringify({ version: 1, challengeVersion: 1, days }));
  const backup = exportFrom(store);
  assert.ok(Buffer.byteLength(backup) < BACKUP_LIMIT);
  const copy = memoryStorage();
  prepareImport(backup, levels, daily, copy)();
  assert.deepEqual(JSON.parse(copy.getItem("alanblox.daily.v1")).days, days);
});
