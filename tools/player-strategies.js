import { placePiece, SHAPES, SIZE } from "../js/game.js";
import { solveHand } from "../js/solver.js";
import { legalPlacements } from "./analysis-core.js";

export function randomFrom(start) {
  let state = start >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 2 ** 32;
  };
}

export const occupied = board => board.reduce((sum, cell) => sum + Number(cell !== null), 0);
const lineCount = result => result.rows.length + result.columns.length;
function readiness(board) {
  let best = 0;
  for (let i = 0; i < SIZE; i++) {
    let row = 0;
    let column = 0;
    for (let j = 0; j < SIZE; j++) {
      row += Number(board[i * SIZE + j] !== null);
      column += Number(board[j * SIZE + i] !== null);
    }
    best = Math.max(best, row, column);
  }
  return best;
}

function play(game, { slot, x, y }) {
  return placePiece(game, slot, x, y);
}

export function choose(game, strategy, random) {
  const legal = [...legalPlacements(game)];
  if (!legal.length) return null;
  if (strategy === "random") return play(game, legal[Math.floor(random() * legal.length)]);
  const ranked = legal.map(move => {
    const result = play(game, move);
    const lines = lineCount(result);
    const anchorBias = Math.abs(move.x - 3.5) + Math.abs(move.y - 3.5);
    const estimate = strategy === "allClear"
      ? Number(result.fullBoardClear) * 500 - occupied(result.game.board) * 9 + readiness(result.game.board) * 4 + anchorBias * .1
      : strategy === "combo"
      ? result.points + readiness(result.game.board) * 3 + (lines && game.comboWindow === 1 ? 40 : 0) + anchorBias * .2
      : lines * 100 + Number(result.fullBoardClear) * 50 + anchorBias + SHAPES[move.id].cells.length * .1;
    return { result, estimate };
  }).sort((a, b) => b.estimate - a.estimate);

  if (strategy === "solver" || strategy === "allClear") {
    return ranked.find(({ result }) => {
      const rest = result.game.hand.filter(id => id !== null);
      return !rest.length || solveHand(result.game.board, rest) === "solvable";
    })?.result ?? ranked[0].result;
  }
  if (strategy === "combo") {
    const shortlist = ranked.slice(0, 8);
    for (const candidate of shortlist) {
      let best = 0;
      for (const move of legalPlacements(candidate.result.game)) {
        best = Math.max(best, play(candidate.result.game, move).points);
      }
      candidate.estimate += best * .42;
    }
    shortlist.sort((a, b) => b.estimate - a.estimate);
    return shortlist[0].result;
  }
  return ranked[0].result;
}

export function summary(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const quantile = p => sorted[Math.floor(p * (sorted.length - 1))] ?? null;
  return {
    p10: quantile(.10), median: quantile(.5), p90: quantile(.90), p95: quantile(.95), max: sorted.at(-1) ?? null,
    mean: values.length ? Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(4)) : null,
  };
}
