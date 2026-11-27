import assert from "node:assert/strict";
import { test } from "node:test";
import { createAudio } from "../js/audio.js";
import { comboVoicing, SOUNDS } from "../js/sound-bank.js";

function audioFixture() {
  const sources = [];
  const gains = [];
  const params = () => ({
    value: 0,
    setValueAtTime() {},
    linearRampToValueAtTime() {},
    exponentialRampToValueAtTime() {},
    setTargetAtTime(value) { this.value = value; },
  });
  const node = () => ({ connect(target) { return target; }, disconnect() { this.disconnected = true; } });
  function source(kind) {
    const element = { ...node(), kind, frequency: params(), start(...args) { this.startArgs = args; }, stop() {} };
    sources.push(element);
    return element;
  }
  const context = {
    state: "suspended",
    currentTime: 2,
    destination: node(),
    createGain() {
      const gain = { ...node(), gain: params() };
      gains.push(gain);
      return gain;
    },
    createWaveShaper: node,
    createOscillator: () => source("oscillator"),
    createBufferSource: () => source("buffer"),
    decodeAudioData: async bytes => {
      if (bytes === "bad audio") throw Error("unsupported format");
      return { duration: bytes === "long" ? 10 : .22 };
    },
    async resume() { this.state = "running"; },
    async suspend() { this.state = "suspended"; },
  };
  return { context, sources, gains };
}

const ioTick = () => new Promise(resolve => setImmediate(resolve));
const cue = (audio, name, combo) => audio.play([{ name, combo }]);

test("first interaction lazily creates audio and plays only the latest recent cue", async () => {
  const { context, sources } = audioFixture();
  let creations = 0;
  let time = 0;
  const audio = createAudio({
    createContext: () => { creations++; return context; },
    now: () => time,
    fetchAsset: async () => ({ ok: false }),
  });
  cue(audio, "ui");
  cue(audio, "place");
  assert.equal(creations, 0);
  assert.equal(sources.length, 0);
  time = 40;
  audio.activate();
  await ioTick();
  assert.equal(creations, 1);
  assert.equal(sources.length, SOUNDS.place.notes().length);
  audio.activate();
  assert.equal(creations, 1);
});

test("stale pre-activation requests are dropped", async () => {
  const { context, sources } = audioFixture();
  let time = 0;
  const audio = createAudio({ createContext: () => context, now: () => time, fetchAsset: async () => ({ ok: false }) });
  cue(audio, "place");
  time = 1000;
  audio.activate();
  await ioTick();
  assert.equal(sources.length, 0);
});

test("volume changes the master gain and mute drops active and incoming voices", () => {
  const { context, sources, gains } = audioFixture();
  const audio = createAudio({ createContext: () => context, fetchAsset: async () => ({ ok: false }) });
  audio.configure({ sound: true, volume: .4 });
  audio.activate();
  const gain = gains[0].gain;
  const first = gain.value;
  assert.ok(first > 0);
  audio.configure({ sound: true, volume: .8 });
  assert.equal(gain.value, first * 2);
  cue(audio, "place");
  assert.equal(sources.length, 2);
  audio.configure({ sound: false, volume: .8 });
  cue(audio, "allClear");
  assert.equal(gain.value, 0);
  assert.equal(sources.length, 2);
  assert.ok(sources.every(source => source.disconnected));
});

test("rapid overlaps remain bounded and all-clear cancels weaker cues", () => {
  const { context, sources } = audioFixture();
  const audio = createAudio({ createContext: () => context, fetchAsset: async () => ({ ok: false }) });
  audio.activate();
  for (let i = 0; i < 100; i++) cue(audio, "clear4", 9);
  assert.ok(sources.length > 24);
  assert.ok(sources.filter(source => !source.disconnected).length <= 24);
  const earlier = sources.slice();
  cue(audio, "allClear");
  assert.ok(earlier.every(source => source.disconnected));
  assert.equal(sources.filter(source => !source.disconnected).length, SOUNDS.allClear.notes().length);
  const count = sources.length;
  cue(audio, "ui");
  assert.equal(sources.length, count);
  audio.stop();
  assert.ok(sources.every(source => source.disconnected));
});

test("custom audio decodes once, tries alternate formats and synthesizes missing events", async () => {
  const { context, sources } = audioFixture();
  const fetched = [];
  const config = { place: ["unsupported.wav", "shared.mp3"], record: "shared.mp3", invalid: "missing.wav", ui: "//outside/a.wav" };
  const audio = createAudio({
    createContext: () => context,
    fetchAsset: async url => {
      const file = url.pathname.split("/").at(-1);
      fetched.push(file);
      if (file === "sounds.json") return { ok: true, json: async () => config };
      return { ok: file !== "missing.wav", arrayBuffer: async () => file === "unsupported.wav" ? "bad audio" : "long" };
    },
  });
  audio.activate();
  await ioTick();
  for (const name of ["place", "record", "invalid", "ui"]) cue(audio, name);
  assert.equal(fetched.filter(file => file === "shared.mp3").length, 1);
  assert.ok(!fetched.includes("a.wav"));
  assert.deepEqual(sources.map(source => source.kind), ["buffer", "buffer", "oscillator", "oscillator", "oscillator"]);
  assert.equal(sources[0].startArgs[2], 3);
});

test("backgrounding stops and suspends audio and foregrounding can resume it", async () => {
  const { context, sources } = audioFixture();
  const audio = createAudio({ createContext: () => context, fetchAsset: async () => ({ ok: false }) });
  audio.activate();
  cue(audio, "place");
  audio.setVisible(false);
  cue(audio, "pickup");
  assert.equal(context.state, "suspended");
  assert.ok(sources.every(source => source.disconnected));
  audio.setVisible(true);
  await ioTick();
  assert.equal(context.state, "running");
  const count = sources.length;
  cue(audio, "place");
  assert.ok(sources.length > count);
});

test("missing audio support and blocked autoplay allow later cues without throwing", async () => {
  const unsupported = createAudio({ createContext: () => null });
  unsupported.activate();
  assert.doesNotThrow(() => cue(unsupported, "place"));

  const { context, sources } = audioFixture();
  const originalResume = context.resume;
  context.resume = () => Promise.reject(new Error("autoplay blocked"));
  const audio = createAudio({ createContext: () => context, fetchAsset: async () => ({ ok: false }) });
  audio.activate();
  cue(audio, "pickup");
  await ioTick();
  assert.equal(sources.length, 0);
  context.resume = originalResume;
  audio.activate();
  await ioTick();
  assert.equal(sources.length, 1);
});

test("combo musical steps ascend, add harmonies and stabilize at high values", () => {
  assert.ok(comboVoicing(2).root > comboVoicing(1).root);
  assert.equal(comboVoicing(3).harmony, null);
  assert.ok(comboVoicing(4).harmony > comboVoicing(4).root);
  assert.ok(comboVoicing(7).shimmer > comboVoicing(7).root);
  assert.deepEqual(comboVoicing(Number.MAX_SAFE_INTEGER), comboVoicing(9));
  assert.ok(SOUNDS.clear4.notes(9).length > SOUNDS.clear1.notes(9).length);
});
