import { SEARCH_GOALS } from "../js/solver.js";
import { STRATEGY_WEIGHTS } from "../js/generator.js";
import { createGame, SHAPES, SIZE } from "../js/game.js";
import { MATERIALS, PALETTES, WORLDS, visualProfile } from "../js/themes.js";

const $ = id => document.getElementById(id);
const iframe = $("sandbox");
const result = $("result");
const colors = ["mint", "sky", "sun", "coral", "lilac"];
const swatchIds = colors.map(color => SHAPES.findIndex(shape => shape.color === color));
let worker;
const frameAPI = () => iframe.contentWindow.alanbloxLab;

function option(select, value, label) {
  select.add(new Option(label, value));
}

option($("palette"), "", "Follow world");
option($("material"), "", "Follow world");
for (const [id, name] of Object.entries(PALETTES)) option($("palette"), id, name);
for (const [id, profile] of Object.entries(MATERIALS)) option($("material"), id, profile.name);
for (const [id, world] of Object.entries(WORLDS)) option($("world"), id, world.name);
const labels = {
  standard: "Standard", completion: "Any complete hand", line: "Line clear", cleanup: "Board cleanup",
  reduction: "Maximum final reduction", minimum: "Minimum at any step", allClear: "All-clear",
};
for (const [id, value] of Object.entries(STRATEGY_WEIGHTS)) {
  option($("strategy"), id, labels[id]);
  const label = document.createElement("label");
  label.textContent = labels[id] + " weight";
  const input = document.createElement("input");
  input.type = "number";
  input.min = "0";
  input.step = "1";
  input.value = value;
  input.dataset.strategy = id;
  label.append(input);
  $("weights").append(label);
}
for (const goal of SEARCH_GOALS) option($("goal"), goal, labels[goal]);
$("goal").value = "allClear";
const slots = Array.from({ length: 3 }, (_, slot) => {
  const label = document.createElement("label");
  label.textContent = `Piece ${slot + 1}`;
  const select = document.createElement("select");
  option(select, "", "Used slot");
  SHAPES.forEach((shape, id) => option(select, id, shape.name));
  label.append(select);
  $("hand-fields").append(label);
  return select;
});

for (const [id, profile] of Object.entries(MATERIALS)) {
  const sample = document.createElement("div");
  sample.className = "sample";
  sample.dataset.material = id;
  const title = document.createElement("h3");
  title.textContent = profile.name;
  const row = document.createElement("div");
  row.className = "blocks";
  for (const color of colors) {
    const block = document.createElement("span");
    block.className = "block";
    block.dataset.color = color;
    row.append(block);
  }
  sample.append(title, row);
  $("samples").append(sample);
}

function write(game) {
  const rows = [];
  for (let y = 0; y < SIZE; y++) rows.push(game.board.slice(y * SIZE, (y + 1) * SIZE)
    .map(id => id === null ? "." : colors.indexOf(SHAPES[id].color)).join(""));
  $("board-editor").value = rows.join("\n");
  slots.forEach((select, i) => { select.value = game.hand[i] ?? ""; });
  $("score").value = game.score;
  $("combo").value = game.combo;
  $("window").value = game.comboWindow;
  $("world").value = game.theme;
  $("palette").value = game.palette ?? "";
  $("material").value = game.material === WORLDS[game.theme].material ? "" : game.material;
}

function preset(type) {
  const game = { ...createGame(), hand: [0, 25, 26] };
  if (["row", "intersection", "all"].includes(type)) {
    for (let y = 0; y < SIZE; y++) {
      if (type === "intersection") game.board[y * SIZE + 5] = 21;
      game.board[3 * SIZE + y] = 8;
    }
    game.board[29] = null;
    if (type !== "all") game.board[63] = 17;
    game.combo = type === "row" ? 0 : 6;
    game.comboWindow = game.combo ? 2 : 0;
  } else if (type === "edge") {
    game.hand = [25, 26, 0];
    game.board[58] = 8;
    game.board[51] = 21;
  } else if (type === "demo") {
    game.hand = [25, 26, 37];
    game.score = 4572;
    game.combo = 6;
    game.comboWindow = 2;
    for (const [index, id] of [[56, 25], [57, 25], [58, 25], [59, 25], [60, 25], [41, 8], [42, 8], [43, 8],
      [49, 8], [50, 8], [51, 8], [33, 8], [34, 8], [35, 8], [14, 11], [22, 11], [23, 11],
      [36, 17], [44, 17], [45, 17], [46, 17], [47, 0], [55, 0], [31, 0]]) game.board[index] = id;
  }
  write(game);
}

