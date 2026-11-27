export const MUSIC = Object.freeze({
  root: 60,
  scale: Object.freeze([0, 2, 4, 7, 9]),
  maxStep: 8,
  harmonyAt: 4,
  shimmerAt: 7,
});

const note = (pitch, at, duration, level, wave = "triangle", endPitch) =>
  ({ pitch, at, duration, level, wave, endPitch });

export function comboVoicing(combo) {
  const step = Math.min(MUSIC.maxStep, Math.max(0, Math.floor(combo) - 1));
  const pitchAt = degree => MUSIC.root + MUSIC.scale[degree % MUSIC.scale.length]
    + 12 * Math.floor(degree / MUSIC.scale.length);
  return {
    root: pitchAt(step),
    upper: pitchAt(step + 3),
    harmony: combo >= MUSIC.harmonyAt ? pitchAt(step + 2) : null,
    shimmer: combo >= MUSIC.shimmerAt ? pitchAt(step + 5) : null,
  };
}

function line(count, combo) {
  const { root, upper, harmony } = comboVoicing(combo);
  const notes = [note(root - 12, 0, .13, .19, "sine"), note(root, .016, .17, .18)];
  if (count >= 2) notes.push(note(upper, .069, .19, .14, "sine"));
  if (count >= 3) notes.push(note(root + 12, .125, .24, .12, "sine"));
  if (count >= 4) notes.push(note(upper, .177, .32, .12), note(upper - 12, .12, .27, .13, "sine"));
  if (harmony !== null) notes.push(note(harmony, .04, .22, .085, "sine"));
  return notes;
}

export const SOUNDS = Object.freeze({
  pickup: { label: "Piece pickup", priority: 0, notes: () => [note(71, 0, .065, .12, "sine", 78)] },
  place: { label: "Block placement", priority: 1, notes: () => [
    note(54, 0, .09, .24, "sine", 41), note(73, .005, .045, .12, "triangle", 66),
  ] },
  invalid: { label: "Invalid placement", priority: 1, notes: () => [
    note(53, 0, .12, .14, "triangle", 46), note(48, .05, .105, .09, "sine", 44),
  ] },
  clear1: { label: "Single-line clear", priority: 2, notes: combo => line(1, combo) },
  clear2: { label: "Double-line clear", priority: 2, notes: combo => line(2, combo) },
  clear3: { label: "Triple-line clear", priority: 2, notes: combo => line(3, combo) },
  clear4: { label: "Four or more lines", priority: 2, notes: combo => line(4, combo) },
  combo: { label: "Combo increase", priority: 2, notes: combo => {
    const { upper, harmony, shimmer } = comboVoicing(combo);
    const notes = [note(upper, 0, .18, .13, "sine")];
    if (harmony !== null) notes.push(note(harmony, .034, .22, .105, "triangle"));
    if (shimmer !== null) notes.push(note(shimmer, .085, .27, .074, "sine"));
    return notes;
  } },
  allClear: { label: "Full-board clear", priority: 4, notes: () => [
    note(48, 0, .42, .24, "sine"), note(60, .018, .24, .18),
    note(64, .106, .25, .18), note(67, .21, .31, .17), note(74, .322, .35, .17),
    note(76, .435, .58, .14), note(72, .435, .52, .13, "sine"),
    note(67, .44, .56, .11, "sine"), note(79, .55, .44, .096, "sine"),
  ] },
  record: { label: "New personal best", priority: 2, notes: () => [
    note(74, 0, .14, .125, "sine"), note(79, .067, .23, .14), note(76, .13, .23, .09, "sine"),
  ] },
  gameOver: { label: "Game over", priority: 3, notes: () => [
    note(64, 0, .22, .17, "sine"), note(62, .11, .25, .14), note(60, .235, .42, .17, "sine"),
    note(48, .235, .41, .10, "sine"),
  ] },
  newGame: { label: "New game", priority: 3, notes: () => [
    note(55, 0, .16, .18, "sine"), note(62, .06, .18, .15), note(67, .13, .26, .16, "sine"),
  ] },
  gem: { label: "Adventure gem", priority: 2, notes: () => [
    note(77, 0, .12, .13, "sine"), note(84, .07, .18, .12, "sine"),
  ] },
  levelComplete: { label: "Adventure victory", priority: 3, notes: () => [
    note(60, 0, .23, .17), note(67, .12, .28, .16), note(76, .24, .44, .15, "sine"),
  ] },
  ui: { label: "UI control", priority: 0, notes: () => [note(76, 0, .055, .10, "sine", 81)] },
});
