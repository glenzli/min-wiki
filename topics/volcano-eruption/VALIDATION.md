# Land eruption 3D review — 2026-10-21

## Scope and maturity

The land eruption chapter now has one Three.js mountain with a geological cutaway and an exterior view, on-demand rendering, orbit/zoom/reset, terrain-bound lava and fragments, and a procedural ash volume. It consumes the existing qualitative intrusion/connection state. The landscape, ecology, submarine and lake chapters retain their previous scientific owners and renderers. Editorial maturity remains **draft**: this is a first 3D version, not acceptance of a photorealistic reconstruction.

The inherited four-file buoyancy contribution was outside this change's claim. No commit, push, deployment, dependency upgrade or catalog promotion was performed.

## Automated evidence

- `WIKI_READER_ROOT=/Users/g4i/lab/wiki-reader npm run check`: 914/914 tests passed, all content/image/localization/editorial/build gates passed, and Reader coverage was 71/71. This run preceded the final responsive-camera and fallback accessibility refinements.
- After those refinements, strict typechecking, localization (6,931 source messages; 72 English namespaces), and the 30 focused volcano/routing tests passed. The last camera-framing adjustment does not change any tested model/geometry inputs; those results are reused.
- Final `WIKI_READER_ROOT=/Users/g4i/lab/wiki-reader npm run build`: all build gates passed; 71 entries; source digest `62c9cddfbebd7d6cd0b9b15cdfe1843c36e5c1984d6b27d4cba0f9385eec2eee`.
- The five new geometry tests check deterministic surfaces/craters, first 3D terrain intersections and retained deposits, crater overtopping without floating slope flows, connection/stall gating, reversible seeking, and continued ascent of emitted ash. They establish teaching-model contracts, not geological accuracy.

Preview and build use the local Wiki Reader checkout at `/Users/g4i/lab/wiki-reader`, version 0.6.0. The preview's final volcano assets match the final packaged assets byte for byte:

| Asset | SHA-256 |
| --- | --- |
| `document-volcano-eruption-OBLOURTR.js` | `38d6c84ac8b5d8c1c347c869cffcd9543b0157f84354f99462e6b81845e5bc41` |
| `document-volcano-eruption-WTFEW24S.css` | `74e38c33efb0b9955548a55aa86a2452749864f370c576868fa62bf9eea6330a` |

## Browser review

Actual in-app browser review used the local Reader at `http://127.0.0.1:64494/encyclopedia/`, with Chinese and English desktop layouts and a 390 × 844 viewport. Both narrow layouts had a 390 px document width and a 390 px scroll width. The narrow view selector scrolls horizontally; long English labels remain operable.

Checked fountain and ash exteriors, the geological cutaway, the grounded lava close-up, underground-stall comparison, perspective changes, keyboard orbit/zoom, reset, playback/pause, seeking, and chapter return. Switching cutaway/exterior at 65% retained `data-progress=0.6500`; seeking 32% → 65% → 32% restored disconnected → connected → disconnected. Returning from mountain-building restored the separate eruption clock at 75.35% in WebGL. Changing language creates a new document and starts its episode anew, as before; cross-language instant restoration is not claimed. The mobile stalled case at 100% remained disconnected without surface products.

Relevant browser shader/runtime warning and error logs were empty during the checks. Screenshots are retained under `/private/tmp/mini-wiki-volcano-3d-20261021/`; this is a temporary local QA artifact directory, not a published asset location.

## Limits of this evidence

GPU-loss handling, GPU-unavailable fallback/retry and reduced-motion branches were inspected in source but were not fault-injected or preference-emulated in this browser session. No physical phone, sustained frame-rate benchmark, deployment, or renewed visual review of every untouched chapter is claimed. Procedural ash is a bounded density illustration, lava/crater filling is not a conserved-volume solver, and subsurface shapes and relative layer thicknesses are illustrative.

## Local material refinement — 2026-10-21

The follow-up requested by the user remains local. It refines the land eruption's magma, lava and ash, while retaining draft maturity and the existing scientific connection gate. No commit, push, deployment, dependency change or catalog promotion was performed. The four inherited buoyancy files remain outside this contribution.

### Changed presentation

- Lava uses irregular crust rafts with rough relief, unequal incandescent seams and an exposed central channel, instead of a smooth, evenly glowing surface. Its material-distance coordinates carry the texture along the flow on the episode clock and freeze during cooling. The silhouette has independently irregular banks, a closed rounded front and low terrain contact. Ground clearance remains within the existing tested bound.
- Underground melt uses static heterogeneous color and fine crystal texture, dark contact rims and stable faceted inclusions. It does not invent underground circulation or calibrated temperature readings.
- Ash uses advected, eroded three-dimensional density with internal light attenuation. A full-resolution terrain depth target occludes the lower-resolution ash integration before a single final tone/color conversion. The CPU density field is shared and bounded at 256 KiB; GPU textures and render targets remain scene-owned and disposable. The ash integration is capped at 640 px on its longest side, with 48 desktop or 36 narrow-screen steps. These are resource bounds, not measured frame rates.

### Current automated evidence

- All **32** focused volcano/routing tests passed: `node --import tsx --test topics/volcano-eruption/tests/*.mjs tests/volcano-routing.test.mjs`. Added checks cover the rounded closed lava front, deterministic material-distance coordinates, and independent disposal of GPU textures that share bounded immutable CPU data.
- Final `WIKI_READER_ROOT=/Users/g4i/lab/wiki-reader npm run build` passed strict typechecking, content/image/localization/editorial gates and packaging of **71** entries. Source digest: `ff5bd53b5356baf24584000c9e30cf0e4f710de795a22a0cf874897cfb9ff01d`.
- `git diff --check` passed. The earlier 914-test run above is historical evidence; the entire suite was not rerun for this material-only refinement. The scientific state owners and authored bilingual content were unchanged in this follow-up.

The local Reader 0.6.0 preview assets match the final packaged assets byte for byte:

| Asset | SHA-256 |
| --- | --- |
| `document-volcano-eruption-I2KPP75D.js` | `227f8af521613f157454d813d272a8904e23f7366c5020ab31ee0c656b318596` |
| `document-volcano-eruption-WTFEW24S.css` | `74e38c33efb0b9955548a55aa86a2452749864f370c576868fa62bf9eea6330a` |

### Current browser evidence

Actual in-app browser checks used the local preview at `http://127.0.0.1:64494/encyclopedia/`. Reviewed final lava and magma close-ups, the ash-rich exterior and close-up, Chinese and English 390 × 844 layouts, resized rendering, view changes, keyboard orbit/zoom, playback/pause and chapter return. Both narrow documents measured 390 px client and scroll widths, and long English view labels remained operable through their horizontal scroller. Both languages rendered ash in WebGL without relevant warning/error logs.

