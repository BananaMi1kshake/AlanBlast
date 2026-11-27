import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { extname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const baseline = process.argv.includes("--baseline");
const project = resolve(process.env.ALANBLOX_ROOT ?? fileURLToPath(new URL("../", import.meta.url)));
const captures = process.env.ALANBLOX_CAPTURES;
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const types = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "text/javascript",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".png": "image/png",
  ".webmanifest": "application/manifest+json",
};
const prefix = "/AlanBlast/";
const server = createServer(async (request, response) => {
  const path = new URL(request.url, "http://localhost").pathname;
  const file = resolve(project, path.slice(prefix.length) || "index.html");
  if (!path.startsWith(prefix) || !file.startsWith(project + sep)) {
    response.writeHead(404).end();
    return;
  }
  try {
    const data = await readFile(file);
    response.writeHead(200, { "Content-Type": types[extname(file)] ?? "application/octet-stream" }).end(data);
  } catch {
    response.writeHead(404).end();
  }
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const home = `http://127.0.0.1:${server.address().port}${prefix}`;
const profile = await mkdtemp(join(tmpdir(), "alanblox-input-"));
const browser = spawn(
  process.env.CHROMIUM ?? "chromium",
  [
    "--headless",
    "--disable-dev-shm-usage",
    "--no-proxy-server",
    "--remote-debugging-port=0",
    ...(process.env.CHROMIUM_NO_SANDBOX === "1" ? ["--no-sandbox"] : []),
    `--user-data-dir=${profile}`,
    "about:blank",
  ],
  { stdio: "ignore" },
);
let launchError;
browser.on("error", (error) => {
  launchError = error;
});
let socket;
try {
  let port;
  for (let i = 0; i < 100 && !port; i++) {
    if (launchError) throw launchError;
    if (browser.exitCode !== null) throw Error("Chromium quit before opening its debugger.");
    port = (await readFile(join(profile, "DevToolsActivePort"), "utf8").catch(() => "")).split("\n")[0];
    if (!port) await pause(50);
  }
  if (!port) throw Error("Could not start the Chromium debugger.");
  const pages = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  socket = new WebSocket(pages.find((page) => page.type === "page").webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve, { once: true });
    socket.addEventListener("error", reject, { once: true });
  });
  if (captures) await mkdir(captures, { recursive: true });
  await verify(socket);
} finally {
  socket?.close();
  if (browser.pid) {
    browser.kill();
    if (browser.exitCode === null && browser.signalCode === null) {
      await new Promise((resolve) => browser.once("exit", resolve));
    }
  }
  server.closeAllConnections();
  server.close();
  await rm(profile, { recursive: true, force: true, maxRetries: 3 });
}

