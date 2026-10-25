# Life gallery validation · 2026-10-25

Implementation and revisions used the assigned Sol 6.1 Max workstream. Scope stayed within the life gallery. Main/reader/registration/cover and the static manuscript work were coordinated with their separate owners. No commit, push, merge or deployment was performed by this workstream.

## Automated checks

- `node --import tsx --test topics/earth-life/tests/*.test.mjs`: 12 passed, 0 failed. Includes bounded state, stable per-community identity, extinction links, persistent anaerobic roles, twelve-remain partitions, nested sampling, hard/soft filtering, finite sequence identity and endpoint equivalence, reversible explanatory scrubbing, outward stem normals, deterministic surfaces and GPU geometry budgets.
- `npm run typecheck`: passed after the eight-gallery route integration.
- `npm run check:i18n`: passed, including the life gallery namespace and paired `w(zh, en)` strings.

## Real Chromium checks

Isolated module harness at `http://127.0.0.1:5294/` used the actual `mountStudy` plus the shared Earth styles and shared Three stage, bundled with esbuild. This is additional module evidence; the parent integration work owns the final production Reader route and full-build checks.

| Check | Result |
| --- | --- |
| Chinese and English at 1280 and 390 px | No page errors or horizontal overflow; three workbenches usable. |
| Seven community compositions | Actual SVG screenshots captured; microbial/Ediacaran/coal/steppe checked visually, and Cambrian checked in both phone languages. |
| Evidence lens changes | Focus identity unchanged; community focus restored on revisit. |
| End-Permian lost trilobite focus | Same ID retained after switching snapshots; lineage ghost and disconnected relations correctly described. |
| Fossil sampling | At the endpoint with fixed source and rapid burial: small search 3/12, wide 8/12. Enlarging collection does not restore excluded sources. The new finite sequence starts with sources ready rather than displaying the endpoint immediately. |
| Plant switching and detail view | Three original exhibits render; Chinese/English phone and desktop screenshots captured. |
| Whole-plant framing | Initial clipped lycopsid terminals corrected with a more distant camera; final desktop and phone screenshots inspected with the full outline inside the stage. |
| Bark shading | Exterior winding corrected, normals welded by position; an automated outward-normal check now guards this failure. |
| Steady state | Frame count stayed 4 → 4 across a 650 ms idle interval in each of the four language/viewport combinations. No continuous RAF loop. |
| Keyboard orbit | ArrowRight advanced the on-demand frame count 2 → 3. |
| Leaving plant workbench | 0 canvases after exit, in all four combinations. |
| Late 3D import | Switch away while the chunk is delayed: fossil workbench remains active and 0 canvases mount. |
| 3D chunk failure | English 390 px: recovery message, 0 canvases, 2D disclosure opened; other content usable. |
| Full reload retry | Removing the simulated failure and clicking retry restores `seedfern` + `surface`, with exactly 1 canvas. |
| WebGL context loss | Retry exposed and 2D disclosure opened; no late scene recreation. |

Final whole-view rendered triangle counts:

| Exhibit | Phone | Desktop |
| --- | ---: | ---: |
| Lycopsid | 7,812 | 9,140 |
| Calamite | 19,200 | 26,448 |
| Seed fern | 22,046 | 52,766 |

All are below 25k phone / 60k desktop. Each exhibit uses 3–4 active geometries and 0 textures in the captured renderer counters. Detail geometries are smaller. These are software rendering statistics, not scientific dimensions.

Evidence files reside at `/workspace/earth-validation/life/`: `browser-report.json`, `edge-report.json`, bilingual `*-390-*.png` and `*-1280-*.png`, seven `community-*.png`, and the final lycopsid surface view. The parent can inspect or preserve them with the broader delivery validation bundle.

## Finite fossil-filtering animation

The requested animation is a finite presentation of the existing taphonomic rules. It uses the shared `finitePlayback.ts`; no autonomous organism behavior or plant growth is added. State now has eleven bounded keys including integer `fossilProgress` (0–100), and playback always restores paused. Checkpoints 0, 33, 67 and 100 represent source, deposition, recognizable preservation and collection, without a geological time scale.

Final isolated Chromium checks cover Chinese/English at 1280/390 px. The English phone run uses actual browser `prefers-reduced-motion: reduce` emulation:

- Initial, paused, completed, fully offscreen and externally paused runs keep the SVG draw counter unchanged while idle. Completion automatically stops; reset and four direct checkpoint controls remain available.
- The twelve actor DOM nodes remain the same during playback. Frames only update their transforms, opacity and authored damage symbols; no SVG is rebuilt while the timer runs.
- Source-excluded items stop at their original source. Items without recognizable modeled preservation fade before the preservation station. Preserved but uncollected items stay at preservation. Outcomes are not revealed before the relevant stage.
- The exposed/small endpoint reports 1/12; changing to rapid/wide at the same endpoint reports 8/12. Previous/next restores 67 → 100 without replacing identities. Condition changes pause and preserve the observation progress.
- Reduced motion reaches exactly 33 and 67 without intervening traveling frames. Manual scrubbing still works. The fractional shared-clock checkpoints are rounded onto the gallery's explicit integer checkpoints.
- Revisiting and remounting preserve the stored progress and restore paused. Disposing removes the module and stops writes.
- No page errors or horizontal overflow in the four viewport/language combinations. The long English preservation label was shortened and wrapping enabled after inspecting the actual phone screenshot.
- Output and rapidly updated result regions use `aria-live="off"`. A dedicated announcement region is off while playing and returns to polite for a concise stage/count report when paused or finished. Outcomes also have distinct stop positions, glyphs and text labels.

To test a *fully* offscreen target in the short isolated desktop document, the browser test adds temporary trailing whitespace before scrolling. Without this test-only space the plot still intersects the large viewport at the document bottom, correctly allowing playback. The production code observes the actual plot rather than the full long manuscript.

Animation evidence resides at `/workspace/earth-validation/life-animation/`: `report.json` and start/middle/end PNGs. The assertions check identity, counters, finite completion, checkpoint values, restoration, accessibility states, removal and overflow. Full production Reader delivery checks remain the parent integration task's responsibility.

`extra-report.json` additionally checks native keyboard scrubbing (47 → 48), switching from playing into the 3D plant view (clock paused, phone lycopsid 7,812 triangles), idle 3D frames (2 → 2), and returning to the filter view (0 canvases). A browser visibility-event probe with an explicitly simulated `document.hidden` signal stops the clock and does not resume it when the signal clears; this probe is distinguished from a physical background-tab test. `en-390-final-controls.png` records all three current experimental conditions in the collapsed summary and the corrected English stage labels.

Scientific limitations remain intentional: authored shapes and color, no specimen scan or measured allometry, composited regional communities rather than invented co-occurrence censuses, categorical ecological status rather than extinction percentages, and deterministic taphonomic teaching rules rather than calibrated preservation probabilities.
