import { createGame, placePiece, SHAPES } from "../js/game.js";
import { generateHand, searchHand } from "../js/solver.js";
import { choose, occupied, randomFrom, summary } from "../tools/player-strategies.js";

const config = process.argv[2] ?? "v1";
const weights = {
  v2: { standard: 40, line: 30, cleanup: 20, allClear: 10 },
  experimental: { standard: 40, line: 30, cleanup: 20, allClear: 10 },
  conservative: { standard: 55, line: 25, cleanup: 15, allClear: 5 },
  allClearHeavy: { standard: 30, line: 25, cleanup: 20, allClear: 25 },
  cleanupHeavy: { standard: 25, line: 20, cleanup: 45, allClear: 10 },
};
if (config !== "v1" && !weights[config]) throw new Error("Use v1, v2, experimental, conservative, allClearHeavy, or cleanupHeavy.");
const generate = config === "v1" ? generateHand
  : config === "experimental" ? (await import("../js/experimental-generator.js")).generateExperimental
  : (await import("../js/generator.js")).generateHandV2;
const runs = Number(process.argv[3] ?? 24);
const cap = Number(process.argv[4] ?? 120);
if (!Number.isSafeInteger(runs) || runs < 1 || !Number.isSafeInteger(cap) || cap < 1) throw new Error("Session count and move cap must be positive integers.");
const SEED = 0x55a1b10;
const OPPORTUNITY_CHECKS = 30000;
const profiles = ["random", "greedy", "combo", "solver", "allClear"];
const results = {};

for (const profile of profiles) {
  const stats = {
    hands: 0, opportunities: 0, unknownOpportunity: 0, allClears: 0, fallback: 0, goalFallback: 0,
    rejected: 0, experimentalReplacements: 0, timedOutDeals: 0, provenImpossible: 0, impossibleReturned: 0,
    occupiedBefore: [], occupiedAfter: [], first: [], gaps: [], scores: [], lengths: [], worlds: [],
    sizes: {}, orientations: Array(SHAPES.length).fill(0), generationMs: [], sessions: [], strategy: {},
  };
  for (let run = 0; run < runs; run++) {
    const dealRandom = randomFrom(SEED + run * 8191);
    const moveRandom = randomFrom(SEED ^ (run * 19997 + 47));
    let game = createGame();
    let stop = "cap";
    let plan = [];
    let moves = 0;
    let before;
    let handStarted = false;
    const clearMoves = [];
    const worldsVisited = new Set([game.theme]);
    while (moves < cap) {
      if (game.hand.every(id => id === null)) {
        before = occupied(game.board);
        const start = performance.now();
        const deal = generate(game.board, game.bag, { random: dealRandom, weights: weights[config] });
        stats.generationMs.push(performance.now() - start);
        stats.rejected += deal.stats.rejected;
        stats.experimentalReplacements += Number(!!deal.stats.experimentalReplacement);
        stats.fallback += deal.stats.fallbacks;
        stats.goalFallback += Number(!!deal.stats.goalFallback);
        const row = stats.strategy[deal.stats.requested ?? "standard"] ??= { drawn: 0, met: 0 };
        row.drawn++;
        row.met += Number(deal.status === "solvable" && !deal.stats.goalFallback);
        if (deal.status !== "solvable") {
          stop = deal.status;
          if (stop === "timeout") stats.timedOutDeals++;
          else if (stop === "impossible") stats.provenImpossible++;
          break;
        }
        stats.hands++;
        handStarted = true;
        stats.occupiedBefore.push(before);
        for (const id of deal.hand) {
          stats.orientations[id]++;
          const size = SHAPES[id].cells.length;
          stats.sizes[size] = (stats.sizes[size] ?? 0) + 1;
        }
        if (searchHand(game.board, deal.hand, { goal: "completion" }).status !== "solvable") {
          stats.impossibleReturned++;
          stop = "invalid-deal";
          break;
        }
        const opportunity = searchHand(game.board, deal.hand, { goal: "allClear", maxChecks: OPPORTUNITY_CHECKS });
        stats.opportunities += Number(opportunity.status === "solvable");
        stats.unknownOpportunity += Number(opportunity.status === "timeout");
        plan = profile === "allClear" ? (opportunity.sequence ?? searchHand(game.board, deal.hand, {
          goal: "cleanup", cleanupCells: Math.max(4, Math.ceil(before / 3)), maxChecks: 9000,
        }).sequence ?? []) : [];
        game = { ...game, hand: deal.hand, bag: deal.bag };
      }

      const move = plan.shift();
      const result = move
        ? placePiece(game, game.hand.indexOf(move.id), move.x, move.y)
        : choose(game, profile, moveRandom);
      if (!result) { stop = "blocked"; break; }
      game = result.game;
      moves++;
      if (result.fullBoardClear) {
        if (clearMoves.length) stats.gaps.push(moves - clearMoves.at(-1));
        else stats.first.push(moves);
        clearMoves.push(moves);
        worldsVisited.add(game.theme);
        stats.allClears++;
      }
      if (game.hand.every(id => id === null)) {
        stats.occupiedAfter.push({ before, after: occupied(game.board), complete: true });
        handStarted = false;
      }
    }
    if (handStarted) stats.occupiedAfter.push({ before, after: occupied(game.board), complete: false });
    stats.sessions.push({ moves, score: game.score, stop, clearMoves, worldsVisited: [...worldsVisited] });
    stats.scores.push(game.score);
    stats.lengths.push(moves);
    stats.worlds.push(worldsVisited.size);
  }
  const { generationMs, occupiedBefore, occupiedAfter, first, gaps, scores, lengths, worlds, ...aggregate } = stats;
  results[profile] = {
    ...aggregate,
    generationMs: summary(generationMs), occupiedBefore: summary(occupiedBefore),
    completedHands: occupiedAfter.filter(hand => hand.complete).length,
    occupiedBeforeAndAfter: occupiedAfter, occupiedAfter: summary(occupiedAfter.map(({ after }) => after)),
    firstClear: summary(first), betweenClears: summary(gaps), worlds: summary(worlds),
    scores: summary(scores), lengths: summary(lengths),
    anyClear: stats.sessions.filter(session => session.clearMoves.length > 0).length,
    multipleClears: stats.sessions.filter(session => session.clearMoves.length > 1).length,
    capped: stats.sessions.filter(session => session.stop === "cap").length,
    noClearCapped: stats.sessions.filter(session => session.stop === "cap" && !session.clearMoves.length).length,
  };
}
console.log(JSON.stringify({
  config, weights: weights[config] ?? null, runs, cap, seed: SEED, opportunityChecks: OPPORTUNITY_CHECKS,
  shapeNames: SHAPES.map(shape => shape.name), results,
}, null, 2));
