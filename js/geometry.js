import { SIZE } from "./pieces.js";

export function inBounds(width, height, x, y) {
  return Number.isInteger(x) && Number.isInteger(y)
    && x >= 0 && y >= 0 && x + width <= SIZE && y + height <= SIZE;
}

export function footprint(shape, x, y) {
  return shape.cells.map(([dx, dy]) => [x + dx, y + dy]);
}

export function placementIndices(shape, x, y) {
  return footprint(shape, x, y).map(([column, row]) => row * SIZE + column);
}

export function boardGeometry(rect, gapX, gapY) {
  const unitX = (rect.width - (SIZE - 1) * gapX) / SIZE;
  const unitY = (rect.height - (SIZE - 1) * gapY) / SIZE;
  return { left: rect.left, top: rect.top, unitX, unitY, gapX, gapY,
    stepX: unitX + gapX, stepY: unitY + gapY, bottom: rect.top + rect.height };
}

export function readBoardGeometry(board) {
  // The board and row establish the layout grid. Cell transforms are decoration.
  const rect = board.getBoundingClientRect();
  const style = getComputedStyle(board);
  const row = getComputedStyle(board.firstElementChild);
  const gapX = parseFloat(row.columnGap) * rect.width / parseFloat(style.width);
  const gapY = parseFloat(style.rowGap) * rect.height / parseFloat(style.height);
  return boardGeometry(rect, gapX, gapY);
}

export function pieceSize(grid, shape) {
  return {
    width: shape.width * grid.stepX - grid.gapX,
    height: shape.height * grid.stepY - grid.gapY,
  };
}
