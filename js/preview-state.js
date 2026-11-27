import { canPlace, SIZE } from "./game.js";

export const PREVIEW = Object.freeze({ valid: 1, invalid: 2, line: 4 });

export function createPreviewState() {
  const rows = new Uint8Array(SIZE);
  const columns = new Uint8Array(SIZE);
  const addRows = new Uint8Array(SIZE);
  const addColumns = new Uint8Array(SIZE);
  let board;

  function markPreview(cells, shape, x, y, flags) {
    flags.fill(0);
    if (!shape) return false;
    const valid = canPlace(cells, shape, x, y);
    for (const [dx, dy] of shape.cells) {
      const col = x + dx;
      const row = y + dy;
      if (col >= 0 && col < SIZE && row >= 0 && row < SIZE) {
        flags[row * SIZE + col] = valid ? PREVIEW.valid : PREVIEW.invalid;
      }
    }
    if (!valid) return false;

    if (board !== cells) {
      board = cells;
      rows.fill(0);
      columns.fill(0);
      for (let i = 0; i < cells.length; i++) {
        if (cells[i] === null) continue;
        rows[Math.floor(i / SIZE)]++;
        columns[i % SIZE]++;
      }
    }
    addRows.fill(0);
    addColumns.fill(0);
    for (const [dx, dy] of shape.cells) {
      addRows[y + dy]++;
      addColumns[x + dx]++;
    }
    let fullRows = 0;
    let fullColumns = 0;
    for (let i = 0; i < SIZE; i++) {
      if (rows[i] + addRows[i] === SIZE) fullRows |= 1 << i;
      if (columns[i] + addColumns[i] === SIZE) fullColumns |= 1 << i;
    }
    if (fullRows || fullColumns) {
      for (let i = 0; i < flags.length; i++) {
        if ((fullRows & (1 << Math.floor(i / SIZE))) || (fullColumns & (1 << (i % SIZE)))) {
          flags[i] |= PREVIEW.line;
        }
      }
    }
    return true;
  }
  return markPreview;
}