Playback advanced 65% to 66.02%; the paused `data-progress=0.6602` remained unchanged while other checks ran. Seeking 65% → 35% → 65% changed the connection state to false and restored it with the same time. Two final 1,054 × 750 stage captures at 65% were pixel-identical after decoding PNGs: zero changed color channels; raw SHA-256 `d8e5f7830e597c6b970875541261e1157ba41d066133c563af2f6685b003942f`. Returning from mountain-building restored the eruption's separate clock at `0.6500` in WebGL, exercising scene disposal and recreation.

Screenshots are retained under `/private/tmp/mini-wiki-volcano-materials-20261021/`, including `lava-final-850.png`, `magma-650.png`, `ash-final-context-zh.png`, `ash-final-650.png`, `ash-final-replayed-650.png`, `mobile-zh-ash.png`, `mobile-en-lava.png` and `mobile-en-ash.png`. This temporary QA directory is not a published asset location. The magma shader was unchanged by the final lava surface refinement.

The previous limits still apply. No physical phone, sustained performance benchmark, forced GPU failure, forced byte-target fallback or new reduced-motion emulation is claimed. The result improves material and volumetric detail; it is still a qualitative teaching reconstruction, not an accepted photorealistic or measured geological simulation.

## Volumetric cutaway prototype — 2026-10-21

The user selected the explanatory direction of Moonraker's **X-Ray Earth** artwork and authorized a local version with volumetric rock, intrusions and storage. The result remains draft. No commit, push, deployment, third-party media import, dependency upgrade or catalog promotion was performed. Existing buoyancy work and the eruption state owners were preserved.

### Representation and ownership

`sectionGeometry.ts` now owns closed geological solids and the intrusive system's display geometry. Eleven unequal units follow ordered basement contacts and nested deposits from the existing mountain profile. Their exposed contact meets the same terrain; the buried roof is slightly inset to avoid coincident surfaces. Separate contact normals and spatial grain/joint fields replace the previous repeated stripe shader.

The cutaway removes front host rock while retaining a three-dimensional intrusive system. A bounded, smooth isosurface joins regions around the original storage anchors, with a partly exposed contact rind, fixed crystal/melt detail and restrained local illumination. This is an illustrative crystal-bearing region, not a hollow cave, open lava lake, scanned reservoir, or measured melt-fraction field. Intrusions have finite thickness, broad sides and closed caps. Their fractional terminal positions consume the original dike advance; the deep feeder enters through the block's base. The final English and Chinese explanations state this viewing convention and its scale/color limitations equivalently.

### Automated evidence and final artifact

- The **36** focused volcano/routing/section tests passed. Four new tests check consistently oriented closed solids, noncrossing geological contacts and terrain alignment, a volumetric storage region containing all original anchors, bounded/independently owned output buffers, fractional closed intrusion tips, reversible seeking, the terrain ceiling and the lower feeder.
- `WIKI_READER_ROOT=/Users/g4i/lab/wiki-reader npm run check` passed **920/920 tests**, all strict/content/image/localization/editorial/build gates, and **71/71 routes** at source digest `cd73cffbdb0e63d4030cc693b6f7c4caa9cb8624e081f82fc1a2d77248f0715b`.
- One final change moved the existing storage lights from z = 0.70 to z = 0.25, reducing wax-like highlights. It changed no geometry, model, controller or localization inputs, so the test evidence above is reused. The final `npm run build` passed every build gate and packaged all 71 entries at source digest **`55de2eb37e398dccd0b2c9e43b6cdb4a3c161e1545b2bcbe59421430000dab7c`**. Final-source browser checks covered English phone and Chinese desktop rendering, ash compositing, chapter return and replay.
- `git diff --check` passed. The preview and packaged source digests match; the final local Reader 0.6.0 assets match byte for byte:

| Asset | SHA-256 |
| --- | --- |
| `document-volcano-eruption-7IOZ3LON.js` | `913b07ee0e1400a064f69350366fb15f0991d75f6dc7461f6fa75905cb7c6198` |
| `document-volcano-eruption-WTFEW24S.css` | `74e38c33efb0b9955548a55aa86a2452749864f370c576868fa62bf9eea6330a` |

A typed-buffer allocation audit of the production composite section counted 5,322,240 bytes for the creased geological units and 2,160,352 bytes for the storage body/rind, plus one immutable 720,900-byte scalar grid. These counts exclude the pre-existing terrain, ejecta and ash targets, the smaller sheet buffers and driver overhead. They describe bounded geometry preparation, not measured total GPU memory or a frame-rate guarantee. The grid is prepared once; each renderer owns and disposes its output geometry. No isosurface work runs on the episode clock.

### Actual browser evidence

Used the existing local preview at `http://127.0.0.1:64494/encyclopedia/`. Reviewed the composite, shield and scoria sections, underground close-up, whole-volcano transition, native orbit/reset, playback/pause, seeking, a stalled intrusion, ash compositing and chapter return. Chinese and English 390 × 844 layouts measured 390 px client/scroll widths; the underground lens kept the storage volume visible and long English view labels remained operable. The English explanation contains the new cutaway convention. Relevant shader/runtime warning and error logs were empty during these checks.

Orbit and cutaway/exterior changes retained `data-progress=0.6500`. Playback advanced from 32% to 32.86%, and the pause button returned to its stopped state. The stalled case at 100% remained disconnected with no surface ejecta. Returning from mountain-building restored the separate eruption clock at 65% in WebGL, exercising disposal and remounting of the new solids. The final-source storage close-up at 65% matched its 65% → 35% → 65% replay **pixel for pixel**: two 1,054 × 750 decoded images, zero changed channels, raw SHA-256 `84f01cf7e47ebf7cebe1fbb59711ce9dcda1efd0f36ec9aa0bd5ef270cecbe45`.

Screenshots: `/private/tmp/mini-wiki-volcano-section-20261021/`, notably `cutaway-context-final-zh.png`, `cutaway-overview-final-zh.png`, `storage-context-final-zh.png`, `storage-closeup-final-zh.png`, `storage-replayed-final-zh.png`, `ash-cutaway-final-zh.png`, `mobile-en-storage-final.png`, and `desktop-en-storage-final.png`. Chinese phone, shield, orbit and stalled captures in the same directory preceded only the final light-placement adjustment. This is a temporary local QA directory, not published artwork.

The previous scientific and verification limits remain: no physical phone, sustained frame-rate benchmark, forced GPU loss/fallback or new reduced-motion emulation was performed. The geometry and heat are uncalibrated teaching reconstructions; this prototype does not claim photorealistic acceptance or a physical simulation of subsurface magma.

## Local three-case refinement — 2026-10-21

The user requested documentary-style refinement of the submarine materials/plume, a formation-to-grassland emphasis for Mount Omuro, and replacement of the older volcanic-lake illustration. This work remains local and draft. No commit, push, deployment, dependency update or catalog promotion is authorized or performed. The four inherited buoyancy files are outside this contribution.

