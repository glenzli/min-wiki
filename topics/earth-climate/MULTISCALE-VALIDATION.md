# Ice-edge → region A → samples: validation, 2026-10-25

Scope is the existing climate gallery. Implementation and revisions used Sol 6.1 Max. No shared renderer/clock, other gallery, public asset, commit or deployment was changed by this revision. The earlier rock-process and local-budget playback evidence remains in [ANIMATION-VALIDATION.md](ANIMATION-VALIDATION.md).

## What is implemented

- Default `view=journey`, `scope=global|region|evidence`; explicit legacy views remain supported. Fixed hypothetical A is 45°N at reference meridian 35°. Global stage and A membership persist across scales. Global cover controls the same site predicate, regional sea-ice context and existing uniform-input reflection budget.
- The original globe has irregular area-preserving polar edges, authored coastal/land relief, continuous ocean shading, detailed ice material, bounded orbit/zoom and a 3D marker plus resize-aware HTML A label. It has no modern basemap or ancient-continent reconstruction. The hypothetical shore field is anchored at A.
- Sea ice comes from seawater; upland land ice comes from snow/firn. A coast section and the refined valley show these as two branches. The valley retains its own budget; its shrinking envelope is not an uphill ice-flow solution.
- P1 sea ice illustrates fixed grain boundaries and partial brine retention/export; P2 snow/firn illustrates changing grain/air-space relationships. Their stable irregular cell fields are authored once. P3 sediment, P4 scratches and P5 modern-core methods reveal observations through a moving cover. Samples are explicitly changed, without claiming that the globe generates measured geological specimens or Cryogenian air.
- Three finite, mutually exclusive presentation clocks: `ice-edge` 18 seconds, `glacier-budget` 12 seconds for twelve rounds, `ice-sample` 12 seconds. These durations are not physical time. All begin/resume restored state paused and stop on scale/view/condition change, hidden document, picture leaving the viewport and disposal. Reduced motion uses discrete stages. Fast outputs silence live announcements until a final paused value.
- Fifteen validated state keys; no persisted playing state. `iceCover` is the global coordinate; `steps` and `glacierPhase` retain the independent local budget; `samplePhase` belongs to the selected observation. A fresh local budget starts at round zero, while explicit saved rounds remain unchanged.

## Checks executed

- `node --import tsx --test topics/earth-climate/tests/*.test.mjs topics/earth-climate/glacier3d/*.test.mjs topics/earth/rocks/tests/*.test.mjs`: **36 passed** after the final T1–T3 addition; climate and its geometry account for 23. New checks include spherical area integration, A's 25/30% crossing, the closed 100% endpoint, independent phases, source-grain/brine identities, reversible sediment reveal, safe restoration and direction markers under balanced/negative budgets.
- Full-workspace `npm run typecheck` and `npm run check:i18n`: passed. Dedicated bilingual key-tree and English untranslated-text checks passed for `journeyContent.json`.
- Climate learning/narration contract: **2 passed**. Local projection of both manuscripts and four spoken/storyboard exports passed; **64 Markdown links / 12 local targets** checked. The parent owns the final unified projection/resources/metadata gate.
- Source ledger contains the actual primary NSIDC/NPS pages read for sea ice, snow/firn, ice movement, mixed deposits, scratches and modern ice-core methods. Mathematical geometry and arbitrary structures are explicitly separate from observed evidence.

## Actual browser environment and results

The standalone harness imports the real studies and Earth CSS at `/tmp/earth-playback-browser/`, port 5254. System Chromium, Python Playwright, headless Linux ANGLE/Vulkan SwiftShader, unthrottled loopback HTTP. Normal-motion desktop/narrow checks cover Chinese and English; narrow reduced-motion checks cover both languages. These are desktop software-renderer and emulated-touch results, not phone-GPU FPS, a cold-network benchmark or a Reader production release.

- At 25% cover A is outside; at 30%, inside with 44.43° at its reference meridian. Expansion reaches 100% and stops; retreat then decreases cover. Local rounds and sample phase do not advance. The coast uses the same retained A/stage.
- Entering region disposes the globe before the valley mounts. Entering evidence leaves no WebGL canvas. Instrumented live contexts never exceed **1**, and final disposal yields **0**. Returning/remounting preserves all separate progress and restores paused state.
- Local budget playback changes its own button/ARIA state, not the global button. Sample playback leaves both other coordinates unchanged. P1 retains thirteen brine-channel identifiers at the endpoint; P2 pores shrink; P3 reveal changes while retaining all 120 clast positions.
- Real WebGL creation denied by test injection exposes an open fallback with usable area/site controls and a visible global retry. Enabling WebGL and using that retry restores the globe. URL state retention is a parent Reader integration check; the standalone harness does not simulate route persistence.
- Host-height resizing updates A's badge projection without a camera gesture. Narrow layouts have no horizontal overflow; sample labels, interpretations and limits are readable DOM text outside the SVG. Actual normal/reduced renders for the globe, coast/valley and P1/P2/P3 were inspected.
- Synthetic `document.hidden` events verify immediate clock stop and no visibility-return autoplay. A second headless page did not produce a real OS background state, so that action is not claimed as a background-browser pass.

| Observed budget | Desktop 1280 viewport / DPR1 | Narrow 390 viewport / DPR2 emulation |
| --- | --- | --- |
| Global main-view triangles, instrumented draw calls | **31,168** (30,400 sphere + 288 marker + 480 ring) | **12,864** (12,096 + 288 + 480) |
| Valley main-view triangles, including T1–T3 | **56,244** | **22,628** |
| Global drawing buffer / CSS box | 1208×755 / 1208×755 | 445×378 / 330×280, approximately capped DPR1.35 |
| Valley drawing buffer / CSS box | 740×462 / 740×462 | 445×337 / 330×250 |

The globe's two original maps are 512×256 each, baked once and reused without per-frame generation. Over **2,592–2,603 ms**, the normal global sample produced **25 full state writes** and **72 instrumented triangle draw calls**. Raw GL allocations remained **13 buffers / 6 textures / 4 programs** before and after; texture counts include two authored maps and renderer defaults. These are update/allocation observations, not measured phone frame rates. The final ocean-only material refinement retains these resource sizes and topology.

## Evidence artifacts

All paths below are in `/tmp/earth-playback-browser/`:

- `journey-validation.json`: full chain, independent clocks, restoration, single-context/disposal and resource sample.
- `journey-final-validation.json`: complementary language/viewport matrix, reduced motion, resize badge, hidden-event contract, fallback/retry.
- `journey-budgets.json`: actual global/valley draw-call triangle counts and drawing buffers.
- `journey-frozen-global-{1280,390}-en.png`: final continuous-water globe, inspected after the last material refinement.
- `journey-final-region-{1280,390}-en.png`: same A's coast and refined valley, inspected at narrow width.
- `journey-final-P1-390-en-rTrue.png`, `journey-final-P2-390-en-rTrue.png`: irregular microstructure diagrams, inspected.
- `journey-evidence-390-en.png`: evidence reading layout; final layout hides global controls outside the global scope while retaining the compact A/stage strip.
- `/tmp/earth-climate-static-validation.json`: seven projected static-file checksums and link validation.

The parent will verify the final Reader build, URL flushing, production theme, cold/weak-network behavior and unified repository gates. No additional climate simulation, paleogeographic reconstruction, physical ice velocity, real sample diagnosis or geological dating is claimed.

The last direction-marker correction, balanced/negative-budget views and revised valley draw counts are detailed in [Tracer validation](TRACER-VALIDATION.md). Runtime was frozen before the parent started unified production verification; subsequent changes were limited to this evidence record.
