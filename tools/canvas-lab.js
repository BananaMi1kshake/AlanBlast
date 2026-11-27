import { makeCanvasRenderer, CANVAS_SIZE } from "./canvas-renderer.js";
import { MATERIALS, visualProfile } from "../js/themes.js";
import { createGame, placePiece, SHAPES } from "../js/game.js";
import { isLoopback } from "../js/sandbox.js";

const $ = id => document.getElementById(id);
const textures = new Map();
const pct = (values, p) => Number(values.slice().sort((a, b) => a - b)[Math.ceil(values.length * p) - 1].toFixed(2));

if (isLoopback(location.hostname)) {
  const canvas = $("canvas-board");
  const select = $("canvas-material");
  const result = $("canvas-results");
  const run = $("canvas-run");
  const stress = $("canvas-stress");
  const reset = $("canvas-reset");
  let renderer, game, drag, rect, effectFrame, generation = 0;
  select.replaceChildren(...Object.entries(MATERIALS).map(([id, item]) => new Option(item.name, id)));
  select.value = "glitter";
  $("canvas-controls").hidden = false;
  const materialFixture = () => ({ ...createGame(), material: select.value, palette: "dusk", hand: [25, 26, 8],
    board: Array.from({ length: 64 }, (_, i) => i >= 40 && (i % 4 === 0 || i % 7 === 0) ? 0 : null) });

  async function setup() {
    const request = ++generation;
    drag = null;
    renderer = null;
    cancelAnimationFrame(effectFrame);
    game = materialFixture();
    Object.assign(document.documentElement.dataset, visualProfile(game));
    const style = getComputedStyle(document.documentElement);
    const paint = Object.fromEntries(Object.entries({ mint: "mint", sky: "sky", sun: "sun",
      coral: "coral", lilac: "lilac", empty: "cell", board: "board", scene: "scene-bottom" })
      .map(([key, name]) => [key, style.getPropertyValue("--" + name).trim()]));
    const asset = style.getPropertyValue("--grain").match(/url\(["']?([^"')]+)/)?.[1];
    if (asset && !textures.has(asset)) {
      const image = new Image();
      image.src = new URL(asset, new URL("../materials.css", import.meta.url));
      textures.set(asset, image.decode().then(() => image).catch(() => null));
    }
    const texture = await textures.get(asset);
    if (request !== generation) return;
    renderer = makeCanvasRenderer(canvas, paint, texture);
    renderer.setGame(game);
    renderer.draw();
  }

  function point(event) {
    return { x: (event.clientX - rect.left) * CANVAS_SIZE.width / rect.width,
      y: (event.clientY - rect.top) * CANVAS_SIZE.height / rect.height };
  }
  function move(event) {
    if (!drag || drag.pointer !== event.pointerId) return;
    const p = point(event);
    const shape = SHAPES[game.hand[drag.slot]];
    drag.left = p.x - shape.width * 21.5;
    drag.top = p.y - shape.height * (event.pointerType === "touch" ? 43 : 22) - (event.pointerType === "touch" ? 38 : 0);
    renderer.draw(drag);
  }
  canvas.addEventListener("pointerdown", event => {
    if (!renderer || drag || run.disabled) return;
    rect = canvas.getBoundingClientRect();
    const p = point(event);
    const slot = Math.min(2, Math.floor(p.x / 130));
    if (p.y < 365 || game.hand[slot] === null) return;
    drag = { slot, pointer: event.pointerId };
    canvas.setPointerCapture(event.pointerId);
    move(event);
  });
  canvas.addEventListener("pointermove", move);
  function cancelDrag() {
    drag = null;
    renderer?.draw();
  }
  canvas.addEventListener("lostpointercapture", event => {
    if (drag?.pointer === event.pointerId) cancelDrag();
  });
  addEventListener("resize", () => { if (drag) cancelDrag(); });
  canvas.addEventListener("pointerup", event => {
    if (drag?.pointer !== event.pointerId) return;
    move(event);
    const { x, y } = renderer.target(drag);
    const id = game.hand[drag.slot];
    const placed = placePiece(game, drag.slot, x, y);
    drag = null;
    if (!placed) { renderer.draw(); return; }
    game = placed.game;
    renderer.setGame(game, { id, cleared: placed.cleared });
    cancelAnimationFrame(effectFrame);
    const started = performance.now();
    function animate(now) {
      renderer.draw(null, now);
      if (now - started < 380) effectFrame = requestAnimationFrame(animate);
    }
    effectFrame = requestAnimationFrame(animate);
  });

  async function measure(clear) {
    if (!renderer || run.disabled || drag) return;
    const count = clear ? 240 : 168;
    run.disabled = stress.disabled = select.disabled = reset.disabled = true;
    result.value = "Measuring…";
    const frames = [];
    const paintTimes = [];
    let last;
    const model = materialFixture();
    const clearGame = { ...model, hand: [0, 25, 26], board: Array.from({ length: 64 }, (_, i) =>
      i === 7 ? null : i < 8 ? 0 : null) };
    renderer.setGame(clear ? clearGame : model);
    for (let i = 0; i < count; i++) {
      const time = await new Promise(requestAnimationFrame);
      if (last !== undefined) frames.push(time - last);
      last = time;
      const start = performance.now();
      if (clear) {
        const placed = placePiece(clearGame, 0, 7, 0);
        renderer.setGame(placed.game, { id: 0, cleared: placed.cleared }, start);
        renderer.draw(null, start + 95);
        renderer.setGame(clearGame);
      } else {
        const phase = i / (count - 1);
        renderer.draw({ slot: 0, left: 175 + 105 * Math.sin(phase * 15) - 100, top: 200 + 100 * Math.cos(phase * 11) - 84 });
      }
      paintTimes.push(performance.now() - start);
    }
    result.value = JSON.stringify({ material: select.value, frames: count, frameMedian: pct(frames, .5),
      frameP95: pct(frames, .95), drawMedian: pct(paintTimes, .5), drawP95: pct(paintTimes, .95),
      backingBytes: renderer.bytes, heapBytes: performance.memory?.usedJSHeapSize, measurement: clear ? "clear" : "drag" }, null, 2);
    run.disabled = stress.disabled = select.disabled = reset.disabled = false;
    renderer.setGame(game);
    renderer.draw();
  }

  run.addEventListener("click", () => measure(false));
  stress.addEventListener("click", () => measure(true));
  reset.addEventListener("click", setup);
  select.addEventListener("change", setup);
  setup();
}