The integrated controller now selects Omuro's landscape journey by default, starting on its mature grassland. Replay resets to formation; four model-owned milestones locate deposition, cooling, soil/seed arrival and grassland. Explicit eruption/ecology chapter URLs remain usable. The journey composes the original formation and ecological models with distinct compressed clocks; it does not assert a measured single-eruption history. The three-dimensional surface, fixed ecological sites, habitat alternatives, crater close-up and rooted cutaway retain the same mountain. Soil, grass blades and roots are enlarged for visibility; the bilingual explanation retains the role of traditional burning.

The submarine projection refines the quenched rock rind, water optics and continuous plume density while retaining its authored supply, cooling and accumulation model. The lake projection consumes the original withdrawal/fracture/subsidence/water states, offering a whole basin and the same basin in section. It preserves dry basins with zero input or losses exceeding supply. All three scenes use the common paused transport and camera controls, with scene-owned GPU lifetime and fallback/retry. See the two process owners' validation documents for renderer details and local test evidence.

The old managed Reader PID 86301 on port 64494 was stopped with the Reader's project-scoped helper; a subsequent listener check confirmed that port closed. Unrelated dev-site and math-workspace hosts were left untouched. A fresh Reader 0.6.0 for this root is PID 77387 on `http://127.0.0.1:54650/encyclopedia/`. The process identity and project-scoped helper receipt were verified.

### Validation baseline and visual iteration

`WIKI_READER_ROOT=/Users/g4i/lab/wiki-reader npm run check` passed **948/948 tests**, strict typechecking, image/localization/editorial/content/build gates and **71/71 routes**, at source digest `779ae9fa6cf8abd061f02a3329ea5e39b128ceba5a420108f8ff0242cd901eee`. Actual screenshots then exposed visible model-like surfaces, prompting a second material/framing pass in the three renderer owners. This first pass is baseline evidence, not a claim that the later material refinements were already visually accepted. Final-source validation and screenshots are recorded below.

### Final-source checks and local preview

The final renderer-owner integration passed **87/87 focused tests** across the unified volcano, submarine and volcanic-lake contracts and compatibility routes. The last two subsequent changes only adjust the Omuro local cutaway lens/support face and the deep-water near-vent camera/lamp. Their owners reran **17/17 Omuro** and **21/21 submarine** focused checks and strict typechecking. A final `WIKI_READER_ROOT=/Users/g4i/lab/wiki-reader npm run build` passed strict typechecking and every localization/content/image/editorial/build gate, packaging all **71** entries. The earlier 948-test full run is retained for unchanged contracts; it is not relabeled as a final-source full-suite run. `git diff --check` passed.

Final packaged and managed-preview source digest: `aa9ed3a34a3b38ba372bb102ee666a6fd321ad9169fabaed60b406cb743413d1`. The final preview uses the same Reader 0.6.0 and matches both study assets byte for byte:

| Asset | SHA-256 |
| --- | --- |
| `document-volcano-eruption-6PG6TFUA.js` | `2c79f0ee4079feba6d2e988a44b9d4748f7e3b29bcc36c8a477d2c0665d3ad99` |
| `document-volcano-eruption-YU3XVJNI.css` | `c8d2815471a5f85bc9c13efb450dc94bda163a35d1047bbea577d1e68193b1e5` |

Actual in-app browser checks cover the following changed behavior:

- Omuro opens on mature grassland at 100%; replay starts the formation stage. At 44% the same mountain is bare and cooling; later soil/seed and grass stages retain its surface and ecological sites. Drought visibly limits cover, and the title/body now describe conditional establishment rather than promising a grassy endpoint. The two languages retain enlarged soil/grass/root qualifications and traditional burning. The mobile cutaway now magnifies a local cut in the same slope, instead of showing a floating whole-mountain slice. Keyboard orbit/zoom preserves time.
- The lake's 13%, 23%, 36% and 85% frames respectively show withdrawal, fractures before subsidence, sinking without water, and later water input. Zero input and high leakage both read 0% and leave a dry basin. The smaller-crater option keeps its separate history; whole-basin and section lenses retain progress. The initially closed upper layers had zero normals that caused two later black polygons; fixed +Z cut-face normals remove those artifacts without changing rock geometry, subsidence or color. The 17 focused lake checks include this rewind/reveal regression.
- Deep-water near-vent rock and the source-to-head plume were inspected in the actual final renderer. A conservative AABB camera experiment was rejected because it pulled too far away; the final lens makes a small target/distance adjustment and aims the local ROV lamp at the rock pile. Shallow water retains separate water/air density; sustained island supply reaches the surface, while early cessation remains submerged at 100%. Playback advanced and paused, keyboard orbit/zoom retained progress, and changing cases exercised disposal/remounting.
- Actual Chinese and English narrow-screen checks use a 390 × 844 viewport. Recorded documents measure 390 px client/scroll widths; long English view labels remain usable in their horizontal scroller. Relevant warning/error logs were empty in the final inspected pages.

Screenshots and state observations are retained under `/private/tmp/mini-wiki-volcano-refinement-20261021/`, especially `submarine-deep-final-accepted-zh.png`, `submarine-mobile-final-en.png`, `submarine-mobile-final-zh.png`, `omuro-mobile-zh-final.png`, `omuro-cooled-final-zh.png`, `omuro-section-phone-final-accepted-en.png`, `lake-stage-850-final-zh.png`, `lake-dry-final-zh.png` and `lake-mobile-en-final.png`. This temporary directory contains earlier review images too; `interrupted-by-preview-reload.png` and the rejected `*-review*`/`*-first*` captures are not final acceptance evidence. Changes written during early multi-agent work caused preview reloads; final checks wait for source freezes.

No physical-phone test, sustained frame-rate benchmark, forced GPU failure/retry, new reduced-motion emulation or empirical geological calibration is claimed. These remain qualitative teaching reconstructions with improved material and volumetric presentation.

## Local case consistency, compact controls and structural refinement — 2026-10-21

The reported `?case=shield&chapter=landscape` route still selected the older SVG mountain history. This was an omitted renderer branch, not evidence of a Git rollback or stale preview host. `rendererForCase` now assigns a 3D owner to all 15 case/chapter combinations. Shield/composite landscape and ecology use `landscapeGeometry.ts` / `landscape3d.ts`; their SVG is explicit failure fallback. The explicit landscape route is preserved rather than redirected to the independently timed eruption.

The new history projection retains 18 deposit births and ordered contacts above four basement units, closed strata with a rough exposed face, finite intrusive sheets and a joined crystal-bearing storage volume. The mature surface exactly matches the single-episode terrain. Completed buried contacts persist through later accumulation; erosion truncates the stack without compressing its buried contacts. Ecology uses its own clock and 100 fixed displayed sites. The landscape entry initially shows the mature mountain; replay begins its construction. Whole-mountain, cutaway, slope/vent views and native gestures do not advance scientific time. Portrait history cutaways inspect the central intrusive system instead of shrinking the entire broad basement into the available width.

