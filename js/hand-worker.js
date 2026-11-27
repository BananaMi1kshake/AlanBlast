import { generateHandV2 } from "./generator.js";

self.addEventListener("message", ({ data: { board, bag } }) => {
  self.postMessage(generateHandV2(board, bag));
});
