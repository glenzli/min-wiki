# Original hypothetical glacier valley

The public interface is `mountGlacier3D(host, label, onUnavailable) → update(mass, observationRound=0), pause(), resume(), dispose()`. The optional round supports three direction-only markers without changing the mass budget. The gallery's existing `glacierBudget` and bilingual qualification remain authoritative. No renderer, router, controls, mass model or shared stage was duplicated.

## What the geometry shows

`landform.ts` defines one deterministic terrain in arbitrary illustration coordinates. A broad lower trough sits between irregular connected peaks, craggy sidewalls and a headwall. Its lower relief joins a short cut edge and closed underside, rather than floating above a separate slab. The starting camera looks upstream from the valley mouth; orbit is restricted to above the ground. Ridge shape and material detail remain fixed when mass changes.

The same bounded mass input (0–180 water-equivalent teaching units) drives one continuous ice body. A shared coordinate function supplies the top, enclosed sides/bottom, rounded downstream nose, two marginal debris ribbons and the stream's origin. Length, width and thickness are qualitative monotonic illustrations, not a calibrated ice volume, stress field, velocity field or terminus forecast. Zero mass hides this selected ice body. Fixed pale patches on high terrain are contextual snow material, outside the selected glacier budget.

The ice surface contains bounded partial fractures, with darkened incision interiors and fine stable spatial material detail. The snout has outward-facing thickness geometry. Marginal debris is drawn only on the lower reach; there are no invented medial moraines without tributary convergence. The ribbons indicate present marginal debris, not a simulation of older moraine positions or sediment conservation. The stream is a static contextual surface, not a second water-budget model.

All meshes, shaders, relief and materials are original program code. The gallery cover was inspected for art direction only; no cover pixels, exhibition photographs, scans, third-party models or downloaded textures are used. This is a recognizable hypothetical landform, not a named glacier reconstruction or measured terrain.

## Rendering and resource lifetime

The existing `earth/threeStage.ts` owns the renderer, OrbitControls, limited DPR, on-demand frames and global disposal. This gallery sets its camera, lights and above-ground orbit limit. One 512×512 directional shadow map anchors the ice and mountain surfaces. It refreshes only when the ice amount changes; idle scenes and camera-only changes reuse it. The shadow map is explicitly disposed before shared-stage teardown.

| Tier | Main-view triangles | Geometry objects | Image textures | Shadow texture |
| --- | --- | --- | --- | --- |
| Desktop | 56,244 | 8 | 0 | One 512×512 map |
| Narrow/coarse pointer | 22,628 | 8 | 0 | One 512×512 map |

The main-view triangle counter is the shared stage's `renderer.info` value. A shadow refresh additionally draws its terrain and ice-top casters; that extra pass is not included in the displayed main-view triangle count. The scene has no independent animation loop; the gallery can request bounded mass observations through its finite presentation driver. DPR remains the shared cap: 1.35 on narrow/coarse-pointer devices, 1.5 desktop maximum.

`geometry.ts` keeps dynamic position, normal and index buffers instead of replacing GPU attributes on every input. A repeated identical mass does no work. Mass rewind reproduces the same geometry. Material noise is anchored in object space. No per-frame random geometry, background timer or fluid animation runs. Pause cancels work; a later explicit gesture or visible-page restoration can resume it. All gallery listeners, meshes/materials, shadow resources and the shared stage/context are released on dispose.

The gallery's optional finite budget playback changes this same scalar mass through `update(mass)`; it neither scrolls material textures nor adds an ice-flow or erosion solution. [Animation validation](../ANIMATION-VALIDATION.md) records resource counters during playback.

T1–T3 use the existing observation round in fixed down-valley coordinates. Their shared low-face arrow shape adds one instanced draw call and eighteen main-view triangles. Markers advance when mass is balanced, while the ice envelope/front independently consumes the original mass shape. Outside the drawn ice they become gray † identities with an explicit untracked-fate note, without turning into water or restarting. Stable IDs and rewind reproduce the same teaching snapshots; no displacement, velocity or time calibration is claimed. See [Tracer validation](../TRACER-VALIDATION.md).

