import { placementIndices } from "./geometry.js";
import { drawCandidate, HAND_SIZE, SHAPES, SIZE } from "./pieces.js";

const bits = Array.from({ length: SIZE ** 2 }, (_, index) => 1n << BigInt(index));
const lineMasks = [];
for (let i = 0; i < SIZE; i++) {
  let row = 0n;
  let column = 0n;
  for (let j = 0; j < SIZE; j++) {
    row |= bits[i * SIZE + j];
    column |= bits[j * SIZE + i];
  }
  lineMasks.push(row, column);
}

const placements = SHAPES.map(shape => {
  const masks = [];
  for (let y = 0; y <= SIZE - shape.height; y++) {
    for (let x = 0; x <= SIZE - shape.width; x++) {
      masks.push(placementIndices(shape, x, y).reduce((mask, index) => mask | bits[index], 0n));
    }
  }
  return masks;
});
const largestFirst = SHAPES.map((_, id) => id)
  .sort((a, b) => SHAPES[b].cells.length - SHAPES[a].cells.length);
const limitReached = Symbol("placement budget exhausted");

function boardMask(board) {
  return board.reduce((mask, cell, index) => cell === null ? mask : mask | bits[index], 0n);
}

function afterPlacement(board, placement) {
  const occupied = board | placement;
  let cleared = 0n;
  for (const line of lineMasks) {
    if ((occupied & line) === line) cleared |= line;
  }
  return occupied & ~cleared;
}

function makeSearch(maxChecks) {
  let checks = 0;
  const dead = new Map();

  function* fittingMasks(board, id) {
    for (const mask of placements[id]) {
      if (checks >= maxChecks) throw limitReached;
      checks++;
      if ((board & mask) === 0n) yield mask;
    }
  }

  function search(board, remaining) {
    const key = remaining.join(",");
    if (!dead.has(key)) dead.set(key, new Set());
    const failedBoards = dead.get(key);
    if (failedBoards.has(board)) return false;

    for (let i = 0; i < remaining.length; i++) {
      const id = remaining[i];
      if (id === remaining[i - 1]) continue;
      for (const mask of fittingMasks(board, id)) {
        if (remaining.length === 1) return true;
        const next = remaining.slice();
        next.splice(i, 1);
        if (search(afterPlacement(board, mask), next)) return true;
      }
    }
    failedBoards.add(board);
    return false;
  }

  const failed = Array.from({ length: HAND_SIZE + 1 }, () => new Set());

  function fallback(board, count) {
    if (failed[count].has(board)) return null;
    for (const id of largestFirst) {
      for (const mask of fittingMasks(board, id)) {
        if (count === 1) return [id];
        const rest = fallback(afterPlacement(board, mask), count - 1);
        if (rest) return [id, ...rest];
      }
    }
    failed[count].add(board);
    return null;
  }

  return { search, fallback };
}

export function solveHand(board, hand, { maxChecks = Infinity } = {}) {
  try {
    const search = makeSearch(maxChecks);
    const ordered = [...hand].sort((a, b) => a - b);
    return search.search(boardMask(board), ordered) ? "solvable" : "impossible";
  } catch (error) {
    if (error === limitReached) return "timeout";
    throw error;
  }
}

export function generateHand(board, remainder, { random = Math.random, attempts = 12, maxChecks = Infinity } = {}) {
  const search = makeSearch(maxChecks);
  const occupied = boardMask(board);
  const stats = { rejected: 0, fallbacks: 0 };
  let bag = remainder;
  try {
    for (let i = 0; i < attempts; i++) {
      const candidate = drawCandidate(bag, random);
      bag = candidate.bag;
      if (search.search(occupied, [...candidate.hand].sort((a, b) => a - b))) {
        return { status: "solvable", hand: candidate.hand, bag, stats };
      }
      stats.rejected++;
    }
    stats.fallbacks++;
    const hand = search.fallback(occupied, HAND_SIZE);
    if (!hand) return { status: "impossible", stats };
    // Avoid revealing the fallback's successful placement order.
    hand.sort((a, b) => a - b);
    return { status: "solvable", hand, bag, stats };
  } catch (error) {
    if (error === limitReached) return { status: "timeout", stats };
    throw error;
  }
}
