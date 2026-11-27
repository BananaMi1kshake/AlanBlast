export const VIBRATIONS = Object.freeze({
  place: { label: "Block placement", pattern: 8, priority: 0 },
  invalid: { label: "Invalid placement", pattern: 20, priority: 1 },
  clear1: { label: "Single-line clear", pattern: 25, priority: 2 },
  clear2: { label: "Double-line clear", pattern: 40, priority: 2 },
  clear3: { label: "Larger simultaneous clear", pattern: 60, priority: 2 },
  combo: { label: "High combo", pattern: [24, 45, 36], priority: 3 },
  allClear: { label: "Full-board clear", pattern: [32, 60, 42, 64, 58], priority: 4 },
});

export function createHaptics({ device = globalThis.navigator, now = () => performance.now() } = {}) {
  const supported = typeof device?.vibrate === "function";
  let enabled = true;
  let visible = true;
  let lastPulse = -Infinity;
  let busyUntil = -Infinity;
  let currentPriority = 0;

  function vibrate(pattern) {
    if (!supported) return false;
    try { return device.vibrate(pattern); } catch { return false; }
  }

  function stop() {
    if (now() < busyUntil) vibrate(0);
    busyUntil = -Infinity;
    lastPulse = -Infinity;
  }

  function configure(settings) {
    enabled = settings.vibration;
    if (!enabled) stop();
  }

  function setVisible(value) {
    visible = value;
    if (!visible) stop();
  }

  function play(name) {
    const cue = VIBRATIONS[name];
    if (!cue || !enabled || !visible) return false;
    const time = now();
    if ((time < busyUntil || time - lastPulse < 50) && cue.priority <= currentPriority) return false;
    if (!vibrate(cue.pattern)) return false;
    const length = Array.isArray(cue.pattern) ? cue.pattern.reduce((total, ms) => total + ms, 0) : cue.pattern;
    currentPriority = cue.priority;
    lastPulse = time;
    busyUntil = time + length;
    return true;
  }

  return { supported, configure, setVisible, play, stop };
}
