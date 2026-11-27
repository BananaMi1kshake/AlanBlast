import { isLoopback } from "../js/sandbox.js";
import { createGame } from "../js/game.js";
import { appearanceFor } from "../js/material-rotation.js";
import { MATERIALS, visualProfile } from "../js/themes.js";

const $ = id => document.getElementById(id);
const screens = {
  classic: ["Classic", "../play.html?lab=1"],
  allClear: ["All-clear fixture", "../play.html?lab=1"],
  over: ["Classic game over", "../play.html?lab=1"],
  adventure: ["Adventure game", "../play.html?mode=adventure&editor=1"],
  win: ["Adventure completion", "../play.html?mode=adventure&editor=1"],
  fail: ["Adventure failure", "../play.html?mode=adventure&editor=1"],
  dailyPlay: ["Daily puzzle", "../play.html?mode=daily&date=2026-11-01&lab=1"],
  tutorial: ["Tutorial", "../play.html?mode=tutorial&lab=1"],
  menu: ["Main menu", "../index.html?preview=1"],
  worlds: ["Level selection", "../adventure.html?preview=1"],
  settings: ["Settings", "../index.html?preview=1"],
  installed: ["Install guidance", "../index.html?preview=1"],
  backup: ["Save controls", "../index.html?preview=1"],
  collection: ["Material collection", "../progress.html?view=materials&preview=1"],
  stats: ["Statistics", "../progress.html?view=stats&preview=1"],
  achievements: ["Achievements", "../progress.html?view=achievements&preview=1"],
  daily: ["Daily date selection", "../daily.html?preview=1"],
  studio: ["Studio splash", "./splash-preview.html?stage=studio"],
  game: ["Game splash", "./splash-preview.html?stage=game"],
};

if (isLoopback(location.hostname)) {
  const frame = $("viewer");
  const selector = $("screen");
  const material = $("material");
  let generation = 0;
  const text = $("preview-message");
  text.textContent = "Preview data stays in memory.";
  $("preview-controls").hidden = false;
  selector.replaceChildren(...Object.entries(screens).map(([id, [label]]) => new Option(label, id)));
  material.replaceChildren(...Object.entries(MATERIALS).map(([id, profile]) => new Option(profile.name, id)));
  selector.value = "classic";
  const pattern = [0, 7, 9, 17, 1, 7, 19, 8];
  function fixture(mode) {
    const skin = appearanceFor(material.value);
    const game = { ...createGame(), ...skin, score: 480, combo: 7, comboWindow: 2, fixedAppearance: mode !== "allClear", hand: [0, 7, 29] };
    if (mode === "over") {
      game.hand = [8, 8, 8];
      game.board = game.board.map((_, i) => (Math.floor(i / 8) + i % 8) % 2 === 0 ? pattern[i % 8] : null);
    } else if (mode === "allClear") {
      for (let i = 1; i < 8; i++) {
        game.board[i * 8] = pattern[i];
        game.board[i] = pattern[(i + 2) % 8];
      }
    } else {
      for (let y = 3; y < 8; y++) for (let x = 0; x < 8; x++) {
        if ((x + y * 3) % 7 < y - 1) game.board[y * 8 + x] = pattern[(x + y) % 8];
      }
    }
    return game;
  }
  function prepared(mode, generationAtLoad) {
    const child = frame.contentWindow;
    const doc = frame.contentDocument;
    const remaining = 30;
    function apply(retries) {
      if (generationAtLoad !== generation) return;
      if (["classic", "over", "allClear"].includes(mode)) {
        if (child.alanbloxLab) child.alanbloxLab.load(fixture(mode), { holdDeal: true });
        else if (retries) setTimeout(() => apply(retries - 1), 55);
      }
      if (["win", "fail"].includes(mode)) {
        const trial = { id: "preview", name: "Score practice", world: "mint", palette: "mint", material: "classic",
          difficulty: "Intro", board: ["AAAAAAA.", ...Array(7).fill("........")], gems: [],
          hands: [[0, 7, 1]], objectives: [{ type: "rows", target: 1 }], maxMoves: 1 };
        if (child.alanbloxAdventureEditor) {
          child.alanbloxAdventureEditor.load(trial, [{ slot: 0, x: 7, y: mode === "win" ? 0 : 1 }]);
        } else if (retries) setTimeout(() => apply(retries - 1), 55);
      }
      if (["settings", "installed", "backup"].includes(mode)) {
        doc.querySelector("#open-settings")?.click();
        if (mode === "installed") {
          doc.querySelector("#install-panel").hidden = false;
          const help = doc.querySelector("#install-help");
          help.hidden = false;
          help.textContent = "In Safari, tap Share, then Add to Home Screen.";
        }
        if (mode === "backup") {
          const controls = doc.querySelector("#save-controls");
          controls.hidden = false;
          controls.open = true;
        }
      }
    }
    apply(remaining);
  }
  function render() {
    const mode = selector.value;
    const [width, height] = $("viewport").value.split(",");
    frame.width = width;
    frame.height = height;
    frame.inert = !["classic", "allClear", "over", "adventure", "win", "fail", "dailyPlay", "tutorial"].includes(mode);
    $("play-clear").disabled = mode !== "allClear";
    const id = ++generation;
    frame.onload = () => prepared(mode, id);
    const url = new URL(screens[mode][1], location.href);
    if (mode === "studio" || mode === "game") url.searchParams.set("ms", $("duration").value);
    frame.src = url;
  }
  for (const field of [selector, $("viewport"), material]) field.addEventListener("change", render);
  $("run-preview").addEventListener("click", render);
  $("play-clear").addEventListener("click", () => {
    frame.contentDocument.querySelector('[data-slot="0"]')?.click();
    frame.contentDocument.querySelector('[data-index="0"]')?.click();
  });
  for (const [id, profile] of Object.entries(MATERIALS)) {
    const figure = document.createElement("figure");
    const caption = document.createElement("figcaption");
    const sample = document.createElement("div");
    figure.id = `sample-${id}`;
    caption.textContent = profile.name;
    sample.className = "swatches";
    const colors = ["sky", "mint", "sun", "lilac", "sky", "mint", "sun", "lilac"];
    sample.dataset.palette = visualProfile({ theme: "mint" }).palette;
    sample.dataset.material = id;
    for (const color of colors) {
      const block = document.createElement("span");
      block.className = "block";
      block.dataset.color = color;
      sample.append(block);
    }
    figure.append(caption, sample);
    $("material-grid").append(figure);
  }
  render();
}
