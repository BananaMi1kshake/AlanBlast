# AlanBlox visual reference audit

Phase 8 uses an original presentation with a score-first portrait playfield, tactile controls, and a separate visual treatment for each AlanBlox material. The approved Phase 7 build is the comparison baseline.

Official product and store URLs returned HTTP 403 from this workspace. No current official screenshot or recording could be inspected. The four supplied inline images depict Alan Studio and AlanBlox branding. They are evidence for the intended AlanBlox art direction only. The "Reference" column distinguishes requests in the brief from verified observations. Gameplay observations from earlier phases have the same limitations. [Block Blast official site](https://www.blockblast.com/) · [Google Play](https://play.google.com/store/apps/details?id=com.block.juggle) · [Classic rules audit](CLASSIC_PARITY.md)

| Element | AlanBlox 0.7.0 | Reference evidence | Phase 8 design |
| --- | --- | --- | --- |
| Studio splash | Immediate menu | Studio-first sequence requested. Timing unverified. | Short white stage for the supplied studio art when available. |
| Game splash | Immediate menu | Inline AlanBlox logo and portrait block artwork visible. Block Blast scene unverified. | Separate logo and background layers, one presentation per tab session. |
| Logo | Small icon above the title | Supplied AlanBlox wordmark has bold blue and amber lettering. | Large centered game wordmark. |
| Menu | Framed content cards and separate actions | Primary-first layout requested. Reference button placement unverified. | Two broad colored actions with progress beneath their labels and compact utilities. |
| Typography | System sans with small headers | Reference font family unverified. | Local rounded system fallbacks, heavy numerals and high-contrast display shadows. |
| Current and best score | Stacked score and trophy | Score-first hierarchy requested. Exact scale unverified. | Larger current score and compact bright best score, with a distinct trophy silhouette. |
| Settings | Small top-right gear | Reference position unverified. | Remains at top right with a visible focus ring and 44px target. |
| Board and tray | Square 8×8 board and three separate pieces | Reference scale, offsets and gutters unverified. | Recessed square playfield and open tray. Existing placement math and input anchor remain authoritative. |
| Blocks and background | Original gloss and eight material treatments | Reference bevel and palette unverified. | Original textures, legible borders and independent palettes. |
| Buttons | Muted rectangular surfaces | Reference dimensions and feedback unverified. | Sculpted highlights and pressed states with stable hitboxes. |
| Combo | Compact multiplier and popup | Reference typography and timings unverified. | Stronger numbers, a compact three-step window and a short clear banner. |
| Line clears | Composited dissolve, wave and particles | Reference animation sequence unverified. | Shared wave and material-specific fragments using bounded particle count. |
| All-clear and transformation | One bonus and animated scene fade | Reference reward, exact animation and material behavior unverified. | Large original celebration and new material label when the cosmetic actually changes. |
| Classic game over and best | Board overlay and two values | Reference screen controls unverified. | High-contrast panel with a primary replay action and recognizable personal-best marker. |
| Adventure selection | Vertical lists in chapter groups | Reference map and unlock order unverified. | World badges and readable available, complete and locked states with original campaign order. |
| Objectives and gem counter | Label and number | Reference iconography unverified. | Original typographic markers, readable progress and remaining placements. |
| Level win and failure | Shared overlay | Reference wording, prizes and choreography unverified. | Outcome palette, compact objective summary and prominent continue or retry. |
| Overlay and navigation | Modal plus entry fades | Reference transitions unverified. | Shared surfaces and motion tokens. Reduced-motion users get instant navigation and startup. |

The shared 8×8 grid, three-piece tray and line-clear emphasis are broad genre conventions. No element is claimed as a verified match to the reference build. Block Blast assets are excluded from the application and screenshots. Exact scoring parity and the frequency of Classic all-clears remain open research questions.


## Phase 8.1 visual alignment

The supplied Alan Studio mark, AlanBlox wordmark and blue block scene guide the branding and startup. Existing Phase 8 assets remain in use. The Classic default uses royal blue, a darker navy board with muted cells, bold white numerals, a gold crown and an unframed three-slot tray. Other worlds retain their individual material colors and textures. The main menu emphasizes the logo and two mode actions, with a resume action where a run exists and compact access to the collection, statistics, achievements and Daily. The About panel identifies Alan Studio and the AlanBlox release version.

The board and tray reserve space independently of score, combo, objectives and feedback. Adventure levels, material collection, statistics and achievements fit by paging or filtering their data. The Daily date entry remains an ordinary browser date control. Only Settings can scroll within the stationary app. Completion, failure and confirmations keep their controls within the checked viewports. Startup now allocates 360 ms to Alan Studio and 500 ms to AlanBlox and respects reduced motion and ordinary in-app navigation.

Official reference URLs were still inaccessible from this environment. The palette, proportions and timing are AlanBlox design choices informed by the supplied assets and the brief. Physical visual review, perceived drag quality and exact comparator parity remain open. [Before-and-after screen gallery](docs/phase-8-1/SCREENS.md) · [Performance and rendering audit](docs/phase-8-1/PERFORMANCE.md)
