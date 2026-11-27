# Worlds, palettes, and materials

Palette colors live in [themes.css](themes.css). World presets and the visual-motion profiles live in [themes.js](js/themes.js). Surface, edge, background, empty-cell, particle, and wave treatments live in [materials.css](materials.css). Board cells, tray pieces, drag ghosts, and valid previews inherit the current material. Clear ghosts and particles hold the departing material while the next world crossfades in.

| World progression | Palette | Material |
|---|---|---|
| Ocean | Ocean | Classic |
| Sunset Loom | Sunset | Yarn |
| Forest Workshop | Forest | Wood |
| Midnight Geode | Midnight | Crystal |
| Candy Bounce | Candy | Jelly |
| Glacier | Glacier | Ice |
| Moonlit Kiln | Midnight | Ceramic |
| Sunset Bakery | Sunset | Confectionery |

The cycle returns to Ocean. A full-board clear moves forward exactly once and leaves the remaining pieces in their slots. The original six world IDs retain their palette positions. Older saves derive their material from the stored world. New saves record both world and material, and unknown material names fall back to the world's default. No material takes part in scoring, positioning, or dealing.

## Assets and customization

- The original SVG overlays live in `assets/materials/`. Yarn uses repeated knit stitches, Wood uses irregular grain, Ice uses fracture lines, and Confectionery uses wafer ridges. Classic, Jelly, Crystal, and Ceramic use distinct bevels, reflections, facets, or glaze drawn with CSS. A missing texture leaves the underlying colored surface and highlight visible.
- Add a profile to `MATERIALS` in `js/themes.js` and a matching `[data-material="id"]` rule in `materials.css`. Keep artwork transparent where block color should show, and keep spacing and dimensions in the board geometry. To include the profile in normal play, point a world preset at it.
- Store optional material audio under `audio/` and add a nested entry in `audio/sounds.json`, for example `{"materials":{"wood":{"place":"wood-tap.wav"}}}`. The order is material file, base event file, then synthesis. Missing assets do not break playback.
- Register new texture URLs in the shell in `sw.js` and bump its cache version. Existing materials are precached. They use static backgrounds and small files rather than per-frame raster generation. Reduced motion keeps previews, descriptions, and material changes while skipping the visual animations.

## Gameplay and theme lab

Run the local server from the [README](README.md) and open `http://localhost:8000/tools/gameplay-lab.html`. This page enables its tools only on loopback hosts. It embeds the normal playable board with a separate in-memory save and preferences. The normal game, player record, and progression stay untouched. The lab and sound preview are outside the offline application shell.

Choose a scenario, edit eight rows of eight dots or color digits, select up to three pieces, and enter score and combo values. Set a world, then choose a palette and material independently or let them follow the world. **Apply to sandbox** loads the fixture. Drag, tap, or use the keyboard in the embedded board. **Read sandbox** copies the current state into the controls. The material swatches at the bottom use one palette for direct comparisons.

Use **Single line**, **Intersecting clears**, or **Full-board clear** then put the first piece at column 6, row 4. The **Exact-fit five-cell bar** fits at column 4, row 8. Keep palette and material on **Follow world** to inspect an entire all-clear transition. **Inspect current hand** reports a bounded count and a witness for the selected goal. **Deal V2** and **Compare V1 and V2** test the seeded dealer. Step buttons replay intermediate boards. [Dealer lab guide](GENERATION_V2.md) **Reset lab** clears the test state.

## Verification notes

Chromium exercised all 38 drag orientations, five portrait and desktop viewport sizes, both drag input types, a viewport resize during touch drag, and keyboard placement. The lab verified isolated storage, intersecting clears, material/texture migration, a full-board world transition, and reduced motion. A 150-move run peaked at the 72-particle cap and the effects layer emptied after settling. One same-process trace measured approximately 1.53 MB before and 1.74 MB after garbage collection, including modules loaded by the test itself. This does not establish a long-run memory trend.

In two full-board-clear traces under Chromium 4× CPU throttling, median frame interval was about 16.7 ms and p95 ranged from 33 to 50 ms. Individual frames were missed under throttling. Synthetic desktop and mobile emulation leave physical iOS/Android frame rate, haptics, and standalone install behavior unverified.

## Material collection

Phase 7 lets players discover materials through Adventure completions and Classic all-clears. The automatic, favorite-first, and fixed-favorite options apply to the next Classic run. Adventure uses each puzzle’s authored material. See the [Phase 7 discovery rules](PHASE_7.md#material-discovery-and-appearance).
