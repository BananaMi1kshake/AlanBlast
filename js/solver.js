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

export const SEARCH_GOALS = Object.freeze(["completion", "line", "cleanup", "reduction", "minimum", "allClear"]);

function count32(value) {
  value -= (value >>> 1) & 0x55555555;
  value = (value & 0x33333333) + ((value >>> 2) & 0x33333333);
  return Math.imul((value + (value >>> 4)) & 0x0f0f0f0f, 0x01010101) >>> 24;
}

function occupancy(mask) {
  return count32(Number(mask & 0xffffffffn)) + count32(Number(mask >> 32n));
}

// A simultaneous clear removes the union of rows and columns. This over-approximates
// possible removals and can safely rule out clear goals by cell count alone.
const removedOnce = new Set();
for (let rows = 0; rows <= SIZE; rows++) {
  for (let columns = 0; columns <= SIZE; columns++) {
    removedOnce.add(SIZE * (rows + columns) - rows * columns);
  }
}
const possibleRemoval = [new Set([0])];
for (let step = 1; step <= HAND_SIZE; step++) {
  possibleRemoval.push(new Set([...possibleRemoval[step - 1]].flatMap(n => [...removedOnce].map(m => n + m))));
}

const shapeSizes = SHAPES.map(shape => shape.cells.length);
const removalCache = new Map();

function couldEmpty(occupied, remaining) {
  const key = remaining.map(id => shapeSizes[id]).sort((a, b) => a - b).join(",");
  if (!removalCache.has(key)) {
    const counts = new Set();
    const sizes = key.split(",").map(Number);
    for (let subset = 1; subset < 2 ** sizes.length; subset++) {
      let cells = 0;
      let steps = 0;
      for (let i = 0; i < sizes.length; i++) {
        if (subset & (1 << i)) { cells += sizes[i]; steps++; }
      }
      for (const removed of possibleRemoval[steps]) {
        if (removed >= SIZE && removed >= cells && removed - cells <= SIZE ** 2) counts.add(removed - cells);
      }
    }
    removalCache.set(key, counts);
  }
  return removalCache.get(key).has(occupied);
}

/**
 * Find a complete hand witness. "minimum" optimizes the best board at any played
 * prefix. "reduction" optimizes the final board. A partial search never certifies
 * the absence of a goal or the optimum.
 */
export function searchHand(board, hand, { goal = "completion", maxChecks = Infinity, cleanupCells = 4 } = {}) {
  if (!SEARCH_GOALS.includes(goal)) throw new RangeError("Unknown hand search goal");
  const initial = boardMask(board);
  const starting = occupancy(initial);
  const optimize = goal === "minimum" || goal === "reduction";
  const needsEvent = goal === "line" || goal === "allClear";
  let checks = 0;
  const memo = new Map();
  const empty = { sequence: [], finalOccupied: 0, minimumOccupied: Infinity };

  function walk(mask, count, remaining, met) {
    if (!remaining.length) {
      if ((needsEvent && !met) || (goal === "cleanup" && count > starting - cleanupCells)) return null;
      return count === 0 ? empty : { ...empty, finalOccupied: count };
    }
    if (goal === "allClear" && !met && !couldEmpty(count, remaining)) return null;
    const key = remaining.join(",") + (met ? ":met" : "");
    if (!memo.has(key)) memo.set(key, new Map());
    const entries = memo.get(key);
    if (entries.has(mask)) return entries.get(mask);
    let best = null;
    const quiet = [];
    const orderClears = goal !== "completion" && !met && count > 0;

    function visit(id, index, width, next, nextCount, rest, cleared) {
      const hit = goal === "allClear" ? next === 0n : goal === "line" && cleared;
      const suffix = walk(next, nextCount, rest, met || hit);
      if (!suffix) return false;
      const minimum = Math.min(suffix.minimumOccupied, nextCount);
      const value = goal === "minimum" ? minimum : suffix.finalOccupied;
      const bestValue = goal === "minimum" ? best?.minimumOccupied : best?.finalOccupied;
      if (!best || value < bestValue) {
        best = {
          sequence: [{ id, x: index % width, y: Math.floor(index / width) }, ...suffix.sequence],
          finalOccupied: suffix.finalOccupied,
          minimumOccupied: minimum,
        };
      }
      return !optimize || value === 0;
    }

    const store = () => { entries.set(mask, best); return best; };
    for (let i = 0; i < remaining.length; i++) {
      const id = remaining[i];
      if (id === remaining[i - 1]) continue;
      const rest = remaining.filter((_, j) => j !== i);
      const width = SIZE - SHAPES[id].width + 1;
      for (const [index, placement] of placements[id].entries()) {
        if (checks >= maxChecks) throw limitReached;
        checks++;
        if ((mask & placement) !== 0n) continue;
        const placed = mask | placement;
        const next = afterPlacement(mask, placement);
        const cleared = next !== placed;
        const nextCount = cleared ? occupancy(next) : count + shapeSizes[id];
        if (orderClears && !cleared) quiet.push([id, index, width, next, nextCount, rest, false]);
        else if (visit(id, index, width, next, nextCount, rest, cleared)) return store();
      }
    }
    for (const move of quiet) {
      if (visit(...move)) return store();
    }
    entries.set(mask, best);
    return best;
  }

  if (goal === "cleanup" && starting < cleanupCells) return { status: "unmet", checks };
  try {
    const best = walk(initial, starting, [...hand].sort((a, b) => a - b), false);
    return best
      ? { status: "solvable", ...best, minimumOccupied: hand.length ? best.minimumOccupied : starting, reduction: starting - best.finalOccupied, checks }
      : { status: goal === "completion" ? "impossible" : "unmet", checks };
  } catch (error) {
    if (error === limitReached) return { status: "timeout", checks };
    throw error;
  }
}

