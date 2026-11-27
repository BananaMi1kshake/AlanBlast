# AlanBlox

A free, fair, mobile-first block puzzle game inspired by Block Blast.

**No ads. No microtransactions. Just gameplay.**

## About

AlanBlox aims to recreate the satisfying gameplay experience of modern block puzzle games without intrusive advertising, aggressive monetization or hidden player manipulation.

The project focuses on responsive controls, rewarding audiovisual feedback, colorful themes and a transparent gameplay system that rewards skill and strategic thinking.

## Features and roadmap

### Playable in Phase 8

- Shared 8×8 puzzle board with endless Classic and a 48-level Adventure campaign.
- Offline Daily Challenges, an interactive tutorial, a library of 24 materials, local statistics, and achievements.
- Portable local save backups and opt-in installation guidance.
- Main menu with separate Classic and Adventure resume options.
- Adventure gem, score, line, combo, and all-clear objectives, with sequential world unlocks.
- Three block pieces per round.
- Intuitive drag-and-drop controls.
- Row and column clears, including both in one move.
- Escalating multi-line scores and combos that allow up to two non-clearing moves.
- Full-board bonuses and eight rotating material worlds.
- Game-over detection.
- Every new three-piece hand has a legal completion sequence when dealt.
- Persistent high scores.
- Automatic game progress saving.
- Tactile block pickup, projected line clears, animated scoring, and visual celebrations.
- Original procedural sound effects, musical combos, and vibration on supported devices.

### Accessibility

- Mobile-first responsive design.
- Touch and mouse support.
- Installable Progressive Web App (PWA).
- Offline gameplay.
- No account required.
- No downloads required to play in a browser.

## Our Philosophy

AlanBlox is built around five fundamental principles:

1. **Fairness:** Gameplay outcomes are never influenced by monetization or advertising engagement.
2. **Transparency:** Gameplay rules and piece-generation algorithms are documented and publicly accessible.
3. **Privacy:** No tracking, analytics or personal data collection.
4. **Accessibility:** Free to play without advertisements, purchases or subscriptions.
5. **Quality:** Prioritize game feel, responsiveness and polish.

## Technology Stack

- HTML5
- CSS3
- Vanilla JavaScript
- Web Audio API
- Vibration API, where supported
- Service Workers
- Web App Manifest
- Local Storage
- GitHub Pages

## Classic audit and development tools

See the [Classic parity and scoring audit](CLASSIC_PARITY.md) for evidence, the solver audit, simulation results, and the original Adventure architecture proposal. Run `node scripts/simulate-classic.js` for the full seeded strategy data. The [materials guide](MATERIALS.md) documents the eight worlds, texture and audio assets, isolated gameplay lab, and preview instructions.

## Development Roadmap

### Phase 1 — Core Gameplay

- [x] Responsive 8×8 board and 25 oriented block templates
- [x] Shuffled-bag piece generation and three-piece hands
- [x] Mouse and touch drag-and-drop, tap-to-place, and keyboard controls
- [x] Valid and invalid placement previews
- [x] Simultaneous line clearing, basic scoring, and game-over detection
- [x] Restart, progress restoration, and persistent high scores
- [x] Installable app shell with offline support
- [x] Automated gameplay and storage tests

### Phase 2 — Gameplay Balancing

- [x] Configurable block, line, simultaneous-clear, and combo scoring
- [x] Consecutive-clear streak with visible combo count
- [x] Full-board clear bonuses and palette changes
- [x] Expanded shape library and statistical shuffle-bag tests
- [x] Phase 1 save migration

### Phase 2.5 — Scoring and solvable hands

- [x] Three-placement combo window and uncapped combo multiplier
- [x] Board-aware hand solver, bounded proposals, and exhaustive fallback
- [x] Offline worker, save migration, and reproducible reference-solver benchmark

### Phase 3 — Game Feel

- [x] Block pickup, return, tray refill, and placement animations
- [x] Directional line clears and color-matched particles
- [x] Score counters, floating points, and record feedback
- [ ] Screen shake
- [x] Combo milestones and full-board celebrations

### Phase 4 — Visual Design

- [x] Original visual identity and a centered mobile-first gameplay screen
- [x] Six original color palettes
- [x] Dynamic theme transitions
- [x] Full-board clear celebrations
- [x] Settings with persistent preferences, restart confirmation, and a game-over summary

### Phase 5 — Audio and Haptics

- [x] Block placement sounds
- [x] Line-clearing sounds
- [x] Dynamic combo sounds
- [x] Full-board clear sound effects
- [x] Haptic feedback
- [x] Audio and vibration settings

### Phase 5.5 — Classic audit and materials

