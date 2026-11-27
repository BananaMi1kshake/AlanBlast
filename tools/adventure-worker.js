import { validateLevel } from "../js/level-solver.js";

self.addEventListener("message", event => {
  self.postMessage(validateLevel(event.data));
});
