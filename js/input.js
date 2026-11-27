import { SHAPES, SIZE } from "./game.js";
import { makePiece } from "./view.js";

const DRAG_DISTANCE = 5;
const TOUCH_LIFT = 56;
const directions = {
  ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1],
};

export function bindInput(view, getGame, place) {
  const { board, tray, cells, slots } = view;
  let selected = null;
  let drag = null;

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
    }
  }

  function positionDrag(event) {
    const { shape, metrics, ghost } = drag;
    const { origin, step, unit, gap } = metrics;
    const width = shape.width * step - gap;
    const height = shape.height * step - gap;
    const left = event.clientX - width / 2;
    const lift = event.pointerType === "touch" ? TOUCH_LIFT : 0;
    const top = event.clientY - height / 2 - lift;
    const x = Math.round((left - origin.left) / step);
    const y = Math.round((top - origin.top) / step);
    const valid = view.preview(getGame(), shape, x, y);
    ghost.style.setProperty("--unit", `${unit}px`);
    ghost.style.setProperty("--gap", `${gap}px`);
    ghost.style.transform = `translate3d(${left}px, ${top}px, 0)`;
    ghost.classList.toggle("invalid", !valid);
    return { x, y, valid };
  }

  function stopDrag() {
    if (!drag) return;
    const { button, pointerId, ghost } = drag;
    drag = null;
    if (button.hasPointerCapture(pointerId)) button.releasePointerCapture(pointerId);
    if (ghost) ghost.remove();
    button.classList.remove("dragging");
    view.preview(getGame());
  }

  function reset() {
    stopDrag();
    select(null);
  }

  tray.addEventListener("pointerdown", event => {
    if (drag || !event.isPrimary || event.button !== 0) return;
    const button = event.target.closest("button[data-slot]");
    if (!button || button.disabled) return;
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
      const origin = cells[0].getBoundingClientRect();
      const step = cells[1].getBoundingClientRect().left - origin.left;
      drag.metrics = { origin, step, unit: origin.width, gap: step - origin.width };
      drag.ghost = makePiece(drag.shape);
      drag.ghost.classList.add("floating");
      drag.ghost.setAttribute("aria-hidden", "true");
      document.body.append(drag.ghost);
      drag.button.classList.add("dragging");
      select(drag.slot);
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
      }
      return;
    }

    const { x, y, valid } = positionDrag(event);
    const { slot, button } = drag;
    const restoreFocus = document.activeElement === button;
    reset();
    if (valid) {
      place(slot, x, y);
      if (restoreFocus && button.disabled) {
        slots.find(candidate => !candidate.disabled)?.focus({ preventScroll: true });
      }
    } else {
      view.announce("That piece does not fit here.");
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
  window.addEventListener("scroll", () => { if (drag) reset(); }, { passive: true });

  tray.addEventListener("click", event => {
    const button = event.target.closest("button[data-slot]");
    if (!button || button.disabled || event.detail !== 0) return;
    const slot = Number(button.dataset.slot);
    select(selected === slot ? null : slot);
    if (selected !== null) {
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
