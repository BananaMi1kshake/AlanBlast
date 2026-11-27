# Classic mode audit

## Evidence and scope

This audit verifies AlanBlox behavior with source inspection, deterministic tests, a separate reference solver, seeded strategy simulations, and Chromium. It establishes no verified match to a specific Block Blast build. The reference app was not installed or recorded in this environment. Requests for the official listings and product site were denied by the environment's network proxy. The links below identify reference sources for manual testing. They do not substantiate a row of the audit. [App Store](https://apps.apple.com/us/app/block-blast/id1617391485) · [Google Play](https://play.google.com/store/apps/details?id=com.block.juggle) · [Block Blast](https://blockblast.com/)

“Approximate match” describes a broad interaction or presentation goal based on the project brief. “Requires manual verification” marks version-dependent or quantitative behavior. “Intentional difference” marks a documented AlanBlox decision. A **Verified match** would require a recorded side-by-side check. A **Missing** entry would require a verified reference feature absent from AlanBlox. Neither label is warranted by the available evidence. The yarn description is from the project brief. Unofficial reports and guesses about hidden difficulty or scoring were excluded.

| Feature | Classification | AlanBlox behavior and evidence needed |
|---|---|---|
| Shape library | Requires manual verification | 38 fixed orientations with stable IDs. Inventory and capture the reference orientations over multiple runs. |
| Starting board configurations | Intentional difference | A new AlanBlox run opens on an empty board in Ocean. Record reference starts after first launch, after restart, and in later runs. |
| Piece distribution | Intentional difference | 38-orientation shuffle proposals, legal sequence filtering, exhaustive deterministic fallback. Reference output samples alone cannot establish its internal algorithm. |
| Block color assignment | Intentional difference | Color role comes from the shape template and the palette supplies its value. Record whether the reference recolors the same orientation within a world. |
| Scoring | Requires manual verification | The exact configurable formula is below. Capture before and after scores for identical board states and moves. |
| Simultaneous line clears | Approximate match | Detect every filled row and column on the placed board and remove their union once. Verify reference intersection handling with a captured move. |
| Combo multipliers | Requires manual verification | One increment per clearing placement and an uncapped line-score multiplier. Capture increments at repeated clear counts and after long streaks. |
| Combo expiration | Requires manual verification | Third consecutive non-clear expires the combo. Capture clears after zero, one, two, and three intervening non-clears. |
| Full-board clear bonus | Requires manual verification | Flat 100, added after line points are multiplied. Isolate the bonus from placement and line totals in the reference. |
| Full-board clear theme transitions | Approximate match | A clear advances once to a different material and palette and preserves unplayed slots. Record the trigger and tray behavior in the reference. |
| Dragging responsiveness | Requires manual verification | Pointer capture, viewport-aware touch lift, and a shared snap anchor. Compare on the same physical phone and orientation at a fixed capture rate. |
| Placement previews | Approximate match | Valid cells, projected clears, collision warning, and an invalid return animation. Capture reference snapping at boundaries and collisions. |
| Animations | Approximate match | Pickup, return, placement, clear, tray refill, and score timing are configurable. Compare durations and interruption handling frame by frame. |
| Particle effects | Intentional difference | Original material-specific shapes and motion, with a cap of 72. |
| Sound effects | Intentional difference | Original procedural synthesis with optional local replacements. |
| Musical combo progression | Intentional difference | C-major pentatonic voicing with layers at combos 4 and 7 and a pitch plateau at 9. |
| Game-over behavior | Approximate match | Ends when no remaining piece fits. A proven impossible deal is distinct from a timeout. No revives or offers. |
| High-score celebrations | Requires manual verification | Best-score pulse, one record audio cue per run when appropriate, and a persistent record badge in the final summary. |
| Restart behavior | Approximate match | Settings restart requests confirmation, and Play Again starts a new run while retaining the best. |
| Save and restore | Requires manual verification | Local board, revealed tray, bag, score, best, combo, world, and material persist. Test reference reload, process termination, and background restore separately. |
| Settings | Intentional difference | Local sound, volume, vibration, and reduced-motion controls. |
| Mobile layout | Approximate match | Centered score, single square board, three slots, safe areas, and no monetization surfaces. Chromium emulation covers structure only. |
| Block textures | Intentional difference | Original knit stitches, wood grain, ice cracks, and wafer textures plus reusable CSS surfaces. |
| Block materials | Intentional difference | Classic, Yarn, Jelly, Wood, Crystal, Ceramic, Ice, and Confectionery. The brief describes yarn-like reference surfaces. Its texture and trigger remain unverified. |
| Surface highlights and shading | Intentional difference | Configured glaze, specular reflection, facet, bevel, and edge shadows with the same geometry. |
| Block edges | Intentional difference | The corner silhouette and relief vary by material without changing the footprint. |
| Material effects | Intentional difference | Material-specific impact transforms, dissolve, particle silhouettes and spread, and all-clear wave finish. |
| Theme backgrounds | Intentional difference | Palette gradients with distinct material overlays and a composited scene crossfade. |
| Board appearance | Intentional difference | Independent palette colors, material frame treatment, and empty-cell recesses. |
| Full-board celebrations | Approximate match | An animated all-clear, own flourish, bonus, and visual transition. Reference sequence and timing remain unverified. |
| Theme transition sequence | Intentional difference | Fixed eight-world loop, with no consecutive material repeats. |
| Theme variety | Requires manual verification | Eight AlanBlox worlds and six independent palettes. No reference theme count or unlock table has been verified. |
| Theme progression behavior | Intentional difference | One step at each full clear. Starts in Ocean on restart and restores the saved world and material on reload. |