const clearUnions = [];
function collectUnions(start, depth, mask) {
  if (depth) clearUnions.push({ mask, cells: occupancy(mask) });
  if (depth === 4) return;
  for (let i = start; i < lineMasks.length; i++) collectUnions(i + 1, depth + 1, mask | lineMasks[i]);
}
const coversByCell = [];
function coversAt(anchor) {
  coversByCell[anchor] ??= placements.map(masks =>
    masks.flatMap((mask, index) => mask & bits[anchor] ? [{ mask, index }] : []));
  return coversByCell[anchor];
}

function tryLineCover(board, order, maxChecks) {
  if (!clearUnions.length) {
    collectUnions(0, 0, 0n);
    clearUnions.sort((a, b) => a.cells - b.cells);
  }
  const starting = occupancy(board);
  let checks = 0;
  const tiles = [];
  function replay(mask, pending, sequence) {
    for (const [i, tile] of pending.entries()) {
      const next = afterPlacement(mask, tile.mask);
      const accepted = [...sequence, tile.move];
      if (next === 0n) return accepted;
      const result = replay(next, pending.filter((_, j) => i !== j), accepted);
      if (result) return result;
    }
    return null;
  }

  function tile(missing, count, left) {
    if (!missing) return replay(board, tiles, []);
    if (!left || count > left * 9) return null;
    const anchor = bits.findIndex(bit => (missing & bit) !== 0n);
    for (const id of order) {
      if (shapeSizes[id] > count || (left === 1 && shapeSizes[id] !== count)) continue;
      const width = SIZE - SHAPES[id].width + 1;
      for (const { mask, index } of coversAt(anchor)[id]) {
        if (checks >= maxChecks) throw limitReached;
        checks++;
        if ((missing & mask) !== mask) continue;
        tiles.push({ mask, move: { id, x: index % width, y: Math.floor(index / width) } });
        const result = tile(missing & ~mask, count - shapeSizes[id], left - 1);
        tiles.pop();
        if (result) return result;
      }
    }
    return null;
  }

  try {
    for (const { mask, cells } of clearUnions) {
      if (cells <= starting || (board & mask) !== board) continue;
      if (cells > starting + 27) break;
      const sequence = tile(mask & ~board, cells - starting, HAND_SIZE);
      if (sequence) return { status: "found", sequence, checks };
    }
    return { status: "notFound", checks };
  } catch (error) {
    if (error === limitReached) return { status: "timeout", checks };
    throw error;
  }
}

// Search a diversified shortlist of promising boards for a constructive all-clear.
// This search proposes hands. Running out of beam width is never a proof about the library.
export function proposeAllClear(board, order, { maxChecks, width }) {
  const mask = boardMask(board);
  const cover = tryLineCover(mask, order, Math.floor(maxChecks / 4));
  if (cover.status === "found") return cover;
  let checks = cover.checks;
  let frontier = [{ board: mask, sequence: [] }];
  for (let depth = 0; depth < HAND_SIZE; depth++) {
    const nextFrontier = [];
    const seen = new Set();
    for (const node of frontier) {
      const count = occupancy(node.board);
      for (const id of order) {
        const canFinish = removedOnce.has(count + shapeSizes[id]);
        if (!canFinish && depth === HAND_SIZE - 1) continue;
        const columns = SIZE - SHAPES[id].width + 1;
        for (const [index, mask] of placements[id].entries()) {
          if (checks >= maxChecks) return { status: "timeout", checks };
          checks++;
          if ((node.board & mask) !== 0n) continue;
          const landed = node.board | mask;
          const next = afterPlacement(node.board, mask);
          const move = { id, x: index % columns, y: Math.floor(index / columns) };
          if (next === 0n) return { status: "found", sequence: [...node.sequence, move], checks };
          if (depth === HAND_SIZE - 1 || seen.has(next)) continue;
          seen.add(next);
          const nextCount = next === landed ? count + shapeSizes[id] : occupancy(next);
          let fullest = 0;
          for (const line of lineMasks) fullest = Math.max(fullest, occupancy(next & line));
          // Favor low clutter and contiguous line progress. Bag order breaks ties.
          const rank = 2 * nextCount - 3.25 * fullest + Number(shapeSizes[id] === 1) * 1.5;
          if (nextFrontier.length === width && rank >= nextFrontier.at(-1).rank) continue;
          nextFrontier.push({ board: next, sequence: [...node.sequence, move], rank });
          nextFrontier.sort((a, b) => a.rank - b.rank);
          if (nextFrontier.length > width) nextFrontier.pop();
        }
      }
    }
    frontier = nextFrontier;
  }
  return { status: "notFound", checks };
}