The Reader toolbar now exists before reading-mode controls mount, and those controls mount before scene metadata. This also avoids mistaking Omuro's canvas `data-mode` for a reading-mode button on direct entry/reload. Case, chapter and reading choices share one disclosure; topic padding is reduced and mobile summaries show the selected case with its full accessible name. The final desktop toolbar is 57 px high; Chinese/English mobile summaries remain on one row. Reader source and dependencies are unchanged.

The shared `ecologyDispersal.ts` projection retains the original arrival thresholds and finite identities while showing tiny, staggered, short near-ground approaches. Whole-mountain views do not magnify those seeds. The Omuro and SVG owners consume the same helper; the new shield/composite ecology projection does too. Plant/environment outputs and their causal limitations are unchanged.

The submarine summit owner separated deep extrusion ridges/local fissures, a broken shallow fragment lip and local island outlets while retaining its deposit/supply histories. Actual wide-stage review then found the deep near-vent source too low. Its final aspect-only camera compensation preserves the portrait camera and existing density/light/material inputs: the .45 and .65 plume remains readable, and no plume is invented after its authored dissipation. The lake owner added closed rock units, connected crystal mush, finite intrusion/fault volumes, coherent inner subsidence and separate wall slumping/talus. An actual .48 view exposed large triangles from coarse buried roofs overlapping the fine terrain. The final draw range exposes the cut/perimeter faces while the fine terrain alone draws the outer roof; complete closed geometry and valid normals remain retained. Crater/caldera explanations remain branch-specific.

### Validation and final package identity

The broad integration baseline passed `WIKI_READER_ROOT=/Users/g4i/lab/wiki-reader npm run check`: **974/974 tests**, strict typing, localization/images/authored-entry/editorial/build gates and **71/71 routes**. That run preceded the final visual repairs and is not relabeled as a final-source full-suite run. After the lake and submarine repairs, the volcano/submarine/lake suites plus `tests/volcano-routing.test.mjs` passed **111/111**. The subsequent portrait-history camera and compact-summary changes affect presentation only. A final `npm run build` passed strict typing and every build gate; the last CSS-only toolbar-spacing correction was repackaged with `npm run reader:build`. `git diff --check` passed.

Final source digest: `8045bc019a4ee5d798eb05954c93425f6b6eb32f37dfd76d0f8d93b7d0e84fb7`. All **1,454** recorded input hashes match the current files, resolving `tool:` inputs against the configured local Reader checkout. The managed preview and final package have the same digest and identical study assets:

| Asset | SHA-256 |
| --- | --- |
| `document-volcano-eruption-ZBD74TY4.js` | `1895c99c099ac8ad72ce7659fdbdb6f703cac9d24c97545d191e319b0a6741b9` |
| `document-volcano-eruption-T4BUXEC6.css` | `81b730355847405d52cfbc2dd2c12c08f9b46ce2bc598fb5eeb1f77b6337ee59` |

The managed Reader remains PID 77387 at `http://127.0.0.1:54650/encyclopedia/`. Port 64494 was checked again and has no listener; unrelated hosts were not stopped. No canonical commit, push, deployment, dependency change or catalog promotion was performed. The four inherited buoyancy files remain outside this contribution.

### Actual browser checks

Desktop review includes the exact reported shield route, new shield/composite history sections at .43, composite ecology at .65, native keyboard rotation without changing progress, case changes and disposal/remounting. On a 390 × 844 English phone viewport, playback advanced history from .43 to .4439 and paused; entering the eruption selected its separate .08 clock, and returning restored history at .4439 in WebGL. Both reading modes remain reachable in the compact menu. Direct Omuro reload retains two reading-mode buttons alongside its separate scene metadata.

Lake review covers fractures at .23, subsidence at .36, the final dry basin and grounded rubble at .48, later water at .85, zero input and high leakage. Both dry comparisons read 0% and show no lake water. English caldera text explicitly explains removed foreground host rock and unmeasured reconstruction; the smaller-crater text excludes the caldera's deep collapse. Native phone zoom preserves .85. The new closed section has no recurrence of the earlier black polygons. Two first-mount lake automation clicks exceeded the input-call deadline, but the next state confirmed the requested case had completed; no latency benchmark is claimed.

Deep .45/.65, shallow .45 and island supply alternatives were inspected. Sustained supply reports emergence; early cessation remains submerged. The revised deep wide-stage source/ridge and source-to-head plume are visible under the retained local lighting; English 390px plume and long lens controls remain usable. Omuro's mature grassland and .75 local soil/arrival view show no oversized aerial seed shower. Chinese and English narrow documents measure **390 px client/scroll widths**; the temporary viewport override was reset. Relevant warning/error logs on the inspected final QA tabs were empty.

Evidence is retained in `/private/tmp/mini-wiki-volcano-land-history-20261021/`, including `lake-cutaway-final-zh.png`, `shield-phone-section-final-zh.png`, `phone-compact-menu-final-en.png`, `lake-phone-zoom-final-en.png`, `submarine-phone-final-en.png`, `composite-history-section-zh.png`, `submarine-deep-wide-final-450-zh.png`, `submarine-deep-wide-final-650-zh.png`, `omuro-seed-soil-750-zh.png`, both final state JSON files, check/focused/build logs and `build-identity-final.json`. The phone captures and named scene-detail images precede only the last 4 px toolbar-padding correction; their geometry, clocks and menu content match the final sources. `lake-cutaway-final-zh.png` records the final-package desktop context. Earlier review images in the directory are not final acceptance evidence.

These are uncalibrated teaching reconstructions. This review does not establish geological measurement, physical-phone performance, sustained frame rate, empirical collapse prediction, forced GPU loss/retry or new reduced-motion emulation.

## 2026-10-21 · Caldera rock destination and one Omuro journey

Local continuation after the reported solid-looking caldera and redundant Omuro chapters. Existing dirty work was accepted through bounded Dev Mesh claims; unrelated buoyancy work was preserved. No canonical commit, push or deployment was performed.

The caldera now retains a finite four-layer roof block. Its top, contacts, base and material coordinates move together into a contacting crystal/melt region; outer host layers have a real central opening filled by those distinct solids. A narrow host-rock collar fills the irregular reservoir sides. Original roof/layer traces remain visible in a fixed section camera throughout subsidence, so camera enlargement cannot hide the displacement. Rock fault bands are clipped to their current terrain, including their caps. The outer-wall debris remains separate. The original process clock, smaller-crater branch and water-input/leakage rules are unchanged. Geometric identity does not establish a calibrated pressure, magma-volume or whole-volcano mass-conservation solver.