## Exact scoring

Let **b** be placed cells, **n** the rows plus columns completed together, and **c** the combo after the move. Each accepted move earns **b + (10n + 5n(n−1)/2) × c + bonus**. Bonus is **100** exactly when the post-clear board is empty. A clearing move increments the prior combo and refreshes its window to three. Each accepted non-clear spends one window step, with the third miss resetting the combo to zero. Invalid or canceled actions do not spend the window. A single clear without an active combo adds 10 line points. The settings live in `js/scoring.js`.

| Example | Award |
|---|---:|
| Five cells, no clear | 5 |
| Three cells, one line, fresh combo | 3 + 10 × 1 = 13 |
| Two cells, two lines, previous combo 3 with one step left, full-board clear | 2 + 25 × 4 + 100 = 202 |
| Five cells, four lines, previous combo 6 | 5 + 70 × 7 = 495 |

The examples are assertions in [scoring.test.js](tests/scoring.test.js). No independently verified discrepancy supports changing the values. For manual comparison, log the reference build, OS, before and after scores, the shape and cell count, exact filled rows and columns, prior combo, misses since last clear, and whether the board emptied. Use several repeats per fixture and separate any one-time bonuses.

## Dealer and difficulty

The live solver precomputes bitmasks using the same placement footprints as the game. It tries every distinct remaining shape order and every fitting anchor. Duplicate shapes share equivalent branches. After each hypothetical move the solver removes the union of completed rows and columns, including their intersections. A 12-candidate proposal limit leads to deterministic search over the entire permitted library, duplicates included. This fallback can prove impossibility only after exhausting the search space. A worker deadline or operation budget yields **timeout**, with no revealed hand. A restart cancels stale worker work. Once dealt, the hand stays fixed until used or the run ends. Hands restored from versions that predate the guarantee can still contain those versions' revealed pieces.

The [independent benchmark](scripts/benchmark-hands.js) ran 10,250 cases. All **10,000 generated hands** had a completion sequence according to a separate array-based reference solver, and 250 artificial full boards had no available placement. Results included 14,012 rejected proposals, 688 fallback searches, and zero impossible hands returned or timeouts. This benchmark deliberately over-samples adversarial layouts.

### Seeded strategy simulation

