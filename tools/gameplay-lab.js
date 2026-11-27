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

function analyze(deal) {
  let game;
  try { game = read(); } catch (error) { result.textContent = error.message; return; }
  worker?.terminate();
  const request = new Worker("./lab-worker.js", { type: "module" });
  worker = request;
  result.textContent = "Searching…";
  request.onmessage = ({ data }) => {
    if (worker !== request) return;
    const { generation, inspection } = data;
    const lines = [];
    if (generation) lines.push(`Deal ${generation.status} in ${generation.ms.toFixed(2)} ms. Rejected ${generation.stats.rejected}; fallback ${generation.stats.fallbacks}.`);
    if (inspection) {
      lines.push(`${inspection.complete ? "" : "At least "}${inspection.solutions} sequence(s), ${inspection.visited} visited.`);
      if (inspection.first) lines.push(...inspection.first.map(({ id, x, y }, i) => `${i + 1}. ${SHAPES[id].name} at column ${x + 1}, row ${y + 1}`));
    }
    result.textContent = lines.join("\n");
    request.terminate();
  };
  request.onerror = () => {
    if (worker === request) result.textContent = "The worker could not run.";
    request.terminate();
  };
  request.postMessage({ game, deal });
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
  $("preset").value = "empty";
  preset("empty");
  iframe.contentWindow.location.reload();
});
$("inspect").addEventListener("click", () => analyze(false));
$("deal").addEventListener("click", () => analyze(true));
iframe.addEventListener("load", () => { if (frameAPI()) apply(); });
preset("demo");
$("preset").value = "demo";
$("local-only").hidden = true;
$("lab").hidden = false;
iframe.src = "../index.html?lab=1";
