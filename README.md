# AlanBlox

A free, fair, mobile-first block puzzle game inspired by Block Blast.

**No ads. No microtransactions. Just gameplay.**

## About

AlanBlox aims to recreate the satisfying gameplay experience of modern block puzzle games without intrusive advertising, aggressive monetization or hidden player manipulation.

The project focuses on responsive controls, rewarding audiovisual feedback, colorful themes and a transparent gameplay system that rewards skill and strategic thinking.

## Features and roadmap

### Playable through Phase 2

- Classic 8×8 puzzle board.
- Three block pieces per round.
- Intuitive drag-and-drop controls.
- Row and column clears, including both in one move.
- Escalating multi-line scores and consecutive-clear combos.
- Full-board bonuses and six rotating color palettes.
- Game-over detection.
- Fair and transparent piece generation.
- Persistent high scores.
- Automatic game progress saving.

### Planned polish

- Smooth block placement animations.
- Satisfying line-clearing effects.
- Dynamic particle effects.
- Animated score counters.
- Escalating combo sound effects.
- Haptic feedback on supported devices.
- Seamless color palette transitions.

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

### Phase 3 — Game Feel

- [ ] Block placement animations
- [ ] Line-clearing animations
- [ ] Particle effects
- [ ] Animated scoring
- [ ] Screen shake
- [ ] Celebration effects

### Phase 4 — Visual Design

- [ ] Original visual identity
- [x] Six original color palettes
- [ ] Dynamic theme transitions
- [ ] Full-board clear celebrations
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

The tray refills after all three pieces are placed. When none of the remaining pieces fits, the game ends. Restart resets the board, session score, combo, and palette to Mint, and keeps the best score on that browser.

### Scoring and combos

- Every accepted placement earns **1 point per block**. Each row or column completed by that move counts as one line. All completed lines are identified before removing any blocks, and a shared cell is removed once.
- Clearing **n** lines in one move earns **10 × n + 5 × n × (n − 1) / 2** line points. For one, two, three, and four lines, that is **10, 25, 45, and 70** before the combo multiplier.
- Each accepted move that clears one or more lines increments the combo by one. The first clear uses **×1**, then the multiplier rises with the combo up to **×5**. The combo count can keep growing. The multiplier applies to all line points from the move, including simultaneous-clear rewards.
- An accepted placement that clears no lines resets the combo to zero. Invalid or canceled moves, time between moves, dealing a new hand, and reloading leave it intact.
- If a placement leaves the board entirely empty after line removal, it earns a flat **100-point bonus** and advances the palette through **Mint → Tidal → Orchard → Dusk → Desert → Glacier → Mint**. The combo multiplier applies only to line points, so the block points and full-board bonus stay fixed.

The default scoring values live in `js/scoring.js`. A save from Phase 1 keeps its board, score, best score, remaining pieces, and undealt bag. It starts with combo zero and the Mint palette. Existing scores are carried forward as earned.

### Piece selection

Each fresh bag contains one copy of every one of the 38 oriented templates in `js/game.js`. Phase 2 adds both five-cell bars, both 2×3 rectangles, eight four-cell elbows, and a cross while preserving existing shape IDs. The game shuffles the bag with Fisher–Yates, choosing a random index from 0 through the current index at each step using the browser's `Math.random()`.

The game deals three consecutive templates at a time. If fewer than three remain, it deals those first and finishes the hand from a freshly shuffled bag. An orientation can repeat across that boundary. Shapes have fixed orientations, and equal representation applies per orientation. Families with more orientations consequently appear more often. A restored Phase 1 bag finishes in its original order before the expanded catalog takes effect.

The draw uses only the undealt bag and randomness. Board position, score, playtime, spending, and player identity do not influence it. All pieces fit an empty board, and a later piece or hand can be blocked by the current board. There are no rescue rerolls. The undealt bag order is saved so reloading preserves it.

## Running locally

From the repository root, serve the app with Python and open `http://localhost:8000/`:

```sh
python3 -m http.server 8000 --bind 127.0.0.1
```

Run the automated tests with Node.js 20 or newer. No dependency installation is needed.

```sh
npm test
```

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

Phases 1 and 2 are playable. Later phases focus on game feel and audiovisual polish.

## Disclaimer

AlanBlox is an independent project inspired by the block puzzle genre. It is not affiliated with Block Blast or its developers. All code, branding, graphics and audio assets are intended to be original.
