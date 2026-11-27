import assert from "node:assert/strict";
import { SHAPES } from "../js/pieces.js";

export function verifyWitness(level) {
  const board = level.board.join("").split("").map(cell => cell !== ".");
  const gems = new Set(level.gems);
  let handNumber = 0;
  let hand = level.hands[handNumber].slice();
  let combo = 0;
  let misses = 0;
  let total = 0;
  let won = false;
  const counts = { score: 0, gems: 0, rows: 0, columns: 0, lines: 0, allClear: 0, combo: 0 };
  for (const { slot, x, y } of level.validation.witness) {
    assert.equal(won, false, "The witness must stop immediately after winning.");
    total++;
    assert.ok(total <= (level.maxMoves ?? Infinity));
    const shape = SHAPES[hand[slot]];
    assert.ok(shape, "The piece must still be in the revealed tray.");
    for (const [dx, dy] of shape.cells) {
      assert.ok(x + dx >= 0 && x + dx < 8 && y + dy >= 0 && y + dy < 8);
      const index = (y + dy) * 8 + x + dx;
      assert.equal(board[index], false, "The piece cannot overlap the board.");
      board[index] = true;
    }
    hand[slot] = null;

    const cleared = new Set();
    let rows = 0;
    let columns = 0;
    for (let line = 0; line < 8; line++) {
      const row = Array.from({ length: 8 }, (_, i) => line * 8 + i);
      const column = Array.from({ length: 8 }, (_, i) => i * 8 + line);
      if (row.every(index => board[index])) { rows++; row.forEach(index => cleared.add(index)); }
      if (column.every(index => board[index])) { columns++; column.forEach(index => cleared.add(index)); }
    }
    for (const index of cleared) {
      if (gems.delete(index)) counts.gems++;
      board[index] = false;
    }
    const allClear = board.every(cell => !cell);
    const lines = rows + columns;
    if (lines > 0) { combo++; misses = 0; }
    else if (++misses >= 3) combo = 0;
    counts.combo = Math.max(counts.combo, combo);
    counts.rows += rows;
    counts.columns += columns;
    counts.lines += lines;
    counts.allClear += Number(allClear);
    counts.score += shape.cells.length + (10 * lines + 5 * (lines * (lines - 1) / 2)) * combo + (allClear ? 100 : 0);
    won = level.objectives.every(goal => counts[goal.type] >= goal.target);
    if (!won && hand.every(id => id === null)) {
      handNumber++;
      assert.ok(handNumber < level.hands.length, "The witness must finish before the supply runs out.");
      hand = level.hands[handNumber].slice();
    }
  }
  assert.ok(won, level.id + " must reach every objective");
  return { moves: total, ...counts };
}