- [x] Classic scoring and fairness audit
- [x] Reproducible gameplay simulation and isolated gameplay lab
- [x] Eight material worlds with six independently configurable palettes

### Phase 5.6 — All-clear opportunities

- [x] Weighted, solvability-preserving dealer objectives
- [x] Seeded V1/V2 comparisons and intermediate witness replay
- [x] Independent solver benchmark and balance report

### Phase 6 — Adventure

- [x] Mode selection, shared gameplay, and independent saves
- [x] Sixteen independently validated levels across eight material worlds
- [x] Gem collection, objective progress, replay, and level editor
- [x] Classic cleanup experiment in the gameplay laboratory

### Phase 7 — Release candidate

- [x] Developer-provided PWA icons and install guidance
- [x] Second Adventure tour with 32 independently validated puzzles
- [x] Material discovery, appearance preferences, local statistics, and achievements
- [x] Verified UTC Daily Challenges and tutorial
- [x] Versioned backup export, validated import, and confirmed reset

See the [Phase 7 guide](PHASE_7.md) for rules, backup format, screenshots, and the release-candidate checklist.

### Phase 8 — Visual release candidate

- [x] Alan Studio and AlanBlox startup and a mode-first menu
- [x] Twenty-four distinct surfaces and a separate cosmetic shuffle
- [x] Save recovery, offline upgrade checks, and visual preview tools
- [x] Portable backups and release verification

See [release candidate 0.8.0-rc.1](RELEASE_CANDIDATE.md) for the visual review, screenshots, deployment steps, and device checklist.

### Release testing

- [ ] GitHub Pages deployment
- [ ] Android browser testing
- [ ] iOS browser testing
- [ ] Desktop browser testing
- [ ] Performance optimization
- [ ] Final gameplay polish

## Playing

Drag a piece from the tray to the board. On touchscreens the piece floats above your finger so you can see the target. You can also select a piece and tap its top-left target on the board. With a keyboard, activate a piece, use the arrow keys to move its preview, and press Enter or Space to place it. Escape cancels the selection.

**Classic.** The tray refills after all three pieces are placed. Each new hand can be completed in at least one placement sequence on the board at deal time. Your choices can still leave unplaceable pieces. The game ends if none of the revealed pieces fits, or if the dealer proves no new hand has a legal completion sequence. Restart resets the board, session score, combo, and palette to Ocean, and keeps the best score.

**Adventure.** Choose a world and complete its objectives using a fixed set of trays. Some levels limit placements. Completion unlocks the next level and leaves earlier levels available for replay. See the [Adventure guide](ADVENTURE.md) for the rules, level format, editor, validation, and playtesting checklist.

### Scoring and combos

These are provisional AlanBlox rules. Scoring parity with Block Blast has not been independently verified.

- Each placement earns **1 point per occupied cell in the piece**, even if that cell clears immediately.
- Clearing **n** rows or columns together earns **10 × n + 5 × n × (n − 1) / 2** line points before the combo multiplier. One, two, three, and four lines are worth **10, 25, 45, and 70**. Rows and columns are identified before removal, and each shared cell is removed once.
- Each clearing placement advances the combo once, including moves that clear multiple lines, and refreshes its window to three placements. The first clear uses **×1**, and subsequent clearing moves use the new combo count as the multiplier. There is no gameplay cap.
- A valid placement without a clear uses one step of the window. A clear after one or two misses continues the combo. Three misses expire it, and the next clear starts again at ×1. Invalid or canceled moves, a new deal, elapsed time, and reloading do not consume the window.
- A move that leaves the board empty after line removal adds a flat **100 points** and, in Classic, advances the palette through **Ocean → Sunset Loom → Forest Workshop → Midnight Geode → Candy Bounce → Glacier → Moonlit Kiln → Sunset Bakery → Ocean**. The multiplier applies to line points only.

Tune the provisional constants in `js/scoring.js`. Scores are carried forward as earned. Saves keep the revealed pieces, proposal bag, score, best score, world, material, combo count, and combo window. Phase 1 saves start with zero combo and the first palette. An active Phase 2 combo starts with a fresh three-placement window because it had just cleared a line under the old rules. Existing revealed hands are kept, including hands dealt under the old rules.

### Solvable hand generation

Each newly revealed tray has a legal completion sequence. The dealer reserves a solvable shuffle-bag hand, then may search for a line clear, net cleanup, or full-board clear within that tray. The default request mix is 40% Standard, 30% line clear, 20% cleanup, and 10% all-clear. A missed objective returns the reserved hand. An all-clear may occur before the tray is spent, and no piece is changed after it is revealed.

