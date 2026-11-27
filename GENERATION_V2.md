# Generation V2 and all-clear opportunities

## What the audit found

Classic checks the board after every accepted placement. It finds completed rows and columns on the same placed board and removes their union. If the resulting board is empty, the existing move path adds one 100-point bonus, advances one world and material, and dispatches one all-clear celebration and sound. It consumes only the slot played. The new-hand worker stays idle until the final slot is spent. A simultaneous row-and-column fixture verified a score of 126 from one cell, two lines, and the bonus, with two tray pieces and the new world retained after reload. A separate fixture clears one line to open space for a second placement that empties the board. A third fixture clears only on move three.

V1 guaranteed a legal completion sequence and had no objective for ending with an empty board. The V1 simulation observed zero actual all-clears. That finding and the audit point to hand opportunities and placement choices as the bottleneck in the sampled Classic experience. The scoring, combo, shape, geometry, material assets, and audio code are retained.

## Live dealer and fairness

The worker takes only the board and shuffle-bag remainder. A fresh uniform random draw selects from cumulative weights in this order.

| Strategy | Default weight | Verified objective |
|---|---:|---|
| Standard | 40% | At least one complete legal sequence, using the original dealer |
| Line clear | 30% | At least one line clears at a played step of a complete sequence |
| Board cleanup | 20% | The completed tray leaves at least four fewer occupied cells than the starting board |
| All-clear | 10% | The board reaches zero occupied cells after a placement, with a complete legal sequence for the rest of the tray |

Positive supplied weights are relative. If their sum is zero, Standard is used. The rule is the same for every player. Score, best, time, prior outcomes, and identity are absent from the worker message. The weights control requests. Delivered rates depend on the board and search budget, and Standard hands can have incidental opportunities.

1. Reserve a Standard hand using V1's shuffle-bag proposals and its deterministic solvability fallback. It tries up to 12 proposals before the fallback. It is limited to 120,000 placement checks. An exhaustive proof of no legal hand yields `impossible`. A budget limit yields `timeout` with no hand.
2. For a targeted strategy, probe up to eight hands including the reserve, using the next shuffle-bag proposals for alternatives. Each probe is capped at 2,400 placement checks, with 12,000 checks across the probe phase. Cleanup skips extra probes if fewer than four cells are occupied. An accepted proposal commits its resulting bag and the displayed order remains the proposal order.
3. If an all-clear probe misses, the guide has 19,000 placement checks. It spends up to a quarter on exact tilings of missing cells in unions of up to four lines covering the board, then explores a five-board beam to depth three, favoring lower occupancy and fuller lines. It penalizes single-cell moves in beam tie-breaking. The exact-cover pass simulates tile orders and actual clears. The beam simulates every explored move. A discovered clearing prefix may use any catalog orientation, ordered by the reserve bag. Its unused tray slots come from the reserve and are checked on the empty board within 2,400 checks. Guided pieces are removed from the reserve bag when present, and the final tray order is shuffled to avoid disclosing the witness.
4. If the goal is unmet, inconclusive, or the bounded guide finds no witness, return the original reserved hand and its bag. Speculative proposals do not replace that bag. The goal fallback is distinct from the original solvability fallback. Neither guide exhaustion nor a budget limit proves that the catalog cannot supply the goal.

Revealed pieces are fixed. Players can make placements that strand a slot. The dealer never clears cells or places pieces for the player. The normal worker remains cancellable on restart and cached offline.

## Solver goals

The solver uses the existing footprint masks and row/column union operation. It branches on each distinct remaining shape and every legal anchor. Equivalent duplicate slots share branches. The objective search prefers immediate clears while the goal is unresolved, then explores other moves. It memoizes by occupancy mask, remaining multiset and relevant goal state. A necessary cell-count test rejects all-clear branches whose starting cells and any subset of remaining piece sizes cannot match the number of cells removed across that many moves. This test allows simultaneous intersections and only eliminates impossible counts.

`searchHand` can return any completion witness, one with a line clear, one with the configured end reduction, or one with an all-clear. It can also optimize minimum occupancy after any played prefix or maximum net reduction at hand end. Both optimizing goals require a complete legal sequence. Reaching zero certifies the absolute optimum. Otherwise the solver searches all relevant branches to prove the optimum, or returns `timeout` if the budget is insufficient. `unmet` means no witness for that objective on that particular hand. It is not a catalog-wide impossibility result.

## Seeded simulation results

Run `node scripts/simulate-generation.js <config> [runs] [move-cap]`. Each reported configuration used the same initial seeds, 24 sessions per player strategy and 120 moves maximum, for 120 sessions per configuration. V2 consumes a strategy draw, so the trajectories and shuffle streams can diverge. Random, greedy, combo-focused, and solver-informed policies reuse the Phase 5.5 behaviors. All-clear-focused follows a found witness, then tries a bounded cleanup witness, then favors less occupied boards while preserving a completion.

The data records occupancy before and after each hand, including blocked or truncated partial hands, plus individual session scores, stopping reasons, clear moves, visited worlds, and counts by orientation and size. Opportunity checks have a separate 30,000-check cap. Rates below are confirmed opportunities divided by all deals. Unknowns remain separate. First-clear and repeat intervals are conditional on those events occurring. A capped session can have no clears, one, or several.

