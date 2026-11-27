import { scorePlacement } from "./scoring.js";
import { DEFAULT_THEME, nextTheme } from "./themes.js";

import { HAND_SIZE, SHAPES, SIZE } from "./pieces.js";

export { HAND_SIZE, SHAPES, SIZE } from "./pieces.js";

export function createGame() {
  return {
    board: Array(SIZE * SIZE).fill(null), score: 0, combo: 0, comboWindow: 0,
    theme: DEFAULT_THEME, hand: Array(HAND_SIZE).fill(null), bag: [], exhausted: false,
  };
}

export function needsHand(game) {
  return !game.exhausted && game.hand.every(id => id === null);
}

export function canPlace(board, shape, x, y) {
  return Number.isInteger(x) && Number.isInteger(y)
    && x >= 0 && y >= 0 && x + shape.width <= SIZE && y + shape.height <= SIZE
    && shape.cells.every(([dx, dy]) => board[(y + dy) * SIZE + x + dx] === null);
}

export function isGameOver(game) {
  if (needsHand(game)) return false;
  const { board, hand } = game;
  return !hand.some(id => {
    if (id === null) return false;
    const shape = SHAPES[id];
    for (let y = 0; y <= SIZE - shape.height; y++) {
      for (let x = 0; x <= SIZE - shape.width; x++) {
        if (canPlace(board, shape, x, y)) return true;
      }
    }
    return false;
  });
}

function completedLines(board) {
  const rows = [];
  const columns = [];
  for (let line = 0; line < SIZE; line++) {
    const horizontal = board.slice(line * SIZE, (line + 1) * SIZE);
    if (horizontal.every(cell => cell !== null)) rows.push(line);
    if (board.every((cell, index) => index % SIZE !== line || cell !== null)) columns.push(line);
  }
  return { rows, columns };
}

export function placePiece(game, slot, x, y) {
  const id = game.hand[slot];
  const shape = SHAPES[id];
  if (!shape || !canPlace(game.board, shape, x, y)) return null;

  const board = [...game.board];
  const hand = [...game.hand];
  for (const [dx, dy] of shape.cells) board[(y + dy) * SIZE + x + dx] = id;

  const { rows, columns } = completedLines(board);
  const cleared = [];
  for (let i = 0; i < board.length; i++) {
    if (rows.includes(Math.floor(i / SIZE)) || columns.includes(i % SIZE)) {
      board[i] = null;
      cleared.push(i);
    }
  }

  hand[slot] = null;
  const fullBoardClear = board.every(cell => cell === null);
  const { points, combo, comboWindow, bonus } = scorePlacement(
    shape.cells.length, rows.length + columns.length, game, fullBoardClear,
  );
  const theme = fullBoardClear ? nextTheme(game.theme) : game.theme;
  return {
    game: { ...game, board, hand, score: game.score + points, combo, comboWindow, theme },
    points, rows, columns, cleared, fullBoardClear, bonus,
  };
}
