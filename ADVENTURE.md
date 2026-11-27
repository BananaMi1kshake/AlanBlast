# AlanBlox Adventure

Adventure is a campaign of 16 original puzzles, with two levels in each of the eight existing material worlds. The opening levels introduce placements and gems. Later levels combine intersecting clears, ordered openings, limited placements, and combos that span multiple trays.

| Objective | Levels using it |
| --- | ---: |
| Collect gems | 13 |
| Reach a score | 8 |
| Clear rows | 6 |
| Reach a combo | 5 |
| Clear rows or columns | 4 |
| Clear the board | 4 |
| Clear columns | 2 |

Fifteen levels combine objectives, 13 have a placement limit, and four supply more than one tray. The shipped completion witnesses range from one to six placements.

## Gameplay and progression

Choose **Adventure** from the main menu to open world selection. The first level is available immediately. Completing a level unlocks the next level in campaign order, including the next world when appropriate. Completed levels stay available to replay. The menu offers **Resume** when the current Adventure level is still in progress.

Adventure uses the same board, shape footprints, input, line-clearing, provisional scoring, combo window, animations, and audio settings as Classic. Each level supplies fixed trays. You can use their pieces in any order. The next tray appears after all current pieces are spent. A placement may collect multiple gems by clearing their cells. A gem at an intersection counts once and does not change collision. Gem collection has its own sound and an animation toward the objective counter, with an immediate progress update in reduced-motion mode.

All targets must be met to win. A win on the final allowed placement takes precedence over running out of moves or pieces. A valid placement spends one move, and a canceled or invalid placement spends none. The run fails when the placement limit is reached, the fixed supply is exhausted, or no revealed piece fits, while objectives remain incomplete. Retry is immediate and unlimited. Levels have no timer. All-clears still award the shared bonus and trigger feedback. In Adventure the material and palette stay fixed to the level for the board, tray, drag, and effects. In Classic the original all-clear world rotation still applies.

## Architecture and saves

- `index.html` is the menu. `adventure.html` is world selection. `play.html` hosts both modes. Adventure links carry the mode and stable level ID in the URL.
- The shared placement engine is in `js/game.js`. The shared play controller in `js/main.js` uses the existing input, view, and feedback systems. `js/classic.js` owns the Classic session and receives deals from the existing worker. `js/adventure.js` owns finite trays, objectives, and terminal states. The local catalog is loaded by `js/campaign.js`.
- Adventure uses `alanblox.adventure.v1` with schema version 1. It stores completed level IDs and the current level ID with its valid placement transcript. Reload replays the transcript against the authored level, recovering the board, objectives, remaining tray and placements, score, combo window, and outcome. Unknown level IDs and invalid transcripts fall back to a fresh run of an available level. Keep released IDs, initial boards, and tray definitions stable to preserve in-progress saves.
- Classic keeps `alanblox.save.v1` and its existing backwards-compatible normalization for old scores, boards, revealed hands, bags, worlds, and combo windows. Shared preferences stay in `alanblox.settings.v1`. Changing modes does not write to the other mode's progress.
- The service worker precaches the routes, catalog, runtime modules, and core assets at the project-relative URL. The development tools use in-memory sessions and are excluded from the offline shell.

## Level format

Levels are local data in `adventure/levels.json`, in unlock order under `{ "version": 1, "levels": [...] }`. Adding a level uses the following fields.

| Field | Format |
| --- | --- |
| `id`, `name` | Unique stable ID using lowercase letters, digits, and hyphens, and the display name |
| `world`, `material`, `palette` | IDs from `js/themes.js`. Use the world's paired material and palette for a consistent campaign. |
| `difficulty` | `Intro`, `Strategy`, or `Expert` |
| `board` | Eight strings of eight characters. `.` is empty and `A`–`E` are occupied colors. Begin with no already-complete rows or columns. |
| `gems` | Unique zero-based occupied board indices, calculated as `y * 8 + x` |
| `hands` | One to 30 trays, each containing one to three oriented shape IDs from `js/pieces.js` |
| `objectives` | An array of `{ "type": "rows", "target": 1 }` entries with positive integer targets and no repeated objective type |
| `maxMoves` | Optional whole-number limit from 1 to 90 |
| `validation` | `{ "version": 1, "witness": [...] }` with consecutive `{ "slot": 0, "x": 6, "y": 5 }` moves. Slot and anchor coordinates are zero-based. |

