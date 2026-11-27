# Phase 8.1 performance audit

The baseline is the approved merge at `152292a`, using Chromium at 390×844 and DPR 2. The scripted input was a 168-event touch trajectory across a Glitter board, with 1× and 4× CPU conditions. Frame times come from requestAnimationFrame. Chrome performance counters report document layout, style recalculation, task time and JS heap. These are cloud measurements and do not establish physical iPhone performance.

The initial drag did not trigger storage writes or complete board renders. Its pointer handler called the board layout check for nearly every move, forcing style and geometry reads after prior preview and transform writes. Logical target changes copied the board, scanned for complete lines and rebuilt per-cell maps. At 4× CPU throttle the baseline measured 170 bounding-rectangle reads, 225 ms of cumulative layout time and 1.9 ms p95 pointer-handler time. Idle animation frames were near 60 Hz in Chromium, while committed moves reached a 33.4 ms p95 in that sample.

The live refactor uses event-invalidated board geometry with a final safety check at release. Preview line counts cache by immutable board identity and reuse flag buffers. Only changed cell classes are written. The scene and palette tokens update only when materials or palettes change. Moving pieces keep the material textures and use a simpler inset edge. Particles, their animation objects, and their peak active layers are bounded. Static material assets are served by the existing offline shell. Score animation skips identical rounded values.

Placement retains the synchronous, verified save transaction. This keeps progress durable when a user closes the page right after dropping. The baseline measured two short storage writes per accepted placement with elapsed time below its timer resolution in this fixture. The effect and input loops contain neither writes nor save serialization. Web Audio remains gesture-activated and cues are attached to accepted moves. The baseline's automated fixture did not start sample buffers, so it does not establish audio latency on iPhone. Chrome can report JS heap changes for the movement interval, but those include test instrumentation and allocations waiting for collection. The diagnostic does not measure native texture allocations or GPU memory.

The first worker reply arrived about 70–90 ms after construction on the baseline samples, including module startup and solving. A completed deal now leaves one reusable worker. A cancelled, timed-out or failed job terminates its worker. The next board and bag still go through the same V2 entry point. Page disposal releases the worker.

## Optimized DOM measurements

Chromium 156 on a Linux cloud host. Each row is one run per throttle of the same 168-move touch path at 390×844 and DPR 2. Frame statistics include the idle time between dispatched events. Pointer timing covers handling the event from capture through bubble. Layout and task durations are cumulative during the trace, and include other document work.

| Measure | Approved 1× | Optimized 1× | Approved 4× | Optimized 4× |
| --- | ---: | ---: | ---: | ---: |
| Frame median / p95 (ms) | 16.7 / 16.8 | 16.7 / 16.8 | 16.7 / 16.7 | 16.7 / 16.8 |
| Pointer-handler median / p95 (ms) | 0.2 / 0.4 | 0.1 / 0.2 | 0.9 / 1.9 | 0.2 / 1.1 |
| Bounding-rectangle reads, including capture | 170 | 2 | 170 | 2 |
| Document layouts | 44 | 40 | 42 | 39 |
| Cumulative layout (ms) | 52.2 | 39.8 | 225.4 | 193.2 |
| Cumulative style recalculation (ms) | 68.5 | 77.4 | 292.4 | 293.0 |
| Renderer task duration (ms) | 446.8 | 426.6 | 1452.2 | 1373.0 |
| Drag-time storage writes | 0 | 0 | 0 | 0 |
| Frame p95 in short commit trace (ms) | 16.7 | 16.7 | 33.4 | 33.3 |

Pointer handling improved and the drag trace remained close to the 16.67 ms budget. The commit trace still missed that budget at 4×. Chromium reported approximately 0.8 MB of incremental JavaScript heap during each optimized drag sample before collection. This includes instrumentation and transient data.