Omuro now has one formation-to-grassland journey and one remembered position. Its three parallel chapter choices are hidden; the whole mountain, crater and rooted cutaway are lenses of that journey. Old `chapter=eruption` / `chapter=life` links remain valid, entering the formation / arrival portions at .08 / .66 and canonicalizing to `chapter=landscape`. The ordinary entry still shows the grassy endpoint. The bridge selects a different lake case, rather than reopening an independent Omuro ecology clock.

### Checks and build identity

- Focused integration: `node --import tsx --test topics/volcano-eruption/tests/*.mjs topics/submarine-volcanoes/tests/*.ts topics/volcanic-lakes/tests/*.mjs topics/volcanic-lakes/tests/*.ts tests/volcano-routing.test.mjs` — 116/116 passed. This covers the final lake geometry and Omuro route/model contracts. After the later caption-refresh fix, route tests, the complete build and actual view-switch checks were run again; unchanged geometry/model evidence was reused.
- `WIKI_READER_ROOT=/Users/g4i/lab/wiki-reader npm run build` passed strict type checking, all 72 English namespaces, image/entry/editorial gates and the 71-entry Reader build. `git diff --check` passed. One package rebuild followed the observed caption remaining visible when changing to the whole-lake view; caption state now updates on drawing a new view.
- Final source digest: `914de7d52e131ec2eb0fb2b86a1598357d7be5b8980a1ce8e00c121b90969f1b`. All 1,454 packaged inputs matched disk, including `tool:` inputs resolved against the configured Reader checkout. The managed preview returned the same source digest and byte-identical JS/CSS.
- JS `document-volcano-eruption-4G5T7HQB.js`: `49822972dbbf59e6d5418c1c1e355ed1b58aaa46638717894210a573d6f2e577`.
- CSS `document-volcano-eruption-VHQ6K24H.css`: `772c028302a3611c1edcc46508ef74cd001070419717b3a81e4eb9ed97727874`.

Evidence is retained in `/private/tmp/mini-wiki-volcano-continuity-20261021/`: focused/build/route logs, `build-identity-final.json`, browser-state JSON and actual screenshots. The caldera contributor's final four-file hashes are in `/private/tmp/volcanic-lake-causality-sha256.json`.

### Actual browser acceptance

The managed Reader remained PID 77387 at `http://127.0.0.1:54650/encyclopedia/`. Desktop Chinese review stopped at .13 withdrawal, .23 fractures without subsidence, .36 translation, .48 dry basin and .85 later water. The original dashed summit and layer references fit inside the scene, the same rock block remains beneath the basin floor, and the contacting residual melt is visible. Water input zero and high leakage both produce a dry basin at .85; normal supply gives 78% illustrative retention. The smaller crater has no caldera reservoir, traces or causal overlay. Whole-lake/section switching preserves progress and hides/shows the section-only cue appropriately. Rewind/replay at .36 reproduced identical screenshots.

Chinese and English 390 × 844 checks retained a 390px document width, readable causal captions and working lens controls. English science text explicitly places the translated rock beneath the floor and retains residual crystals/melt. Keyboard orbit/reset preserved .36. The Omuro menu showed five cases and two reading modes, with no chapter choices. Old ecological/eruption links selected one journey at .66/.08; changing case and returning restored .66, and changing reading depth, habitat or lens preserved the current journey. Endpoint replay advanced the formation stage and paused successfully. Temporary QA tabs were closed; the user's local preview remains available.

## 2026-10-21 · Fragmented collapse and visible scoria deposition

Local continuation after the roof still resembled a lift and Omuro's glowing ground/tall tufts obscured its formation. The three bounded owners retain the inherited shared work. This section supersedes the preceding single-roof/collar description for the current renderer. No canonical commit, push or deployment is part of this refinement.

The caldera has seven unequal, bent-boundary roof units, each retaining four closed layers, original material coordinates and a finite base. Existing subsidence drives staggered offsets and slight affine inclinations. The crystal-bearing region meets each displaced base without a permanent air gap; original-position traces and the fixed section camera remain. Six retained wall-source regions connect scars to falling/sliding clasts and persistent mixed talus. Block count, scar sites, motion and compressed timing are illustrative, without a fracture/rigid-body or conserved-volume solver. The bilingual academic text explicitly allows real wall slides to occur much later than the principal collapse. The original smaller-crater and water-input/leakage models are unchanged.

Omuro now retains eighteen illustrative deposition units and 72 representative source-to-landing clasts, with at most eight airborne together. Later deposits may bury a clast, while an exposed landed clast keeps its coordinates and darkens. Mountain growth no longer uniformly scales the final cone. The whole slope no longer emits hot flecks; heat is confined to the vent and recent clasts. Mature cover is low turf, with short blades restricted to local inspection. Fragment, soil and root enlargement is qualified in both languages. The 100 ecological identities, habitat alternatives, four milestones and single unified journey remain.

The first actual-page review rejected a high formation camera and barely visible clasts. A narrower second pass lowered and moved back the formation lens, leaving the growing footprint visible, and increased representative-clast legibility. The scene applies its formation pose once after receiving the new frame, including legacy entry. Returning from later stages or replay restores the overall view; deliberate lens/orbit choices within formation are preserved. A short scene cue follows each stage without introducing another menu or chapter clock.

Evidence for this continuation is retained in `/private/tmp/mini-wiki-volcano-natural-20261021/`. Omuro desktop inspection covered .03/.08/.12/.23/.31 and mature cover. Chinese/English 390 × 844 inspection covered formation, grassland, the local rooted slope, all four habitat controls, .90 section → .12 landscape, stage-zero vent → .15 retaining vent, old life → .66 and eruption → .08 links, endpoint replay and pause. Client/scroll widths were both 390px.

### Final checks and actual lake acceptance

- The combined volcano/submarine/lake/routing focused command from the preceding section passed **122/122** tests against the frozen source. Final owner checks also passed: Omuro 16/16 and lake 30/30, with strict owner type checks. These counts overlap the integration suite and are not added together.
- `WIKI_READER_ROOT=/Users/g4i/lab/wiki-reader npm run build` passed strict type checking, 6,968 source messages/all 72 English namespaces, 151 image-source checks, authored-entry/editorial checks and the 71-entry Reader build. `git diff --check` passed. One full package build was needed after final source freeze; earlier actual-page feedback preceded this build.
- Lake desktop inspection covered .23 fractures without sinking, .36/.40 staggered displacement and clast release, .48 dry basin and persistent wall-foot deposits, and .85 later water in section/whole views. The first smooth-wall checkpoint was rejected; the second has widened rear scar windows, bounded wall recession, residual ridges and broader talus wedges. A source review confirmed no large coplanar overlap between the upper wall terrain and the eleven annular rock units.
- Chinese/English 390px checks retained readable controls and captions, distinct crater/caldera histories, zero-input and high-leakage dry basins, and 78% illustrative retention under the normal condition. The English academic explanation retains the possibility of much later wall slides and the illustrative block/debris scale. View changes preserve progress and correctly hide the cutaway-only cue.
- Actual .36 → .85 → .36 rewind reproduced identical pixels inside the scene bounds `[60,172,1220,640]` at 1280 × 720. Full-page images differ only in 188 slider-focus pixels below the scene. The comparison is saved in `rewind-scene-comparison.json`; geometry tests independently check deterministic retained buffers.
- Actual final QA-tab warning/error logs were empty. The user tab and final QA tab both referenced the final scene JS/CSS listed below. Temporary viewport overrides were reset; temporary QA tabs were closed after acceptance, preserving the user's own tab and its current case.

