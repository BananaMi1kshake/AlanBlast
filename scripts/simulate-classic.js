import { createGame, SHAPES } from "../js/game.js";
import { generateHand } from "../js/solver.js";
import { inspectSequences } from "../tools/analysis-core.js";
import { choose, occupied, randomFrom, summary } from "../tools/player-strategies.js";

const seed = 0x55a1b10;
const runs = 48;
const limit = 150;
const variants = ["random", "greedy", "combo", "solver"];
const buckets = ["0–15", "16–31", "32–47", "48–64"];

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
