import { replayLevel, startLevel, playLevel } from "./adventure.js";
import { memoryStorage } from "./sandbox.js";
import { ADVENTURE_KEY, createAdventureSession } from "./adventure-storage.js";

export const DAILY_KEY = "alanblox.daily.v1";
export const TUTORIAL_KEY = "alanblox.tutorial.v1";
export const DAILY_VERSION = 1;
export const FIRST_DAY = "2026-11-01";
const DAY = 86400000;
const epoch = Date.parse(FIRST_DAY);

export const currentDay = (date = new Date()) => date.toISOString().slice(0, 10);

export function dailyDate(day) {
  if (typeof day !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(day)) return null;
  const ms = Date.parse(day);
  return Number.isFinite(ms) && ms >= epoch && currentDay(new Date(ms)) === day ? ms : null;
}

export function dailyLevel(levels, day) {
  const ms = dailyDate(day);
  return ms === null ? null : levels[((ms - epoch) / DAY) % levels.length];
}

const catalogs = new Map();
export function loadChallenges(kind) {
  const file = kind === "daily" ? "daily-v1.json" : "tutorial.json";
  if (!catalogs.has(file)) catalogs.set(file, fetch(new URL("../challenges/" + file, import.meta.url))
    .then(async response => {
      if (!response.ok) throw Error("The puzzle could not be loaded.");
      const data = await response.json();
      if (data.version !== 1 || !Array.isArray(data.levels) || !data.levels.length) throw Error("Invalid puzzle catalog.");
      return data.levels;
    }).catch(error => { catalogs.delete(file); throw error; }));
  return catalogs.get(file);
}

export function emptyDaily() {
  return { version: 1, challengeVersion: DAILY_VERSION, days: {} };
}

export function loadDaily(storage = globalThis.localStorage) {
  try {
    const data = JSON.parse(storage.getItem(DAILY_KEY));
    if (data?.version === 1 && data.challengeVersion === DAILY_VERSION && data.days
      && typeof data.days === "object" && !Array.isArray(data.days)) return data;
  } catch { /* An unavailable save leaves the puzzles playable. */ }
  return emptyDaily();
}

export function dailyResult(level, history) {
  return Array.isArray(history) && history.length <= 90 ? replayLevel(level, history) : null;
}

export function createDailySession(levels, day, storage = globalThis.localStorage) {
  const level = dailyLevel(levels, day);
  if (!level) return null;
  const saved = loadDaily(storage).days[day];
  const previous = dailyResult(level, saved?.history);
  let run = previous ?? startLevel(level);
  let best = dailyResult(level, saved?.best);
  if (best?.status !== "won") best = null;

  return {
    day, level, newlyStarted: !previous,
    get game() { return run.game; },
    get run() { return run; },
    get best() { return best?.game.score ?? 0; },
    get over() { return run.status !== "playing"; },
    get waiting() { return false; },
    play(slot, x, y) {
      const result = playLevel(level, run, slot, x, y);
      if (!result) return null;
      run = result.run;
      if (result.won && (!best || run.game.score > best.game.score
        || (run.game.score === best.game.score && run.history.length < best.history.length))) best = run;
      return result;
    },
    restart() { run = startLevel(level); },
    persist() {
      try {
        const data = loadDaily(storage);
        data.days[day] = { history: run.history, best: best?.history ?? null };
        storage.setItem(DAILY_KEY, JSON.stringify(data));
      } catch { /* The current puzzle can continue without storage. */ }
    },
  };
}

export function tutorialStatus(storage = globalThis.localStorage) {
  try {
    const value = storage.getItem(TUTORIAL_KEY);
    return ["skipped", "completed"].includes(value) ? value : null;
  } catch { return null; }
}

export function saveTutorial(status, storage = globalThis.localStorage) {
  try { storage.setItem(TUTORIAL_KEY, status); } catch { /* Continue without storage. */ }
}

export function createTutorialSession(levels, requested, storage = globalThis.localStorage) {
  const index = Math.max(0, levels.findIndex(level => level.id === requested));
  const isolated = memoryStorage();
  isolated.setItem(ADVENTURE_KEY, JSON.stringify({ version: 1, completed: levels.slice(0, index).map(level => level.id) }));
  const session = createAdventureSession(levels, levels[index].id, isolated);
  const persist = session.persist;
  session.persist = () => {
    persist();
    if (index === levels.length - 1 && session.run.status === "won") saveTutorial("completed", storage);
  };
  return session;
}

export function challengeUrl(mode, value) {
  const params = new URLSearchParams({ mode });
  if (value) params.set(mode === "daily" ? "date" : "level", value);
  return "./play.html?" + params;
}
