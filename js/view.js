import { canPlace, SHAPES, SIZE } from "./game.js";

export function makePiece(shape) {
  const piece = document.createElement("span");
  piece.className = "piece";
  piece.dataset.color = shape.color;
  piece.style.setProperty("--rows", shape.height);
  piece.style.setProperty("--columns", shape.width);
  for (const [x, y] of shape.cells) {
    const block = document.createElement("span");
    block.className = "block";
    block.style.gridArea = `${y + 1} / ${x + 1}`;
    piece.append(block);
  }
  return piece;
}

export function createView() {
  const board = document.querySelector("#board");
  const tray = document.querySelector("#tray");
  const slots = [...tray.querySelectorAll("button")];
  const score = document.querySelector("#score");
  const best = document.querySelector("#high-score");
  const combo = document.querySelector("#combo");
  const controls = document.querySelector("#controls");
  const clearNotice = document.querySelector("#clear-notice");
  const overlay = document.querySelector("#game-over");
  const status = document.querySelector("#status");
  const cells = [];
  for (let y = 0; y < SIZE; y++) {
    const row = document.createElement("div");
    row.className = "board-row";
    row.setAttribute("role", "row");
    for (let x = 0; x < SIZE; x++) {
      const cell = document.createElement("div");
      cell.className = "cell";
      cell.setAttribute("role", "gridcell");
      cell.dataset.index = cells.length;
      cell.tabIndex = cells.length === 0 ? 0 : -1;
      row.append(cell);
      cells.push(cell);
    }
    board.append(row);
  }

  let previews = [];
  let clearedCells = [];
  let focused = 0;

  function preview(game, shape, x, y) {
    for (const cell of previews) cell.classList.remove("preview-valid", "preview-invalid");
    previews = [];
    if (!shape) return false;

    const valid = canPlace(game.board, shape, x, y);
    for (const [dx, dy] of shape.cells) {
      const column = x + dx;
      const row = y + dy;
      if (row < 0 || row >= SIZE || column < 0 || column >= SIZE) continue;
      const cell = cells[row * SIZE + column];
      cell.classList.add(valid ? "preview-valid" : "preview-invalid");
      previews.push(cell);
    }
    return valid;
  }

  function render(game, highScore, gameOver, { cleared = [], fullBoardClear = false, bonus = 0 } = {}) {
    preview(game);
    for (const cell of clearedCells) cell.classList.remove("cleared");
    cells.forEach((cell, index) => {
      const id = game.board[index];
      if (id === null) delete cell.dataset.color;
      else cell.dataset.color = SHAPES[id].color;
      cell.setAttribute("aria-label", `Row ${Math.floor(index / SIZE) + 1}, column ${index % SIZE + 1}, ${id === null ? "empty" : "filled"}`);
    });
    clearedCells = cleared.map(index => cells[index]);
    for (const cell of clearedCells) cell.classList.add("cleared");

    slots.forEach((button, index) => {
      const shape = SHAPES[game.hand[index]];
      button.disabled = !shape || gameOver;
      button.setAttribute("aria-label", shape ? shape.name : "Used piece");
      button.setAttribute("aria-pressed", "false");
      button.replaceChildren(...(shape ? [makePiece(shape)] : []));
    });
    score.textContent = game.score;
    best.textContent = highScore;
    combo.textContent = game.combo;
    document.documentElement.dataset.theme = game.theme;
    controls.hidden = fullBoardClear;
    clearNotice.hidden = !fullBoardClear;
    clearNotice.textContent = fullBoardClear ? `Full-board clear! +${bonus} bonus` : "";
    overlay.hidden = !gameOver;
    board.inert = gameOver;
  }

  return {
    board, tray, cells, slots, render, preview,
    announce(message) { status.textContent = message; },
    select(slot) {
      slots.forEach((button, index) => button.setAttribute("aria-pressed", String(index === slot)));
    },
    focusCell(index) {
      cells[focused].tabIndex = -1;
      focused = index;
      cells[focused].tabIndex = 0;
      cells[focused].focus({ preventScroll: true });
    },
  };
}
