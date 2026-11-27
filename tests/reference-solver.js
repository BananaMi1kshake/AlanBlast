import { SHAPES, SIZE } from "../js/pieces.js";

export function clearLines(board) {
  const rows = Array.from({ length: SIZE }, (_, y) =>
    board.slice(y * SIZE, (y + 1) * SIZE).every(cell => cell !== null));
  const columns = Array.from({ length: SIZE }, (_, x) =>
    rows.every((_, y) => board[y * SIZE + x] !== null));
  return board.map((cell, i) => rows[Math.floor(i / SIZE)] || columns[i % SIZE] ? null : cell);
}

export function referenceSolves(board, hand, { fixedOrder = false, clear = true, goal = "completion" } = {}) {
  const count = grid => grid.filter(cell => cell !== null).length;
  const start = count(board);
  function search(grid, remaining, seen) {
    if (remaining.length === 0) {
      if (goal === "cleanup") return count(grid) <= start - 4;
      return goal === "completion" || seen;
    }
    for (let slot = 0; slot < (fixedOrder ? 1 : remaining.length); slot++) {
      const { cells, width, height } = SHAPES[remaining[slot]];
      for (let y = 0; y <= SIZE - height; y++) {
        for (let x = 0; x <= SIZE - width; x++) {
          if (!cells.every(([dx, dy]) => grid[(y + dy) * SIZE + x + dx] === null)) continue;
          if (remaining.length === 1 && goal === "completion") return true;
          const placed = grid.slice();
          for (const [dx, dy] of cells) placed[(y + dy) * SIZE + x + dx] = 0;
          const rest = remaining.filter((_, index) => index !== slot);
          const next = clear ? clearLines(placed) : placed;
          const hit = goal === "allClear" ? next.every(cell => cell === null)
            : goal === "line" && count(next) < count(placed);
          if (search(next, rest, seen || hit)) return true;
        }
      }
    }
    return false;
  }
  return search(board, hand, false);
}
