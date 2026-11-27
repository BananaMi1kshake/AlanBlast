export const SIZE = 8;
export const HAND_SIZE = 3;

// Shape IDs are saved as array indices. Append new templates to keep old saves compatible.
const templates = [
  ["Single", "mint", ["#"]],
  ["Horizontal pair", "sky", ["##"]],
  ["Vertical pair", "sky", ["#", "#"]],
  ["Horizontal triple", "sky", ["###"]],
  ["Vertical triple", "sky", ["#", "#", "#"]],
  ["Horizontal four", "sky", ["####"]],
  ["Vertical four", "sky", ["#", "#", "#", "#"]],
  ["Small square", "sun", ["##", "##"]],
  ["Large square", "sun", ["###", "###", "###"]],
  ["Small corner, upper left", "coral", ["##", "#."]],
  ["Small corner, upper right", "coral", ["##", ".#"]],
  ["Small corner, lower left", "coral", ["#.", "##"]],
  ["Small corner, lower right", "coral", [".#", "##"]],
  ["Large corner, upper left", "coral", ["###", "#..", "#.."]],
  ["Large corner, upper right", "coral", ["###", "..#", "..#"]],
  ["Large corner, lower left", "coral", ["#..", "#..", "###"]],
  ["Large corner, lower right", "coral", ["..#", "..#", "###"]],
  ["T, up", "lilac", [".#.", "###"]],
  ["T, down", "lilac", ["###", ".#."]],
  ["T, left", "lilac", [".#", "##", ".#"]],
  ["T, right", "lilac", ["#.", "##", "#."]],
  ["Zigzag, left", "mint", ["##.", ".##"]],
  ["Zigzag, right", "mint", [".##", "##."]],
  ["Vertical zigzag, left", "mint", ["#.", "##", ".#"]],
  ["Vertical zigzag, right", "mint", [".#", "##", "#."]],
  ["Horizontal five", "sky", ["#####"]],
  ["Vertical five", "sky", ["#", "#", "#", "#", "#"]],
  ["Wide rectangle", "sun", ["###", "###"]],
  ["Tall rectangle", "sun", ["##", "##", "##"]],
  ["Elbow, upper left", "coral", ["###", "#.."]],
  ["Elbow, upper right", "coral", ["###", "..#"]],
  ["Elbow, lower left", "coral", ["#..", "###"]],
  ["Elbow, lower right", "coral", ["..#", "###"]],
  ["Elbow, left foot", "coral", [".#", ".#", "##"]],
  ["Elbow, right foot", "coral", ["#.", "#.", "##"]],
  ["Elbow, left cap", "coral", ["##", ".#", ".#"]],
  ["Elbow, right cap", "coral", ["##", "#.", "#."]],
  ["Cross", "lilac", [".#.", "###", ".#."]],
];

export const SHAPES = templates.map(([name, color, rows]) => ({
  name,
  color,
  width: rows[0].length,
  height: rows.length,
  cells: rows.flatMap((row, y) => [...row].flatMap((cell, x) => cell === "#" ? [[x, y]] : [])),
}));

export function drawCandidate(remainder, random = Math.random) {
  const bag = [...remainder];
  if (bag.length < HAND_SIZE) {
    const nextBag = SHAPES.map((_, index) => index);
    for (let i = nextBag.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [nextBag[i], nextBag[j]] = [nextBag[j], nextBag[i]];
    }
    bag.push(...nextBag);
  }
  const hand = bag.splice(0, HAND_SIZE);
  return { hand, bag };
}
