import { scorePlacement } from "./scoring.js";
import { DEFAULT_THEME, nextTheme } from "./themes.js";

export const SIZE = 8;
export const HAND_SIZE = 3;

// Shape IDs are saved as array indices. Append new templates to keep old saves compatible.
const templates = [
  ["Single", "mint", ["#"]],
  ["Horizontal pair", "sky", ["##"]],
  ["Vertical pair", "sky", ["#", "#"]],
  ["Horizontal triple", "sky", ["###"]],
  ["Vertical triple", "sky", ["#", "#", "#"]],
  ["Horizontal four", "sky", ["####"]],
  ["Vertical four", "sky", ["#", "#", "#", "#"]],
  ["Small square", "sun", ["##", "##"]],
  ["Large square", "sun", ["###", "###", "###"]],
  ["Small corner, upper left", "coral", ["##", "#."]],
  ["Small corner, upper right", "coral", ["##", ".#"]],
  ["Small corner, lower left", "coral", ["#.", "##"]],
  ["Small corner, lower right", "coral", [".#", "##"]],
  ["Large corner, upper left", "coral", ["###", "#..", "#.."]],
  ["Large corner, upper right", "coral", ["###", "..#", "..#"]],
  ["Large corner, lower left", "coral", ["#..", "#..", "###"]],
  ["Large corner, lower right", "coral", ["..#", "..#", "###"]],
  ["T, up", "lilac", [".#.", "###"]],
  ["T, down", "lilac", ["###", ".#."]],
  ["T, left", "lilac", [".#", "##", ".#"]],
  ["T, right", "lilac", ["#.", "##", "#."]],
  ["Zigzag, left", "mint", ["##.", ".##"]],
  ["Zigzag, right", "mint", [".##", "##."]],
  ["Vertical zigzag, left", "mint", ["#.", "##", ".#"]],
  ["Vertical zigzag, right", "mint", [".#", "##", "#."]],
  ["Horizontal five", "sky", ["#####"]],
  ["Vertical five", "sky", ["#", "#", "#", "#", "#"]],
  ["Wide rectangle", "sun", ["###", "###"]],
  ["Tall rectangle", "sun", ["##", "##", "##"]],
  ["Elbow, upper left", "coral", ["###", "#.."]],
  ["Elbow, upper right", "coral", ["###", "..#"]],
  ["Elbow, lower left", "coral", ["#..", "###"]],
  ["Elbow, lower right", "coral", ["..#", "###"]],
  ["Elbow, left foot", "coral", [".#", ".#", "##"]],
  ["Elbow, right foot", "coral", ["#.", "#.", "##"]],
  ["Elbow, left cap", "coral", ["##", ".#", ".#"]],
  ["Elbow, right cap", "coral", ["##", "#.", "#."]],
  ["Cross", "lilac", [".#.", "###", ".#."]],
];

export const SHAPES = templates.map(([name, color, rows]) => ({
  name,
  color,
  width: rows[0].length,
  height: rows.length,
  cells: rows.flatMap((row, y) => [...row].flatMap((cell, x) => cell === "#" ? [[x, y]] : [])),
}));

export function drawHand(remainder, random = Math.random) {
  const bag = [...remainder];
  if (bag.length < HAND_SIZE) {
    const nextBag = SHAPES.map((_, index) => index);
    for (let i = nextBag.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [nextBag[i], nextBag[j]] = [nextBag[j], nextBag[i]];
    }
    bag.push(...nextBag);
  }
  const hand = bag.splice(0, HAND_SIZE);
  return { hand, bag };
}

export function createGame(random = Math.random) {
  return { board: Array(SIZE * SIZE).fill(null), score: 0, combo: 0, theme: DEFAULT_THEME, ...drawHand([], random) };
}

export function canPlace(board, shape, x, y) {
  return Number.isInteger(x) && Number.isInteger(y)
    && x >= 0 && y >= 0 && x + shape.width <= SIZE && y + shape.height <= SIZE
    && shape.cells.every(([dx, dy]) => board[(y + dy) * SIZE + x + dx] === null);
}

export function isGameOver({ board, hand }) {
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

export function placePiece(game, slot, x, y, random = Math.random) {
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
  const next = hand.every(piece => piece === null) ? drawHand(game.bag, random) : { hand, bag: game.bag };
  const fullBoardClear = board.every(cell => cell === null);
  const { points, combo, bonus } = scorePlacement(shape.cells.length, rows.length + columns.length, game.combo, fullBoardClear);
  const theme = fullBoardClear ? nextTheme(game.theme) : game.theme;
  return {
    game: { board, score: game.score + points, combo, theme, ...next },
    points, rows, columns, cleared, fullBoardClear, bonus,
  };
}
