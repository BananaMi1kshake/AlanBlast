import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { runInNewContext } from "node:vm";
import { levelUrl } from "../js/adventure-view.js";

test("the offline app shell caches and routes game and progress pages under the project URL", async () => {
  const scope = "https://example.test/AlanBlast/";
  const handlers = new Map();
  const files = new Set();
  const cachesByName = new Set([`${scope}old`, `alanblox:${scope}:shell-14`]);
  let claimed = false;
  const cache = {
    async addAll(requests) { requests.forEach(request => files.add(request.url)); },
    async add(request) { files.add(request.url); },
    async match(request) {
      const url = request.url ?? String(request);
      if (files.has(url)) return { url, json: async () => ({}) };
    },
  };
  runInNewContext(await readFile(new URL("../sw.js", import.meta.url), "utf8"), {
    self: { registration: { scope }, clients: { claim() { claimed = true; } }, addEventListener: (type, listener) => handlers.set(type, listener) },
    URL, Request, caches: { open: async name => { cachesByName.add(name); return cache; },
      keys: async () => [...cachesByName], delete: async name => cachesByName.delete(name) }, fetch: async () => { throw Error("offline"); },
  });
  let installed;
  handlers.get("install")({ waitUntil: work => { installed = work; } });
  await installed;
  let activated;
  handlers.get("activate")({ waitUntil: work => { activated = work; } });
  await activated;
  assert.equal(claimed, true);
  assert.deepEqual([...cachesByName], [`${scope}old`, `alanblox:${scope}:shell-15`]);

  async function fetchFromWorker(path, mode = "navigate") {
    let response;
    handlers.get("fetch")({ request: { method: "GET", mode, url: new URL(path, scope).href },
      respondWith: work => { response = work; } });
    return (await response)?.url;
  }
  assert.equal(await fetchFromWorker("./"), scope + "index.html");
  assert.equal(await fetchFromWorker("./play.html?new=1"), scope + "play.html");
  assert.equal(await fetchFromWorker("./adventure.html"), scope + "adventure.html");
  assert.equal(await fetchFromWorker("./daily.html?date=2026-11-03"), scope + "daily.html");
  assert.equal(await fetchFromWorker("./progress.html?view=materials"), scope + "progress.html");
  assert.equal(await fetchFromWorker("./play.html?mode=tutorial"), scope + "play.html");
  assert.equal(await fetchFromWorker("./challenges/daily-v1.json", "cors"), scope + "challenges/daily-v1.json");
  assert.equal(await fetchFromWorker("./challenges/tutorial.json", "cors"), scope + "challenges/tutorial.json");
  const replay = levelUrl("loom-open-seam", { replay: true });
  assert.equal(new URL(replay, scope).searchParams.get("replay"), "1");
  assert.equal(await fetchFromWorker(replay), scope + "play.html");
  assert.equal(await fetchFromWorker("./adventure/levels.json", "cors"), scope + "adventure/levels.json");
  assert.equal(await fetchFromWorker("./js/hand-worker.js", "cors"), scope + "js/hand-worker.js");
  for (const file of ["gameplay.css", "settings.css", "viewport.css", "js/material-picker.js", "js/play-viewport.js", "js/drag-geometry.js", "js/pager.js", "js/preview-state.js"]) {
    assert.equal(await fetchFromWorker("./" + file, "cors"), scope + file);
  }
  assert.ok(!files.has(scope + "tools/adventure-editor.html"));
  assert.ok(!files.has(scope + "tools/canvas-lab.html"));
});