A separate unthrottled check timed a cold menu at 1.34 s before and 1.03 s after. Same-tab navigation to the menu took 103 ms before and 100 ms after. The old initial and subsequent worker round trips took 46.3 and 56.8 ms with two constructions. The new sample took 36.6 and 11.7 ms with one construction. Boards and randomly drawn hands varied between these startup samples. Three real taps to select pieces and three to place them exercised the procedural audio path. Each build scheduled 12 oscillator starts. Audio-output latency still requires physical measurement.

The service worker serves the mandatory static shell and checks for updates separately from drag processing. Chromium activated shell 14 after the old clients closed, retired shell 13, retained the seeded Classic, Adventure, Daily and settings records, and reopened saved routes and the material collection offline. Lab tools and screenshots are excluded from the offline shell.

## Canvas 2D experiment

The loopback-only renderer uses the same game rules and preview flags as the DOM. A static board and tray layer is cached behind the continuous ghost, logical preview, line flashes and particles. Five material sprites reuse the original grain asset when present. The visible and backing surfaces are capped at DPR 2. They account for 5,616,000 raw RGBA bytes together at that density, before sprites, browser buffers or GPU resources.

| Measure | DOM 1× | Canvas 1× | DOM 4× | Canvas 4× |
| --- | ---: | ---: | ---: | ---: |
| Glitter drag, frame median / p95 (ms) | 16.7 / 16.8 | 16.7 / 16.8 | 16.7 / 16.8 | 16.7 / 16.8 |
| Input handler or draw work, p95 (ms) | 0.2 | 0.2 | 1.1 | 1.0 |
| Drag renderer-task proportion of observed interval | 7.3% | 6.4% | 23.8% | 31.3% |
| 240 repeated all-clears, frame median / p95 (ms) | 16.7 / 16.8 | 16.7 / 16.7 | 66.7 / 100.1 | 16.7 / 16.8 |
| Repeated all-clear action or draw work, p95 (ms) | 12.8 | 1.0 | 62.0 | 5.1 |

The Canvas drag fixture draws 168 frames with a cached textured board. DOM receives 168 dispatched touch moves and participates in the full interface. Task proportion is a Chromium renderer-counter estimate. The clear stress fixture repeats a winning row 240 times, requesting one reset and clear per frame. The DOM path loads an in-memory session, updates the accessible interface and runs the usual all-clear effects. Canvas applies the shared rules, draws a simplified effect sample, and resets its backing scene. The stressed comparison includes differing work and cannot predict a full migration improvement. Normal play also gives the effects more time to settle between clears.

DOM peaked at 24 active particles, with zero particle, clear or floating nodes remaining after settling. Its two stress runs retained about 414 kB of additional JavaScript heap after explicit collection. In the Canvas runs the reported JavaScript heap moved from about 3.02 MB at the end of dragging to 3.11–3.48 MB after repeated clears, without a post-run collection. Neither measurement isolates texture/GPU allocation. The Canvas scene was tested in the mobile browser viewport and keeps coordinates in CSS-independent scene units.

Retain the optimized DOM renderer for this release. The drag results were similar, while the fast Canvas clear results omit some of the shipped feedback, accessibility and session work. A full Canvas migration would still need to demonstrate equivalent behavior and improved end-to-end frame pacing on physical hardware. [Canvas prototype capture](screens/canvas-prototype.webp)

## Reproducing the checks

Serve the repository locally and open `/tools/gameplay-lab.html`. Set the iframe to 390×844, choose Glitter, and use **Record frame and game timings** while moving a piece or refilling the tray. The report includes fps, frame/render/hand percentiles, active particles, viewport and last drag telemetry. **Select report** lets you copy the report. Set the particle cap or particle intensity to isolate effect load. Open **Canvas renderer comparison**, select the same surface, and choose **Measure 168 drag frames** or **Measure 240 clears**. Use DevTools CPU throttling and the Performance panel for longer traces and isolated style/compositing analysis. Reports stay in the browser. [Input tuning and device retest](INPUT.md)
