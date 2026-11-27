import { playLevel, replayLevel, startLevel } from "./adventure.js";

export const ADVENTURE_KEY = "alanblox.adventure.v1";

export function isUnlocked(levels, completed, id) {
  const index = levels.findIndex(level => level.id === id);
  return index >= 0 && levels.slice(0, index).every(level => completed.includes(level.id));
}

export function loadAdventure(levels, storage = globalThis.localStorage) {
  const save = { completed: [], current: null };
  try {
    const data = JSON.parse(storage.getItem(ADVENTURE_KEY));
    if (data?.version !== 1) return save;
    const completed = Array.isArray(data.completed) ? data.completed : [];
    for (const level of levels) {
      if (!completed.includes(level.id)) break;
      save.completed.push(level.id);
    }
    const active = levels.find(level => level.id === data.current?.levelId);
    const history = data.current?.history;
    if (active && isUnlocked(levels, save.completed, active.id) && Array.isArray(history) && history.length <= 90) {
      const run = replayLevel(active, history);
      if (run) save.current = { levelId: active.id, run };
    }
  } catch {
    // An unavailable or incompatible save starts only Adventure from its first level.
  }
  return save;
}

export function createAdventureSession(levels, requested, storage = globalThis.localStorage) {
  const saved = loadAdventure(levels, storage);
  const id = requested ?? saved.current?.levelId ?? levels[0].id;
  if (!isUnlocked(levels, saved.completed, id)) return null;
  let level = levels.find(entry => entry.id === id);
  let run = saved.current?.levelId === id ? saved.current.run : startLevel(level);
  let completed = saved.completed;

  return {
    get newlyStarted() { return saved.current?.levelId !== id; },
    get game() { return run.game; },
    get best() { return 0; },
    get over() { return run.status !== "playing"; },
    get waiting() { return false; },
    get run() { return run; },
    get level() { return level; },
    get completed() { return completed; },
    play(slot, x, y) {
      const result = playLevel(level, run, slot, x, y);
      if (!result) return null;
      run = result.run;
      if (result.won && !completed.includes(level.id)) completed = [...completed, level.id];
      return result;
    },
    restart() { run = startLevel(level); },
    persist() {
      try {
        storage.setItem(ADVENTURE_KEY, JSON.stringify({ version: 1, completed,
          current: { levelId: level.id, history: run.history } }));
      } catch { /* The run can continue without storage. */ }
    },
    load(next, history = []) {
      level = next;
      run = replayLevel(level, history) ?? startLevel(level);
    },
  };
}
