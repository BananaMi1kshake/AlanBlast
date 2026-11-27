import { generateHand } from "./solver.js";

self.addEventListener("message", ({ data: { board, bag } }) => {
  self.postMessage(generateHand(board, bag));
});
