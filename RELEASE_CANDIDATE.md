# AlanBlox 0.8.0-rc.2

Phase 8.1 builds on the Phase 8 release candidate and adds [stationary screens and continuous dragging](docs/phase-8-1/INPUT.md). It includes all 48 Adventure levels, the original 11 Daily puzzles with their date mapping, and the four tutorial lessons. Classic still uses Generation V2 and the existing placement geometry, scoring, combo, and all-clear rules.

## Branding and startup

The four referenced images were visible inline. Their source files were unavailable in the workspace. The developer authorized generated replacements. The replacement art follows the supplied direction and is recorded separately from the Phase 7 launcher files. The native launcher remains managed by the operating system. The custom presentation plays Alan Studio for 360 ms then AlanBlox for 500 ms. Reduced motion, repeat navigation in the same tab, and backgrounding suppress or dismiss it. The menu is prepared in parallel, and the waiting label is tied to actual initialization.

| Asset | Generated source | Cached version |
| --- | ---: | ---: |
| Studio logo | 952,042 bytes | 155,434 bytes, lossless WebP |
| Game logo | 1,151,345 bytes | 213,342 bytes, lossless WebP |
| Portrait backdrop | 1,557,158 bytes | 47,972 bytes, optimized WebP |
| App icon master | 1,483,574 bytes | Preview only. No manifest or cache change. |

The manifest ID, scope, start URL, standalone display, relative project URLs, and six active Phase 7 PNGs are preserved. The current artwork extends past the central 80% safe-zone circle, so tight masks can crop decorative perimeter artwork. The proposed separate set gives the central mark additional clearance. [Generated artwork and sizing](assets/branding/README.md) · [Launcher crop comparison](docs/phase-8-screenshots/launcher-icons.webp)

## Release audit