| Configuration in standard/line/cleanup/all-clear order | Confirmed opportunities | Unknown | Actual clears | Sessions with a clear | Sessions with repeats | Goal fallbacks |
|---|---:|---:|---:|---:|---:|---:|
| V1 | 0/3,231 (0%) | 176 | 0 | 0/120 | 0 | — |
| V2 40/30/20/10 | 16/3,233 (0.50%) | 217 | 11 | 11/120 | 0 | 481 |
| Conservative 55/25/15/5 | 12/3,158 (0.38%) | 215 | 8 | 8/120 | 0 | 277 |
| All-clear-heavy 30/25/20/25 | 42/3,341 (1.26%) | 222 | 28 | 25/120 | 2 | 977 |
| Cleanup-heavy 25/20/45/10 | 16/3,402 (0.47%) | 232 | 11 | 11/120 | 0 | 742 |

| Player strategy | Median score V1 → default V2 | Median moves V1 → V2 | Default V2 clears | Default V2 capped without a clear |
|---|---:|---:|---:|---:|
| Random | 57 → 73 | 11 → 13 | 0 | 0 |
| Greedy | 738 → 711 | 35 → 38 | 2 | 1 |
| Combo-focused | 3,816 → 4,987 | 120 → 120 | 3 | 12 |
| Solver-informed | 3,589 → 3,065 | 120 → 120 | 2 | 22 |
| All-clear-focused | 3,172 → 3,197 | 120 → 120 | 4 | 22 |

The default delivered 11 of 294 requested all-clear goals, 441 of 639 cleanup goals, and all 923 line-clear requests in this sample. Five deals used the original solvability fallback, the same number as V1. No live-session simulation returned an impossible hand or reached the base timeout. Singles were 3.24% of default V2 pieces versus 3.19% in V1. Five-cell-or-larger pieces were 22.51% versus 23.34%. The complete orientation distributions are in the simulation output. Mean worlds visited was 1.09 under default V2 and 1.00 under V1.

Default V2's 11 sessions with a clear reached the first one at a median of move 2 and a mean of 2.55. Most sessions never cleared, and default V2 had no repeat intervals to measure. All-clear-heavy had a median first clear at move 3 among successful sessions. Its two repeat sessions gave a pooled mean gap of four moves across three intervals. This concentrated some clears early and did not establish the desired 10–20 move first clear or 15–30 move recurrence. All 24 solver-informed and all 24 all-clear-focused runs reached the cap under every configuration, including V1. A policy that always protects the known witness can keep playing. Random and greedy play still generally ended well below the cap.

### Recommendation

Keep **40/30/20/10** as the experimental default for manual testing. The heavier all-clear setting increased openings, goal fallbacks, and compute cost, and repeat clears remained uncommon. The cleanup-heavy setting extended some runs without adding observed clears over the default. The target cadence needs a richer sample of real player decisions and follow-up design work before treating these as final balance values. No timed or score-based assistance is warranted by this evidence.

## Independent validation and performance

`node scripts/benchmark-hands.js v2` checked 10,000 generated deals with the separate array-based reference solver on empty, partially occupied, congested, and adversarial boards. It also checked 250 deliberately full boards, which had no legal move. There were zero invalid hands and zero base timeouts. An additional set of 20 delivered objectives per targeted strategy was independently checked. The benchmark observed 1,929 goal fallbacks and 693 solvability fallback searches, including the full boards. The V2 mean was 0.60 ms, p95 3.79 ms, and worst observed 37.29 ms on the cloud Node host. These are inside-worker algorithm timings, excluding worker creation and platform scheduling. Synthetic adversarial cases and simulation trajectories have different occupancy mixes.

Chromium emulated touch on a simultaneous clear, checked the one bonus and celebration/audio cue, kept and restored the remaining tray, and obtained a V2 deal offline after those pieces were spent. The localhost lab's seeded repeat returned the same hand and witness. A Phase 5.5 service-worker upgrade test retained the already-revealed hand and loaded the new worker offline.

## Playtesting and lab use

Serve the checkout and open `http://localhost:8000/tools/gameplay-lab.html`. Choose a board scenario or enter a fixture. In **Seeded dealer**, enter a seed, request a strategy or choose Weighted, and edit its four relative weights. **Deal V2** applies the result only to the sandbox. **Compare V1 and V2** uses the same board and a fresh seeded bag for each result. **Inspect current hand** reports the requested witness goal, its status and check count. **Start board** and **Step** buttons replay intermediate boards. The lab preserves the existing bounded count of complete sequences and does not write normal saves.

For manual evaluation, play multiple fresh runs with the default weights and record first and later clear moves, missed opportunities, and whether the offered pieces still feel varied. Compare standard, default, and heavier packs on the same devices. Test all-clears with two or one slots remaining, simultaneous lines, interruption and reload, and offline play after switching caches. Actual iOS and Android timing and touch behavior remain unverified. Player behavior and uncensored long-run survival cannot be inferred from these short seeded simulations.
