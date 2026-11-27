import { generateHandV2 } from "./generator.js";
import { createGame, placePiece } from "./game.js";
import { drawCandidate, SIZE } from "./pieces.js";
import { searchHand } from "./solver.js";

const EXTRA_PROPOSALS = 3;
const CHECKS_PER_PROPOSAL = 1800;

function quality(board) {
  const rows = Array(SIZE).fill(0);
  const columns = Array(SIZE).fill(0);
  const occupied = [];
  let isolated = 0;
  for (let i = 0; i < board.length; i++) {
    if (board[i] === null) continue;
    const x = i % SIZE;
    const y = Math.floor(i / SIZE);
    rows[y]++;
    columns[x]++;
    occupied.push(i);
    const neighbors = [x ? i - 1 : -1, x < SIZE - 1 ? i + 1 : -1, i - SIZE, i + SIZE];
    if (!neighbors.some(j => j >= 0 && j < board.length && board[j] !== null)) isolated++;
  }

  // Planning proxy: leave the next tray fewer cells outside a row/column cross.
  let covered = 0;
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      covered = Math.max(covered, rows[y] + columns[x] - Number(board[y * SIZE + x] !== null));
    }
  }
  return 4 * occupied.length + 6 * (occupied.length - covered) + 2 * isolated;
}

function evaluate(board, hand, cleanupCells) {
  const witness = searchHand(board, hand, { goal: "cleanup", maxChecks: CHECKS_PER_PROPOSAL, cleanupCells });
  if (!witness.sequence) return Infinity;
  let game = { ...createGame(), board, hand };
  for (const { id, x, y } of witness.sequence) game = placePiece(game, game.hand.indexOf(id), x, y).game;
  return quality(game.board);
}

export function generateExperimental(board, remainder, options = {}) {
  const random = options.random ?? Math.random;
  const base = generateHandV2(board, remainder, options);
  if (base.status !== "solvable" || base.stats.requested !== "cleanup") return base;

  const cleanupCells = options.limits?.cleanupCells ?? 4;
  if (board.filter(cell => cell !== null).length < cleanupCells) return base;
  let bag = base.bag;
  let best = base;
  let rank = base.stats.delivered === "cleanup" ? evaluate(board, base.hand, cleanupCells) : Infinity;
  // Keep a proven cleanup if the smaller research budget cannot rediscover its outcome.
  if (base.stats.delivered === "cleanup" && !Number.isFinite(rank)) return base;
  for (let i = 0; i < EXTRA_PROPOSALS; i++) {
    const candidate = drawCandidate(bag, random);
    bag = candidate.bag;
    const score = evaluate(board, candidate.hand, cleanupCells);
    if (score >= rank) continue;
    rank = score;
    best = { ...base, ...candidate, stats: { ...base.stats, delivered: "cleanup",
      goalFallback: false, experimentalReplacement: true } };
  }
  return best;
}
