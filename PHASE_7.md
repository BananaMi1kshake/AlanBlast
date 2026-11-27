# AlanBlox 0.7.0 release candidate

## Installation and branding

Settings → **Install AlanBlox** opens the native prompt when the browser offers one. On iOS the button explains Safari’s **Share → Add to Home Screen** flow. Other browsers show a short menu hint. The game never interrupts play with a prompt. The option is hidden in standalone mode and after a detected installation.

All six requested developer-provided PNGs are included with their original bytes. The two regular icons use manifest purpose `any`. The two dedicated maskable files use `maskable`. The Apple icon is 180×180 and the favicon 32×32. The uploads contain matching regular and maskable artwork at each size. Check platform cropping on Android before release. The existing manifest ID, scope, and start URL remain `./`. Shell 11 precaches the runtime icons and both challenge catalogs.

## Material discovery and appearance

Classic is available from the start. Completing any Adventure level discovers that world’s material. Existing Adventure completion records also qualify. Classic can discover the other seven materials with successive recorded all-clears beginning in Phase 7, in this order.

| Phase 7 Classic all-clear number | Material |
| ---: | --- |
| 1 | Yarn |
| 2 | Wood |
| 3 | Crystal |
| 4 | Jelly |
| 5 | Ice |
| 6 | Ceramic |
| 7 | Confectionery |

An all-clear contributes to that count even if its corresponding material was already discovered in Adventure. An equipped favorite does not change the discovery order. From **Material collection** or **Settings → Material preferences**, choose automatic rotation, favorite first followed by normal rotation, or a fixed favorite. Each preference applies at the next Classic start or restart. A fixed favorite survives reloading the same game. The dealer still receives only the board and shuffle bag. The choice never changes placement, rewards, or difficulty.

## Personal statistics and achievements

- **Classic** shows the existing personal best, games started, games reached game over, occupied cells placed, cumulative rows and columns, all-clears, highest combo, largest simultaneous clear, score earned, and materials discovered. Restarting an unfinished game begins a new game without recording a natural finish.
- **Adventure** shows unique levels completed, attempts started, gems and lines earned across attempts, highest combo, and worlds completed. A world counts as complete after all its levels in both tours are completed. Playing another level or explicitly restarting starts a new attempt. Resuming a saved run does not.
- **Daily Challenge** tracks independent attempts, successful runs including replays, gems, lines, highest combo, and best successful score across all dates. Each calendar date has its own best completion and status.

Phase 7 begins the new lifetime counters. Legacy saves keep their current boards, trays, score, combo, best, and Adventure completions. Legacy completions also restore materials. Cumulative placement, clear, and attempt totals begin at zero because earlier versions did not record them. A committed gameplay action updates records. Loading a transcript, animations, the tutorial, and development sandboxes leave the lifetime counters alone.

The 13 achievements cover the first Classic line, first simultaneous clear, first all-clear, Classic combos of 10/25/50, Classic single-run score milestones of 10,000/50,000/100,000, all eight materials, the first tour’s Ocean world, all released Adventure levels, and a Daily win. Eligibility is checked on gameplay actions. Achievements persist once earned. The menu opens a list of requirements and earned states, and new awards appear briefly during play.

## Daily Challenge and tutorial

Daily rotation version 1 starts on **November 1, 2026 UTC**. The game selects `(whole UTC days since that date) modulo 11` from the immutable order in `challenges/daily-v1.json`. Everyone using that version sees the same puzzle for a UTC date, including offline. The calendar allows any date from the first day through the current UTC day and permits unlimited retries. The best successful score is retained per date, with fewer moves breaking a tie. The rotation repeats after 11 days. A future rotation should use a new version and preserve the old version’s definitions for saved transcripts.

The optional four-step tutorial practices a row, a column, combo continuation after two misses, and an intersecting all-clear that transforms Classic blocks into Yarn. Skip it on the menu or replay it from any game’s settings. The tutorial keeps only a completed or skipped flag. Each lesson is a self-contained exercise and leaves game records alone.

All 11 Daily puzzles and four tutorial lessons have packaged witnesses. Tests replay each with the game engine and an independent implementation.

## Portable backups

Choose **Settings → Save data → Export save** on the sending device. On the receiving device choose **Import save**, select the JSON file, and confirm **Replace saves**. Import verifies the entire file before offering confirmation. It checks the supported schema, board and tray values, the campaign unlock order, legal placement transcripts, Daily winning results, preference ranges, material IDs, achievement IDs, and counters. Invalid files leave the current record intact. Backups are local files and always belong to the browser profile that exports them.

