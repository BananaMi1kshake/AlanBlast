import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { createGame, placePiece } from "../js/game.js";
import { MATERIALS, PALETTES, visualProfile, WORLDS } from "../js/themes.js";
import { inspectSequences } from "../tools/analysis-core.js";

test("material and palette overrides are independent and unknown IDs use world defaults", () => {
  assert.deepEqual(visualProfile({ theme: "tidal", palette: "glacier", material: "wood" }),
    { palette: "glacier", material: "wood" });
  assert.deepEqual(visualProfile({ theme: "unknown", palette: "unknown", material: "unknown" }),
    { palette: "mint", material: "classic" });
  assert.ok(Object.values(WORLDS).every(world => Object.hasOwn(PALETTES, world.palette) && Object.hasOwn(MATERIALS, world.material)));
});

test("every material preserves the same legal footprint, score and remaining pieces", () => {
  const game = { ...createGame(), hand: [25, 26, 0] };
  const outcomes = Object.keys(MATERIALS).map(material => {
    const result = placePiece({ ...game, material }, 0, 3, 7);
    assert.equal(result.game.material, material);
    assert.equal(placePiece({ ...game, material }, 1, 7, 4), null);
    return { board: result.game.board, hand: result.game.hand, points: result.points };
  });
  for (const result of outcomes) assert.deepEqual(result, outcomes[0]);
});

test("surface styles provide fallback paint and local textures are in the offline shell", async () => {
  const root = new URL("../", import.meta.url);
  const css = await readFile(new URL("materials.css", root), "utf8");
  const styles = await readFile(new URL("styles.css", root), "utf8");
  const worker = await readFile(new URL("sw.js", root), "utf8");
  assert.match(styles, /background: var\(--grain\), var\(--facet\), var\(--block\)/);
  assert.ok(worker.includes("./materials.css"));
  const assets = [...css.matchAll(/url\("([^"]+)"\)/g)].map(match => match[1]);
  assert.equal(assets.length, 19);
  assert.equal(Object.keys(MATERIALS).length, 24);
  for (const asset of assets) {
    assert.match(asset, /^\.\/assets\/materials\//);
    assert.ok(worker.includes(asset));
    assert.match(await readFile(new URL(asset, root), "utf8"), /^<svg /);
  }
});

test("lab sequence counts are bounded and its witness can be replayed", () => {
  const game = createGame();
  game.hand = [0, 25, 26];
  const result = inspectSequences(game, { maxSolutions: 4, maxNodes: 50 });
  assert.equal(result.complete, false);
  assert.equal(result.solutions, 4);
  const terminal = result.first.reduce((state, move) => placePiece(state, move.slot, move.x, move.y).game, game);
  assert.ok(terminal.hand.every(id => id === null));
});
