import { SHAPES, SIZE } from "../js/pieces.js";
import { WORLDS } from "../js/themes.js";
import { randomFrom } from "./player-strategies.js";

export function candidateLevel(seed, worldId) {
  const random = randomFrom(seed);
  const world = WORLDS[worldId] ?? WORLDS.mint;
  const worldKey = Object.hasOwn(WORLDS, worldId) ? worldId : "mint";
  const id = [7, 21, 22, 27][Math.floor(random() * 4)];
  const shape = SHAPES[id];
  const x = Math.floor(random() * (SIZE - shape.width + 1));
  const y = Math.floor(random() * (SIZE - shape.height + 1));
  const board = Array.from({ length: SIZE }, (_, row) => Array.from({ length: SIZE }, (_, column) =>
    row >= y && row < y + shape.height ? "ABCDE"[(row + column) % 5] : "."));
  for (const [dx, dy] of shape.cells) board[y + dy][x + dx] = ".";
  const gems = board.flat().flatMap((cell, index) => cell !== "." ? [index] : []);
  return {
    id: "draft-" + (seed >>> 0), name: "Generated draft", world: worldKey,
    material: world.material, palette: world.palette, difficulty: "Strategy",
    board: board.map(row => row.join("")), gems: [gems[0], gems.at(-1)],
    hands: [[25, id, 0]], objectives: [{ type: "gems", target: 2 }, { type: "rows", target: shape.height }],
    maxMoves: 2,
  };
}
