import { canPlace, completedLines, SHAPES, SIZE } from "./game.js";
import { createEffects } from "./effects.js";
import { createCounter, MOTION } from "./motion.js";

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
  const comboWindow = [...document.querySelector("#combo-window").children];
  const controls = document.querySelector("#controls");
  const clearNotice = document.querySelector("#clear-notice");
  const overlay = document.querySelector("#game-over");
  const overMessage = document.querySelector("#game-over-message");
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

  const motion = matchMedia("(prefers-reduced-motion: reduce)");
  const effects = createEffects(document.querySelector("#effects"), cells, motion);
  document.documentElement.style.setProperty("--theme-duration", `${MOTION.theme}ms`);
  const scheduler = { request: callback => requestAnimationFrame(callback), cancel: id => cancelAnimationFrame(id) };
  const animateScore = createCounter(value => { score.textContent = value; }, scheduler);
  const animateBest = createCounter(value => { best.textContent = value; }, scheduler);
  let previous;
  let previousBest = 0;
  let previewKey;
  let previews = new Map();
  let focused = 0;

  function preview(game, shape, x, y) {
    if (previewKey?.board === game.board && previewKey.shape === shape && previewKey.x === x && previewKey.y === y) {
      return previewKey.valid;
    }
    const valid = !!shape && canPlace(game.board, shape, x, y);
    previewKey = { board: game.board, shape, x, y, valid };
    const next = new Map();
    if (shape) {
      const projected = valid ? game.board.slice() : null;
      for (const [dx, dy] of shape.cells) {
        const column = x + dx;
        const row = y + dy;
        if (row < 0 || row >= SIZE || column < 0 || column >= SIZE) continue;
        const i = row * SIZE + column;
        next.set(i, valid ? "preview-valid" : "preview-invalid");
        if (valid) {
          cells[i].style.setProperty("--preview-color", `var(--${shape.color})`);
          projected[i] = 0;
        }
      }
      if (valid) {
        const { rows, columns } = completedLines(projected);
        if (rows.length || columns.length) {
          for (let i = 0; i < cells.length; i++) {
            if (rows.includes(Math.floor(i / SIZE)) || columns.includes(i % SIZE)) {
              next.set(i, next.has(i) ? "preview-valid preview-line" : "preview-line");
            }
          }
        }
      }
    }
    for (const [i, classes] of previews) {
      if (next.get(i) !== classes) cells[i].classList.remove(...classes.split(" "));
    }
    for (const [i, classes] of next) {
      if (previews.get(i) !== classes) cells[i].classList.add(...classes.split(" "));
    }
    previews = next;
    return valid;
  }

  motion.addEventListener("change", () => {
    if (!motion.matches || !previous) return;
    animateScore(previous.score, false);
    animateBest(previousBest, false);
    for (const slot of slots) slot.firstElementChild?.getAnimations().forEach(animation => animation.cancel());
    best.parentElement.getAnimations().forEach(animation => animation.cancel());
  });

  function render(game, highScore, gameOver, move, refill) {
    const { fullBoardClear = false, bonus = 0 } = move?.result ?? {};
    if (move && move.result.game === game) {
      effects.placement(previous, move.result, move.slot, move.x, move.y);
    }
    preview(game);
    cells.forEach((cell, index) => {
      const id = game.board[index];
      if (previous?.board[index] === id) return;
      if (id === null) delete cell.dataset.color;
      else cell.dataset.color = SHAPES[id].color;
      cell.setAttribute("aria-label", `Row ${Math.floor(index / SIZE) + 1}, column ${index % SIZE + 1}, ${id === null ? "empty" : "filled"}`);
    });
    slots.forEach((button, index) => {
      const shape = SHAPES[game.hand[index]];
      button.disabled = !shape || gameOver;
      if (previous?.hand[index] === game.hand[index]) return;
      button.setAttribute("aria-label", shape ? shape.name : "Used piece");
      button.setAttribute("aria-pressed", "false");
      const piece = shape ? makePiece(shape) : null;
      button.replaceChildren(...(piece ? [piece] : []));
      if (piece && refill && !motion.matches) piece.animate([
        { opacity: .45, transform: "translateY(8px) scale(.88)" },
        { opacity: 1, transform: "translateY(0) scale(1)" },
      ], { duration: MOTION.refill, delay: index * MOTION.refillStagger, fill: "backwards", easing: "ease-out" });
    });
    animateScore(game.score, !!previous && !motion.matches);
    animateBest(highScore, !!previous && !motion.matches);
    score.setAttribute("aria-label", String(game.score));
    best.setAttribute("aria-label", String(highScore));
    if (previous && highScore > previousBest && !motion.matches) {
      const card = best.parentElement;
      card.getAnimations().filter(animation => animation.id === "record").forEach(animation => animation.cancel());
      const pulse = card.animate([{ transform: "scale(1)" }, { transform: "scale(1.045)" }, { transform: "scale(1)" }],
        { duration: MOTION.counter });
      pulse.id = "record";
    }
    combo.textContent = game.combo;
    combo.setAttribute("aria-label", `${game.combo}, ${game.comboWindow} placements left in combo window`);
    comboWindow.forEach((pip, index) => pip.classList.toggle("active", index < game.comboWindow));
    document.documentElement.dataset.theme = game.theme;
    controls.hidden = fullBoardClear;
    clearNotice.hidden = !fullBoardClear;
    clearNotice.textContent = fullBoardClear ? `Full-board clear! +${bonus} bonus` : "";
    overlay.hidden = !gameOver;
    overMessage.textContent = game.exhausted ? "No solvable hand exists." : "No remaining piece fits.";
    board.inert = gameOver;
    previous = game;
    previousBest = highScore;
  }

  return {
    board, tray, cells, slots, render, preview, motion,
    resetFeedback() {
      effects.reset();
      animateScore(0, false);
      animateBest(previousBest, false);
      best.parentElement.getAnimations().filter(animation => animation.id === "record").forEach(animation => animation.cancel());
    },
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
