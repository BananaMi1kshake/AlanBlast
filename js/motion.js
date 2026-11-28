export const MOTION = Object.freeze({
  placement: 100,
  refill: 220,
  refillStagger: 35,
  singleClear: 250,
  multiClear: 350,
  floatingScore: 600,
  combo: 750,
  allClear: 1200,
  theme: 650,
  counter: 300,
  settingsOpen: 145,
  settingsClose: 115,
  particleLimit: 24,
});

export function createCounter(write, { request, cancel, duration = MOTION.counter }) {
  let value = 0;
  let target = 0;
  let frame;
  let initialized = false;

  return function update(next, animate = true) {
    if (initialized && next === target && animate) return;
    if (frame !== undefined) cancel(frame);
    frame = undefined;
    target = next;

    if (!initialized || !animate || duration <= 0 || next <= value) {
      initialized = true;
      write(value = next);
      return;
    }

    const from = value;
    let start;
    function step(now) {
      start ??= now;
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - (1 - progress) ** 3;
      const displayed = Math.round(from + (next - from) * eased);
      if (displayed !== value) write(value = displayed);
      frame = progress < 1 ? request(step) : undefined;
    }
    frame = request(step);
  };
}