| Priority | Finding | Status |
| --- | --- | --- |
| P1 | Concurrent gameplay tabs could save the same stale board and count duplicated rewards. | Fixed with an active gameplay write lock on supporting browsers and a save comparison before actions. A stale run asks for a reload. |
| P1 | A quota write failure could persist one part of an action without its matching session or records. | Related writes are staged together. On a write error the app restores prior values, keeps the current run in memory, and offers recovery through export. |
| P2 | New textures could be omitted from an otherwise installed shell. | All gameplay textures and runtime startup art are part of the mandatory precache. A failed install leaves the existing worker active. |
| P2 | The main menu buried mode actions in framed panels. | Two direct primary actions with visible resume and progress information, plus compact secondary navigation. |
| P2 | Classic all-clears are infrequent in seeded samples. | Retained as a known balancing limitation. The new cosmetic unlocks use other existing achievements and play. |
| P1 | Physical iOS testing reported page scrolling and unnatural dragging. | Viewport lock and continuous drag are verified in Chromium. Physical iOS and Android retests are still open. [Touch controls and retest](docs/phase-8-1/INPUT.md) |
| P1 | Dragging repeatedly read board geometry at pointer-event frequency. | The measured drag fell from 170 to two geometry reads. Keep watching the release and effect timings on phones. [Performance audit](docs/phase-8-1/PERFORMANCE.md) |
| P2 | Safari on iOS cannot provide web vibration. | Settings indicates that status and preserves the preference. Audio and visual feedback continue. [Vibration support](docs/phase-8-1/INPUT.md#vibration-support) |
| P2 | Official comparator screenshots and Firefox/WebKit were unavailable in this environment. | Open. Reference and engine access limits are documented below. |
| P3 | Exact Block Blast scoring and visual parity are unverified. | No claim of parity. See the visual and Classic audits. |

The app and worker have no third-party runtime dependencies, account endpoints, telemetry, advertising, or paid features. Backup parsing validates its version, known fields, numeric ranges, rotation records, and placement transcripts before applying any writes. Imported values are handled as data and labels are rendered as text. Browser local storage still has a platform quota and concurrent write behavior can differ in older engines without Web Locks.

## Verification and performance

Run `npm run verify:release` from the repository root. This runs all 219 automated tests, the game and independent Adventure replay, and the reproducible 10,000-hand Classic benchmark. The approved Phase 8.1 baseline passed 215 tests. Phase 8.1 viewport and input checks are recorded with the [physical-device retest instructions](docs/phase-8-1/INPUT.md). The same command runs in GitHub Actions. Daily and tutorial witnesses are independently replayed by the core suite. Tests include storage failure recovery, a large 2,048-date Daily backup, old saves, and required assets.

Chromium covered 320×568, 390×844, 430×932, 768×1024, and 1280×900 viewports. It checked first-run and reduced-motion startup, navigation and resumes, touch drag, mouse drag, keyboard placement, exact-fit previews, multi-tab write protection, and offline assets. It also restored an active game while a hand request was pending. Standalone preference and layout were simulated at 430×932. A native mobile install remains on the checklist. Upgrades from Phase 6 and Phase 7 retained the board and Adventure transcript. The Phase 7 upgrade retained historical Daily results. With one mandatory asset deliberately missing, the old worker stayed active. When the asset was restored, shell 12 installed successfully, activated after the old clients closed, removed the old shell, and opened offline.

Chromium 156 also verified shell 13 → 14. The old worker remained active until its client closed. Activation removed the old cache and preserved Classic, Adventure, Daily, and settings records. Saved gameplay, the Daily result, and the paginated material collection opened offline. The browser matrix covered seven portrait, landscape, tablet and desktop viewport sizes. It reached all 24 materials, 48 Adventure levels and 13 achievements. Settings was the only internally scrollable app surface in the tested layouts. [Viewport captures](docs/phase-8-1/SCREENS.md)

A 390×844, DPR 2 Chromium drag at 4× CPU throttle measured 1.1 ms p95 pointer handling and 16.8 ms p95 frame time after the optimization. The short committed-move sample still reached 33.3 ms p95 at 4×. The Canvas prototype had similar drag frame pacing and lower drawing cost in a deliberately accelerated clear fixture. The shipped renderer remains DOM. [Benchmark conditions, comparisons and tradeoffs](docs/phase-8-1/PERFORMANCE.md)

The table and long-run results below record the original Phase 8 release candidate. The Phase 8.1 release run validated 10,000 hands with zero invalid hands and zero timeouts. Mean, p95 and maximum time were 0.633, 4.086 and 32.022 ms in that run, including 250 proven-impossible fixtures.

Firefox and WebKit binary downloads were blocked by the environment. Physical devices were unavailable. The long-run fixture used 360 real Chromium placement actions with a controlled sandbox refill. It reached combo 120, visited all 24 materials, peaked at 61 live particles under the 72-particle cap, and left no clearing or floating nodes after settling. Sampled animation frames averaged 17.19 ms and peaked at 33.40 ms on the cloud host. The sample used a favorable fixture. It does not represent worst-case mobile hardware.

| Measure | Cloud result |
| --- | --- |
| Classic generation, 10,000 valid hands | 0 invalid, 0 timeouts |
| Generation mean / p95 / maximum | 0.711 / 4.441 / 37.501 ms in the recorded benchmark |
| Phase 7 offline shell | Approximately 822 KiB |
| Cold startup through interactive menu | 1.33 s, including both splash stages |
| Warm navigation without replaying the splash | 166 ms |
| Fresh offline startup with both stages | 1.24 s |
| Warm offline navigation | 83 ms |
| Phase 8 offline shell | 1,324,054 bytes, about 1.26 MiB across 89 files |

## Physical-device checklist

Repeat the [Phase 8.1 grip, viewport and vibration checks](docs/phase-8-1/INPUT.md#verification-and-physical-retest) on the same device as the preceding build.

1. Install on Android Chrome and in iOS Safari. Check launcher artwork, standalone safe areas, home-screen label, system launch, both custom splash stages, reduced motion, and relaunch from the background.
2. Compare a 320px portrait layout, a recent notched phone, and a tablet. Try an exact-fit drop with finger lift, rotate mid-drag, and check focus and settings after closing dialogs.
3. On desktop, repeat keyboard placement and backup download/import in Firefox and a WebKit browser. Check sound only activates after interaction. Confirm vibration controls indicate unavailable hardware cleanly.
4. Play an all-clear with two unplayed pieces, then reload during the transformation. Check the new material, remaining hand, score, and one recorded clear. Attempt simultaneous play from a second tab.
5. Upgrade an installed Phase 7 copy on both phones. Confirm the old game stays open until naturally closed, then start offline. Check saved Classic, Adventure, Daily, materials, preferences, and backups.

### Adventure difficulty worksheet

Record device, viewport, level ID, world and tour, attempts to first solve, moves used versus placement limit, where the route became unclear, readability, and a 1–5 difficulty rating. Play at least two early and two late levels in each tour without consulting the witness. Escalate any reproducible blocker that prevents a level completion or loses progress. A legal witness establishes solvability. Difficulty still needs human calibration.

## Installation, deployment and rollback

- Use **Settings → Install AlanBlox**. Where no native prompt is exposed, use the instructions for the current browser. iOS uses Safari’s Share menu and **Add to Home Screen**.
- Export a JSON backup via **Settings → Save data** before testing upgrades or rollback. To restore, select **Import save**, inspect the confirmation, and choose **Replace saves**. Keep the previous export until testing is finished.
- For review deploy the branch through GitHub Pages using repository root as the publishing directory. For a public build, use the reviewed publishing branch or commit. Keep the `/AlanBlast/` path and HTTPS origin unchanged to preserve install and storage identity.
- A new worker waits while the old one controls open app pages. Finish play, close all AlanBlox windows, and reopen. Update notices appear on the menu. The app does not force a reload while a new worker waits.
- Roll back by deploying the reviewed previous application bundle with a new cache version. Avoid clearing browser storage. Keep a Phase 8 backup first. Phase 7 can read earlier boards and core progress but has no knowledge of the new cosmetics, so avoid overwriting a new-format backup from the older deployment.
- Approve a limited browser beta after the branch passes verification and reviewers approve the generated artwork. A broad public beta also requires the physical device checklist, Firefox/WebKit smoke tests, and an agreed Adventure difficulty sample.

## Before-and-after screenshots

The [Phase 8.1 screen gallery](docs/phase-8-1/SCREENS.md) compares the approved Phase 8.1 branch point with this update and shows the new stationary flows. The historical Phase 7 and Phase 8 pairs below use the same controlled save and viewport where applicable.

| Screen | Phase 7 | Phase 8 |
| --- | --- | --- |
| Main menu | [Before](docs/phase-8-screenshots/before-menu.webp) | [After](docs/phase-8-screenshots/after-menu.webp) |
| Classic | [Before](docs/phase-8-screenshots/before-classic.webp) | [After](docs/phase-8-screenshots/after-classic.webp) |
| Adventure | [Before](docs/phase-8-screenshots/before-adventure.webp) | [After](docs/phase-8-screenshots/after-adventure.webp) |
| Level selection | [Before](docs/phase-8-screenshots/before-worlds.webp) | [After](docs/phase-8-screenshots/after-worlds.webp) |
| Level completion | [Before](docs/phase-8-screenshots/before-level-complete.webp) | [After](docs/phase-8-screenshots/after-level-complete.webp) |
| Settings | [Before](docs/phase-8-screenshots/before-settings.webp) | [After](docs/phase-8-screenshots/after-settings.webp) |
| Game over | [Before](docs/phase-8-screenshots/before-game-over.webp) | [After](docs/phase-8-screenshots/after-game-over.webp) |
| Material collection | [Before](docs/phase-8-screenshots/before-materials.webp) | [After](docs/phase-8-screenshots/after-materials.webp) |
| Statistics | [Before](docs/phase-8-screenshots/before-statistics.webp) | [After](docs/phase-8-screenshots/after-statistics.webp) |
| Daily | [Before](docs/phase-8-screenshots/before-daily.webp) | [After](docs/phase-8-screenshots/after-daily.webp) |
| All-clear | [Before](docs/phase-8-screenshots/before-all-clear.webp) | [After](docs/phase-8-screenshots/after-all-clear.webp) |
| Splash sequence | Menu opened immediately | [Studio](docs/phase-8-screenshots/after-splash-studio.webp), [game](docs/phase-8-screenshots/after-splash-game.webp) |

[Small mobile](docs/phase-8-screenshots/after-menu-small.webp) · [Large mobile](docs/phase-8-screenshots/after-menu-large.webp) · [Tablet worlds](docs/phase-8-screenshots/verify-tablet-worlds.webp) · [Desktop menu](docs/phase-8-screenshots/after-menu-desktop.webp) · [Simulated standalone](docs/phase-8-screenshots/after-standalone-simulated.webp) · [Material contact sheet](docs/phase-8-screenshots/material-contact.webp) · [All 24 material worlds](docs/phase-8-screenshots/material-worlds/)

## Developer preview

Serve the repository locally and open `http://localhost:8000/tools/release-preview.html`. Choose a screen and test viewport, preview either splash and adjust its duration, inspect every material with the same palette, or run the all-clear fixture. The [gameplay lab](docs/phase-8-1/INPUT.md#input-tuning-lab) also includes particle controls, local timings and a separate Canvas prototype. Gameplay fixtures and preview pages are loopback-only and use in-memory state. The preview and documentation images are outside the offline app shell.
