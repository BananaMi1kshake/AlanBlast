import { completedLines, createGame, isGameOver, placePiece, SHAPES, SIZE } from "./game.js";
import { MATERIALS, PALETTES, WORLDS } from "./themes.js";

const colors = { A: 0, B: 1, C: 7, D: 9, E: 17 };
export const OBJECTIVES = Object.freeze({
  score: "Score", gems: "Gems", lines: "Lines", rows: "Rows", columns: "Columns",
  allClear: "All-clears", combo: "Combo",
});
const positive = n => Number.isSafeInteger(n) && n > 0;

export function decodeBoard(rows) {
  return rows.flatMap(row => [...row].map(cell => cell === "." ? null : colors[cell]));
}

export function levelError(level) {
  if (!level || typeof level.id !== "string" || !/^[a-z0-9-]+$/.test(level.id)
    || typeof level.name !== "string" || !level.name.trim()) return "Choose a stable ID and display name.";
  if (!Object.hasOwn(WORLDS, level.world) || !Object.hasOwn(MATERIALS, level.material)
    || !Object.hasOwn(PALETTES, level.palette)) return "Choose a valid world, material and palette.";
  if (!["Intro", "Strategy", "Expert"].includes(level.difficulty)) return "Choose Intro, Strategy or Expert.";
  if (!Array.isArray(level.board) || level.board.length !== SIZE
    || level.board.some(row => typeof row !== "string" || !/^[.A-E]{8}$/.test(row))) return "Enter eight board rows using . or A–E.";
  const board = decodeBoard(level.board);
  const lines = completedLines(board);
  if (lines.rows.length || lines.columns.length) return "Starting boards must not contain complete lines.";
  if (!Array.isArray(level.gems) || new Set(level.gems).size !== level.gems.length
    || level.gems.some(index => !Number.isInteger(index) || index < 0 || index >= board.length || board[index] === null)) {
    return "Gems must be unique indices of occupied cells.";
  }
  if (!Array.isArray(level.hands) || !level.hands.length || level.hands.length > 30
    || level.hands.some(hand => !Array.isArray(hand) || !hand.length || hand.length > 3
      || hand.some(id => !Number.isInteger(id) || !SHAPES[id]))) return "Supply 1–30 trays with 1–3 known shape IDs each.";
  if (!Array.isArray(level.objectives) || !level.objectives.length
    || level.objectives.some(goal => !goal || !Object.hasOwn(OBJECTIVES, goal.type) || !positive(goal.target))) {
    return "Every level needs recognized goals with positive integer targets.";
  }
  if (new Set(level.objectives.map(goal => goal.type)).size !== level.objectives.length) return "Use each objective type once per level.";
  if (level.objectives.some(goal => goal.type === "gems" && goal.target > level.gems.length)) return "The gem target exceeds the gems on the board.";
  if (level.maxMoves !== undefined && (!positive(level.maxMoves) || level.maxMoves > 90)) return "The placement limit must be from 1 to 90.";
  return null;
}

const slots = hand => [...hand, ...Array(3 - hand.length).fill(null)];

export function startLevel(level) {
  const game = {
    ...createGame(), board: decodeBoard(level.board), hand: slots(level.hands[0]), theme: level.world,
    palette: level.palette, material: level.material,
  };
  const blocked = isGameOver(game);
  return {
    game,
    gems: [...level.gems], rows: 0, columns: 0, collected: 0, allClear: 0, peakCombo: 0,
    nextHand: 1, history: [], status: blocked ? "failed" : "playing", reason: blocked ? "blocked" : null,
  };
}

export function objectiveProgress(level, run) {
  const counts = {
    score: run.game.score, gems: run.collected, lines: run.rows + run.columns,
    rows: run.rows, columns: run.columns, allClear: run.allClear, combo: run.peakCombo,
  };
  return level.objectives.map(goal => ({ ...goal, label: OBJECTIVES[goal.type],
    value: counts[goal.type], complete: counts[goal.type] >= goal.target }));
}

export function remainingMoves(level, run) {
  return level.maxMoves === undefined ? null : level.maxMoves - run.history.length;
}

export const FAILURES = Object.freeze({
  limit: "The placement limit was reached before the objectives were complete.",
  supply: "The level ran out of pieces before the objectives were complete.",
  blocked: "None of the remaining pieces fits.",
});

export function playLevel(level, run, slot, x, y) {
  if (run.status !== "playing") return null;
  const result = placePiece(run.game, slot, x, y);
  if (!result) return null;
  // The shared all-clear bonus stays in force. Adventure keeps its authored appearance.
  const game = { ...result.game, theme: level.world, material: level.material, palette: level.palette };
  const cleared = new Set(result.cleared);
  const gemsCollected = run.gems.filter(index => cleared.has(index));
  const next = {
    ...run, game, gems: run.gems.filter(index => !cleared.has(index)),
    rows: run.rows + result.rows.length, columns: run.columns + result.columns.length,
    collected: run.collected + gemsCollected.length, allClear: run.allClear + Number(result.fullBoardClear),
    peakCombo: Math.max(run.peakCombo, game.combo), history: [...run.history, { slot, x, y }],
  };
  const spent = game.hand.every(id => id === null);
  let refill = false;
  if (objectiveProgress(level, next).every(goal => goal.complete)) next.status = "won";
  else if (remainingMoves(level, next) === 0) next.reason = "limit";
  else if (spent && next.nextHand === level.hands.length) next.reason = "supply";
  else {
    if (spent) {
      game.hand = slots(level.hands[next.nextHand++]);
      refill = true;
    }
    if (isGameOver(game)) next.reason = "blocked";
  }
  if (next.reason) next.status = "failed";
  return { ...result, game, run: next, gemsCollected, refill, won: next.status === "won" };
}

export function replayLevel(level, history) {
  let run = startLevel(level);
  for (const move of history) {
    if (!move || !Number.isInteger(move.slot) || move.slot < 0 || move.slot > 2) return null;
    const result = playLevel(level, run, move.slot, move.x, move.y);
    if (!result) return null;
    run = result.run;
  }
  return run;
}
