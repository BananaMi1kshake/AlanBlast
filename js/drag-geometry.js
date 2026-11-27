import { SIZE } from "./pieces.js";

export const INPUT = Object.freeze({
  touchLift: 1.15, grabAnchor: "grab", touchThreshold: 2, mouseThreshold: 5,
  pickupMs: 56, returnMs: 125, snapVisual: false, previewOpacity: .55, hysteresis: 0,
});

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export function inputTuning(values = {}) {
  const number = (key, min, max) => Number.isFinite(values[key]) ? clamp(values[key], min, max) : INPUT[key];
  return {
    touchLift: number("touchLift", 0, 2.5),
    grabAnchor: values.grabAnchor === "center" ? "center" : "grab",
    touchThreshold: number("touchThreshold", 1, 16),
    mouseThreshold: number("mouseThreshold", 1, 16),
    pickupMs: number("pickupMs", 0, 250),
    returnMs: number("returnMs", 0, 350),
    snapVisual: values.snapVisual === true,
    previewOpacity: number("previewOpacity", .15, .9),
    hysteresis: number("hysteresis", 0, .3),
  };
}

export function touchClearance(grid, safeBottom, pitches) {
  return clamp(safeBottom - grid.bottom - 4, 0, grid.stepY * pitches);
}

export function grabOffset(rect, size, start, touch, clearance, anchor) {
  const ratio = (start, origin, length) => anchor === "center" ? .5 : clamp((start - origin) / length, 0, 1);
  return {
    startX: rect.left - start.x,
    startY: rect.top - start.y,
    endX: -size.width * ratio(start.x, rect.left, rect.width),
    endY: touch ? -size.height - clearance : -size.height * ratio(start.y, rect.top, rect.height),
    startScaleX: rect.width / size.width,
    startScaleY: rect.height / size.height,
  };
}

export function dragFrame(pointer, offset, progress) {
  const mix = (from, to) => from + (to - from) * progress;
  return {
    left: pointer.x + mix(offset.startX, offset.endX),
    top: pointer.y + mix(offset.startY, offset.endY),
    scaleX: mix(offset.startScaleX, 1),
    scaleY: mix(offset.startScaleY, 1),
  };
}

export function placementTarget(grid, left, top, previous, hysteresis = 0) {
  function snap(value, last) {
    if (hysteresis && Math.abs(value - last) <= .5 + hysteresis) return last;
    return Math.round(value) || 0;
  }
  return {
    x: snap((left - grid.left) / grid.stepX, previous?.x),
    y: snap((top - grid.top) / grid.stepY, previous?.y),
  };
}

export function dragTarget(grid, pointer, offset, previous, hysteresis) {
  return placementTarget(grid, pointer.x + offset.endX, pointer.y + offset.endY, previous, hysteresis);
}

export function visualOrigin(position, grid, shape, target, snapped) {
  const { x, y } = target;
  if (snapped && x < SIZE && y < SIZE && x + shape.width > 0 && y + shape.height > 0) {
    return { left: grid.left + x * grid.stepX, top: grid.top + y * grid.stepY };
  }
  return { left: position.left, top: position.top };
}

export function boardMoved(before, after) {
  return ["left", "top", "stepX", "stepY", "bottom"].some(key => Math.abs(before[key] - after[key]) > .5);
}
