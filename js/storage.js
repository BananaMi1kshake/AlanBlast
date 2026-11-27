import { HAND_SIZE, SHAPES, SIZE } from "./game.js";
import { DEFAULT_THEME, THEMES } from "./themes.js";

const KEY = "alanblox.save.v1";

function isScore(value) {
  return Number.isSafeInteger(value) && value >= 0;
}

function isShape(value) {
  return Number.isInteger(value) && value >= 0 && value < SHAPES.length;
}

function isCell(value) {
  return value === null || isShape(value);
}

function isGame(value) {
  return value && isScore(value.score)
    && Array.isArray(value.board) && value.board.length === SIZE ** 2 && value.board.every(isCell)
    && Array.isArray(value.hand) && value.hand.length === HAND_SIZE
    && value.hand.every(isCell) && value.hand.some(isShape)
    && Array.isArray(value.bag) && value.bag.length < SHAPES.length && value.bag.every(isShape)
    && new Set(value.bag).size === value.bag.length;
}

export function loadProgress(storage) {
  try {
    const saved = JSON.parse((storage ?? globalThis.localStorage).getItem(KEY));
    const game = isGame(saved?.game) ? {
      ...saved.game,
      combo: isScore(saved.game.combo) ? saved.game.combo : 0,
      theme: THEMES.includes(saved.game.theme) ? saved.game.theme : DEFAULT_THEME,
    } : null;
    const highScore = isScore(saved?.highScore) ? saved.highScore : 0;
    return { game, highScore: Math.max(highScore, game?.score ?? 0) };
  } catch {
    return { game: null, highScore: 0 };
  }
}

export function saveProgress(game, highScore, storage) {
  try {
    (storage ?? globalThis.localStorage).setItem(KEY, JSON.stringify({ game, highScore }));
  } catch {
    // Private browsing and storage restrictions should not interrupt play.
  }
}