Objective types are `score` (cumulative points, including bonuses), `gems` (unique gems collected), `rows` and `columns` (separate cumulative counts), `lines` (their sum), `allClear` (number of placements leaving an empty board after a clear), and `combo` (highest streak multiplier reached, even if the active streak later expires). For example, see `ocean-first-gap` in the catalog for a complete minimal definition.

## Authoring and validation

1. Run `python3 -m http.server 8000 --bind 127.0.0.1` from the repository root. Open `http://localhost:8000/tools/adventure-editor.html`.
2. Start from the seeded draft generator, import a level JSON file, or edit the definition. Paint board colors and gem positions, then edit the world, material, palette, trays, objectives, and placement limit in the JSON panel. Select **Apply JSON** to redraw the editor from the definition.
3. Choose **Validate**. The worker checks the schema, then replays a supplied witness or searches legal moves, simulating both row and column clears and every objective. It uses a bounded search of up to 40,000 placements. A timeout means the search was inconclusive. Fix the draft or provide a recorded witness and validate that path.
4. Inspect the reported moves. Select a witness step to replay it in the sandbox, or choose **Playtest** to start at move zero. Try legal paths that miss the intended goal as well as the witness.
5. Choose **Export JSON** after validation. Give a new level its own stable ID and add it in the appropriate world in the catalog. Run `node scripts/validate-adventure.js` and `npm test`. The campaign validator checks each supplied witness through the production engine and a separate array-based implementation of the rules. All 16 shipped witnesses passed both replays. A witness proves one completion path exists.

The editor is available on localhost or a loopback address. Its embedded game uses an in-memory sandbox, so editing, replaying, and playtesting cannot change the regular Classic best or Adventure progression.

## Manual playtesting

- Start Classic, make a placement, return to the menu, and play Adventure. Verify **Continue Classic** restores the board, score, and revealed pieces. Verify **Resume** returns to the same Adventure level, with its objectives and remaining placements.
- Use mouse, touch, and keyboard to try valid placements, reject a blocked target, and confirm that the preview matches the drop. Check a small phone viewport with the objective counters visible.
- On **Crosscut**, clear a row and a column together and check that the gem at the intersection is collected once. On **Open the Seam**, check the all-clear bonus and that the Yarn material remains in place.
- Try to run out of placements in **Two Tides**. Check the explanation, retry immediately, win, continue, return to world selection, and replay the completed level. Verify the next level becomes available and later ones remain locked.
- Toggle reduced motion, audio, and vibration through Settings. Reload and check the preferences in the other mode.
- Load once online under the GitHub Pages project path, allow the worker to install, then switch the browser offline. Reload the menu, world selection, and an Adventure level. Resume Classic and spend a tray to check the offline dealer.
- Run a witness in the editor, then recheck normal progression and the Classic high score.

The campaign is smaller than the 50-level target. Gems are authored on the starting board. Optional piece-embedded gems and level-specific cosmetic transitions are future extensions.

## Browser screenshots

| View | Capture |
| --- | --- |
| Main menu | [390 × 844](docs/adventure-screenshots/menu-mobile.webp), [1280 × 900](docs/adventure-screenshots/menu-desktop.webp) |
| World selection | [390 × 844](docs/adventure-screenshots/worlds-mobile.webp), [1280 × 900](docs/adventure-screenshots/worlds-desktop.webp) |
| Adventure gameplay | [390 × 844](docs/adventure-screenshots/adventure-gameplay-mobile.webp), [320 × 568](docs/adventure-screenshots/adventure-small-phone.webp) |
| Level complete | [390 × 844](docs/adventure-screenshots/level-complete-mobile.webp) |
| Level failure | [390 × 844](docs/adventure-screenshots/level-failure-mobile.webp) |

The screenshots use Chromium viewport emulation. Browser integration also covered touch and mouse drags, keyboard placement, the offline installability check, and the service-worker upgrade from Phase 5.6 with the Classic save intact. Physical iOS and Android testing remains open.