async function verify(socket) {
  const pending = new Map();
  const errors = [];
  let serial = 0;
  socket.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    if (message.method === "Runtime.exceptionThrown") errors.push(message.params.exceptionDetails);
    const request = pending.get(message.id);
    if (!request) return;
    pending.delete(message.id);
    if (message.error) request.reject(Error(message.error.message));
    else request.resolve(message.result);
  });
  function send(method, params = {}) {
    const id = ++serial;
    return new Promise((resolve, reject) => {
      pending.set(id, { resolve, reject });
      socket.send(JSON.stringify({ id, method, params }));
    });
  }
  async function evaluate(expression) {
    const reply = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
    if (reply.exceptionDetails)
      throw Error(reply.exceptionDetails.exception?.description ?? reply.exceptionDetails.text);
    return reply.result.value;
  }
  async function until(expression) {
    for (let i = 0; i < 100; i++) {
      if (await evaluate(expression).catch(() => false)) return;
      await pause(50);
    }
    throw Error("Timed out: " + expression);
  }
  const save = "alanblox.save.v1";
  const fixture = {
    game: { board: Array(64).fill(null), hand: [0, 1, 2], bag: [3, 4, 5], score: 0 },
    highScore: 0,
  };
  async function loadFixture(value) {
    await evaluate(`localStorage.setItem(${JSON.stringify(save)}, ${JSON.stringify(JSON.stringify(value))});
      document.querySelector("#board").dataset.loading = "true"`);
    await send("Page.reload");
    await until(
      'document.querySelectorAll(".cell").length === 64 && !document.querySelector("#board").dataset.loading',
    );
  }
  const mouse = (type, point, buttons) =>
    send("Input.dispatchMouseEvent", { type, ...point, button: "left", buttons, clickCount: 1 });
  const touch = (type, point) =>
    send("Input.dispatchTouchEvent", { type, touchPoints: point ? [point] : [] });
  async function key(name) {
    const keyCodes = { Enter: 13, ArrowRight: 39 };
    const event = { key: name, code: name, windowsVirtualKeyCode: keyCodes[name] };
    await send("Input.dispatchKeyEvent", {
      type: name === "Enter" ? "keyDown" : "rawKeyDown",
      text: name === "Enter" ? "\r" : "",
      ...event,
    });
    await send("Input.dispatchKeyEvent", { type: "keyUp", ...event });
  }
  const click = (selector) => evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`);
  const scene = (path) => send("Page.navigate", { url: home + path });
  const score = (number) => `document.querySelector("#score")?.getAttribute("aria-label")==="${number}"`;
  const enabled = 'document.querySelectorAll("#tray button:enabled .piece").length === 3';
  async function device(width, height, mobile) {
    await send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile });
    await send("Emulation.setTouchEmulationEnabled", { enabled: mobile, maxTouchPoints: mobile ? 2 : 1 });
  }
  async function picture(name) {
    if (!captures) return;
    const result = await send("Page.captureScreenshot", { format: "png" });
    await writeFile(
      join(captures, `${baseline ? "before" : "after"}-${name}.png`),
      Buffer.from(result.data, "base64"),
    );
  }
  const gameData = (key) => evaluate(`JSON.parse(localStorage.getItem(${JSON.stringify(key)}))`);
  const geometryDetail = (slot = 0) =>
    evaluate(`(()=>{const r=document.querySelector("#board").getBoundingClientRect(), c=document.querySelector('[data-index="0"]').getBoundingClientRect(), n=document.querySelector('[data-index="8"]').getBoundingClientRect(), piece=document.querySelector('[data-slot="${slot}"] .piece').getBoundingClientRect();return {
    left:r.left,top:r.top,bottom:r.bottom,width:r.width,height:r.height,unit:c.width,pitch:n.top-c.top,px:piece.x+piece.width/2,py:piece.y+piece.height/2,
    safe:parseFloat(getComputedStyle(document.querySelector(".game-shell")).paddingBottom),vv:visualViewport.height
  };})()`);
  const visibleGhost = 'document.querySelector(".floating")';
  const midTouch = async (point, id = 1) =>
    send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ ...point, id }] });
  const touchAt = async (point, id = 1) =>
    send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ ...point, id }] });
  const endTouch = async () => touch("touchEnd");
  const targets = (g, x, y, height = 1, width = 1) => ({
    x: g.left + x * g.pitch + (g.unit + (width - 1) * g.pitch) / 2,
    y:
      g.top +
      y * g.pitch +
      g.unit +
      (height - 1) * g.pitch +
      Math.max(0, Math.min(g.pitch * 1.15, g.vv - g.safe - g.bottom - 4)),
  });
  async function swipe(x, y, to) {
    await touchAt({ x, y });
    for (let i = 1; i <= 8; i++) await midTouch({ x, y: y + ((to - y) * i) / 8 });
    await endTouch();
    await new Promise((r) => setTimeout(r, 150));
  }
  async function scrollSnapshot() {
    return evaluate(
      `(()=>{ const root=document.scrollingElement, b=document.querySelector(".board-frame").getBoundingClientRect(),t=document.querySelector("#tray").getBoundingClientRect(), s=document.querySelector(".game-shell").getBoundingClientRect(); return {x:scrollX,y:scrollY,maxX:root.scrollWidth-root.clientWidth,maxY:root.scrollHeight-root.clientHeight,trayTop:t.top,trayBottom:t.bottom,boardBottom:b.bottom,boardWidth:b.width,boardHeight:b.height,visible:visualViewport.height, playfield:s.height};})()`,
    );
  }
  const reset = () => loadFixture(fixture);
  await send("Page.enable");
  await send("Runtime.enable");
  await send("Network.enable");
  const width = 390,
    height = 844;
  await device(width, height, true);
  await scene("play.html");
  await until(enabled);
  await reset();
  const g = await geometryDetail();
  let picked = targets(g, 3, 3);
  if (baseline) picked = { x: g.left + 3 * g.pitch + g.unit / 2, y: g.top + 3 * g.pitch + g.unit / 2 + 56 };
  await touchAt({ x: g.px, y: g.py });
  await midTouch(picked);
  await until(visibleGhost);
  await new Promise((r) => setTimeout(r, 160));
  const sequence = [];
  for (let i = 0; i < 4; i++) {
    await midTouch({ ...picked, x: picked.x + i * g.pitch * 0.24 });
    await new Promise((r) => setTimeout(r, 35));
    const data = await evaluate(
      `({x:document.querySelector(".floating").getBoundingClientRect().left,cells:[...document.querySelectorAll(".preview-valid")].map(c=>+c.dataset.index)})`,
    );
    sequence.push(data);
    await picture("drag-" + i);
  }
  await endTouch();
  await until(score(1));
  assert.equal((await gameData(save)).game.board[sequence.at(-1).cells[0]], 0);
  console.log("drag comparison", JSON.stringify(sequence), "pitch", g.pitch);
  if (baseline) {
    assert.equal(sequence[0].x, sequence[1].x);
    assert.notEqual(sequence[1].x, sequence[3].x);
  } else {
    for (let i = 1; i < 4; i++) assert.ok(Math.abs(sequence[i].x - sequence[i - 1].x - g.pitch * 0.24) < 1.6);
    assert.deepEqual(sequence[0].cells, sequence[1].cells);
    assert.notDeepEqual(sequence[1].cells, sequence[3].cells);
  }

  const paths = [
    "play.html",
    "play.html?mode=adventure&level=ocean-first-gap",
    "play.html?mode=daily&date=2026-11-01",
    "play.html?mode=tutorial",
  ];
  const sizes = [
    [320, 568],
    [375, 667],
    [390, 844],
    [430, 932],
    [667, 320],
    [844, 390],
  ];
  sizes.push([320, 448]);
  const overflow = [];
  for (const [w, h] of sizes) {
    await device(w, h, true);
    for (const path of paths) {
      await scene(path);
      await until(
        'document.querySelectorAll(".cell").length===64 && document.querySelectorAll("#tray button:enabled").length>=1',
      );
      const before = await scrollSnapshot();
      await swipe(
        before.boardWidth > w / 2 ? Math.floor(w / 2) : Math.floor(w / 4),
        Math.min(before.boardBottom - 12, h - 40),
        64,
      );
      const after = await scrollSnapshot();
      if (after.y || after.maxY || after.trayBottom > h + 1) overflow.push({ w, h, path, after });
      if (!baseline) {
        assert.equal(after.y, 0);
        assert.equal(after.x, 0);
        assert.equal(after.maxX, 0);
        assert.equal(after.maxY, 0);
        assert.ok(after.trayTop >= 0 && after.trayBottom <= h + 1, JSON.stringify({ w, h, path, after }));
        assert.ok(Math.abs(after.boardWidth - after.boardHeight) < 1.5, JSON.stringify(after));
      }
    }
  }
  console.log("viewport overflow", JSON.stringify(overflow));
  if (baseline) {
    assert.ok(overflow.length > 0);
    return;
  }
  await device(320, 568, true);
  await scene("play.html");
  await reset();
  await click("#open-settings");
  await until('document.querySelector("#settings").open');
  await evaluate(`document.querySelectorAll("#settings details").forEach(el=>el.open=true)`);
  const panel = await evaluate(
    `(()=>{const d=document.querySelector("#settings"),r=d.getBoundingClientRect();return {x:r.left+18,y:r.top+r.height-25,to:r.top+65,max:d.scrollHeight-d.clientHeight};})()`,
  );
  assert.ok(panel.max > 1);
  await swipe(panel.x, panel.y, panel.to);
  assert.ok((await evaluate('document.querySelector("#settings").scrollTop')) > 10);
  assert.equal((await scrollSnapshot()).y, 0);
  await click("#resume");
  await until('!document.querySelector("#settings").open');

  // Press feedback precedes the threshold. A tap selects without consuming the piece.
  const small = await geometryDetail();
  await touchAt({ x: small.px, y: small.py });
  await until('document.querySelector(\'[data-slot="0"]\').classList.contains("pressed")');
  assert.equal(await evaluate('Boolean(document.querySelector(".floating"))'), false);
  await endTouch();
  await until('document.querySelector(\'[data-slot="0"]\').getAttribute("aria-pressed")==="true"');
  assert.equal((await gameData(save)).game.hand[0], 0);
  await touchAt({ x: small.px, y: small.py });
  await endTouch(); // Deselect.

  async function beginAndWait(slot, x, y, shapeHeight = 1, shapeWidth = 1) {
    const box = await geometryDetail(slot);
    const target = targets(box, x, y, shapeHeight, shapeWidth);
    await touchAt({ x: box.px, y: box.py });
    await midTouch(target);
    await until(visibleGhost);
    await new Promise((r) => setTimeout(r, 115));
    return target;
  }
  await beginAndWait(0, 7, 7);
  await evaluate('visualViewport.dispatchEvent(new Event("scroll"))');
  assert.ok(await evaluate('Boolean(document.querySelector(".floating"))'));
  await until('document.querySelector(\'[data-index="63"]\').classList.contains("preview-valid")');
  await endTouch();
  await until(score(1));
  assert.equal((await gameData(save)).game.board[63], 0);

  await reset();
  await beginAndWait(0, 2, 2);
  await touch("touchCancel");
  await until('!document.querySelector(".floating")');
  assert.equal((await gameData(save)).game.hand[0], 0);
  const first = await beginAndWait(0, 2, 2);
  await send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [
      { ...first, id: 1 },
      { x: first.x + 30, y: first.y + 15, id: 2 },
    ],
  });
  await until('!document.querySelector(".floating")');
  await endTouch();
  assert.equal((await gameData(save)).game.hand[0], 0);
  await evaluate(
    'document.addEventListener("pointerdown", e => window.pressedId=e.pointerId, {once:true,capture:true})',
  );
  const lost = await beginAndWait(0, 2, 2);
  await evaluate('document.querySelector(\`[data-slot="0"]\`).releasePointerCapture(window.pressedId)');
  await midTouch({ ...lost, x: lost.x + 1 });
  await until('!document.querySelector(".floating")');
  await endTouch();
  assert.equal((await gameData(save)).game.hand[0], 0);
  await beginAndWait(0, 2, 2);
  await device(375, 667, true);
  await until('!document.querySelector(".floating")');
  await endTouch();
  assert.equal((await gameData(save)).game.hand[0], 0);

  // An occupied target returns. The next piece can be picked up right away.
  const tight = structuredClone(fixture);
  tight.game.board[18] = 0;
  tight.game.hand = [0, 25, 26];
  await loadFixture(tight);
  await beginAndWait(0, 2, 2);
  await until('document.querySelectorAll(".preview-invalid").length===1');
  await endTouch();
  assert.equal((await gameData(save)).game.hand[0], 0);
  await beginAndWait(1, 3, 7, 1, 5);
  await until('document.querySelectorAll(".preview-valid").length===5');
  await endTouch();
  await until(score(5));
  await beginAndWait(2, 7, 0, 5, 1);
  await endTouch();
  await until(score(10));
  assert.equal((await gameData(save)).game.board[7], 26);

  await send("Emulation.setEmulatedMedia", {
    features: [{ name: "prefers-reduced-motion", value: "reduce" }],
  });
  await loadFixture(tight);
  await beginAndWait(0, 2, 2);
  await endTouch();
  assert.equal(await evaluate('Boolean(document.querySelector(".floating"))'), false);
  await send("Emulation.setEmulatedMedia", { features: [] });

  await device(1280, 900, false);
  await reset();
  const desk = await geometryDetail();
  const mouseTarget = {
    x: desk.left + 3 * desk.pitch + desk.unit / 2,
    y: desk.top + 2 * desk.pitch + desk.unit / 2,
  };
  await mouse("mousePressed", { x: desk.px, y: desk.py }, 1);
  await mouse("mouseMoved", mouseTarget, 1);
  await until('document.querySelectorAll(".preview-valid").length===1');
  await new Promise((r) => setTimeout(r, 110));
  await mouse("mouseReleased", mouseTarget, 0);
  await until(score(1));
  assert.equal((await gameData(save)).game.board[19], 0);
  await evaluate("document.querySelector('[data-slot=\"1\"]').focus()");
  await key("Enter");
  await key("ArrowRight");
  await key("Enter");
  await until(score(3));

  // Standalone display and inset geometry can be simulated in Chromium only.
  await device(430, 932, true);
  const standalone = await send("Page.addScriptToEvaluateOnNewDocument", {
    source: `(() => {
    const original=matchMedia.bind(window);
    window.matchMedia = query => query === "(display-mode: standalone)" ?
      {matches:true,media:query,addEventListener(){},removeEventListener(){}} : original(query);
  })()`,
  });
  let insets = false;
  try {
    await send("Emulation.setSafeAreaInsetsOverride", { insets: { top: 32, bottom: 24, left: 0, right: 0 } });
    insets = true;
  } catch {}
  await scene("play.html?mode=tutorial");
  await until('document.querySelectorAll(".cell").length===64');
  await swipe(190, 640, 190);
  assert.equal((await scrollSnapshot()).y, 0);
  assert.ok((await scrollSnapshot()).trayBottom < 932);
  if (insets)
    assert.ok(
      (await evaluate('parseFloat(getComputedStyle(document.querySelector(".game-shell")).paddingBottom)')) >=
        24,
    );
  await send("Page.removeScriptToEvaluateOnNewDocument", { identifier: standalone.identifier });
  await until(
    'navigator.serviceWorker.controller && caches.keys().then(keys=>keys.some(k=>k.endsWith("shell-13")))',
  );
  await send("Network.emulateNetworkConditions", {
    offline: true,
    latency: 0,
    downloadThroughput: 0,
    uploadThroughput: 0,
  });
  await scene("play.html");
  await until(
    '!navigator.onLine && document.documentElement.classList.contains("play-page") && document.querySelectorAll(".cell").length===64',
  );
  assert.ok(await evaluate('caches.match("./js/drag-geometry.js").then(Boolean)'));

  await send("Network.emulateNetworkConditions", {
    offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1,
  });
  await device(1280, 900, false);
  const playerSave = await gameData(save);
  await scene("tools/gameplay-lab.html");
  await until('document.querySelector("#sandbox")?.contentWindow?.alanbloxLab?.tuneInput');
  const lab = await evaluate(`(() => {
    const field = document.querySelector('[name="previewOpacity"]');
    field.value = '.63';
    field.dispatchEvent(new Event('change', { bubbles: true }));
    document.querySelector('#input-shape').value = '26';
    document.querySelector('#input-fixture').value = 'exact';
    document.querySelector('#input-corner').value = 'br';
    document.querySelector('#load-input-shape').click();
    const frame = document.querySelector('#sandbox');
    const board = frame.contentDocument.querySelector('#board');
    return {
      opacity: board.style.getPropertyValue('--preview-opacity'),
      game: frame.contentWindow.alanbloxLab.snapshot().game,
      count: document.querySelector('#input-shape').options.length,
    };
  })()`);
  assert.equal(lab.opacity, "0.63");
  assert.equal(lab.game.hand[0], 26);
  assert.equal(lab.game.board[63], null);
  assert.ok(lab.game.board[62] !== null);
  assert.equal(lab.count, 38);
  assert.deepEqual(await gameData(save), playerSave);
  assert.deepEqual(errors, []);
  console.log(
    "Chromium passed touch trajectories and release agreement, portrait/landscape fit in four modes, modal scroll, cancellation, long pieces, reduced motion, mouse, keyboard, simulated standalone, offline and lab isolation.",
  );
}
