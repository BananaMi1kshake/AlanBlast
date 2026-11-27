import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { runInNewContext } from "node:vm";
import { levelUrl } from "../js/adventure-view.js";

test("the offline app shell caches and routes both modes under the project URL", async () => {
  const scope = "https://example.test/AlanBlast/";
  const handlers = new Map();
  const files = new Set();
  const cache = {
    async addAll(requests) { requests.forEach(request => files.add(request.url)); },
    async add(request) { files.add(request.url); },
    async match(request) {
      const url = request.url ?? String(request);
      if (files.has(url)) return { url, json: async () => ({}) };
    },
  };
  runInNewContext(await readFile(new URL("../sw.js", import.meta.url), "utf8"), {
    self: { registration: { scope }, addEventListener: (type, listener) => handlers.set(type, listener) },
    URL, Request, caches: { open: async () => cache }, fetch: async () => { throw Error("offline"); },
  });
  let installed;
  handlers.get("install")({ waitUntil: work => { installed = work; } });
  await installed;

  async function fetchFromWorker(path, mode = "navigate") {
    let response;
    handlers.get("fetch")({ request: { method: "GET", mode, url: new URL(path, scope).href },
      respondWith: work => { response = work; } });
    return (await response)?.url;
  }
  assert.equal(await fetchFromWorker("./"), scope + "index.html");
  assert.equal(await fetchFromWorker("./play.html?new=1"), scope + "play.html");
  assert.equal(await fetchFromWorker("./adventure.html"), scope + "adventure.html");
  const replay = levelUrl("loom-open-seam", { replay: true });
  assert.equal(new URL(replay, scope).searchParams.get("replay"), "1");
  assert.equal(await fetchFromWorker(replay), scope + "play.html");
  assert.equal(await fetchFromWorker("./adventure/levels.json", "cors"), scope + "adventure/levels.json");
  assert.equal(await fetchFromWorker("./js/hand-worker.js", "cors"), scope + "js/hand-worker.js");
  assert.ok(!files.has(scope + "tools/adventure-editor.html"));
});