Run `node scripts/simulate-classic.js` for the full JSON, including orientation counts, counts by size, occupancy, duplicate hands, rejection/fallback totals, timing, survival, and sampled sequence counts. It simulates **192 sessions**, 48 per strategy, with a **150-move cap**. The dealer is fed a seeded random stream for each run and uses only the board and bag. Random samples legal anchors uniformly after collapsing equivalent slots. Greedy prioritizes immediate line count. Combo-focused ranks immediate score and setup, then looks one move ahead among its eight best candidates. Solver-informed ranks immediate clears and selects a move that preserves at least one completion for the rest of the tray.

| Strategy | Score p10 / median / p90 | Median moves | Reached 30 / 60 / 150 moves |
|---|---:|---:|---:|
| Random | 34 / 58 / 133 | 11 | 0 / 0 / 0 |
| Greedy | 163 / 549 / 1,186 | 35 | 32 / 8 / 0 |
| Combo-focused | 979 / 5,045 / 7,835 | 149 | 47 / 41 / 24 |
| Solver-informed | 3,171 / 4,367 / 5,876 | 150 | 48 / 48 / 48 |

| Occupied cells at deal | Hands | Rejected / proposals | Fallbacks | Singles | Pieces of 5+ cells | Mean generation |
|---|---:|---:|---:|---:|---:|---:|
| 0–15 | 609 | 0 / 609 | 0 | 1.3% | 28.6% | 0.019 ms |
| 16–31 | 2,540 | 163 / 2,703 | 0 | 2.7% | 24.1% | 0.022 ms |
| 32–47 | 2,011 | 1,370 / 3,376 | 5 | 4.3% | 20.0% | 0.035 ms |
| 48–64 | 23 | 84 / 105 | 2 | 7.2% | 13.0% | 0.044 ms |

There were 5,183 session deals, including 13 with repeated shapes and 7 fallbacks. The overall candidate rejection rate was 23.8%. Sequence counts sampled 16 hands per occupancy band, capped at 128 complete sequences and 12,000 visited moves. Swapping identical slots does not count as a different sequence. Of 64 samples, 29 had exact counts and the rest reported lower bounds. In the densest sample, at least one hand had exactly one solution. Timings are Node wall-clock generation only, with no worker startup or hardware comparison. Denser boards are underrepresented in the live-session sample, and capped session lengths are right-censored. Strategies are heuristics rather than models of actual players.

The sample supports meaningful differences in skill and scoring. Fallback was rare in these trajectories, and even the densest band still contained pieces of five or more cells. Perfect within-hand selection sustained all solver-informed runs to the cap, which follows from the solvability guarantee. It is a test of the dealer, not a typical player result. Retain the policy. If more difficulty evidence is needed, compare larger seeded samples, collect opt-in manual playtest notes, and distinguish finding one path from finding a high-scoring path.

## Manual playtesting before Adventure

1. Record the reference app version and try the scoring fixtures above. Note piece starts, color assignments and sizes, combo expiry, and all-clear behavior independently.
2. In AlanBlox, play a normal run and use the lab for both five-cell bars at corners and tight edges. Test mouse, keyboard, physical touch, rapid placements, an interrupted drag, and a resized viewport.
3. Clear one line, an intersection, and the entire board. Confirm one effect per intersecting cell, the exact score, remaining tray slots, a world change, and reduced-motion behavior.
4. Install from a served HTTPS deployment on an Android device and an iOS device. Reload offline, background and return, toggle preferences, restart, and compare the restored run and record.
5. Upgrade from Phase 5 with an old game open. Close older tabs to activate the new cache and verify that saves, local audio files, and material textures work offline. Check sound and physically supported vibration on each device.

## Adventure architecture recommendation

Keep `game.js`, `scoring.js`, and solver footprints shared as pure rules. Put authored goals, starting layouts, and fixed or seeded trays into versioned level records with deterministic validators. Validate each authored puzzle offline with a witness and keep objective logic and persistence in mode-specific modules and save keys. Reuse the board, input, and material renderer with a mode adapter. Preserve Classic's save, score, and dealer independently.