### Final package and preview identity

Source digest: `5011fdb1ba5af58f724fce7272aa3886d9d92f9e03a2a48b36213c39359af3f6`. All **1,454** packaged inputs matched disk, including Reader `tool:` inputs. The managed preview returned that same digest and byte-identical assets:

- JS `document-volcano-eruption-RBSHHAUA.js`: `3e4c67229b1ecd4a78919b119dda1d79d0889605dcd60507335a5b615abc301a`.
- CSS `document-volcano-eruption-7DPMUYQK.css`: `9d1c2aeb886539d0f87c4ccb9c42677e62a234614f882027cf17471295f0d528`.

`build-identity-final.json`, `focused-final.log`, `build-final.log`, `browser-state-final.json` and final screenshots retain the proof. The acceptance record itself is excluded from packaged inputs. The same managed Reader remains PID 77387 at `http://127.0.0.1:54650/encyclopedia/`; old port 64494 has no listener. HEAD remains `06875bd444f8b98a44dea0a46887cd7f6c347392`. No canonical commit, push or deployment occurred.


## 2026-10-21 · Four units, seven questions and separately pausable liquid detail

This local integration supersedes the preceding case/chapter navigation and the combined Omuro player as the primary learning structure. Four units now answer seven questions: magma reaching the surface; differences in eruption styles; retained mountain building; submarine building; green versus bare slopes; basin formation and water retention; and groundwater heat. A named volcano is not required at entry. Landform/environment choices are comparisons inside the relevant question. The underlying scientific owners and refined mountain, submarine and caldera geometry remain topic-owned.

`studyModel.ts` owns routing, renderer selection and explicit clock conversion; `studyContent.ts` owns question copy and transitions. Each question remembers progress, conditions and the requested lens. Building consumes only the retained-deposition segment (.00–.61 for shield/composite, .00–.32 for scoria), without advancing ecology. Ecology starts with an already-built cone. Default surface-style comparisons start at connected pathways (.54–1 of the existing episode); mechanism retains the earlier underground clock and stalled-intrusion alternative. These are distinct teaching timescales rather than one universal volcanic life cycle. Legacy case/chapter links enter meaningful states. Registered Markdown source links use language-qualified question anchors; query-only Markdown links are unsupported by the current Reader and were replaced without changing Reader source.

`magmaMotion.ts` supplies a bounded display phase, updating admitted hot material at most 24 times per second. Molten streaks and local relief migrate within fixed melt masks and along existing dike/lava coordinates; crystals, host rock and cold crust remain fixed. Process and flow have separate pause controls. Explicit seeks reset detail phase, while ordinary process pause does not turn it off. The display does not compute measured magma circulation or fluid dynamics.

`hydrothermalModel.ts` / `hydrothermalScene.ts` add precipitation, infiltration, hot-rock heat exchange, ascent and a surface spring/pool, including no-water and disconnected-return alternatives. Display flow adds no pool water. The heat source is solid hot rock; not all natural hot springs are volcanic. The cutaway and surface lenses share one process frame. Each new WebGL owner and retry receives a fresh canvas, preventing reuse of a disposed context on question return. Fallback diagnostics are mirrored through `data-renderer-error`. The final surface lens frames the pool/near shore, and one continuous surface owns the landscape, removing the earlier rectangular ground seam. Resource policy remains 21 geometries, 22 materials, three instanced meshes and one 1536² shadow; the far surface has a bounded 28,985 vertices. These counts are not a frame-rate benchmark.

### Final automated and package evidence

- `WIKI_READER_ROOT=/Users/g4i/lab/wiki-reader npm run check` passed against frozen sources: **1,018/1,018 tests**, strict types, **7,012** source messages/all **72** English namespaces, **151** image-source checks, authored-entry/editorial checks, packaging and **71/71** Reader routes. Focused agent and question/routing results overlap this run and are not added to its count.
- `git diff --check` passed. The accepted four unrelated buoyancy files were not edited by this contribution. HEAD remains `06875bd444f8b98a44dea0a46887cd7f6c347392`; no canonical commit, push, deployment, dependency change or editorial promotion occurred.
- Source digest: `cb383c4b78546e06c4f3272f12104cf1855ff1d8d01a14812c358a7d40699d1d`. All **1,459** recorded inputs match disk, including Reader `tool:` inputs. The managed preview returns the same digest and byte-identical topic assets. The final actual browser document references these assets too.
- JS `document-volcano-eruption-JBVS2FT5.js`: `f9884609a57da502cc9ec8691e8cae651291a275ae032750683d6b75f30c18a1`.
- CSS `document-volcano-eruption-HBWM477D.css`: `395fa43630612ffc784730e6feab9d6b4fc28d3ae3e8450bbd6c9864b3a2927f`.

### Actual browser acceptance

Desktop Chinese review covered all seven questions, the completed retained cone, same-mountain transition into ecology, dry-habitat contrast, ash/flow comparisons, no surface output for stalled intrusion, caldera .36 displacement and no-input dry basin at .85, and deep submarine vent/plume. Returning to building restored its own 100% state; old shield-landscape and scoria-life URLs entered building at 100% and ecology at 50% respectively. The first actual heat re-entry fell back because the old canvas retained a disposed WebGL context; after the lifecycle repair, repeated heat → lake/ecology → heat entries retain WebGL, requested landscape lens, progress 1, supply .75 and pool state .9.

Chinese and English **390 × 844** checks covered the four-unit question menu, reading modes, explanation controls, process play/pause and independently wrapped flow control. Both documents measure **390px client/scroll widths**. The English static-reading question link enters the corresponding live heat question and canonicalizes to `study=heat`. At the fixed heat endpoint, zero water supply and a disconnected return path both show pool state zero and matching explanations. Native keyboard zoom/orbit preserves process progress. Final Chinese phone and desktop surface views show a legible pool and continuous ground without the earlier rectangular seam; section framing is retained. The temporary viewport override was reset, and the final current-package preview tab is retained for the user.

Fixed-progress two-frame comparisons distinguish display motion from process motion. Storage at .08 differs only inside its molten region. Surface lava at question progress .68 / episode progress .8528 differs only within the lava strip (whole-page difference box `[575,207,657,536]`). Pausing flow makes the scene bounds `[60,172,1220,640]` pixel-identical in both comparisons; the surface full-page comparison differs only in the browser scrollbar outside the scene. Shader/runtime warning and error logs were empty on the final inspected document.

