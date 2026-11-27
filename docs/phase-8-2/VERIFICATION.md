# Phase 8.2 verification

The release candidate is **0.8.0-rc.3**. The baseline is the approved `alanblox-phase-8-1` tip at `7962af3`. [Screenshot observations and design decisions](VISUAL.md) · [Before and after](SCREENS.md)

## Touch and appearance

The pressed piece responds immediately with opacity feedback. The floating view follows every pointer movement directly. A 44 ms ease-out enlarges and lifts it from the tray, with most of the change early in the pickup. The logical preview uses the full-size origin from the first drag frame. Release recomputes that anchor from the latest pointer position, independently of cosmetic progress. Touch starts after 2 CSS pixels, and clearance remains about 1.15 board-cell pitches or the available safe-bottom room. Cell marks show valid, colliding, and clearing placements. Tap, mouse, keyboard, and cancellation continue to use the same rules.

The Classic toolbar opens a compact material dialog. Next cycles through discovered materials and the currently equipped material. Closing or pressing Escape discards the candidate. Apply changes the current run's saved appearance. Applying a material leaves the revealed hand, board, score, combo, dealer bag, and future-run preferences intact. An automatic run changes appearance on its next all-clear using the existing ordered or shuffled rotation. A fixed run keeps its selection until restart. The collection remains available separately. Adventure, Daily, and tutorial keep their authored visuals.

## Chromium measurement

Linux Chromium 156 emulated a 390×844 mobile viewport at DPR 2. The two builds used the same stored score, board and hand. Startup, warm menu, navigation and popup values are medians of three samples per setting. Startup uses the timestamp when the splash releases the menu. Warm menu measures elapsed navigation time to the restored Classic button. Gameplay transition measures the captured click event through the restored score update. Browser-side DOM timestamps are recorded independently of the test runner’s polling. Popup timings measure the open call through the next animation frame and then animation completion. Drag data comes from one 168-move touch trace per build and setting. The device and throttling are browser emulation.

| Measure | rc.2 at 1× | rc.3 at 1× | rc.2 at 4× | rc.3 at 4× |
| --- | ---: | ---: | ---: | ---: |
| Cold menu ready (ms) | 984 | 885 | 1,185 | 1,079 |
| Warm menu ready (ms) | 58 | 51 | 130 | 131 |
| Continue Classic to restored score (ms) | 78 | 75 | 302 | 260 |
| Settings next frame / fully open (ms) | 9 / 244 | 8 / 173 | 34 / 287 | 40 / 204 |
| Material picker next frame / fully open (ms) | — | 11 / 145 | — | 22 / 139 |
| Drag frame median / p95 (ms) | 16.7 / 16.7 | 16.7 / 16.7 | 16.7 / 16.7 | 16.7 / 16.7 |
| Pointer-handler p95 (ms) | 0.3 | 0.3 | 1.3 | 1.2 |
| Bounding rectangle reads during trace | 2 | 2 | 2 | 2 |

Drag pacing held steady. Settings settled faster, with an additional 6 ms to its first sampled frame at 4×. The throttled Classic navigation sample reached the restored score 42 ms sooner. The animation targets are 320 ms for the studio, 420 ms for the game, 145 ms for opening Settings, and 110 ms for opening the material dialog. Startup keeps preparing the menu while the animation runs. Reduced motion skips those animations. Both drag traces used two geometry reads per session. The local gameplay lab can sample longer traces without sending data anywhere. [Lab and tuning controls](../phase-8-1/INPUT.md#input-tuning-lab)

## Regression coverage and release gates

- `npm run verify:release` runs all 221 Node tests, independently replays 48 Adventure witnesses, and validates 10,000 solvable Classic hands. This run returned zero invalid hands and zero timeouts. It also checked 250 structurally impossible fixtures.
- `CHROMIUM_NO_SANDBOX=1 npm run verify:input` exercises touch, mouse, keyboard, exact fits, fast release, cancellation, multi-touch, standalone-style viewport, scroll behavior, offline routes, pagination and unsupported haptics. It also cycles, cancels, applies, and reloads a material in Classic while checking the saved game data.
- The viewport sweep covers 320×448, 320×568, 375×667, 390×844, 430×932, 667×320, 768×1024 and 1280×900. It checks menu, all gameplay modes, Adventure lists, Daily entry, collection, statistics, achievements, both popups, and Settings' internal scroll.
- Chromium upgraded an active Phase 8.1 install from shell 14 to 15, preserved Classic, Adventure, Daily and preference records, and opened those routes and the Classic material picker offline after the old client left.

Exact reference-game parity remains unverified. Physical iPhone feel, frame pacing with Safari's toolbar changing, system gestures, hardware vibration and native installs still need the device check. On iPhone, compare pickup from the bottom tray, fast release during enlargement, and both bottom board corners. Open and dismiss both dialogs during the same run. The settings manager keeps the vibration preference and shows when the browser does not support the Web Vibration API. [Physical-device checklist](../phase-8-1/INPUT.md#verification-and-physical-retest)
