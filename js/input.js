import { pieceSize, pointerTarget, readBoardGeometry } from "./geometry.js";
import { SHAPES, SIZE } from "./game.js";
import { makePiece } from "./view.js";
import { MOTION } from "./motion.js";

const DRAG_DISTANCE = 5;
const directions = {
  ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1],
};

export function bindInput(view, getGame, place, playSound) {
  const { board, tray, slots } = view;
  let selected = null;
  let drag = null;
  let returning;

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

  function positionDrag(event) {
    const { shape, grid, size, lift, ghost } = drag;
    const { x, y, left, top } = pointerTarget(grid, shape, size, event.clientX, event.clientY, lift);
    const valid = view.preview(getGame(), shape, x, y);
    ghost.style.transform = `translate3d(${left}px, ${top}px, 0)`;
    ghost.classList.toggle("invalid", !valid);
    return { x, y, valid };
  }

  function stopDrag(animateReturn = false) {
    if (!drag) return;
    const { button, pointerId, ghost, trayRect, scale } = drag;
    drag = null;
    if (button.hasPointerCapture(pointerId)) button.releasePointerCapture(pointerId);
    if (ghost && animateReturn && !view.motion.matches) {
      finishReturn();
      button.classList.add("returning");
      const animation = ghost.animate([
        { transform: ghost.style.transform, opacity: .7 },
        { transform: `translate3d(${trayRect.left}px, ${trayRect.top}px, 0) scale(${scale})`, opacity: 1 },
      ], { duration: MOTION.return, easing: "ease-out", fill: "both" });
      returning = { button, ghost, animation };
      animation.onfinish = finishReturn;
    } else {
      ghost?.remove();
    }
    button.classList.remove("dragging");
    view.preview(getGame());
  }

  function reset() {
    finishReturn();
    stopDrag();
    select(null);
  }

  tray.addEventListener("pointerdown", event => {
    if (drag || !event.isPrimary || event.button !== 0) return;
    const button = event.target.closest("button[data-slot]");
    if (!button || button.disabled) return;
    finishReturn();
    const slot = Number(button.dataset.slot);
    const shape = SHAPES[getGame().hand[slot]];
    if (!shape) return;
    drag = { slot, button, shape, pointerId: event.pointerId, startX: event.clientX, startY: event.clientY };
    button.setPointerCapture(event.pointerId);
  });

  tray.addEventListener("pointermove", event => {
    if (!drag || event.pointerId !== drag.pointerId) return;
    if (!drag.ghost) {
      if (Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) < DRAG_DISTANCE) return;
      const grid = readBoardGeometry(board);
      const size = pieceSize(grid, drag.shape);
      const viewport = window.visualViewport;
      const bottom = viewport ? viewport.offsetTop + viewport.height : window.innerHeight;
      drag.lift = event.pointerType === "touch"
        ? Math.max(0, Math.min(MOTION.touchLift, bottom - (grid.bottom - size.height / 2) - 6))
        : 0;
      drag.grid = grid;
      drag.size = size;
      const trayPiece = drag.button.firstElementChild;
      trayPiece.getAnimations().forEach(animation => animation.cancel());
      drag.trayRect = trayPiece.getBoundingClientRect();
      drag.scale = drag.trayRect.width / size.width;
      drag.ghost = document.createElement("span");
      drag.ghost.classList.add("floating");
      drag.ghost.setAttribute("aria-hidden", "true");
      const piece = makePiece(drag.shape);
      piece.style.setProperty("--unit-x", `${grid.unitX}px`);
      piece.style.setProperty("--unit-y", `${grid.unitY}px`);
      piece.style.setProperty("--gap-x", `${grid.gapX}px`);
      piece.style.setProperty("--gap-y", `${grid.gapY}px`);
      drag.ghost.append(piece);
      document.body.append(drag.ghost);
      if (!view.motion.matches) piece.animate([
        { transform: `scale(${drag.scale})` }, { transform: "scale(1)" },
      ], { duration: MOTION.pickup, easing: "ease-out" });
      drag.button.classList.add("dragging");
      select(drag.slot);
      playSound("pickup");
    }
    positionDrag(event);
  });

  tray.addEventListener("pointerup", event => {
    if (!drag || event.pointerId !== drag.pointerId) return;
    if (!drag.ghost) {
      const { slot, startX, startY } = drag;
      stopDrag();
      if (Math.hypot(event.clientX - startX, event.clientY - startY) < DRAG_DISTANCE) {
        select(selected === slot ? null : slot);
        if (selected !== null) playSound("pickup");
      }
      return;
    }

    const { x, y, valid } = positionDrag(event);
    const { slot, button } = drag;
    const restoreFocus = document.activeElement === button;
    if (valid) {
      reset();
      place(slot, x, y);
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
    if (drag?.pointerId !== event.pointerId) return;
    if (drag.ghost) reset();
    else stopDrag();
  }

  tray.addEventListener("pointercancel", cancelDrag);
  tray.addEventListener("lostpointercapture", cancelDrag);
  window.addEventListener("resize", reset);
  document.addEventListener("visibilitychange", () => { if (document.hidden) reset(); });
  window.visualViewport?.addEventListener("resize", reset);
  window.visualViewport?.addEventListener("scroll", () => { if (drag || returning) reset(); });
  window.addEventListener("scroll", () => { if (drag || returning) reset(); }, { passive: true });
  view.motion.addEventListener("change", () => {
    if (!view.motion.matches) return;
    finishReturn();
    drag?.ghost?.firstElementChild.getAnimations().forEach(animation => animation.cancel());
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
    if (event.key !== "Escape" || selected === null) return;
    const { activeElement } = document;
    const button = slots[selected];
    reset();
    if (board.contains(activeElement)) button.focus({ preventScroll: true });
  });

  return { reset };
}