function read() {
  const rows = $("board-editor").value.trim().split(/\s+/);
  if (rows.length !== SIZE || rows.some(row => !/^[.0-4]{8}$/.test(row))) {
    throw new Error("Enter eight rows of eight dots or digits from 0 to 4.");
  }
  const theme = $("world").value;
  const palette = $("palette").value || undefined;
  const material = visualProfile({ theme, material: $("material").value }).material;
  const combo = Number($("combo").value);
  const comboWindow = Number($("window").value);
  const score = Number($("score").value);
  if (![score, combo, comboWindow].every(value => Number.isSafeInteger(value) && value >= 0) || comboWindow > 3) {
    throw new Error("Enter nonnegative whole numbers. The combo window is between 0 and 3.");
  }
  return {
    ...createGame(), theme, palette, material,
    board: rows.join("").split("").map(cell => cell === "." ? null : swatchIds[Number(cell)]),
    hand: slots.map(select => select.value === "" ? null : Number(select.value)),
    score, combo: comboWindow ? combo : 0, comboWindow: combo ? comboWindow : 0,
  };
}

function apply() {
  try {
    const game = read();
    frameAPI().load(game);
    document.documentElement.dataset.palette = visualProfile(game).palette;
    result.textContent = "Sandbox updated.";
  } catch (error) { result.textContent = error.message; }
}

function analyze(action) {
  let game;
  try { game = read(); } catch (error) { result.textContent = error.message; return; }
  const seed = Number($("seed").value);
  if (!Number.isSafeInteger(seed)) { result.textContent = "Enter an integer seed."; return; }
  const weights = Object.fromEntries([...$("weights").querySelectorAll("input")].map(input => [input.dataset.strategy, Number(input.value)]));
  if (Object.values(weights).some(value => !Number.isFinite(value) || value < 0)) {
    result.textContent = "Weights must be finite and nonnegative.";
    return;
  }
  const strategy = $("strategy").value || undefined;
  const goal = $("goal").value;
  $("steps").replaceChildren();
  worker?.terminate();
  const request = new Worker("./lab-worker.js", { type: "module" });
  worker = request;
  result.textContent = "Searching…";
  request.onmessage = ({ data }) => {
    if (worker !== request) return;
    const { generations, inspection, states, completions } = data;
    const lines = [];
    for (const generation of generations) {
      const { version, status, ms, stats, hand } = generation;
      lines.push(`${version.toUpperCase()} ${status} in ${ms.toFixed(2)} ms, ${stats.rejected} rejected, ${stats.fallbacks} solvability fallbacks.`);
      if (version !== "v1") lines.push(`Requested ${labels[stats.requested]}. Delivered ${labels[stats.delivered]}${stats.guided ? " by guided search" : ""}. ${stats.goalTimeouts} goal budgets exhausted.`);
      if (hand) lines.push(hand.map(id => SHAPES[id].name).join(", "));
    }
    if (action === "deal" && generations[0].status === "solvable") {
      frameAPI()?.load(states[0]);
      write(states[0]);
    }
    if (completions) lines.push(`${completions.complete ? "" : "At least "}${completions.solutions} complete sequence(s), ${completions.visited} visited.`);
    if (inspection) {
      lines.push(`${labels[goal]}: ${inspection.status}, ${inspection.checks} checks.`);
      if (inspection.sequence) {
        lines.push(`Minimum ${inspection.minimumOccupied}, final ${inspection.finalOccupied}, reduction ${inspection.reduction}.`);
        lines.push(...inspection.sequence.map(({ id, x, y }, i) => `${i + 1}. ${SHAPES[id].name} at column ${x + 1}, row ${y + 1}`));
        states.forEach((state, i) => {
          const button = document.createElement("button");
          button.type = "button";
          button.textContent = i ? `Step ${i}` : "Start board";
          button.addEventListener("click", () => {
            frameAPI()?.load(state, { holdDeal: true });
            write(state);
          });
          $("steps").append(button);
        });
      }
    }
    result.textContent = lines.join("\n");
    request.terminate();
  };
  request.onerror = () => {
    if (worker === request) result.textContent = "The worker could not run.";
    request.terminate();
  };
  request.postMessage({ game, action, options: { seed, weights, strategy, goal } });
}

$("state").addEventListener("submit", event => { event.preventDefault(); apply(); });
$("preset").addEventListener("change", event => preset(event.target.value));
$("read").addEventListener("click", () => {
  const sandbox = frameAPI();
  if (sandbox) write(sandbox.snapshot().game);
});
$("reset").addEventListener("click", () => {
  worker?.terminate();
  worker = undefined;
  $("steps").replaceChildren();
  $("preset").value = "empty";
  preset("empty");
  iframe.contentWindow.location.reload();
});
$("inspect").addEventListener("click", () => analyze("inspect"));
$("deal").addEventListener("click", () => analyze("deal"));
$("compare").addEventListener("click", () => analyze("compare"));
$("experiment").addEventListener("click", () => analyze("experiment"));
$("strategy").addEventListener("change", event => {
  $("goal").value = event.target.value === "standard" ? "completion" : event.target.value || "allClear";
});
iframe.addEventListener("load", () => { if (frameAPI()) apply(); });
preset("demo");
$("preset").value = "demo";
$("local-only").hidden = true;
$("lab").hidden = false;
iframe.src = "../play.html?lab=1";
