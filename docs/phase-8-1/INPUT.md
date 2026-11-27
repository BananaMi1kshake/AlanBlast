# Phase 8.1 touch controls

Phase 8.1 addresses the two issues reported from physical iOS play. The release candidate is **0.8.0-rc.2**. Confirm grip and release feel on a phone before closing either blocker.

## Confirmed causes and behavior

| Area | Phase 8 | Phase 8.1 |
| --- | --- | --- |
| Gameplay scroll | The game shell stayed in document flow. Its height estimate omitted some wrapped objectives, tutorial text and feedback. Panning remained available outside the tray. | A fixed, overflow-hidden gameplay viewport fits the board into the space left after the HUD and tray. Short landscape layouts place the board beside the controls and reserve space below it for touch drops. |
| Drag movement | Both the preview and ghost used a rounded grid origin. A sub-cell movement could produce no visible change followed by a full-cell jump. | The ghost follows continuous pointer coordinates. A separate nearest-cell calculation produces the logical preview. The engine receives the validated preview coordinates at release. |
| Pickup | Five pixels for every pointer. The ghost appeared at the rounded grid position while a child animation grew to board size from its default transform origin. | Immediate pressed feedback. Touch enters drag at 2 px and mouse at 5 px. One transform grows from the measured tray piece using the same grab offset throughout pickup. A tap selects without placing. |
| Touch offset | A capped 56 CSS px shift from the piece center. Tall pieces left less visible clearance below their lowest edge. | Default clearance is 1.15 cell pitches from the bottom edge of the piece to the finger. It is capped once per pickup by the safe bottom of the viewport, with a 4 px margin. Mouse has zero lift. |
| Cancellation | VisualViewport scrolling reset every active drag. | Viewport events only cancel a drag when they change board geometry or zoom. Lost capture, touch or pointer cancellation, a second touch, and leaving the page cancel without spending a piece. |
| Return | 180 ms | 125 ms. A new press cancels the old return immediately. Reduced motion removes the animated pickup and return. |

At 320×568, Phase 8 Chromium emulation scrolled the tutorial document **48 px** after a board swipe. At 667×320, offsets reached **282 px**. Phase 8.1 held document offsets and scroll range at zero across the viewport and mode matrix. The settings dialog still scrolls independently. The other screens use fixed layouts, with pages for level lists, materials, statistics and achievements. Daily uses a native date field with adjacent-day controls. `VisualViewport` dimensions are used at ordinary zoom. Gameplay-only touch prevention leaves modal scroll, other pages, and browser zoom controls available where supported.

A drag measures the tray and board at pickup. Pointer moves update a transform directly. Only the pickup scale and offset animate. Grid preview updates are limited to a new anchor or changed board, with line highlighting still computed by the game rules. The logical preview uses the full-size piece geometry from the first drag frame. Release checks the latest pointer position with the same geometry, even if pickup is still animating. Invalid drops keep the slot. [Before-and-after frames](drag-frames.webp)

## Input tuning lab

1. From the checkout root, run `python3 -m http.server 8000 --bind 127.0.0.1` and open `http://localhost:8000/tools/gameplay-lab.html`.
2. Under **Input tuning**, choose a shape, open or exact-fit fixture, corner, and viewport. Select **Load shape fixture**. The iframe uses the actual gameplay controls and a separate in-memory session.
3. Change a value and drag again. The telemetry lists pointer and floating origin in CSS pixels, zero-based board anchor, validity, cell size and pitch, board dimensions, viewport size and scale, and document scroll. The colored board markers show pointer, floating origin, and preview origin.
4. Compare **Continuous** with **Grid-snapped comparison**, or try **Center** grip versus the default touched spot. **Restore defaults** resets the experiment. **Export tuning** downloads JSON. To promote verified settings, transfer the exported values to `INPUT` in `js/drag-geometry.js` and rerun the browser check. Keep `snapVisual` false for production.

| Parameter | Live default |
| --- | --- |
| Touch clearance | 1.15 cell pitches, limited by safe bottom room |
| Anchor | Touched spot. Mouse preserves both axes. Touch preserves the horizontal anchor while lifting vertically. |
| Threshold | Touch 2 px, mouse 5 px |
| Pickup / return | 56 ms / 125 ms |
| Floating render | Continuous |
| Valid shadow opacity | 0.55 |
| Hysteresis | 0 cell pitches |

Set a particle limit and intensity in **Performance diagnostics**. Enable recording to measure frame pacing, render duration and Classic hand round trips. To copy the local report, choose **Select report** and copy it manually. The Canvas comparison is linked from the same panel. [Measured results](PERFORMANCE.md)

## Vibration support

The app enables vibration only when it can call `navigator.vibrate`. Safari on iOS, including the Home Screen web app, lacks this API. Settings shows the status while retaining the saved vibration preference. Compatible Android browsers can request the original patterns after a user gesture. Browser, system and hardware settings still determine whether a pulse is felt. Audio and visual cues continue wherever vibration is unavailable. A future Capacitor wrapper could use its native Haptics plugin. The release remains a GitHub Pages PWA. [MDN Vibration API](https://developer.mozilla.org/en-US/docs/Web/API/Vibration_API) · [Browser-compatibility data](https://github.com/mdn/browser-compat-data/blob/main/api/Navigator.json) · [Capacitor Haptics](https://capacitorjs.com/docs/apis/haptics)

## Verification and physical retest

Run `npm run verify:release` for the automated suite, puzzle witnesses, and unchanged V2 benchmark. Run `npm run verify:input` with Node 22 or newer and Chromium installed. Set `CHROMIUM` if the binary has a different name. Where the cloud host disables Chromium's sandbox, use `CHROMIUM_NO_SANDBOX=1 npm run verify:input` with the local-only fixtures. Set `ALANBLOX_CAPTURES` to save frame captures. To compare the old build, archive the pre-touch build `f6c027e` to another directory, set `ALANBLOX_ROOT` to the extracted repo, and run `npm run verify:input -- --baseline`.

Chromium emulation covered 320×448, 320×568, 375×667, 390×844, 430×932, 667×320, and 844×390 in Classic, Adventure, Daily, and tutorial, plus 1280×900 desktop input. It checked sub-cell movement, release agreement, bottom-right drops, long pieces, cancellation, multi-touch, lost capture, resize, harmless viewport events, modal scrolling, simulated standalone layout, reduced motion, and offline loading. Exact-fit tests cover every shape and all four corners. Firefox and WebKit engine downloads were denied.

Retest on physical **iOS Safari and Home Screen mode**, then **Android Chrome and installed mode**. Use the branch on an HTTPS test origin and confirm **Settings → About AlanBlox** reports rc.2 after the worker updates. Start each mode and swipe the empty board, HUD, and remaining screen space. Open Settings on a short viewport and scroll to About. Drag a single cell, five-cell bar, and large square slowly and quickly, especially to the bottom corners. Check near-edge pickup, invalid return followed by an immediate second pickup, tap-to-place, a second touch during drag, interruption by rotation or backgrounding, and a Safari toolbar change. Compare the feel against the prior build on the same phone. Record OS, browser, device orientation, mode, and what the piece did relative to your finger and the preview. Swipe the menu, worlds, materials and date selector outside their controls. Check that iOS marks vibration unavailable and that supported Android hardware pulses on placement and all-clear with vibration enabled. Install the previous worker first, keep one client open during the upgrade, then verify a saved game and date replay after reopening offline. OS edge gestures, toolbar transitions, hardware haptics, perceived drag feel and native frame pacing remain physical-device checks.
