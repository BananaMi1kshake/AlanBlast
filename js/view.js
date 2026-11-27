import { MATERIALS, visualProfile } from "./themes.js";
import { SHAPES, SIZE } from "./game.js";
import { createPreviewState, PREVIEW } from "./preview-state.js";
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

export function createView(motion) {
  const board = document.querySelector("#board");
  const tray = document.querySelector("#tray");
  const slots = [...tray.querySelectorAll("button")];
  const score = document.querySelector("#score");
  const best = document.querySelector("#high-score");
  const combo = document.querySelector("#combo");
  const comboWindow = [...document.querySelector("#combo-window").children];
  const clearNotice = document.querySelector("#clear-notice");
  const overlay = document.querySelector("#game-over");
  const overMessage = document.querySelector("#game-over-message");
  const finalScore = document.querySelector("#final-score");
  const finalBest = document.querySelector("#final-best");
  const recordBadge = document.querySelector("#record-badge");
  const themeColor = document.querySelector('meta[name="theme-color"]');
  const sceneFade = document.querySelector("#scene-fade");
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

  const effects = createEffects(document.querySelector("#effects"), cells, motion);
  document.documentElement.style.setProperty("--theme-duration", `${MOTION.theme}ms`);
  const scheduler = { request: callback => requestAnimationFrame(callback), cancel: id => cancelAnimationFrame(id) };
  const animateScore = createCounter(value => { score.textContent = value; }, scheduler);
  const animateBest = createCounter(value => { best.textContent = value; }, scheduler);
  let previous;
  let previousGems = new Set();
  let previousBest = 0;
  let previewKey;
  const markPreview = createPreviewState();
  const previews = new Uint8Array(SIZE * SIZE);
  const nextPreview = new Uint8Array(SIZE * SIZE);
  let previewColor;
  let focused = 0;
  let paint;
  const sceneProperties = ["--scene-glow", "--scene-top", "--scene-bottom", "--world-detail", "--world-size"];

  function stopThemeFade() {
    sceneFade.getAnimations().forEach(animation => animation.cancel());
    sceneFade.hidden = true;
  }

  function setTheme(game, animate) {
    const profile = visualProfile(game);
    stopThemeFade();
    const root = document.documentElement;
    if (animate) {
      for (const key of sceneProperties) sceneFade.style.setProperty(key, paint[key]);
      sceneFade.hidden = false;
      const fade = sceneFade.animate([{ opacity: 1 }, { opacity: 0 }], {
        duration: MOTION.theme, easing: "ease-in-out", fill: "both",
      });
      fade.onfinish = stopThemeFade;
    }
    root.dataset.theme = game.theme;
    root.dataset.palette = profile.palette;
    root.dataset.material = profile.material;
    const colors = getComputedStyle(root);
    paint = Object.fromEntries([...sceneProperties, "--chrome", "--mint", "--sky", "--sun",
      "--coral", "--lilac", "--particle", "--clear-glow"].map(key => [key, colors.getPropertyValue(key).trim()]));
    themeColor.content = paint["--chrome"];
  }

  function preview(game, shape, x, y) {
    if (previewKey?.board === game.board && previewKey.shape === shape && previewKey.x === x && previewKey.y === y) {
      return previewKey.valid;
    }
    const valid = markPreview(game.board, shape, x, y, nextPreview);
    previewKey = { board: game.board, shape, x, y, valid };
    if (valid && previewColor !== shape.color) {
      previewColor = shape.color;
      board.style.setProperty("--preview-color", `var(--${shape.color})`);
    }
    for (let i = 0; i < previews.length; i++) {
      const flags = nextPreview[i];
      const changed = previews[i] ^ flags;
      if (!changed) continue;
      if (changed & PREVIEW.valid) cells[i].classList.toggle("preview-valid", !!(flags & PREVIEW.valid));
      if (changed & PREVIEW.invalid) cells[i].classList.toggle("preview-invalid", !!(flags & PREVIEW.invalid));
      if (changed & PREVIEW.line) cells[i].classList.toggle("preview-line", !!(flags & PREVIEW.line));
      previews[i] = flags;
    }
    return valid;
  }

  motion.addEventListener("change", () => {
    if (!motion.matches || !previous) return;
    stopThemeFade();
    animateScore(previous.score, false);
    animateBest(previousBest, false);
    for (const slot of slots) slot.firstElementChild?.getAnimations().forEach(animation => animation.cancel());
    best.parentElement.getAnimations().forEach(animation => animation.cancel());
  });

  function render(game, highScore, gameOver, move, refill, adventure) {
    const { fullBoardClear = false, bonus = 0 } = move?.result ?? {};
    if (move && move.result.game === game) {
      if (adventure) effects.collectGems(move.result.gemsCollected, adventure.gemTarget);
      effects.placement(previous, move.result, move.slot, move.x, move.y, paint);
      if (adventure && move.result.won && !fullBoardClear) effects.celebrate(game, paint);
    }
    const gems = new Set(adventure?.gems);
    preview(game);
    cells.forEach((cell, index) => {
      const id = game.board[index];
      const gem = gems.has(index);
      if (previous?.board[index] === id && previousGems.has(index) === gem) return;
      cell.toggleAttribute("data-gem", gem);
      if (id === null) delete cell.dataset.color;
      else cell.dataset.color = SHAPES[id].color;
      cell.setAttribute("aria-label", `Row ${Math.floor(index / SIZE) + 1}, column ${index % SIZE + 1}, ${id === null ? "empty" : "filled"}${gem ? ", gem" : ""}`);
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
    const digits = String(game.score).length;
    if (digits !== String(previous?.score).length || !previous) score.style.setProperty("--score-digits", digits);
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
    if (game.theme !== previous?.theme || game.material !== previous?.material || game.palette !== previous?.palette) {
      setTheme(game, !!previous && !motion.matches);
    }
    clearNotice.hidden = !fullBoardClear;
    const changed = fullBoardClear && game.material !== previous?.material;
    const name = changed ? ` · ${MATERIALS[game.material].name}` : "";
    clearNotice.textContent = fullBoardClear ? `Full-board clear! +${bonus} bonus${name}` : "";
    overlay.hidden = !gameOver || !!adventure;
    if (gameOver && !adventure) {
      finalScore.textContent = game.score;
      finalBest.textContent = highScore;
      recordBadge.hidden = game.record !== true;
    }
    overMessage.textContent = game.exhausted ? "No solvable hand exists." : "No remaining piece fits.";
    board.inert = gameOver;
    previous = game;
    previousGems = gems;
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
    effects: options => effects.configure(options),
    particleCount: effects.particleCount,
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
