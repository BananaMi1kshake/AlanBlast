import { levelError } from "../js/adventure.js";
import { WORLDS } from "../js/themes.js";
import { candidateLevel } from "./adventure-candidate.js";

const $ = id => document.getElementById(id);
const board = $("editor-board");
const frame = $("sandbox");
const definition = $("definition");
const report = $("result");
let worker;
let draft;
const cells = Array.from({ length: 64 }, (_, index) => {
  const button = document.createElement("button");
  button.type = "button";
  button.addEventListener("click", () => paint(index));
  board.append(button);
  return button;
});
for (const [id, world] of Object.entries(WORLDS)) $("world").add(new Option(world.name, id));

function show(level) {
  draft = level;
  definition.value = JSON.stringify(level, null, 2);
  const cellsText = level.board.join("");
  for (const [i, button] of cells.entries()) {
    const gem = level.gems.includes(i);
    button.dataset.color = cellsText[i];
    button.textContent = gem ? "◆" : cellsText[i] === "." ? "" : cellsText[i];
    button.setAttribute("aria-label", `Row ${Math.floor(i / 8) + 1}, column ${i % 8 + 1}${gem ? ", gem" : ""}`);
  }
}

function read() {
  const level = JSON.parse(definition.value);
  const error = levelError(level);
  if (error) throw Error(error);
  return level;
}

function invalidate() {
  worker?.terminate();
  worker = undefined;
  $("steps").replaceChildren();
}

function paint(index) {
  try { draft = read(); } catch (error) { report.textContent = error.message; return; }
  invalidate();
  const selected = $("paint").value;
  const y = Math.floor(index / 8);
  const x = index % 8;
  if (selected === "gem") {
    if (draft.board[y][x] === ".") { report.textContent = "Place a block before adding a gem."; return; }
    draft.gems = draft.gems.includes(index) ? draft.gems.filter(i => i !== index) : [...draft.gems, index];
  } else {
    draft.board[y] = draft.board[y].slice(0, x) + selected + draft.board[y].slice(x + 1);
    if (selected === ".") draft.gems = draft.gems.filter(i => i !== index);
  }
  delete draft.validation;
  show(draft);
  report.textContent = "Board edited. Validate the revised level.";
}

function playtest(level, witness = []) {
  const api = frame.contentWindow.alanbloxAdventureEditor;
  if (!api) { report.textContent = "The isolated playtest is still loading."; return; }
  api.load(level, witness);
}

function validate() {
  invalidate();
  let level;
  try { level = read(); } catch (error) { report.textContent = error.message; return; }
  const request = new Worker("./adventure-worker.js", { type: "module" });
  worker = request;
  report.textContent = "Validating level…";
  request.onmessage = ({ data }) => {
    if (worker !== request) return;
    request.terminate();
    worker = undefined;
    report.textContent = `Validation ${data.status}${data.error ? " · " + data.error : ""}. ${data.checked ?? 0} placements checked.`;
    if (!data.witness) return;
    level.validation = { version: 1, witness: data.witness };
    show(level);
    report.textContent += "\n" + data.witness.map((step, i) =>
      `${i + 1}. Slot ${step.slot + 1}, column ${step.x + 1}, row ${step.y + 1}`).join("\n");
    for (let i = 0; i <= data.witness.length; i++) {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = i ? `Step ${i}` : "Start";
      button.addEventListener("click", () => playtest(level, data.witness.slice(0, i)));
      $("steps").append(button);
    }
  };
  request.onerror = () => { if (worker === request) { invalidate(); report.textContent = "The validator worker could not run."; } };
  request.postMessage(level);
}

$("generate").addEventListener("click", () => {
  const seed = Number($("seed").value);
  if (!Number.isSafeInteger(seed)) { report.textContent = "Enter a whole-number seed."; return; }
  invalidate();
  show(candidateLevel(seed, $("world").value));
  report.textContent = "Draft created. Validate before adding it to the campaign.";
});
$("read-json").addEventListener("click", () => {
  invalidate();
  try { show(read()); report.textContent = "JSON applied."; } catch (error) { report.textContent = error.message; }
});
definition.addEventListener("input", invalidate);
$("playtest").addEventListener("click", () => {
  try { playtest(read()); } catch (error) { report.textContent = error.message; }
});
$("validate").addEventListener("click", validate);
$("import").addEventListener("change", async event => {
  const file = event.target.files[0];
  if (!file) return;
  invalidate();
  definition.value = await file.text();
  try { show(read()); report.textContent = "Level imported."; } catch (error) { report.textContent = error.message; }
});
$("export").addEventListener("click", () => {
  try {
    const level = read();
    const url = URL.createObjectURL(new Blob([JSON.stringify(level, null, 2) + "\n"], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `${level.id}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch (error) { report.textContent = error.message; }
});

show(candidateLevel(6501, "mint"));
$("editor").hidden = false;
$("local-only").hidden = true;
frame.src = "../play.html?mode=adventure&editor=1";
