# Volcano performance and stellar-life continuity — 2026-10-24

## Scope and learning contract

All volcano renderers are covered: eruption/mechanism/styles, shield/composite mountain history and ecology, scoria/Omuro, crater and caldera lakes, hydrothermal water, and deep/shallow/emerging-island submarine cases. Existing marine visitors, wave detail, light occlusion and the scientific models remain owned by their topics. The dirty marine baseline was reviewed and preserved; it is not attributed to this task.

Stellar life asks how the same star changes, and why its center and outer material can move in different directions. Readers retain the same mass branch, progress, camera controls, physical comparison and reversible playback. Observable changes are envelope size, detached material, central heating, delayed gas emission and eventual cooling. The key misconception to prevent is an entire giant ball collapsing into a white dwarf while an unrelated bright shell appears. The geometry and enhanced colors are teaching choices, not an observed three-dimensional reconstruction, stellar-structure solution, calibrated spectrum or hydrodynamic calculation.

## Implementation

- The remaining five volcano renderers join the existing `FrameRender` presentation queue. Camera changes, model snapshots and independent detail motion share one pending browser presentation. Disposal cancels it before GPU release; hydrothermal retries create a fresh queue. Lake reflection and submarine scene/plume/composite passes remain intact.
- Mountain-history projections retain only their exact current progress/settings/view snapshot. Marine geometry retains its current frame and its object-bound surface caches. Repeated snapshots avoid redoing geometry/ecology/camera-follow work. No progress rounding, historic snapshot cache or changed geological clock is introduced; sea/visitor phase and future admission remain independent.
- Emerging-island lava skins retain their current triangle locations and double-precision barycentric weights. Each update still reads the current terrain heights and recomputes vertices, cooling attributes and normals in the original operation order. Route, front, width, source and in-place station changes invalidate the basis. The bounded current cache is at most 1,315,123 bytes (about 1.25 MiB) and is cleared on disposal; 38 original output snapshots are byte-identical.
- Solar life retains seven legacy stops and adds continuous subphases: giant tip → core helium burning and contraction → AGB expansion → wind loss → exposed central heating → ionized surrounding gas → white-dwarf cooling. The same numbered detached parcels move outward independently of the shrinking photosphere. A faint scattered-light contribution reveals neutral outflow before its ionized emission rises.
- The photosphere reaches the displayed core radius before the solar material crossfade, avoiding a second sphere inside a transparent sphere. The current 48³ field expands its coordinate map around detached parcels and their whole splat support; GPU scale and cutaway mapping follow it, preventing polar ejecta from being cropped by the nursery box. The outflow fits the default camera; the closer remnant view starts after most shell emission fades. Screen traversal remains 84 seconds, with 22 seconds for the remnant, without calibrated elapsed ages or cooling temperatures.
- Massive-star physical readouts and comparison drawings share 3D's late collapse interval. Their ejecta depart after collapse begins; a black-hole locator fades in. Selected massive/very-massive examples do not imply that every collapse produces a bright explosion or an accretion disk. The low-mass distant-future branch still has neither a red giant nor an explosion shell.
- Late solar and massive phases share a rounded epoch rather than implying a planetary nebula glows for hundreds of millions of years. Child and academic reading use the current solar subphase, so changing modes cannot replace helium/AGB/wind explanations with a stale generic paragraph.

## Scientific basis and limits

[Karakas & Lattanzio, giant-star evolution](https://ned.ipac.caltech.edu/level5/March15/Karakas/Karakas2.html) supports the core-helium and subsequent shell-burning sequence. [ESA/Hubble's preplanetary-nebula observation](https://esahubble.org/images/potw1123a/) distinguishes material already shed and reflecting starlight from later UV-ionized gas emission. [Schröder & Smith's solar model](https://arxiv.org/abs/0801.4031) illustrates why the second giant maximum, solar mass loss, planetary fate and an eventual bright solar nebula depend on the model. These sources constrain the causal sequence; they do not determine the authored screen coordinates, radii or timing.

## Validation

The before snapshot contains the accepted marine dirty bytes, plus the identified `e1a1ac1` base for unchanged lake sources. `scripts/visual-performance.ts` uses the same diagnostic for before and after: CSS 800×450, matching per-renderer drawing buffers, DPR 2, 16 finite camera/snapshot bursts and two idle frames. Detail clocks are held only in the diagnostic. Counts are actual WebGL draw entry calls, not an FPS estimate or physical-phone benchmark.

The final browser measurements are below. `flow` and `ash` are controls already optimized in `e1a1ac1`; they are retained to check that the diagnostic did not broadly change the workload. The other ten cases reduce actual draw entry calls by 55.4–75%. All before/after canvas sizes, buffers and DPR match; both runs make zero draw calls in their two idle frames. The CPU column is the median time in the finite update handler, not frame rate, total GPU time or a guarantee for other devices.

| Case | WebGL draw calls, before → after | CPU median ms, before → after |
| --- | ---: | ---: |
| flow | 512 → 512 | 5.7 → 5.8 |
| ash | 624 → 624 | 5.8 → 5.7 |
| shield | 640 → 160 | 26.0 → 21.2 |
| composite | 640 → 160 | 24.4 → 19.7 |
| ecology | 320 → 80 | 19.0 → 9.5 |
| scoria | 280 → 125 | 6.4 → 6.1 |
| lake-crater | 2397 → 816 | 3.2 → 1.6 |
| lake-caldera | 4935 → 1680 | 9.1 → 6.9 |
| heat | 1280 → 320 | 2.3 → 1.6 |
| ocean-deep | 10839 → 3576 | 5.4 → 3.1 |
| ocean-shallow | 1377 → 513 | 4.2 → 3.7 |
| ocean-island | 4408 → 1552 | 64.5 → 46.2 |

The island case remains the heaviest CPU case, so this is a measured improvement rather than a claim that all devices sustain a target frame rate. Its triangle-basis microbenchmark isolates a larger local saving, but only the complete browser measurement above is used for the user-facing result.

Final source validation: 1,474/1,474 repository tests pass; TypeScript, all 7,377 localized messages across 74 namespaces, 151 image deliveries, authored entry projections, editorial status and 73/73 Reader routes pass. The old eruption-release test double was completed with its presentation-queue stub; its production disposal behavior was not weakened to accommodate the test. The frozen eight inherited marine source/test files outside the current scene change remain byte-identical; the two inherited marine documentation files were not edited by this task.

The complete Reader artifact has source digest `f8a8d5b749a214c767bbe97eac7545b2777e799de26dfa8a9a56692cbcf0689e`, 73 entries and 1,562 verified input files. The read-only local preview at port 5194 serves that artifact; its HTTP manifest matches the build receipt. The workspace source preview at port 65181 is retained separately. No current-task commit, push or deployment was performed.

Actual desktop browser checks cover all volcano renderer families, seek to start/end and camera/view changes. The packaged marine scenes additionally cover island waves and occasional visitors, sparse pioneer plants, return to eruption, deep-water section and shallow-water context; console warnings/errors are absent. Packaged stellar checks cover solar helium contraction and matching academic explanation, neutral-to-ionized outflow, reverse playback with retained progress when switching to radius comparison, final cooling, and the corrected massive-star collapse without a giant transparent photosphere around the compact core. Chinese and English were inspected. A screenshot is saved as `stellar-life-solar-final-20261024.png` in the task's visualization directory.

Responsive validation limit: the browser viewport capability accepted a 390×844 override but the actual native page remained 1099×1106. A reset/reapply gave the same result. No 390 px/mobile pass or physical-phone performance claim is recorded; the original page, query, language and normal viewport were restored.
