import { canPlace, placePiece, SHAPES, SIZE } from "../js/game.js";

export function* legalPlacements(game) {
  const tried = new Set();
  for (const [slot, id] of game.hand.entries()) {
    if (id === null || tried.has(id)) continue;
    tried.add(id); // Switching equivalent tray slots does not make a different solution.
    const shape = SHAPES[id];
    for (let y = 0; y <= SIZE - shape.height; y++) {
      for (let x = 0; x <= SIZE - shape.width; x++) {
        if (canPlace(game.board, shape, x, y)) yield { slot, id, x, y };
      }
    }
  }
}

export function inspectSequences(game, { maxSolutions = 200, maxNodes = 20000 } = {}) {
  const path = [];
  let first = null;
  let solutions = 0;
  let visited = 0;
  let complete = true;

  function explore(state) {
    if (state.hand.every(id => id === null)) {
      first ??= path.slice();
      solutions++;
      return;
    }
    for (const move of legalPlacements(state)) {
      if (solutions >= maxSolutions || visited >= maxNodes) {
        complete = false;
        return;
      }
      visited++;
      path.push(move);
      explore(placePiece(state, move.slot, move.x, move.y).game);
      path.pop();
      if (!complete) return;
    }
  }

  if (game.hand.some(id => id !== null)) explore(game);
  return { first, solutions, visited, complete };
}