Evidence is retained in `/private/tmp/mini-wiki-volcano-questions-20261021/`: `check-final.log`, `build-identity-final.json`, `browser-state-final.json`, `motion-comparison-final.json`, the named final motion pairs, `question-navigation-final-zh.png`, both phone navigation captures, and final spring phone/desktop captures. Earlier `*-first*`, `motion-comparison.json`, and pre-repair spring captures are review history, not final acceptance. The same managed Reader 0.6.0 remains PID 77387 at `http://127.0.0.1:54650/encyclopedia/`; port 64494 has no listener.

These remain uncalibrated teaching reconstructions. Reduced-motion/hidden/disposal and fallback/retry contracts have focused owner tests; browser preference emulation and deliberate GPU fault injection were not performed. No physical-phone test, sustained frame-rate benchmark, fluid solver or geological measurement is claimed. This acceptance record is excluded from package inputs.

## 2026-10-21 · Visible melt transport, eruption strength and responsive collapse

This local continuation addresses flow that was imperceptible, insufficient eruption comparisons and collapse playback stalls. The four-unit/seven-question structure and inherited volcano work remain. No canonical commit, push or deployment occurred.

### Changed behavior and limits

Surface lava now has retained, raised molten folds that advance within the existing flow ribbon. Fixed banks and cold crust provide a visible reference. Underground feeder faces have advancing folds along existing path coordinates; storage detail moves within fixed melt masks while the crystal field remains fixed. `meltTransport.ts` owns these bounded display surfaces. The existing admitted 24 Hz detail phase, separate flow pause, process clock, reduced-motion/hidden/disposal gates and cooling state remain. Display motion does not extend a connected path or establish measured circulation or fluid dynamics.

The first current-page review still found the whole-mountain framing too wide to judge flow. The accepted flow lens follows a fixed local segment of the maximum-strength developed channel. Changing strength preserves that reference camera; the weaker head and banks remain in view at desktop and portrait sizes. This is a presentation camera, without altered lava reach or physical scale.

Six directly accessible scenarios cover gentle overflow, multiple discrete vents, low spatter, a high fountain, a short ash column and a stronger ash column. Small/large controls preserve the mountain, process position and camera, and vary the same style's bounded relative strength. Both Three and Canvas consume the canonical weights for lava flux/width/spread, clast activity/rise/spread and ash height/radius/density. Default strength 1 preserves the earlier geometry and Canvas drawing commands. Relative strength is qualitative, without measured volume, discharge or VEI. Multiple discrete vents do not claim a continuous fissure. The scenario source is `eruptionScenarios.ts`; bilingual qualifications are visible beside the controls. The styles question opens at .62 / episode .8252 so a developed flow is available immediately.

Lake rock updates now depend on actual formation/subsidence changes. Filling no longer rebuilds the host units, displaced blocks, storage and terrain normals. Same-state draws do no geometry or water work; view/resize still renders. Prepared bounded spatial/contact data remove repeated per-vertex terrain queries and temporary allocations. Three bounded slips with rests, modest transient inclination and source-linked tumbling clasts replace continuous smooth descent. The seven unequal roof units, retained rock/layer identities, fixed original-position traces, source scars, final talus and residual crystal/melt contacts remain. Timing and motion remain illustrative rather than a fracture, rigid-body or mass-conservation solver. Full CPU and lifecycle details are in `topics/volcanic-lakes/VALIDATION.md`.

The production draw/geometry CPU fixture's collapse mean decreased from 417.76 to 12.29 ms, filling from 454.20 to 6.64 ms and alternating seek from 410.07 to 14.55 ms. The fixture omits GPU rendering, shaders, reflection cost and input/layout; these are not browser FPS or startup benchmarks. Caches add bounded CPU storage without a new growing geometry, texture or particle population.

### Frozen-source checks and actual page acceptance

- `WIKI_READER_ROOT=/Users/g4i/lab/wiki-reader npm run check` passed **1,048/1,048 tests**, strict types, **7,025** source messages/all **72** English namespaces, **151** image-source checks, entry/editorial gates, packaging and **71/71** Reader routes. Focused owner checks overlap this result and are not added to the count. The affected scientific model/geometry tests retain default behavior, finite retained buffers, fallback parity, deterministic seek and lifecycle bounds.
- Actual desktop flow inspection at question .62 / episode .8252 shows broad hot folds moving down the channel while banks stay fixed. Two fixed-process frames differ within the molten strip; the scene is pixel-identical after flow pause. The storage lens at .22 likewise differs only in its molten region, and its paused scene is pixel-identical. The initial overly wide flow captures and an early HMR-reset pair are review history, not acceptance.
- Small/large fountain and ash pairs were captured at the same .62 process position, mountain, camera and page offset. Low spatter has fewer, lower clasts; the high fountain reaches higher/farther. The stronger ash column is visibly higher and wider. Multiple-vent flow was also inspected. Native control auto-scroll was corrected before the accepted same-view pairs; earlier displaced-page captures are not the comparison evidence.
- Lake inspection covered .23 fractures without subsidence, .36 staggered displacement, .44 lower roof and accumulated wall debris, live collapse, filling, whole/section switching and leaving/returning to the question with its own position retained. At 2×, actual collapse advances and accepts pause. In a bounded filling play/pause probe, progress advanced .65000 → .67041 → .67266; the geology counter stayed 2 while water updates advanced 3 → 14 → 15, and the running frame reported 8.6 ms CPU submission / 0 geometry ms. These observations do not establish sustained input latency or GPU frame rate.
- Rapid native seeks .23 → .36 → .85 → .36 returned identical scene pixels in `[60,172,1220,640]`. Chinese and English **390 × 844** checks retained **390px client/scroll widths**, readable captions and working scene/process controls. English phone collapse advanced .36000 → .38317 and paused at .38551; running CPU submission/geometry reported 12.1/10.0 ms. The phone flow lens keeps the weaker ribbon visibly wide enough to inspect. English scenario controls fit within their parent after the final minimum-width/padding correction.
- Earlier current-model zero-input/high-leakage and crater/caldera distinction acceptance is reused; unchanged numeric/model contracts also pass the complete suite. Hidden/reduced-motion/disposal and fallback/retry are covered by focused owner tests. Browser preference emulation, deliberate GPU faults, physical-phone testing and sustained frame-rate profiling were not performed. A first scene entry/view change can still incur construction/shader cost; fixing repeated collapse work does not claim zero startup delay.
- Final QA warning/error logs were empty. The user's existing lake tab and the QA document both reference the current JS/CSS below. Temporary viewport overrides were reset and the temporary QA tab was closed; the user's existing local preview and selected lake question were preserved. Four unrelated buoyancy files were not edited by this contribution.

### Final package and evidence

