# AlanBlox

A free, fair, mobile-first block puzzle game inspired by Block Blast.

**No ads. No microtransactions. Just gameplay.**

## About

AlanBlox aims to recreate the satisfying gameplay experience of modern block puzzle games without intrusive advertising, aggressive monetization or hidden player manipulation.

The project focuses on responsive controls, rewarding audiovisual feedback, colorful themes and a transparent gameplay system that rewards skill and strategic thinking.

## Features and roadmap

### Playable through Phase 3

- Classic 8×8 puzzle board.
- Three block pieces per round.
- Intuitive drag-and-drop controls.
- Row and column clears, including both in one move.
- Escalating multi-line scores and combos that allow up to two non-clearing moves.
- Full-board bonuses and six rotating color palettes.
- Game-over detection.
- Every new three-piece hand has a legal completion sequence when dealt.
- Persistent high scores.
- Automatic game progress saving.
- Tactile block pickup, projected line clears, animated scoring, and visual celebrations.

### Planned polish

- Escalating combo sound effects.
- Haptic feedback on supported devices.

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

- [ ] Original visual identity
- [x] Six original color palettes
- [x] Dynamic theme transitions
- [x] Full-board clear celebrations
- [ ] Menu design

### Phase 5 — Audio and Haptics

- [ ] Block placement sounds
- [ ] Line-clearing sounds
- [ ] Dynamic combo sounds
- [ ] Full-board clear sound effects
- [ ] Haptic feedback
- [ ] Audio and vibration settings

### Phase 6 — Release

- [ ] GitHub Pages deployment
- [ ] Android browser testing
- [ ] iOS browser testing
- [ ] Desktop browser testing
- [ ] Performance optimization
- [ ] Final gameplay polish

## Playing

Drag a piece from the tray to the board. On touchscreens the piece floats above your finger so you can see the target. You can also select a piece and tap its top-left target on the board. With a keyboard, activate a piece, use the arrow keys to move its preview, and press Enter or Space to place it. Escape cancels the selection.

The tray refills after all three pieces are placed. Each new hand can be completed in at least one placement sequence on the board at deal time. Your choices can still leave unplaceable pieces. The game ends if none of the revealed pieces fits, or if the dealer proves no new hand has a legal completion sequence. Restart resets the board, session score, combo, and palette to Mint, and keeps the best score.

### Scoring and combos

These are provisional AlanBlox rules. Scoring parity with Block Blast has not been independently verified.

- Each placement earns **1 point per occupied cell in the piece**, even if that cell clears immediately.
- Clearing **n** rows or columns together earns **10 × n + 5 × n × (n − 1) / 2** line points before the combo multiplier. One, two, three, and four lines are worth **10, 25, 45, and 70**. Rows and columns are identified before removal, and each shared cell is removed once.
- Each clearing placement advances the combo once, including moves that clear multiple lines, and refreshes its window to three placements. The first clear uses **×1**, and subsequent clearing moves use the new combo count as the multiplier. There is no gameplay cap.
- A valid placement without a clear uses one step of the window. A clear after one or two misses continues the combo. Three misses expire it, and the next clear starts again at ×1. Invalid or canceled moves, a new deal, elapsed time, and reloading do not consume the window.
- A move that leaves the board empty after line removal adds a flat **100 points** and advances the palette through **Mint → Tidal → Orchard → Dusk → Desert → Glacier → Mint**. The multiplier applies to line points only.

Tune the provisional constants in `js/scoring.js`. Scores are carried forward as earned. Saves keep the revealed pieces, proposal bag, score, best score, palette, combo count, and combo window. Phase 1 saves start with zero combo and Mint. An active Phase 2 combo starts with a fresh three-placement window because it had just cleared a line under the old rules. Existing revealed hands are kept, including hands dealt under the old rules.

### Solvable hand generation

1. As before, shuffle a bag with one copy of each of the **38 fixed orientations** using Fisher–Yates. Propose the next three pieces, crossing into a fresh bag as needed. A duplicate can occur across a bag boundary.
2. Try up to **12** candidates. For each, search every distinct ordering and legal position until a completion sequence is found or all possibilities are exhausted. The simulation uses precomputed placement masks and clears completed rows and columns together after each placement. It leaves the live board untouched.
3. Consume rejected proposals from the bag. If none works, search directly over legal placements of any of the 38 orientations, allowing duplicates at every step. The deterministic fallback tries larger shapes first and memoizes dead board states by placements remaining. It can prove failure only after exhausting all permitted sequences. Its returned order does not expose the sequence used to establish solvability.
4. Search runs in a Web Worker. After a ten-second deadline the deal stays pending, and **Retry deal** starts a fresh search with a 30-second deadline. Timing out or failing to start the worker does not count as game over. Reloading resumes a pending deal from the saved board and bag.

Filtering changes the distribution of revealed hands. The proposal bag still contains each orientation once per shuffle, but pieces that fit more boards survive filtering more often. Fallback may also repeat a shape. The board affects generation only through solvability. The generator uses no score, high score, session length, losses, player identity, engagement, or spending. Revealed pieces are never replaced, and the deal guarantees one solution, with other placements free to fail.

### Visual feedback

Timing defaults live in `js/motion.js`. Pickup and placement take 100 ms, invalid returns 180 ms, tray arrivals 220 ms with a 35 ms stagger, and clear waves 250 ms for one line or 350 ms for several. Floating scores last 600 ms, combo messages 750 ms, and the all-clear celebration 1,200 ms. Score counters take 300 ms, and palette changes take 650 ms. The combo card's three markers track the saved combo window.

The game commits each move and its score immediately. Visual effects can overlap and the particle pool is capped at 72 live particles. The system's reduced-motion setting suppresses moving effects and shows exact scores and palette changes immediately. Placement previews, the combo window, and the text notification for a full-board clear remain available.

## Running locally

From the repository root, serve the app with Python and open `http://localhost:8000/`:

```sh
python3 -m http.server 8000 --bind 127.0.0.1
```

Run the automated tests with Node.js 20 or newer. No dependency installation is needed.

```sh
npm test
node scripts/benchmark-hands.js
```

The benchmark checks 10,000 seeded deals using a separate array-based backtracking solver and adds 250 full-board tests for proven impossibility. It reports time by board scenario, candidate rejections, fallbacks, and per-orientation frequencies. Timings cover generation only, excluding worker startup and independent validation.

## Deploying to GitHub Pages

1. Once the reviewed changes are in the desired publishing branch, open **Settings → Pages** in GitHub.
2. Under **Build and deployment**, choose **Deploy from a branch**, select that branch and **/ (root)**, then save.
3. Open the HTTPS URL shown in Pages once the deployment succeeds. For the existing repository it is expected to be `https://bananami1kshake.github.io/AlanBlast/`.
4. Load the site online once and give the service worker time to cache the app. Use the browser's install command where supported or Safari's **Add to Home Screen** on iOS. Reload offline to check the deployment.

All app paths are relative, so the board and offline cache work at the project URL as well as on localhost. Increment the shell cache version in `sw.js` whenever changing a cached asset. Close open instances of the app to let an updated service worker take over.

## Development

AlanBlox is developed with the assistance of OpenAI Codex.

AI development agents should refer to `AGENTS.md` for project-specific requirements, technical constraints, gameplay principles and development guidelines.

## Project Status

Phases 1 through 3 are playable. Later phases focus on visual identity, audio, and haptics.

## Disclaimer

AlanBlox is an independent project inspired by the block puzzle genre. It is not affiliated with Block Blast or its developers. All code, branding, graphics and audio assets are intended to be original.