The JSON envelope contains `format: "alanblox-backup"`, `version: 1`, and a `data` object with six required sections.

| Section | Contents |
| --- | --- |
| `classic` | Normalized `game` or null, plus `highScore` |
| `adventure` | Version, completed level IDs, and current level ID with placement transcript |
| `daily` | Save version, challenge version, and date-keyed current and best placement transcripts |
| `profile` | Version, Classic/Adventure/Daily counters, material IDs, achievement IDs |
| `settings` | Sound, volume, vibration, reduced motion, appearance mode and favorite |
| `tutorial` | `null`, `skipped`, or `completed` |

Files up to 2 MiB are accepted. **Reset progress** requires separate confirmation and clears all mode records, achievements, discoveries, and the tutorial flag. It restores automatic Classic rotation and retains sound, vibration, volume, and reduced-motion preferences.

## Verification and performance

The Phase 6 baseline passed 137 tests. The release candidate passed 200 tests. All 48 Adventure witnesses, 11 Daily witnesses, and four tutorial witnesses passed the game and independent replays. Processing the full Adventure catalog took about 11–16 ms on the cloud Node host.

Chromium integration covered 390×844 and 320×568 mobile viewports and a 1280×900 desktop viewport. It checked touch, mouse, keyboard, independent saves, installability, alternative install guidance, backup confirmation, and offline operation under the GitHub Pages-style project path. A Phase 6 service-worker upgrade retained the existing Classic board and the in-progress Adventure transcript.

One run observed 311 ms from cold navigation to the menu’s campaign progress and service-worker control, and 82 ms from offline Daily navigation to the rendered puzzle card. Those are cloud Chromium observations. The 62 shell files total about 822 KiB on disk, including about 39 KiB of puzzle data. Screenshots and the design master are outside the offline shell.

## Release-candidate checklist

1. In a Phase 6 installation, record a Classic best and leave an Adventure level in progress. Load the new build, then close the old app tabs to let shell 11 activate. Check both resume actions, the best, the live tray, and the same Adventure objective progress.
2. Try a touch drag, a rejected placement, a mouse drag, and keyboard placement on the new build. Repeat on a short viewport. Check game layout and touch lift on physical Android and iOS.
3. From Settings try installation on an Android browser and Safari iOS. Inspect the home-screen artwork, including Android maskable cropping, and confirm standalone hides the guidance. Check the same build at its GitHub Pages project URL.
4. Discover Yarn through an Adventure win or a Classic all-clear. Exercise automatic, favorite-first, and fixed appearance. Confirm a full-board bonus in all three, then restart and reload to verify the intended appearance.
5. Finish and replay a Daily puzzle, then visit an earlier date. Check saved best and independent counters. Compare the same UTC date across different device time zones.
6. Finish the tutorial, replay it through Settings, and inspect statistics. Try a failed, canceled, and successful backup import. Export before testing reset, then restore that export.
7. After the initial online load, switch offline and reload the menu, Adventure, Daily, and each progress screen. Confirm settings and achievements still work and spend a complete Classic tray to trigger an offline deal.
8. Play both Adventure tours without the witnesses and report difficulty spikes. The campaign has 48 released levels against a target of 50. Physical mobile behavior, installed-icon cropping, and human difficulty calibration remain open.

## Browser screenshots

| Screen | Mobile | Desktop |
| --- | --- | --- |
| Main menu | [390×844](docs/phase-7-screenshots/menu-mobile.webp) | [1280×900](docs/phase-7-screenshots/menu-desktop.webp) |
| Material collection | [390×844](docs/phase-7-screenshots/materials-mobile.webp) | [1280×900](docs/phase-7-screenshots/materials-desktop.webp) |
| Personal statistics | [390×844](docs/phase-7-screenshots/statistics-mobile.webp) | |
| Achievements | [390×844](docs/phase-7-screenshots/achievements-mobile.webp) | |
| Daily Challenge | [Calendar](docs/phase-7-screenshots/daily-mobile.webp), [result](docs/phase-7-screenshots/daily-result-mobile.webp) | [Calendar](docs/phase-7-screenshots/daily-desktop.webp) |
| Installation guidance | [390×844](docs/phase-7-screenshots/installation-mobile.webp) | |