Source digest: `d3aeba259122908548cdc266ee35856a0f9c59d826788a2194941295ef542e5e`. All **1,461** recorded inputs match disk, including Reader `tool:` inputs. The managed preview returns the same digest and byte-identical topic assets:

- JS `document-volcano-eruption-GYHFXKEG.js`: `ce24f0cd45e2a9329900bba42e846f5edda3c43b3b06b5566df04084d2201e05`.
- CSS `document-volcano-eruption-YN5SVHRT.css`: `04f94ed2896a08bbfb063256503f812233c61d7a52b2565ba1d9e6fb7eebc639`.

Evidence is retained in `/private/tmp/mini-wiki-volcano-feedback-20261021/`: `check-final.log`, `build-identity-final.json`, `browser-state-final.json`, `melt-frame-comparison.json`, `storage-frame-comparison.json`, `lake-seek-comparison.json`, the final same-view ash/fountain pairs, fixed-process moving/paused melt pairs and desktop/phone lake captures. The copied owner CPU reports retain the before/after benchmark and scope. The same managed Reader 0.6.0 remains PID 77387 at `http://127.0.0.1:54650/encyclopedia/`; no second host was started. HEAD remains `06875bd444f8b98a44dea0a46887cd7f6c347392`. This acceptance record is excluded from packaged inputs.

## 2026-10-21 · Transported cooling skin and partly molten ejecta

This continuation replaces the uniformly incandescent moving strip with dark transported skin, irregular compression folds and selected torn openings with recessed orange-red interiors and dark rolled lips. Both material and relief consume the same retained, positive-path skin coordinates. Source ribbon, banks, reach, geological clock, supply/strength and final cooling are unchanged. Surface-only `meltCrust` attributes add 58,176 bytes each of CPU/GPU attribute storage at the maximum four flows, without more vertices, textures, draw populations, RAFs or per-frame arrays. Underground sheets explicitly use `transportMaterial(false)`; storage's crystal framework and melt mask remain unchanged. Cooling appearance is not thermometry, calibrated rind thickness or a fluid solver.

The first actual near view eliminated the bright belt but was rejected as too dark and closed. A bounded second pass adds a few unequal curved hot openings and contact relief, retaining dark crust as the main surface. Final large and small-flow inspection shows fixed rough banks, deforming skin and localized exposed melt instead of continuous yellow illumination. The final molten opening/morphology choices and geological qualifications are documented in both languages in the README, with claim-specific USGS/NPS references.

`ejecta3d.ts` now owns the fragment population's complete appearance/resource lifetime. Two retained instanced families represent smooth unequal hot drops/spindles/short stretched clots and harder ash-rich or seeded solid fragments. The canonical schedule still determines every birth, radius, trajectory, ground intersection and source-strength gate. Flight age darkens a rind and reduces exposed heat; only a seeded still-plastic subset spreads modestly at its original impact site. Cold poses remain fixed. The original fragment budget remains at most 384 actual instances, although each bounded family reserves that capacity. The owner has two geometries, two clast materials, no textures and 89,120 bytes of typed arrays; the molten family has 187 vertices/288 triangles, the solid family 240 vertices/80 triangles. Fountain skin is one separate root-disposed material using the existing jet UVs, heat and admitted detail phase. The root raises jet cross-section sampling from eight to twelve sides with smoother unequal necking, without changing its centerline or strength-dependent height. These are resource bounds, not a GPU timing or aerodynamic/thermal benchmark.

### Final checks and visible acceptance

- `WIKI_READER_ROOT=/Users/g4i/lab/wiki-reader npm run check` passed against the frozen production/test source: **1,060/1,060 tests**, strict types, **7,025** source messages/all **72** English namespaces, **151** image checks, entry/editorial gates, packaging and **71/71** Reader routes. The 24 melt/crust/section and 9 ejecta owner checks overlap this suite and are not added to its count. `git diff --check` passed.
- Final fixed-process flow frames at question .62 / episode .8252 differ within scene-relative bounds `[163,0,789,252]`; the banks and surrounding mountain remain fixed. Paused flow frames are pixel-identical throughout `[60,172,1220,555]`. Both moving and paused states retain the same process position, scenario, strength and lens. The large/small controls preserve that lens; the cooled retained ribbon reaches episode 1 with detail `idle` and no incandescent motion.
- Actual final fountain inspection distinguishes soft elongated/clotted volumes, developing rind and the retained hard subset. With detail paused, .62 → 1 → .62 reproduces identical scene pixels. Mechanism at .22 remains unconnected; returning to styles retains its own .62 position, selected fountain lens, paused detail and WebGL renderer. Warning/error logs are empty on the final QA page.
- Chinese and English **390 × 844** flow near views retain **390px client/scroll widths**, visible hot openings and usable controls. The native English phone process play/pause probe advances question .620 → .635 → .637 and stops process playback while independent liquid detail continues, as labelled. No physical phone, deliberate GPU failure or browser preference emulation was used; the owner lifecycle tests cover hidden/reduced/cold/disposal gates and retained-buffer reuse.
- A temporary missing-module preview error occurred while the root wired the new owner before its file existed. The existing owner was restored immediately; the complete replacement was then integrated and built successfully. Earlier `*-first*`, `*-review*` and HMR-reset images are review history. Final acceptance uses the named `*-final*` pairs on the package listed below.

### Package identity and local publication boundary

Source digest: `98da6deaf23033c3b50bc68e3ec3d03f6c3dbceb7407470a87a986e80b75da6d`. All **1,462** packaged inputs match disk, and the managed preview returns the same digest and byte-identical assets:

- JS `document-volcano-eruption-JQNCYXX3.js`: `2d4392263bd77fdf85223a466171e80e5bd20e3afb0d191bea203aafd4d6df24`.
- CSS `document-volcano-eruption-YN5SVHRT.css`: `04f94ed2896a08bbfb063256503f812233c61d7a52b2565ba1d9e6fb7eebc639`.

Evidence lives in `/private/tmp/mini-wiki-volcano-rheology-20261021/`: full check/build log, build identity, final browser state, moving/paused crust pairs and comparison, ejecta rewind pairs/comparison, bilingual phone captures, owner test/resource reports and scoped source hashes. The same managed Reader remains at port 54650; no new debug host was started. Viewport overrides were reset and the temporary QA page was closed after recording acceptance, preserving the user's existing pages.

The user explicitly authorized a current-time local commit of the completed volcano work. The publication scope is the three volcano directories plus `SKELETON.md`, the required shared English catalog translations and `wiki.json`; it includes the earlier completed local refinements. Four inherited buoyancy files are hash-checked and excluded from that scope. The whole-workspace preview digest still includes those unchanged unrelated working bytes. Git publication is recorded separately in the local receipt after this frozen-source acceptance; no push, deployment, dependency update or editorial-status promotion is authorized or performed. This validation document is excluded from package inputs.
