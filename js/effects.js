import { placementIndices } from "./geometry.js";
import { SHAPES, SIZE } from "./pieces.js";
import { MOTION } from "./motion.js";

function node(className, text) {
  const element = document.createElement("span");
  element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

const pop = [
  { transform: "scale(.72)", opacity: 0 },
  { transform: "scale(1.08)", opacity: 1, offset: .24 },
  { transform: "scale(1)", opacity: 1, offset: .65 },
  { transform: "scale(.97)", opacity: 0 },
];

export function createEffects(layer, cells, motion) {
  const live = new Map();
  const ghosts = new Map();
  const particles = new Set();

  function remove(element) {
    live.get(element)?.cancel();
    live.delete(element);
    particles.delete(element);
    element.remove();
  }

  function play(element, frames, options) {
    layer.append(element);
    const animation = element.animate(frames, { easing: "ease-out", fill: "both", ...options });
    live.set(element, animation);
    animation.onfinish = () => remove(element);
  }

  function position(element, indices) {
    const x = indices.reduce((sum, i) => sum + i % SIZE, 0) / indices.length;
    const y = indices.reduce((sum, i) => sum + Math.floor(i / SIZE), 0) / indices.length;
    element.style.left = `${(x + .5) / SIZE * 100}%`;
    element.style.top = `${(y + .5) / SIZE * 100}%`;
  }

  function burst(indices, count, colors, duration, confetti = false) {
    for (let i = 0; i < count; i++) {
      if (particles.size >= MOTION.particleLimit) remove(particles.values().next().value);
      const particle = node(confetti ? "fx-particle confetti" : "fx-particle");
      position(particle, [indices[i % indices.length]]);
      particle.style.backgroundColor = colors[i % colors.length];
      const angle = i * 2.4;
      const distance = (confetti ? 45 : 14) + (i % 6) * (confetti ? 10 : 4);
      const x = Math.round(Math.cos(angle) * distance);
      const y = Math.round(Math.sin(angle) * distance + (confetti ? 20 : 0));
      particles.add(particle);
      play(particle, [
        { transform: "translate(-50%, -50%) scale(.65)", opacity: 1 },
        { transform: `translate(${x}px, ${y}px) rotate(${i * 29}deg) scale(.55)`, opacity: 0 },
      ], { duration, delay: confetti ? i % 6 * 14 : 0 });
    }
  }

  const snaps = new Map();

  function placement(previous, result, slot, x, y) {
    if (motion.matches) return;
    const id = previous.hand[slot];
    const parts = placementIndices(SHAPES[id], x, y);
    const palette = getComputedStyle(document.documentElement);
    const colors = new Map();
    function colorAt(index) {
      const key = SHAPES[previous.board[index] ?? id].color;
      if (!colors.has(key)) colors.set(key, palette.getPropertyValue(`--${key}`).trim());
      return colors.get(key);
    }

    for (const i of parts) {
      if (ghosts.has(i)) remove(ghosts.get(i));
      ghosts.delete(i);
      snaps.get(i)?.cancel();
      if (result.game.board[i] === null) continue;
      const snap = cells[i].animate([
        { transform: "scale(1.08,.9)" },
        { transform: "scale(.96,1.05)", offset: .56 },
        { transform: "scale(1)" },
      ], { duration: MOTION.placement, easing: "ease-out" });
      snaps.set(i, snap);
      snap.onfinish = () => snaps.delete(i);
    }

    const lines = result.rows.length + result.columns.length;
    const duration = lines > 1 ? MOTION.multiClear : MOTION.singleClear;
    if (lines) {
      const wave = node(result.fullBoardClear ? "fx-wave all" : "fx-wave");
      play(wave, [
        { opacity: result.fullBoardClear ? .9 : Math.min(.7, .38 + lines * .1), transform: "scale(.8)" },
        { opacity: 0, transform: "scale(1.06)" },
      ], { duration: result.fullBoardClear ? MOTION.theme : duration });
      for (const i of result.cleared) {
        if (ghosts.has(i)) remove(ghosts.get(i));
        snaps.get(i)?.cancel();
        snaps.delete(i);
        const ghost = node("fx-cleared");
        ghost.style.gridArea = `${Math.floor(i / SIZE) + 1} / ${i % SIZE + 1}`;
        ghost.style.setProperty("--block", colorAt(i));
        ghosts.set(i, ghost);
        const delay = (i % SIZE + Math.floor(i / SIZE)) * duration * .022;
        play(ghost, [
          { transform: "scale(1)", opacity: 1 },
          { transform: "scale(1.04)", opacity: 1, offset: .24 },
          { transform: "scale(.12) rotate(8deg)", opacity: 0 },
        ], { duration: duration * .68, delay });
        live.get(ghost).onfinish = () => { ghosts.delete(i); remove(ghost); };
      }
      const sources = result.fullBoardClear
        ? Array.from({ length: SIZE ** 2 }, (_, index) => index)
        : result.cleared;
      const burstColors = result.fullBoardClear
        ? ["mint", "sky", "sun", "coral", "lilac", "particle"].map(key => palette.getPropertyValue(`--${key}`).trim())
        : result.cleared.map(colorAt);
      const count = result.fullBoardClear ? 48 : Math.min(36, 8 + lines * 7 + Math.min(8, result.game.combo));
      burst(sources, count, burstColors, result.fullBoardClear ? MOTION.allClear * .82 : duration + 140,
        result.fullBoardClear);
    } else {
      burst(parts, Math.min(8, parts.length + 3), [colorAt(parts[0]), palette.getPropertyValue("--particle").trim()], MOTION.placement + 110);
    }

    // Only the current labels remain onscreen. Board effects may overlap independently.
    for (const label of layer.querySelectorAll(".fx-score")) remove(label);
    const score = node(result.fullBoardClear ? "fx-score full-total" : "fx-score", `+${result.points}`);
    if (!result.fullBoardClear) position(score, lines ? result.cleared : parts);
    play(score, [
      { transform: "translate(-50%, 0) scale(.92)", opacity: 0 },
      { transform: "translate(-50%, -20px) scale(1)", opacity: 1, offset: .24 },
      { transform: "translate(-50%, -44px)", opacity: 0 },
    ], { duration: MOTION.floatingScore });

    const combo = result.game.combo;
    if (result.fullBoardClear || combo > previous.combo) {
      for (const label of layer.querySelectorAll(".fx-banner")) remove(label);
      const message = result.fullBoardClear ? "ALL CLEAR"
        : combo >= 10 ? "Incredible" : combo >= 7 ? "Amazing" : combo >= 4 ? "Great" : "Nice";
      const banner = node("fx-banner");
      banner.dataset.intensity = result.fullBoardClear || combo >= 7 ? "high" : "normal";
      banner.classList.toggle("all-clear", result.fullBoardClear);
      banner.classList.toggle("low", parseFloat(score.style.top) < 43);
      banner.append(node("fx-title", message), node("fx-detail", result.fullBoardClear
        ? `+${result.bonus} bonus` : `Combo ×${combo}`));
      play(banner, pop, { duration: result.fullBoardClear ? MOTION.allClear : MOTION.combo });
      if (result.fullBoardClear) {
        banner.lastElementChild.animate([
          { transform: "translateY(6px)", opacity: 0 },
          { transform: "translateY(0)", opacity: 1 },
        ], { duration: MOTION.placement * 2, delay: MOTION.placement, fill: "both" });
      }
    }
  }

  function reset() {
    for (const element of live.keys()) remove(element);
    for (const animation of snaps.values()) animation.cancel();
    snaps.clear();
    ghosts.clear();
  }

  motion.addEventListener("change", () => { if (motion.matches) reset(); });
  return { placement, reset };
}