## Morphological references

Browsed and checked on 2026-10-25; original explanatory interpretation, not copied media:

- [USGS — Geology of Glacier National Park](https://www.usgs.gov/geology-and-ecology-of-national-parks/geology-glacier-national-park): broad U-shaped glacial troughs, cirques, hanging valleys, arêtes and horns provide morphology context. No park-specific dimensions or chronology were imported into this hypothetical terrain.
- [NPS — Glaciers and glacial landforms](https://www.nps.gov/subjects/geology/glacial-landforms.htm): ice, erosion and transported sediment belong to the same glacial landscape; geometry here illustrates relationships without calculating erosion.
- [NPS — Lateral and medial moraines](https://www.nps.gov/articles/lateralmedialmoraines.htm): marginal debris differs from medial debris created at glacier confluences. Lower-reach placement avoids depicting an arbitrary set of central dark lines.
- [NPS — Glacier ice features](https://www.nps.gov/subjects/glaciers/glacier-ice-features.htm): ice-surface features provide visual context. The authored fractures are illustrative; no strain solution or precise crevasse spacing is claimed.

## Validation, 2026-10-25

- `node --import tsx --test topics/earth-climate/tests/*.test.mjs topics/earth-climate/glacier3d/*.test.mjs`: 11 passed, 0 failed, including five new geometry/visual-contract tests.
- Tests cover valley cross-section and joined edge, fixed terrain under mass changes, finite geometry/normals, monotonic bounded shape inputs, the scene budgets, buffer identity across updates, deterministic rewind, and outward-facing snout normals.
- Typecheck passed after this implementation. A later full-workspace invocation encountered the concurrently unfinished `topics/earth-life/content.json` import; this unrelated file is outside this task. The scoped scene typecheck (`tsc --noEmit` with strict ES2022/Bundler/DOM options and `scene3d.ts` as its entry) passed.
- `npm run check:i18n`: passed at 7,074 source messages / 79 namespaces. No authored language text was added to this scene.

Actual browser evidence uses system Chromium, Python Playwright, headless Linux ANGLE/SwiftShader, unthrottled loopback HTTP and reduced-motion mode. These are desktop software-renderer measurements and emulated narrow/touch viewports, not phone-GPU FPS or cold-network benchmarks.

The actual gallery `study.ts` was bundled in an isolated harness. English and Chinese at 1280×900 and 390×900 were checked at initial mass 42, growth to 180, zero remaining mass, rewind to 60, keyboard orbit/zoom/reset, touch rotation/pinch, hidden/visible recovery, idle frames and six history/glacier disposal/re-entry cycles. One canvas, seven geometries and one shadow texture remained after re-entry. Main-view screenshots for initial, full and empty states were visually inspected; whole-page checks found no horizontal overflow. No glacier JavaScript or shader errors occurred. Separate malformed history-SVG-coordinate console messages were reported to the parent, who assigned that existing `study.ts` fix to its owner; it was not changed here.

Direct-scene measurements: initial ready 1,518 ms desktop / 583 ms narrow in one shared browser session; warm `update(mass)` synchronous CPU work across 12 changing masses had medians 8.3 / 4.5 ms and maxima 9.8 / 7.8 ms. These timings exclude GPU render duration. They do not establish sustained FPS. The full-study ready measurements were 799/765 ms for English/Chinese desktop and 524/510 ms for narrow pages in another shared browser session.

Artifacts are outside the repository in `/tmp/earth-glacier-refine/`: `browser-results.json`, `performance-results.json`, `final-first-{1280|390}-{en|zh}.png`, `final-growth-*`, `final-empty-*`, and `final-mass-{0|1|10|42|60|120|180}-{1120|390}.png`. The parent task owns the production Reader rebuild and final integrated screenshot. No commit, push, deployment or external publishing was performed here.
