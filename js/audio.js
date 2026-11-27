import { SOUNDS } from "./sound-bank.js";

const ASSETS = new URL("../audio/", import.meta.url);
const LIMITS = { cues: 4, voices: 24, queueAge: 220, fileLevel: .26, fileSeconds: 3, output: .8, maxVolume: .55 };
const hertz = midi => 440 * 2 ** ((midi - 69) / 12);

function browserContext() {
  const AudioContext = globalThis.AudioContext ?? globalThis.webkitAudioContext;
  return AudioContext ? new AudioContext() : null;
}

function localAsset(file, directory) {
  if (typeof file !== "string" || !file || file.startsWith("/") || file.includes("..") || !/^[\w./ -]+$/.test(file)) return null;
  return new URL(file, directory);
}

export function createAudio({
  createContext = browserContext, fetchAsset = (...args) => fetch(...args),
  now = () => performance.now(), directory = ASSETS,
} = {}) {
  let context;
  let master;
  let enabled = true;
  let volume = .65;
  let visible = true;
  let pending;
  const buffers = new Map();
  const groups = new Set();

  function adjustVolume() {
    if (master) {
      master.gain.setTargetAtTime(enabled && visible ? volume * LIMITS.maxVolume : 0, context.currentTime, .012);
    }
  }

  function release(group, voice) {
    if (!group.voices.delete(voice)) return;
    voice.source.onended = null;
    voice.source.disconnect();
    voice.gain.disconnect();
    if (!group.voices.size) groups.delete(group);
  }

  function cancel(group) {
    for (const voice of group.voices) {
      try { voice.source.stop(); } catch { /* The source may have failed to start. */ }
      release(group, voice);
    }
  }

  function stop() {
    pending = undefined;
    for (const group of groups) cancel(group);
  }

  function configure(settings) {
    enabled = settings.sound;
    volume = Number.isFinite(settings.volume) ? Math.max(0, Math.min(1, settings.volume)) : .65;
    if (!enabled || !volume) stop();
    adjustVolume();
  }

  async function preload() {
    const decoded = new Map();
    function load(url) {
      if (!decoded.has(url.href)) {
        decoded.set(url.href, (async () => {
          try {
            const response = await fetchAsset(url, { mode: "same-origin", redirect: "error" });
            if (response.ok) return await context.decodeAudioData(await response.arrayBuffer());
          } catch {
            // Files that are missing, offline or unsupported use synthesis.
          }
          return null;
        })());
      }
      return decoded.get(url.href);
    }

    try {
      const response = await fetchAsset(new URL("sounds.json", directory), { mode: "same-origin", redirect: "error" });
      if (!response.ok) return;
      const assets = await response.json();
      await Promise.all(Object.keys(SOUNDS).map(async name => {
        const files = Array.isArray(assets?.[name]) ? assets[name] : [assets?.[name]];
        for (const file of files) {
          const url = localAsset(file, directory);
          const buffer = url && await load(url);
          if (buffer) {
            buffers.set(name, buffer);
            return;
          }
        }
      }));
    } catch {
      // The manifest is optional. Every sound can be synthesized locally.
    }
  }

  function init() {
    if (context !== undefined) return;
    context = createContext();
    if (!context) return;
    master = context.createGain();
    master.gain.value = enabled && visible ? volume * LIMITS.maxVolume : 0;
    const limiter = context.createWaveShaper();
    limiter.curve = Float32Array.from({ length: 257 }, (_, i) =>
      LIMITS.output * Math.tanh((i / 128 - 1) / LIMITS.output));
    master.connect(limiter).connect(context.destination);
    void preload();
  }

  function scheduleVoice(group, cue, start) {
    const gain = context.createGain();
    let source;
    if (cue.buffer) {
      source = context.createBufferSource();
      source.buffer = cue.buffer;
      gain.gain.value = LIMITS.fileLevel;
    } else {
      source = context.createOscillator();
      source.type = cue.wave;
      source.frequency.setValueAtTime(hertz(cue.pitch), start);
      if (cue.endPitch) source.frequency.exponentialRampToValueAtTime(hertz(cue.endPitch), start + cue.duration);
      const end = start + cue.duration;
      gain.gain.setValueAtTime(.0001, start);
      gain.gain.linearRampToValueAtTime(cue.level, start + Math.min(.012, cue.duration / 4));
      gain.gain.exponentialRampToValueAtTime(.0001, end);
    }

    const voice = { source, gain };
    group.voices.add(voice);
    source.onended = () => release(group, voice);
    source.connect(gain);
    gain.connect(master);
    if (cue.buffer) source.start(start, 0, Math.min(cue.buffer.duration, LIMITS.fileSeconds));
    else {
      source.start(start);
      source.stop(start + cue.duration + .006);
    }
  }

  function schedule(entries) {
    const cues = [];
    let priority = 0;
    for (const { name, combo = 1, delay = 0 } of entries) {
      const sound = SOUNDS[name];
      if (!sound) continue;
      priority = Math.max(priority, sound.priority);
      const buffer = buffers.get(name);
      if (buffer) cues.push({ buffer, at: delay });
      else for (const cue of sound.notes(combo)) cues.push({ ...cue, at: cue.at + delay });
    }
    if (!cues.length) return;
    const allClear = SOUNDS.allClear.priority;
    if (priority < allClear && [...groups].some(group => group.priority === allClear)) return;
    const activeVoices = () => [...groups].reduce((sum, group) => sum + group.voices.size, 0);
    if (priority === allClear) stop();
    while (groups.size >= LIMITS.cues || activeVoices() + cues.length > LIMITS.voices) {
      const victim = [...groups].find(group => group.priority <= priority);
      if (!victim) return;
      cancel(victim);
    }
    const group = { priority, voices: new Set() };
    groups.add(group);
    const start = context.currentTime;
    try {
      for (const cue of cues) scheduleVoice(group, cue, start + cue.at);
    } catch {
      cancel(group);
    }
  }

  function flush() {
    if (!pending || context?.state !== "running") return;
    const { entries, at } = pending;
    pending = undefined;
    if (enabled && volume && visible && now() - at <= LIMITS.queueAge) schedule(entries);
  }

  function resume() {
    if (context?.state === "running") flush();
    else if (context) void context.resume().then(flush).catch(() => {});
  }

  function activate() {
    if (!enabled || !volume || !visible) return;
    try {
      init();
      resume();
    } catch {
      // Browser policy or missing audio hardware should not interrupt the game.
    }
  }

  function play(entries) {
    if (!enabled || !volume || !visible || context === null) return;
    if (context?.state === "running") schedule(entries);
    else pending = { entries, at: now() };
  }

  function setVisible(value) {
    visible = value;
    adjustVolume();
    if (visible && enabled && volume) {
      try { resume(); } catch { /* The next gesture can retry. */ }
    } else if (!visible) {
      stop();
      if (context?.state === "running") {
        void context.suspend().then(() => {
          if (visible && enabled && volume) resume();
        }).catch(() => {});
      }
    }
  }

  return { activate, configure, play, stop, setVisible };
}
