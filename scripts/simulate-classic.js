import { createGame, placePiece, SHAPES, SIZE } from "../js/game.js";
import { generateHand, solveHand } from "../js/solver.js";
import { inspectSequences, legalPlacements } from "../tools/analysis-core.js";

const seed = 0x55a1b10;
const runs = 48;
const limit = 150;
const variants = ["random", "greedy", "combo", "solver"];
const buckets = ["0–15", "16–31", "32–47", "48–64"];

function randomFrom(start) {
  let state = start >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 2 ** 32;
  };
}

const occupied = board => board.reduce((sum, cell) => sum + Number(cell !== null), 0);
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

function choose(game, strategy, random) {
  const legal = [...legalPlacements(game)];
  if (!legal.length) return null;
  if (strategy === "random") return play(game, legal[Math.floor(random() * legal.length)]);
  const ranked = legal.map(move => {
    const result = play(game, move);
    const lines = lineCount(result);
    const anchorBias = Math.abs(move.x - 3.5) + Math.abs(move.y - 3.5);
    const estimate = strategy === "combo"
      ? result.points + readiness(result.game.board) * 3 + (lines && game.comboWindow === 1 ? 40 : 0) + anchorBias * .2
      : lines * 100 + Number(result.fullBoardClear) * 50 + anchorBias + SHAPES[move.id].cells.length * .1;
    return { result, estimate };
  }).sort((a, b) => b.estimate - a.estimate);

  if (strategy === "solver") {
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

function summary(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const quantile = p => sorted[Math.floor(p * (sorted.length - 1))] ?? null;
  return {
    p10: quantile(.10), median: quantile(.5), p90: quantile(.90), p95: quantile(.95), max: sorted.at(-1) ?? null,
    mean: values.length ? Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(4)) : null,
  };
}

function stats() {
  return { hands: 0, attempts: 0, rejected: 0, fallbacks: 0, repeats: 0, impossible: 0, timeouts: 0, times: [],
    sizes: {}, shapes: Array(SHAPES.length).fill(0), occupancy: [] };
}

function collect(stats, deal, ms, fill) {
  stats.attempts += deal.stats.rejected + Number(deal.status === "solvable" && !deal.stats.fallbacks);
  stats.rejected += deal.stats.rejected;
  stats.fallbacks += deal.stats.fallbacks;
  stats.times.push(ms);
  stats.occupancy.push(fill);
  if (deal.status !== "solvable") {
    if (deal.status === "timeout") stats.timeouts++;
    else stats.impossible++;
    return;
  }
  stats.hands++;
  stats.repeats += Number(new Set(deal.hand).size !== deal.hand.length);
  for (const id of deal.hand) {
    stats.shapes[id]++;
    const size = SHAPES[id].cells.length;
    stats.sizes[size] = (stats.sizes[size] ?? 0) + 1;
  }
}

function show({ times, occupancy, ...result }) {
  return { ...result, timingMs: summary(times), occupancy: summary(occupancy) };
}

const sessions = {};
const occupancyStats = Object.fromEntries(buckets.map(name => [name, stats()]));
const solutionSamples = Object.fromEntries(buckets.map(name => [name, []]));
for (const strategy of variants) {
  const scoring = [];
  const lengths = [];
  const totals = stats();
  let blocked = 0;
  for (let run = 0; run < runs; run++) {
    const dealRandom = randomFrom(seed + run * 8191);
    const moveRandom = randomFrom(seed ^ (run * 19997 + 47));
    let game = createGame();
    let turns = 0;
    while (turns < limit) {
      if (game.hand.every(id => id === null)) {
        const fill = occupied(game.board);
        const bucket = buckets[Math.min(buckets.length - 1, Math.floor(fill / 16))];
        const start = performance.now();
        const deal = generateHand(game.board, game.bag, { random: dealRandom });
        const ms = performance.now() - start;
        collect(totals, deal, ms, fill);
        collect(occupancyStats[bucket], deal, ms, fill);
        if (deal.status !== "solvable") break;
        game = { ...game, hand: deal.hand, bag: deal.bag };
        if (solutionSamples[bucket].length < 16) {
          const { solutions, complete, visited } = inspectSequences(game, { maxSolutions: 128, maxNodes: 12000 });
          solutionSamples[bucket].push({ solutions, complete, visited });
        }
      }
      const result = choose(game, strategy, moveRandom);
      if (!result) { blocked++; break; }
      game = result.game;
      turns++;
    }
    scoring.push(game.score);
    lengths.push(turns);
  }
  sessions[strategy] = { ...show(totals), blocked, scores: summary(scoring), sessionMoves: summary(lengths),
    reached: Object.fromEntries([30, 60, limit].map(moves => [moves, lengths.filter(n => n >= moves).length])) };
}

console.log(JSON.stringify({
  seed, sessionsPerStrategy: runs, moveCap: limit,
  orientations: SHAPES.map(shape => shape.name), sessions,
  occupancy: Object.fromEntries(Object.entries(occupancyStats).map(([key, value]) => [key, show(value)])),
  solutionSamples,
}, null, 2));
