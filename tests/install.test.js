import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { runInNewContext } from "node:vm";

const moduleCode = (await readFile(new URL("../js/install.js", import.meta.url), "utf8")).replace("export ", "");

function harness({ ios = false, installed = false } = {}) {
  const events = new Map();
  const panel = {};
  const help = { hidden: true };
  const button = { addEventListener: (name, fn) => events.set(name, fn), setAttribute() {} };
  const media = { matches: installed, addEventListener: (name, fn) => events.set(name, fn) };
  const elements = new Map([["#install-panel", panel], ["#install-game", button], ["#install-help", help]]);
  runInNewContext(moduleCode + "\nbindInstall();", {
    document: { querySelector: id => elements.get(id) },
    navigator: { userAgent: ios ? "iPhone" : "Test" },
    matchMedia: () => media,
    addEventListener: (name, fn) => events.set(name, fn),
  });
  return { panel, help, events };
}

test("installation is opt-in and hides its entry after native installation", async () => {
  const { panel, help, events } = harness();
  let prompts = 0;
  let intercepted = false;
  events.get("beforeinstallprompt")({ preventDefault() { intercepted = true; },
    prompt() { prompts++; }, userChoice: Promise.resolve({ outcome: "accepted" }) });
  assert.equal(intercepted, true);
  assert.equal(prompts, 0);
  await events.get("click")();
  assert.equal(prompts, 1);
  assert.equal(panel.hidden, true);
  assert.equal(help.hidden, true);
});

test("standalone hides installation and unsupported iOS gets manual guidance", async () => {
  const standalone = harness({ installed: true });
  assert.equal(standalone.panel.hidden, true);
  const ios = harness({ ios: true });
  await ios.events.get("click")();
  assert.equal(ios.help.hidden, false);
  assert.match(ios.help.textContent, /Safari.*Share.*Add to Home Screen/);
  ios.events.get("appinstalled")();
  assert.equal(ios.panel.hidden, true);
});
