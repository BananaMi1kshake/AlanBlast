import { pieceSize, readBoardGeometry } from "./geometry.js";
import { boardMoved, dragFrame, grabOffset, INPUT, inputTuning, placementTarget, touchClearance, visualOrigin } from "./drag-geometry.js";
import { SHAPES, SIZE } from "./game.js";
import { makePiece } from "./view.js";
const directions = {
  ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1],
};

export function bindInput(view, getGame, place, playSound, { inspect } = {}) {
  const { board, tray, slots } = view;
  let selected = null;
  let drag = null;
  let returning;
  let tuning = INPUT;
  const viewport = window.visualViewport;
  const point = event => ({ x: event.clientX, y: event.clientY });
  const transform = ({ left, top, scaleX = 1, scaleY = scaleX }) =>
    `translate3d(${left}px, ${top}px, 0) scale(${scaleX}, ${scaleY})`;

  function report() {
    if (!inspect) return;
    const visual = viewport ?? window;
    inspect(drag && {
      slot: drag.slot, phase: drag.ghost ? "dragging" : "pressed", pointer: drag.pointer,
      floating: drag.visual, target: drag.target, valid: drag.valid, lift: drag.clearance,
      cell: { width: drag.grid.unitX, height: drag.grid.unitY, pitchX: drag.grid.stepX, pitchY: drag.grid.stepY },
      board: { left: drag.grid.left, top: drag.grid.top, bottom: drag.grid.bottom },
      viewport: { width: visual.width ?? window.innerWidth, height: visual.height ?? window.innerHeight, scale: viewport?.scale ?? 1 },
      scroll: { x: window.scrollX, y: window.scrollY },
    });
  }

  function finishReturn() {
    if (!returning) return;
    returning.animation.cancel();
    returning.button.classList.remove("returning");
    returning.ghost.remove();
    returning = null;
  }

  function select(slot) {
    selected = slot;
    view.select(slot);
    view.preview(getGame());
  }

  function showAt(index, slot) {
    return view.preview(getGame(), SHAPES[getGame().hand[slot]], index % SIZE, Math.floor(index / SIZE));
  }

  function placeAt(index) {
    if (selected === null) return;
    if (!place(selected, index % SIZE, Math.floor(index / SIZE))) {
      showAt(index, selected);
      view.announce("That piece does not fit here.");
      playSound("invalid");
    }
  }

  function draw(progress) {
    const { pointer, offsets, grid, target, shape, ghost } = drag;
    const frame = dragFrame(pointer, offsets, progress);
    const next = placementTarget(grid, frame.left, frame.top, target, tuning.hysteresis);
    const game = getGame();
    if (!target || next.x !== target.x || next.y !== target.y || drag.previewBoard !== game.board) {
      drag.target = next;
      drag.previewBoard = game.board;
      drag.valid = view.preview(game, shape, next.x, next.y);
      ghost.classList.toggle("invalid", !drag.valid);
    }
    const visual = { ...frame, ...visualOrigin(frame, grid, shape, next, tuning.snapVisual) };
    ghost.style.transform = transform(visual);
    drag.visual = visual;
    drag.progress = progress;
    report();
  }

  function pickupFrame(now) {
    drag.frame = undefined;
    const duration = view.motion.matches ? 0 : tuning.pickupMs;
    draw(duration ? Math.max(0, Math.min(1, (now - drag.started) / duration)) : 1);
    if (drag.progress < 1) drag.frame = requestAnimationFrame(pickupFrame);
  }

  function begin() {
    const { shape, grid } = drag;
    const ghost = document.createElement("span");
    ghost.className = "floating";
    ghost.setAttribute("aria-hidden", "true");
    const piece = makePiece(shape);
    piece.style.setProperty("--unit-x", `${grid.unitX}px`);
    piece.style.setProperty("--unit-y", `${grid.unitY}px`);
    piece.style.setProperty("--gap-x", `${grid.gapX}px`);
    piece.style.setProperty("--gap-y", `${grid.gapY}px`);
    ghost.append(piece);
    document.body.append(ghost);
    drag.ghost = ghost;
    drag.button.classList.remove("pressed");
    drag.button.classList.add("dragging");
    drag.started = performance.now();
    drag.progress = view.motion.matches || !tuning.pickupMs ? 1 : 0;
    select(drag.slot);
    playSound("pickup");
  }

  function stopDrag(animateReturn = false) {
    if (!drag) return;
    const { button, pointerId, ghost, rect, offsets, frame } = drag;
    drag = null;
    if (frame !== undefined) cancelAnimationFrame(frame);
    button.classList.remove("pressed", "dragging");
    if (button.hasPointerCapture(pointerId)) button.releasePointerCapture(pointerId);
    if (ghost && animateReturn && !view.motion.matches && tuning.returnMs) {
      finishReturn();
      button.classList.add("returning");
      const animation = ghost.animate([
        { transform: ghost.style.transform, opacity: .8 },
        { transform: transform({ left: rect.left, top: rect.top,
          scaleX: offsets.startScaleX, scaleY: offsets.startScaleY }), opacity: 1 },
      ], { duration: tuning.returnMs, easing: "ease-out", fill: "both" });
      returning = { button, ghost, animation };
      animation.onfinish = finishReturn;
    } else {
      ghost?.remove();
    }
    view.preview(getGame());
    report();
  }

  function reset() {
    finishReturn();
    stopDrag();
    select(null);
  }

  function pastThreshold() {
    const { start, pointer, touch } = drag;
    return Math.hypot(pointer.x - start.x, pointer.y - start.y) >= (touch ? tuning.touchThreshold : tuning.mouseThreshold);
  }

  tray.addEventListener("pointerdown", event => {
    if (drag || !event.isPrimary || event.button !== 0) return;
    const button = event.target.closest("button[data-slot]");
    if (!button || button.disabled) return;
    const slot = Number(button.dataset.slot);
    const shape = SHAPES[getGame().hand[slot]];
    if (!shape) return;
    finishReturn();
    const trayPiece = button.firstElementChild;
    trayPiece.getAnimations().forEach(animation => animation.cancel());
    const rect = trayPiece.getBoundingClientRect();
    const grid = readBoardGeometry(board);
    const size = pieceSize(grid, shape);
    const start = point(event);
    const touch = event.pointerType === "touch";
    const bottom = viewport ? viewport.offsetTop + viewport.height : window.innerHeight;
    const safe = parseFloat(getComputedStyle(tray.closest(".game-shell")).paddingBottom) || 0;
    const clearance = touch ? touchClearance(grid, bottom - safe, tuning.touchLift) : 0;
    drag = {
      slot, button, shape, pointerId: event.pointerId, start, pointer: start, touch, rect, grid, clearance,
      scale: viewport?.scale ?? 1, offsets: grabOffset(rect, size, start, touch, clearance, tuning.grabAnchor),
    };
    button.classList.add("pressed");
    try { button.setPointerCapture(event.pointerId); } catch { /* Document listeners also track uncaptured pointers. */ }
    report();
  });

  document.addEventListener("pointermove", event => {
    if (!drag || event.pointerId !== drag.pointerId) return;
    checkLayout();
    if (!drag) return;
    drag.pointer = point(event);
    if (!drag.ghost) {
      if (!pastThreshold()) { report(); return; }
      begin();
    }
    draw(drag.progress);
    if (drag.progress < 1 && drag.frame === undefined) drag.frame = requestAnimationFrame(pickupFrame);
  });

  document.addEventListener("pointerup", event => {
    if (!drag || event.pointerId !== drag.pointerId) return;
    checkLayout();
    if (!drag) return;
    drag.pointer = point(event);
    if (!drag.ghost) {
      if (!pastThreshold()) {
        const { slot } = drag;
        stopDrag();
        select(selected === slot ? null : slot);
        if (selected !== null) playSound("pickup");
        return;
      }
      begin();
      draw(1);
    } else {
      // Use the last drawn scale and offset. A release between animation frames
      // must not advance the pickup and thereby change the visible target.
      draw(drag.progress);
    }

    const { target, valid, slot, button } = drag;
    const restoreFocus = document.activeElement === button;
    if (valid) {
      reset();
      place(slot, target.x, target.y);
      if (restoreFocus && button.disabled) {
        slots.find(candidate => !candidate.disabled)?.focus({ preventScroll: true });
      }
    } else {
      stopDrag(true);
      select(null);
      view.announce("That piece does not fit here.");
      playSound("invalid");
    }
  });

  function cancelDrag(event) {
    if (drag?.pointerId === event.pointerId) reset();
  }

  function checkLayout() {
    if (drag && (boardMoved(drag.grid, readBoardGeometry(board)) || Math.abs(drag.scale - (viewport?.scale ?? 1)) > .01)) reset();
    else if (returning) finishReturn();
  }

  document.addEventListener("pointerdown", event => {
    if (drag?.touch && event.pointerType === "touch" && event.pointerId !== drag.pointerId) reset();
  }, true);
  document.addEventListener("touchstart", event => {
    if (drag?.touch && event.touches.length > 1) reset();
  }, { passive: true });
  document.addEventListener("touchcancel", () => { if (drag?.touch) reset(); }, { passive: true });
  document.addEventListener("pointercancel", cancelDrag);
  tray.addEventListener("lostpointercapture", cancelDrag);
  window.addEventListener("resize", checkLayout);
  window.addEventListener("pagehide", reset);
  document.addEventListener("visibilitychange", () => { if (document.hidden) reset(); });
  viewport?.addEventListener("resize", checkLayout);
  viewport?.addEventListener("scroll", checkLayout);
  window.addEventListener("scroll", checkLayout, { passive: true });
  if ("ResizeObserver" in window) new ResizeObserver(checkLayout).observe(board);
  view.motion.addEventListener("change", () => {
    if (!view.motion.matches) return;
    finishReturn();
    if (drag?.ghost) {
      if (drag.frame !== undefined) cancelAnimationFrame(drag.frame);
      drag.frame = undefined;
      draw(1);
    }
  });

  tray.addEventListener("click", event => {
    const button = event.target.closest("button[data-slot]");
    if (!button || button.disabled || event.detail !== 0) return;
    const slot = Number(button.dataset.slot);
    select(selected === slot ? null : slot);
    if (selected !== null) {
      playSound("pickup");
      view.focusCell(0);
      showAt(0, selected);
    }
  });

  board.addEventListener("pointerover", event => {
    const cell = event.target.closest("[data-index]");
    if (selected !== null && !drag && cell) showAt(Number(cell.dataset.index), selected);
  });
  board.addEventListener("pointerleave", () => { if (!drag) view.preview(getGame()); });
  board.addEventListener("click", event => {
    const cell = event.target.closest("[data-index]");
    if (!cell) return;
    const index = Number(cell.dataset.index);
    view.focusCell(index);
    placeAt(index);
  });

  board.addEventListener("keydown", event => {
    const cell = event.target.closest("[data-index]");
    if (!cell) return;
    const index = Number(cell.dataset.index);
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      const slot = selected;
      placeAt(index);
      if (slot !== null && selected === null) slots.find(button => !button.disabled)?.focus({ preventScroll: true });
      return;
    }
    const direction = directions[event.key];
    if (!direction) return;
    event.preventDefault();
    const x = Math.min(SIZE - 1, Math.max(0, index % SIZE + direction[0]));
    const y = Math.min(SIZE - 1, Math.max(0, Math.floor(index / SIZE) + direction[1]));
    const next = y * SIZE + x;
    view.focusCell(next);
    if (selected !== null) showAt(next, selected);
  });

  document.addEventListener("keydown", event => {
    if (event.key !== "Escape" || (selected === null && !drag)) return;
    const { activeElement } = document;
    const button = slots[selected];
    reset();
    if (board.contains(activeElement)) button?.focus({ preventScroll: true });
  });

  return {
    reset,
    configure(values) {
      reset();
      tuning = inputTuning(values);
      board.style.setProperty("--preview-opacity", tuning.previewOpacity);
      return tuning;
    },
  };
}
