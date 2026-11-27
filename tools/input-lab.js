import { INPUT, inputTuning } from "../js/drag-geometry.js";
import { createGame, SHAPES, SIZE } from "../js/game.js";

const $ = (id) => document.getElementById(id);
const format = (value) => (Number.isFinite(value) ? value.toFixed(1) : "—");
const pair = (x, y) => `${format(x)}, ${format(y)}`;

export function bindInputLab(iframe, api, reportGame) {
  const form = $("input-tuning");
  const readout = $("input-telemetry");
  const monitor = $("monitor-performance");
  const report = $("performance-report");
  const limit = $("particle-limit");
  const intensity = $("effect-intensity");
  const samples = [];
  let marks;
  let latestDrag;
  let lastFrame;
  let lastReport;
  let animation;

  function applyEffects() {
    const values = api()?.tuneEffects({ particleLimit: limit.valueAsNumber, intensity: intensity.valueAsNumber });
    if (values) {
      limit.value = values.particleLimit;
      intensity.value = values.intensity;
    }
  }

  function summarize(times) {
    if (!times.length) return null;
    const sorted = times.slice().sort((a, b) => a - b);
    const p = fraction => Number(sorted[Math.ceil(sorted.length * fraction) - 1].toFixed(2));
    return { count: times.length, median: p(.5), p95: p(.95) };
  }

  function measure(now) {
    if (lastFrame !== undefined) {
      samples.push(now - lastFrame);
      if (samples.length > 240) samples.shift();
    }
    lastFrame = now;
    if (lastReport === undefined || now - lastReport >= 500) {
      lastReport = now;
      const game = api()?.measurements();
      const child = iframe.contentWindow;
      const mean = samples.length && samples.reduce((sum, value) => sum + value, 0) / samples.length;
      // Keep the report stable while it is selected for manual copying.
      if (document.activeElement !== report) report.value = JSON.stringify({
        framesPerSecond: mean ? Number((1000 / mean).toFixed(1)) : null,
        frameMs: summarize(samples),
        renderMs: summarize(game?.renderMs ?? []),
        handMs: summarize(game?.handMs ?? []),
        activeParticles: game?.activeParticles,
        viewport: { width: child.innerWidth, height: child.innerHeight, dpr: child.devicePixelRatio },
        scroll: { x: child.scrollX, y: child.scrollY },
        tuning: read(),
        effects: { particleLimit: limit.valueAsNumber, intensity: intensity.valueAsNumber },
        lastDrag: latestDrag,
      }, null, 2);
    }
    animation = requestAnimationFrame(measure);
  }

  function toggleMonitor() {
    cancelAnimationFrame(animation);
    api()?.monitor(monitor.checked);
    samples.length = 0;
    lastFrame = lastReport = undefined;
    if (monitor.checked) animation = requestAnimationFrame(measure);
  }

  function put(values) {
    for (const [key, value] of Object.entries(values)) form.elements[key].value = String(value);
  }

  function read() {
    const data = new FormData(form);
    return inputTuning(
      Object.fromEntries(
        Object.entries(INPUT).map(([key, initial]) => [
          key,
          typeof initial === "boolean"
            ? data.get(key) === "true"
            : typeof initial === "number"
              ? form.elements[key].valueAsNumber
              : data.get(key),
        ]),
      ),
    );
  }

  function show(frame) {
    if (frame) latestDrag = frame;
    if (!frame || !$("input-overlay").checked) {
      marks?.forEach((mark) => {
        mark.hidden = true;
      });
      readout.textContent = "Pick up a piece to inspect the drag.";
      return;
    }
    const { pointer, floating, target, valid, lift, cell, viewport, scroll, board } = frame;
    readout.textContent =
      `${frame.phase} · slot ${frame.slot + 1}\nPointer ${pair(pointer.x, pointer.y)} · floating ${pair(floating?.left, floating?.top)}\n` +
      `Target ${target ? `${target.x}, ${target.y} (${valid ? "valid" : "invalid"})` : "—"} · lift ${format(lift)} px\n` +
      `Board ${pair(board.width, board.height)} · cell ${pair(cell.width, cell.height)} · pitch ${pair(cell.pitchX, cell.pitchY)}\n` +
      `Viewport ${pair(viewport.width, viewport.height)} · ${format(viewport.scale)}× · scroll ${pair(scroll.x, scroll.y)}`;
    const points = [
      pointer,
      floating && { x: floating.left, y: floating.top },
      target && { x: board.left + target.x * cell.pitchX, y: board.top + target.y * cell.pitchY },
    ];
    marks?.forEach((mark, index) => {
      const p = points[index];
      mark.hidden = !p;
      if (p) mark.style.translate = `${p.x}px ${p.y}px`;
    });
  }

  function apply() {
    put(api()?.tuneInput(read(), show) ?? read());
  }

  iframe.addEventListener("load", () => {
    const child = iframe.contentDocument;
    marks = [
      ["Pointer", "#fff34a"],
      ["Floating origin", "#54f5ff"],
      ["Preview origin", "#fa80d2"],
    ].map(([label, color]) => {
      const mark = child.createElement("span");
      mark.hidden = true;
      mark.setAttribute("aria-hidden", "true");
      mark.textContent = label;
      mark.style.cssText = `position:fixed;left:0;top:0;z-index:20;pointer-events:none;padding:2px 4px;color:#0b1937;background:${color};font:700 10px system-ui;`;
      child.body.append(mark);
      return mark;
    });
    apply();
    applyEffects();
    toggleMonitor();
  });
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    apply();
  });
  form.addEventListener("change", apply);
  monitor.addEventListener("change", toggleMonitor);
  limit.addEventListener("change", applyEffects);
  intensity.addEventListener("change", applyEffects);
  $("select-performance").addEventListener("click", () => report.select());
  $("reset-input").addEventListener("click", () => {
    put(INPUT);
    apply();
  });
  $("export-input").addEventListener("click", () => {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(read(), null, 2) + "\n"], { type: "application/json" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "alanblox-input-tuning.json";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });

  $("input-viewport").addEventListener("change", (event) => {
    const [width, height] = event.target.value.split("×");
    Object.assign(iframe.style, {
      width: width ? `${width}px` : "",
      height: height ? `${height}px` : "",
      maxHeight: height ? "none" : "",
    });
  });
  for (const [id, shape] of SHAPES.entries()) $("input-shape").add(new Option(shape.name, id));
  $("load-input-shape").addEventListener("click", () => {
    const id = Number($("input-shape").value);
    const shape = SHAPES[id];
    const game = { ...createGame(), hand: [id, 25, 26] };
    if ($("input-fixture").value === "exact") {
      const corner = $("input-corner").value;
      const x = corner.endsWith("r") ? SIZE - shape.width : 0;
      const y = corner.startsWith("b") ? SIZE - shape.height : 0;
      for (let i = 0; i < game.board.length; i++) {
        const dx = (i % SIZE) - x;
        const dy = Math.floor(i / SIZE) - y;
        if (dx < -1 || dx > shape.width || dy < -1 || dy > shape.height) continue;
        if (!shape.cells.some(([sx, sy]) => sx === dx && sy === dy)) game.board[i] = 1;
      }
    }
    api()?.load(game, { holdDeal: true });
    reportGame(game);
  });

  put(INPUT);
}
