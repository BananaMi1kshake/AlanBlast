import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { replayLevel } from "../js/adventure.js";
import { createDailySession, createTutorialSession, currentDay, dailyLevel, loadDaily, tutorialStatus } from "../js/challenges.js";
import { memoryStorage } from "../js/sandbox.js";
import { validateLevel } from "../js/level-solver.js";
import { verifyWitness } from "./reference-adventure.js";

const read = file => readFile(new URL("../challenges/" + file + ".json", import.meta.url), "utf8")
  .then(raw => JSON.parse(raw).levels);
const daily = await read("daily-v1");
const tutorial = await read("tutorial");

test("Daily uses an immutable UTC rotation and rejects malformed dates", () => {
  assert.equal(currentDay(new Date("2026-11-28T00:01:00+05:00")), "2026-11-27");
  assert.equal(dailyLevel(daily, "2026-11-01").id, "the-low-bridge");
  assert.equal(dailyLevel(daily, "2026-11-12"), daily[0]);
  assert.equal(dailyLevel(daily, "2026-11-32"), null);
  assert.equal(dailyLevel(daily, "2026-02-29"), null);
  assert.equal(dailyLevel(daily, "2026-10-31"), null);
});

for (const level of [...daily, ...tutorial]) test(level.name + " has an independently verified challenge or tutorial witness", () => {
  const replay = replayLevel(level, level.validation.witness);
  assert.equal(validateLevel(level, { maxNodes: 0 }).method, "replay");
  assert.equal(replay.status, "won");
  assert.equal(replay.game.score, verifyWitness(level).score);
});

test("completed Daily runs restore best scores and dates independently through unlimited retries", () => {
  const store = memoryStorage();
  const session = createDailySession(daily, "2026-11-01", store);
  for (const { slot, x, y } of session.level.validation.witness) session.play(slot, x, y);
  session.persist();
  const best = session.best;
  assert.ok(best > 0);
  const retry = createDailySession(daily, "2026-11-01", store);
  assert.equal(retry.newlyStarted, false);
  retry.restart();
  retry.persist();
  assert.equal(createDailySession(daily, "2026-11-01", store).best, best);
  assert.equal(createDailySession(daily, "2026-11-02", store).best, 0);
  assert.equal(loadDaily(store).days["2026-11-01"].history.length, 0);
});

test("the final tutorial move clears both directions, changes material, and only writes the tutorial flag", () => {
  const store = memoryStorage();
  const final = tutorial.at(-1);
  const session = createTutorialSession(tutorial, final.id, store);
  const { slot, x, y } = final.validation.witness[0];
  const result = session.play(slot, x, y);
  session.persist();
  assert.equal(result.gemsCollected.length, 0);
  assert.deepEqual(result.rows, [4]);
  assert.deepEqual(result.columns, [3]);
  assert.equal(result.game.material, "yarn");
  assert.equal(tutorialStatus(store), "completed");
  assert.equal(store.getItem("alanblox.profile.v1"), null);
  assert.equal(store.getItem("alanblox.adventure.v1"), null);
});
