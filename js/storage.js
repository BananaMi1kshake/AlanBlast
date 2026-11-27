import { validRotation } from "./material-rotation.js";
import { HAND_SIZE, SHAPES, SIZE } from "./game.js";
import { RULES } from "./scoring.js";
import { DEFAULT_THEME, THEMES, visualProfile } from "./themes.js";

export const CLASSIC_KEY = "alanblox.save.v1";

function isScore(value) {
  return Number.isSafeInteger(value) && value >= 0;
}

function isShape(value) {
  return Number.isInteger(value) && value >= 0 && value < SHAPES.length;
}

function isCell(value) {
  return value === null || isShape(value);
}

export function isSavedGame(value) {
  return value && isScore(value.score)
    && Array.isArray(value.board) && value.board.length === SIZE ** 2 && value.board.every(isCell)
    && Array.isArray(value.hand) && value.hand.length === HAND_SIZE
    && value.hand.every(isCell)
    && Array.isArray(value.bag) && value.bag.length < SHAPES.length && value.bag.every(isShape)
    && new Set(value.bag).size === value.bag.length;
}

export function loadProgress(storage) {
  try {
    const saved = JSON.parse((storage ?? globalThis.localStorage).getItem(CLASSIC_KEY));
    let game = null;
    if (isSavedGame(saved?.game)) {
      const { combo, comboWindow, hand, exhausted, theme } = saved.game;
      const active = isScore(combo) && combo > 0;
      const window = active ? (isScore(comboWindow) && comboWindow <= RULES.comboWindow
        ? comboWindow : RULES.comboWindow) : 0;
      game = {
        ...saved.game,

        combo: window ? combo : 0,
        comboWindow: window,
        exhausted: exhausted === true && hand.every(id => id === null),
        theme: THEMES.includes(theme) ? theme : DEFAULT_THEME,
        material: visualProfile(saved.game).material,
      };
      if (!validRotation(game.rotation)) delete game.rotation;
    }
    const highScore = isScore(saved?.highScore) ? saved.highScore : 0;
    return { game, highScore: Math.max(highScore, game?.score ?? 0) };
  } catch {
    return { game: null, highScore: 0 };
  }
}

export function saveProgress(game, highScore, storage) {
  try {
    (storage ?? globalThis.localStorage).setItem(CLASSIC_KEY, JSON.stringify({ game, highScore }));
  } catch {
    // Private browsing and storage restrictions should not interrupt play.
  }
}
