import { readFile } from "node:fs/promises";
import { validateLevel } from "../js/level-solver.js";
import { verifyWitness } from "../tests/reference-adventure.js";

const { levels } = JSON.parse(await readFile(new URL("../adventure/levels.json", import.meta.url), "utf8"));
const start = performance.now();
const rows = levels.map(level => {
  if (validateLevel(level, { maxNodes: 0 }).method !== "replay") throw Error("Missing verified witness for " + level.id);
  const result = verifyWitness(level);
  return { level: level.name, moves: result.moves, score: result.score, world: level.world };
});
console.table(rows);
console.log(`Verified ${rows.length} witnesses in ${(performance.now() - start).toFixed(2)} ms (two replayers).`);