The worker receives only the board and remaining bag. A base timeout leaves the deal pending and can be retried. The [V2 generation report](GENERATION_V2.md) documents the algorithms, seeded baseline, balance comparison, and playtesting targets.

### Visual feedback

Timing defaults live in `js/motion.js`. Pickup and placement take 100 ms, invalid returns 180 ms, tray arrivals 220 ms with a 35 ms stagger, and clear waves 250 ms for one line or 350 ms for several. Floating scores last 600 ms, combo messages 750 ms, and the all-clear celebration 1,200 ms. Score counters take 300 ms, and palette changes take 650 ms. The combo card's three markers track the saved combo window.

The game commits each move and its score immediately. Visual effects can overlap and the particle pool is capped at 72 live particles. The in-game or system reduced-motion setting suppresses moving effects and shows exact scores and palette changes immediately. Placement previews, the combo window, and the text notification for a full-board clear remain available.

### Placement and settings

The game reads board origin, spacing, and cell size from the layout grid. Placement pop animations can change a cell's visual bounds, so those bounds are excluded from pointer geometry. The floating piece, projected cells, and final placement snap to the same grid anchor. Preview, gameplay validation, and solver masks use the same shape footprint. The touch lift is reduced when the visible viewport leaves too little space beneath the board.

The settings gear opens a modal with Resume, Restart, How to Play, and About. Restart asks for confirmation and keeps the personal best. The reduced-motion switch applies immediately and respects the operating-system preference. Sound, volume, and vibration preferences apply immediately and are saved locally. Theme saves retain their original palette positions and gain a material when loaded.

### Audio development

AlanBlox uses original procedural audio and plays a musical cue when the combo advances. The game activates audio after a browser-approved interaction. On supported browsers it can also vibrate for placement, clears, and celebrations. See the [audio guide](audio/README.md) for event names, replacement file formats, offline caching, and the localhost sound preview tool.

## Running locally

From the repository root, serve the app with Python and open `http://localhost:8000/`:

```sh
python3 -m http.server 8000 --bind 127.0.0.1
```

Run the automated tests with Node.js 20 or newer. No dependency installation is needed.

```sh
npm run verify:release
node scripts/simulate-generation.js v2
node scripts/validate-adventure.js
```

The benchmark checks 10,000 seeded deals using a separate array-based backtracking solver and adds 250 full-board tests for proven impossibility. It reports time by board scenario, candidate rejections, fallbacks, and per-orientation frequencies. Timings cover generation only, excluding worker startup and independent validation.

### Manual playtesting

1. Run the local server and open the game. Drag long horizontal and vertical bars into tight gaps at board edges. Check that the translucent cells match the drop, then try a blocked target and confirm that the piece returns to the same slot.
2. Repeat on a narrow phone viewport, a larger phone, and a desktop window. Pick up a piece immediately after a placement animation and resize during a drag. Check that the drag cancels cleanly on resize and that the next drag aligns.
3. Clear an intersecting row and column and finish a full-board clear. Check the combo markers, final score, theme change, and remaining tray pieces.
4. Open Settings during a run. Toggle preferences, cancel a restart, resume, and reload. Confirm that preferences, board, remaining pieces, and score are restored. Then confirm a restart and verify that the personal best is retained.
5. Play to game over and confirm that the summary shows the final score and record. Load once online, switch DevTools to offline, reload, and place the three pieces to verify that the next deal works offline.

## Deploying to GitHub Pages

1. Once the reviewed changes are in the desired publishing branch, open **Settings → Pages** in GitHub.
2. Under **Build and deployment**, choose **Deploy from a branch**, select that branch and **/ (root)**, then save.
3. Open the HTTPS URL shown in Pages once the deployment succeeds. For the existing repository it is expected to be `https://bananami1kshake.github.io/AlanBlast/`.
4. Load the site online once and give the service worker time to cache the app. Use **Settings → Install AlanBlox** to open the native prompt or view the browser’s installation instructions. Reload offline to check the deployment.

All app paths are relative, so the board and offline cache work at the project URL as well as on localhost. Increment the shell cache version in `sw.js` whenever changing a cached asset. Close open instances of the app to let an updated service worker take over.

## Development

AlanBlox is developed with the assistance of OpenAI Codex.

AI development agents should refer to `AGENTS.md` for project-specific requirements, technical constraints, gameplay principles and development guidelines.

## Project Status

Classic, the 48-level Adventure campaign, and Daily Challenge are playable in release candidate 0.8.0-rc.1. See the [release notes](RELEASE_CANDIDATE.md) for verification and open device testing.

## Disclaimer

AlanBlox is an independent project inspired by the block puzzle genre. It is not affiliated with Block Blast or its developers. All code, branding, graphics and audio assets are intended to be original.
