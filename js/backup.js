import { validRotation } from "./material-rotation.js";
import { replayLevel } from "./adventure.js";
import { ADVENTURE_KEY, isUnlocked, loadAdventure } from "./adventure-storage.js";
import { DAILY_KEY, TUTORIAL_KEY, dailyLevel, dailyResult, emptyDaily, loadDaily, tutorialStatus } from "./challenges.js";
import { ACHIEVEMENTS, loadProfile, MATERIAL_ORDER, PROFILE_KEY, STAT_NAMES } from "./profile.js";
import { RULES } from "./scoring.js";
import { loadSettings, SETTINGS_KEY, APPEARANCE_MODES } from "./settings.js";
import { isSavedGame, loadProgress, CLASSIC_KEY } from "./storage.js";
import { THEMES, MATERIALS, PALETTES } from "./themes.js";

export const APP_VERSION = "0.8.0-rc.3";
export const BACKUP_LIMIT = 2 * 1024 * 1024;
export const BACKUP_NOTICE = "alanblox.backup-change";
const FORMAT = "alanblox-backup";
const KEYS = { classic: CLASSIC_KEY, adventure: ADVENTURE_KEY, daily: DAILY_KEY, profile: PROFILE_KEY,
  settings: SETTINGS_KEY, tutorial: TUTORIAL_KEY };

const count = value => Number.isSafeInteger(value) && value >= 0;
const shape = (object, keys) => object && typeof object === "object" && !Array.isArray(object)
  && Object.keys(object).length === keys.length && keys.every(key => Object.hasOwn(object, key));
const uniqueKnown = (values, allowed) => Array.isArray(values)
  && new Set(values).size === values.length && values.every(value => allowed.includes(value));
const validHistory = moves => Array.isArray(moves) && moves.length <= 90 && moves.every(move =>
  shape(move, ["slot", "x", "y"]) && ["slot", "x", "y"].every(key => Number.isInteger(move[key])));

function cleanClassic({ game, highScore }) {
  if (!game) return { game, highScore };
  const { board, hand, bag, score, combo, comboWindow, exhausted, theme, material } = game;
  const value = { board, hand, bag, score, combo, comboWindow, exhausted, theme, material };
  if (validRotation(game.rotation)) value.rotation = { pool: game.rotation.pool, bag: game.rotation.bag, seed: game.rotation.seed };
  if (typeof game.record === "boolean") value.record = game.record;
  if (typeof game.fixedAppearance === "boolean") value.fixedAppearance = game.fixedAppearance;
  if (Object.hasOwn(PALETTES, game.palette)) value.palette = game.palette;
  return { game: value, highScore };
}

function validClassic(value) {
  if (!shape(value, ["game", "highScore"]) || !count(value.highScore)) return false;
  const { game, highScore } = value;
  if (game === null) return true;
  return isSavedGame(game) && Object.keys(game).length === Object.keys(cleanClassic(value).game).length
    && highScore >= game.score && count(game.combo) && count(game.comboWindow) && game.comboWindow <= RULES.comboWindow
    && (game.combo > 0) === (game.comboWindow > 0)
    && typeof game.exhausted === "boolean" && (!game.exhausted || game.hand.every(id => id === null))
    && THEMES.includes(game.theme) && Object.hasOwn(MATERIALS, game.material);
}

function validAdventure(value, levels) {
  if (!shape(value, ["version", "completed", "current"]) || value.version !== 1
    || !uniqueKnown(value.completed, levels.map(level => level.id))
    || value.completed.some(id => !isUnlocked(levels, value.completed, id))) return false;
  if (value.current === null) return true;
  const { levelId, history } = value.current;
  if (!shape(value.current, ["levelId", "history"]) || !isUnlocked(levels, value.completed, levelId)
    || !validHistory(history)) return false;
  const run = replayLevel(levels.find(level => level.id === levelId), history);
  return run && (run.status !== "won" || value.completed.includes(levelId));
}

function validDailyEntry(day, value, levels) {
  const level = dailyLevel(levels, day);
  if (!level || !shape(value, ["history", "best"]) || !validHistory(value.history)) return false;
  const run = dailyResult(level, value.history);
  if (!run) return false;
  if (value.best === null) return run.status !== "won";
  if (!validHistory(value.best)) return false;
  const best = dailyResult(level, value.best);
  return best?.status === "won" && (run.status !== "won" || best.game.score > run.game.score
    || (best.game.score === run.game.score && best.history.length <= run.history.length));
}

