import { WORLDS } from "./themes.js";

export const PROFILE_KEY = "alanblox.profile.v1";
export const STAT_NAMES = Object.freeze({
  classic: { started: "Games started", completed: "Games completed", blocks: "Blocks placed",
    lines: "Lines cleared", allClears: "Full-board clears", combo: "Highest combo",
    simultaneous: "Largest simultaneous clear", points: "Total score earned", bestRun: "Best newly recorded run" },
  adventure: { attempts: "Total attempts", gems: "Gems collected", lines: "Lines cleared", combo: "Highest combo" },
  daily: { attempts: "Total attempts", wins: "Successful runs", gems: "Gems collected", lines: "Lines cleared",
    combo: "Highest combo", bestRun: "Best score across days" },
});
export const MATERIAL_ORDER = Object.values(WORLDS).map(world => world.material);

export const ACHIEVEMENTS = [
  ["first-line", "First Line", "Clear a line in Classic.", p => p.classic.lines >= 1],
  ["multi-line", "Double Take", "Clear at least two lines together in Classic.", p => p.classic.simultaneous >= 2],
  ["all-clear", "Clean Slate", "Clear the entire board in Classic.", p => p.classic.allClears >= 1],
  ...[10, 25, 50].map(value => ["combo-" + value, "Combo " + value, "Reach a Classic combo of " + value + ".", p => p.classic.combo >= value]),
  ...[10000, 50000, 100000].map(value => ["score-" + value, value.toLocaleString("en-US") + " Points",
    "Reach " + value.toLocaleString("en-US") + " points in one Classic run.", p => p.classic.bestRun >= value]),
  ["all-materials", "Material Collector", "Discover all eight materials.", p => p.materials.length === MATERIAL_ORDER.length],
  ["first-world", "Ocean Explorer", "Complete the first tour's Ocean levels.", (p, context) => context.firstWorld === true],
  ["campaign", "Grand Tour", "Complete every released Adventure level.", (p, context) => context.campaign === true],
  ["first-daily", "Daily Debut", "Complete a Daily Challenge.", p => p.daily.wins >= 1],
];

export const freshProfile = () => ({
  version: 1,
  ...Object.fromEntries(Object.entries(STAT_NAMES).map(([mode, fields]) =>
    [mode, Object.fromEntries(Object.keys(fields).map(field => [field, 0]))])),
  materials: ["classic"], achievements: [],
});

export function loadProfile(storage = globalThis.localStorage) {
  const profile = freshProfile();
  try {
    const data = JSON.parse(storage.getItem(PROFILE_KEY));
    if (data?.version !== 1) return profile;
    for (const mode of Object.keys(STAT_NAMES)) {
      for (const key of Object.keys(STAT_NAMES[mode])) {
        const value = data[mode]?.[key];
        if (Number.isSafeInteger(value) && value >= 0) profile[mode][key] = value;
      }
    }
    profile.materials.push(...MATERIAL_ORDER.slice(1).filter(id => data.materials?.includes?.(id)));
    profile.achievements = ACHIEVEMENTS.map(([id]) => id).filter(id => data.achievements?.includes?.(id));
  } catch { /* Local play can continue with a fresh profile. */ }
  return profile;
}

function saveProfile(profile, storage) {
  try { storage.setItem(PROFILE_KEY, JSON.stringify(profile)); } catch { /* Storage might be unavailable. */ }
}

export function adventureProgress(levels, completed) {
  const complete = new Set(completed);
  const worlds = Object.keys(WORLDS).filter(world => {
    const entries = levels.filter(level => level.world === world);
    return entries.length && entries.every(level => complete.has(level.id));
  });
  const firstWorld = levels.filter(level => level.world === "mint" && !level.chapter);
  return { worlds, firstWorld: firstWorld.length > 0 && firstWorld.every(level => complete.has(level.id)),
    campaign: levels.length > 0 && levels.every(level => complete.has(level.id)) };
}

function addMaterial(profile, material) {
  if (!profile.materials.includes(material)) profile.materials.push(material);
}

function updateAchievements(profile, context) {
  const earned = ACHIEVEMENTS.filter(([id, , , earned]) => !profile.achievements.includes(id) && earned(profile, context));
  profile.achievements.push(...earned.map(([id]) => id));
  return earned.map(([, title]) => title);
}

// The old campaign already recorded real completions. These can restore cosmetics,
// while lifetime totals start with Phase 7's committed events.
export function restoreDiscoveries(levels, completed, storage = globalThis.localStorage) {
  const profile = loadProfile(storage);
  const previous = profile.materials.length;
  for (const level of levels) {
    if (completed.includes(level.id)) addMaterial(profile, level.material);
  }
  if (profile.materials.length !== previous) saveProfile(profile, storage);
  return profile;
}

export function recordGameplay(mode, event, context = {}, storage = globalThis.localStorage) {
  const profile = loadProfile(storage);
  const stats = profile[mode];
  if (event.type === "start") {
    if (mode === "classic") stats.started++;
    else stats.attempts++;
  } else if (event.type === "end") {
    stats.completed++;
  } else {
    const { result, shape } = event;
    const lines = result.rows.length + result.columns.length;
    stats.lines += lines;
    stats.combo = Math.max(stats.combo, result.game.combo);
    if (mode === "classic") {
      stats.blocks += shape.cells.length;
      stats.points += result.points;
      stats.simultaneous = Math.max(stats.simultaneous, lines);
      stats.bestRun = Math.max(stats.bestRun, result.game.score);
      if (event.over) stats.completed++;
      if (result.fullBoardClear) {
        stats.allClears++;
        const discovery = MATERIAL_ORDER[stats.allClears];
        if (discovery) addMaterial(profile, discovery);
      }
    } else {
      stats.gems += result.gemsCollected.length;
      if (mode === "adventure" && result.won) addMaterial(profile, result.game.material);
      if (mode === "daily" && result.won) {
        stats.wins++;
        stats.bestRun = Math.max(stats.bestRun, result.game.score);
      }
    }
  }
  const unlocked = updateAchievements(profile, context);
  saveProfile(profile, storage);
  return unlocked;
}
