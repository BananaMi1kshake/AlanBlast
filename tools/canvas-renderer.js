// Lab-only renderer. Static board and tray are cached apart from moving effects.
import { createPreviewState, PREVIEW } from "../js/preview-state.js";
import { placementTarget } from "../js/drag-geometry.js";
import { SHAPES, SIZE } from "../js/pieces.js";

export const CANVAS_SIZE = { width: 390, height: 450 };
const gap = 4;
const cell = 39;
const pitch = cell + gap;
const grid = { left: 25, top: 16, stepX: pitch, stepY: pitch };
const trayCenterY = 410;
const trayPitch = 15;
const center = slot => 66 + slot * 129;

export function canvasFootprint(shape, left, top, step = pitch) {
  return shape.cells.map(([x, y]) => [left + x * step, top + y * step]);
}

export function makeCanvasRenderer(canvas, paint, texture, density = devicePixelRatio) {
  const dpr = Math.min(2, Math.max(1, density));
  const flags = new Uint8Array(SIZE * SIZE);
  const preview = createPreviewState();
  const background = document.createElement("canvas");
  for (const surface of [canvas, background]) {
    surface.width = CANVAS_SIZE.width * dpr;
    surface.height = CANVAS_SIZE.height * dpr;
  }
  const ctx = canvas.getContext("2d");
  const base = background.getContext("2d");
  for (const context of [ctx, base]) context.scale(dpr, dpr);
  const sprites = new Map();
  for (const key of ["mint", "sky", "sun", "coral", "lilac"]) {
    const sprite = document.createElement("canvas");
    sprite.width = sprite.height = cell * dpr;
    const pen = sprite.getContext("2d");
    pen.scale(dpr, dpr);
    pen.beginPath();
    pen.roundRect(0, 0, cell, cell, 5);
    pen.clip();
    pen.fillStyle = paint[key];
    pen.fillRect(0, 0, cell, cell);
    const highlight = pen.createLinearGradient(0, 0, cell / 3, cell);
    highlight.addColorStop(0, "#ffffff66");
    highlight.addColorStop(.46, "#ffffff04");
    highlight.addColorStop(1, "#00154055");
    pen.fillStyle = highlight;
    pen.fillRect(0, 0, cell, cell);
    if (texture) {
      pen.globalAlpha = .64;
      pen.drawImage(texture, 0, 0, cell, cell);
    }
    sprites.set(key, sprite);
  }
  let game;
  let clearing = [];
  let started = -Infinity;
  let previousShape;
  let previousTarget;
  let valid;

  function tile(context, color, x, y, size = cell) {
    const sprite = sprites.get(color);
    if (sprite) context.drawImage(sprite, x, y, size, size);
    else {
      context.fillStyle = paint.empty;
      context.roundRect(x, y, size, size, 4);
      context.fill();
    }
  }
  function setGame(next, result, now = performance.now()) {
    if (result) {
      clearing = result.cleared.map(i => ({ index: i, color: SHAPES[game?.board[i] ?? result.id]?.color ?? "sky" }));
      started = now;
    } else clearing = [];
    game = next;
    previousShape = undefined;
    previousTarget = undefined;
    flags.fill(0);
    base.fillStyle = paint.scene;
    base.fillRect(0, 0, CANVAS_SIZE.width, CANVAS_SIZE.height);
    base.fillStyle = paint.board;
    base.fillRect(grid.left - 7, grid.top - 7, SIZE * pitch + 10, SIZE * pitch + 10);
    for (let i = 0; i < next.board.length; i++) {
      base.beginPath();
      tile(base, SHAPES[next.board[i]]?.color, grid.left + (i % SIZE) * pitch, grid.top + Math.floor(i / SIZE) * pitch);
    }
    next.hand.forEach((id, slot) => {
      if (id === null) return;
      const shape = SHAPES[id];
      const top = trayCenterY - shape.height * trayPitch / 2;
      for (const [x, y] of canvasFootprint(shape, center(slot) - shape.width * trayPitch / 2, top, trayPitch)) {
        tile(base, shape.color, x, y, trayPitch - 2);
      }
    });
  }

  function draw(drag, now = performance.now()) {
    ctx.drawImage(background, 0, 0, CANVAS_SIZE.width, CANVAS_SIZE.height);
    const shape = drag && SHAPES[game.hand[drag.slot]];
    if (shape) {
      const target = placementTarget(grid, drag.left, drag.top);
      if (shape !== previousShape || target.x !== previousTarget?.x || target.y !== previousTarget?.y) {
        valid = preview(game.board, shape, target.x, target.y, flags);
        previousShape = shape;
        previousTarget = target;
      }
      for (let i = 0; i < flags.length; i++) {
        const mark = flags[i];
        if (!mark) continue;
        const x = grid.left + (i % SIZE) * pitch;
        const y = grid.top + Math.floor(i / SIZE) * pitch;
        ctx.globalAlpha = .52;
        if (mark & PREVIEW.valid) tile(ctx, shape.color, x, y);
        else {
          ctx.fillStyle = mark & PREVIEW.invalid ? "#ef5669" : "#ffeab0";
          ctx.fillRect(x, y, cell, cell);
        }
        if (mark & PREVIEW.line) {
          ctx.strokeStyle = "#fff0a5";
          ctx.lineWidth = 2;
          ctx.strokeRect(x + 1, y + 1, cell - 2, cell - 2);
        }
      }
      ctx.globalAlpha = valid ? .95 : .76;
      for (const [x, y] of canvasFootprint(shape, drag.left, drag.top)) tile(ctx, shape.color, x, y);
    }
    const progress = (now - started) / 380;
    if (progress >= 0 && progress < 1) {
      ctx.globalAlpha = (1 - progress) * .88;
      for (const [i, item] of clearing.entries()) {
        const x = grid.left + (item.index % SIZE) * pitch;
        const y = grid.top + Math.floor(item.index / SIZE) * pitch;
        tile(ctx, item.color, x + cell * progress / 2, y + cell * progress / 2, cell * (1 - progress));
        if (i < 24) {
          ctx.fillStyle = paint[item.color];
          ctx.fillRect(x + 19 + Math.sin(i * 2.4) * progress * 55, y + 19 + Math.cos(i * 2.4) * progress * 55, 4, 4);
        }
      }
    }
    ctx.globalAlpha = 1;
  }

  return { setGame, draw, target: drag => placementTarget(grid, drag.left, drag.top),
    bytes: 2 * canvas.width * canvas.height * 4 };
}