function validProfile(value) {
  const modes = Object.keys(STAT_NAMES);
  return shape(value, ["version", "materials", "achievements", ...modes]) && value.version === 1
    && uniqueKnown(value.materials, MATERIAL_ORDER) && value.materials.includes("classic")
    && uniqueKnown(value.achievements, ACHIEVEMENTS.map(([id]) => id))
    && modes.every(mode => shape(value[mode], Object.keys(STAT_NAMES[mode])) && Object.values(value[mode]).every(count));
}

function validSettings(value, materials) {
  const toggles = ["sound", "vibration", "reducedMotion"];
  return shape(value, [...toggles, "volume", "materialMode", "favoriteMaterial"])
    && toggles.every(key => typeof value[key] === "boolean")
    && Number.isFinite(value.volume) && value.volume >= 0 && value.volume <= 1
    && APPEARANCE_MODES.includes(value.materialMode) && materials.includes(value.favoriteMaterial);
}

export function exportBackup(levels, challengeLevels, storage = globalThis.localStorage) {
  // Read through the normal Phase 7 loaders so older data exports in the documented format.
  const classic = cleanClassic(loadProgress(storage));
  const restored = loadAdventure(levels, storage);
  const current = restored.current;
  const adventure = { version: 1, completed: restored.completed,
    current: current && { levelId: current.levelId, history: current.run.history } };
  const daily = emptyDaily();
  for (const [day, value] of Object.entries(loadDaily(storage).days)) {
    if (validDailyEntry(day, value, challengeLevels)) daily.days[day] = value;
  }
  const profile = loadProfile(storage);
  const settings = loadSettings(storage);
  if (!profile.materials.includes(settings.favoriteMaterial)) settings.favoriteMaterial = "classic";
  return JSON.stringify({ format: FORMAT, version: 1, data: {
    classic, adventure, daily, profile, settings, tutorial: tutorialStatus(storage),
  } }, null, 2);
}

export function parseBackup(text, levels, challengeLevels) {
  if (typeof text !== "string" || text.length > BACKUP_LIMIT) throw Error("This backup is too large.");
  let backup;
  try { backup = JSON.parse(text); } catch { throw Error("Choose a valid AlanBlox JSON backup."); }
  if (backup?.format !== FORMAT || backup.version !== 1) throw Error("This AlanBlox backup format or version is unsupported.");
  const data = backup.data;
  if (!shape(data, Object.keys(KEYS))) throw Error("Required sections are missing or unfamiliar.");
  if (!validClassic(data.classic)) throw Error("The Classic save is invalid.");
  if (!validAdventure(data.adventure, levels)) throw Error("The Adventure save is invalid.");
  const daily = data.daily;
  if (!shape(daily, ["version", "challengeVersion", "days"]) || daily.version !== 1
    || daily.challengeVersion !== emptyDaily().challengeVersion || !daily.days || typeof daily.days !== "object"
    || Array.isArray(daily.days) || !Object.entries(daily.days).every(([day, value]) => validDailyEntry(day, value, challengeLevels))) {
    throw Error("The Daily Challenge history is invalid or uses an unfamiliar rotation.");
  }
  if (!validProfile(data.profile)) throw Error("The statistics, discoveries, or achievements are invalid.");
  if (!validSettings(data.settings, data.profile.materials)) throw Error("The settings are invalid.");
  if (![null, "completed", "skipped"].includes(data.tutorial)) throw Error("The tutorial flag is invalid.");
  return data;
}

function replace(values, storage) {
  const before = new Map(Object.keys(values).map(key => [key, storage.getItem(key)]));
  const changed = [];
  try {
    for (const [key, value] of Object.entries(values)) {
      if (value === null) storage.removeItem(key);
      else storage.setItem(key, value);
      changed.push(key);
    }
  } catch {
    for (const key of changed.reverse()) {
      const value = before.get(key);
      if (value === null) storage.removeItem(key);
      else storage.setItem(key, value);
    }
    throw Error("The browser could not save the changes. Check that local storage is available.");
  }
  try { storage.setItem(BACKUP_NOTICE, String(Date.now())); } catch { /* Other windows can reload manually. */ }
}

export function prepareImport(text, levels, challenges, storage = globalThis.localStorage) {
  const data = parseBackup(text, levels, challenges);
  const values = Object.fromEntries(Object.entries(KEYS).map(([field, key]) =>
    [key, field === "tutorial" ? data[field] : JSON.stringify(data[field])]));
  return () => replace(values, storage);
}

export function resetProgress(storage = globalThis.localStorage) {
  const settings = loadSettings(storage);
  settings.materialMode = "automatic";
  settings.favoriteMaterial = "classic";
  replace({ [CLASSIC_KEY]: null, [ADVENTURE_KEY]: null, [DAILY_KEY]: null,
    [PROFILE_KEY]: null, [TUTORIAL_KEY]: null, [SETTINGS_KEY]: JSON.stringify(settings) }, storage);
}
