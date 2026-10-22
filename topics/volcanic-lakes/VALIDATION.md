# Volcanic-lake initial continuity repair · 2026-10-22

Current checkpoint: Dev Mesh owner `codex-lake-continuity`, run `lake-continuity-20261022`, inherited baseline `67caccfa105ed4f61ab9be12ca6198d0e5a16175a64063a6810ef68ece8dbc8b` on HEAD `e1d91046ef9f9c6d1eb3ddba6c424521649462db`. Earlier local openings, rain, melt withdrawal, block identities, sediment sources, lake balance and filling gates are preserved. Work remains local, without commit, push, deployment, new host or browser control by this owner.

## Source cause and implemented change

The brown slab was the visible `storageBuffers` half-column created by `Lake3DScene.createUnderground` and shaded throughout with `reservoirMaterial`. Outer source strata were annular; the central support had no corresponding visible contacts. Independent host/core relief tapered toward zero on either side of the join, adding an initial geometric seam. Changing color alone would not restore the absent strata or common observation surface.

The renderer now consumes `storageLayerBuffers`: eleven clipped source-contact units between the same roof base and mush floor, with unused vertices removed once at preparation. These units and the four roof layers join the outer host's corresponding source strata before motion. All share a layer-independent source cut, canonical `LAYER_FACIES` and source material coordinates. `supportMaterial` composes the same host shader and adds emission/melt only within irregular lobes; unmelted framework retains host facies. The previous single support half-column is not retained as a second rendered wall.

The existing withdrawal/subsidence gate updates cached scalar contacts and retained positions/normals. The three local openings remain visible during collapse and close at settling. Fault cut depth still follows fracture state; source layer identities, clast/deposit state and the final terrain/water intersection are unchanged. No new process clock or repeated topology creation is added.

## Focused checks

49 tests pass: 29 geometry, 6 model/content, 5 render-work, 5 support-opening and 4 continuity/material/resource tests. The last suite directly checks the actual retained geometry at p=0/.08/.16: roof, support and basement cover the outer host's entire interval at both joins, with no interval gap, and all front vertices meet the common source cut. It checks actual new support layers through .23/.30/.36/.44/.48/.85 and seek, source/UV identity, local opening at .36 and final closure. It invokes the real material compile hooks and actual `createUnderground`/`updateSupport`/`dispose` methods without WebGL to verify binding, resource identity, finite indexed geometry and valid normals.

```text
node --import tsx --test topics/volcanic-lakes/tests/model.test.mjs topics/volcanic-lakes/tests/geometry3d.test.ts topics/volcanic-lakes/tests/supportGeometry3d.test.ts topics/volcanic-lakes/tests/renderWork.test.ts topics/volcanic-lakes/tests/continuity3d.test.ts
```

Affected strict TypeScript passes with repository ES2022/Bundler/strict settings and `src/reader.d.ts`, including the facade, geometry, material, renderer, science and all four TypeScript test files. Scoped `git diff --check` passes. These checks prove source/geometry/binding contracts; actual GPU shader compilation and visual acceptance remain with the root's unified build and browser pass.

## Finite resource and update cost

The visible support changes from one 4,570-vertex body to eleven fixed units with 44,260 vertices and 54,494 triangles. Cached source contacts occupy 1,770,400 bytes across the units. The underground composition has fifteen tracked geometries and eight materials, versus the prior five geometries/five materials: +10 geometries, +3 materials and +39,690 support vertices. Full roof/cut roof, water, rain, arrows, texture, reflector and shadow resources are unchanged. No object population grows with progress or seek count. Actual owner tests observe exactly one dispose event for every tracked underground geometry/material/texture, including after a repeated dispose call.

A narrow Node/macOS CPU observation called the actual `updateSupport` on retained Three buffers, omitting WebGL/render/shaders/layout. After three warm-ups, 24 collapse samples at p=.28–.46 averaged 2.51 ms, with sample P95 3.25 ms and maximum 4.71 ms. This measures support deformation and bounds only; it is not total scene cost, browser FPS, loading time or a performance guarantee. Filling, repeated stable frames and water-only conditions invoke no support updates, as separately covered by the draw-gate tests.

Root should inspect p=0/.08/.16 for coherent initial strata and cut depth; .23/.30/.36/.44 for progressive broken faces/openings; .48 for closure and .85 for filling without rock/support work. Slight section orbit must preserve contact identity, and switching back to whole-lake/smaller-crater must retain the prior branch contract. Chinese/English desktop/mobile, GPU warnings, fallback/retry and final build remain root-owned. Source qualifications still distinguish enlarged local separations and unmelted framework from measured voids, gas pressure, rock mechanics or bedding preserved inside molten magma.

---

# Earlier local separation checkpoint · 2026-10-22

The following report records the pre-continuity source. Its single-body counts are superseded above.

Local contribution on HEAD `e1d91046ef9f9c6d1eb3ddba6c424521649462db`, accepted Dev Mesh baseline `b9d9f986b202cf31f4c4d2643c513285c8f6f854e97c50d38f60f7457ad115df`. The inherited README, 2D and 3D rainfall changes are preserved, including 480 retained 3D rain segments. This owner changes only `topics/volcanic-lakes/`; it does not commit, push, deploy, regenerate shared output or control a browser.

## Changed contract

`supportGeometry3d.ts` owns three fixed, compact local separations, bounded fracture relief and refinement of the teaching cut's perimeter. It adds no timer, random history, GPU owner or unbounded cache. Withdrawal opens the separations; the existing phase of each retained roof block closes its own contact late in descent. Finite floors, rear slopes and intact side shoulders retain crystals/melt around each opening. At p=.36, at least one mouth remains more than .4 display units below its roof. At p>=.48 all roof/support contacts have closed.

The actual roof x/z footprints, source contacts, four-layer identities, displacement field, source-linked clast motion and final terrain/water intersection remain unchanged. Perimeter refinement samples rough cut faces rather than spanning an entire section edge with one polygon. Fault relief removes a bounded amount of extra foreground material along the two actual ring-fault contacts; it leaves the whole-lake solids unchanged. The recessed broken-rock floor and marker end at the moving roof base rather than continuing through the basement. Source normals are recomputed for non-affine cut surfaces. A section-only inspection fill and more neutral lithic tones expose the underside and sidewalls.

The enlarged separations and observation cuts are explanatory geometry, not measured void dimensions, gas/air composition, pressure, collision or rock mechanics. They do not imply that an entire magma reservoir must evacuate into an air-filled cavern. Equivalent Chinese/English qualifications are maintained in README and lake science terms. The root owner separately owns the nearby integrated caption and actual browser acceptance. The smaller crater does not use this structure. The retained 2D fallback remains a simpler mechanism drawing; its inherited denser rain is unchanged.

## Focused evidence

Passed 45 tests: 29 geometry, 6 model/content, 5 render-work and 5 support-opening tests.

```text
node --import tsx --test topics/volcanic-lakes/tests/model.test.mjs topics/volcanic-lakes/tests/geometry3d.test.ts topics/volcanic-lakes/tests/supportGeometry3d.test.ts topics/volcanic-lakes/tests/renderWork.test.ts
```

Evidence includes separated mouths and exact rear/side closure, finite support remainder, real retained-buffer recesses, p=.36 visibility, final closure, fixed whole-lake volumes, fault termination, fracture-only cut updates without roof translation, valid normals, deterministic rewind and unchanged terrain/water/branch contracts. Render-work tests prove that settled filling and changed water conditions do not update rock/support, while repeated frames do no geometry or render work. Withdrawal updates only the support-contact buffers and the existing markers, without rebuilding the mountain.

Affected strict TypeScript passes with the repository's ES2022/Bundler/strict settings and `src/reader.d.ts`, including the facade, geometry, support, materials, renderer, science and three TypeScript test files. Source whitespace checks pass. The root owner owns the unified build and complete i18n/integration gates.

## Resource bounds and remaining acceptance

The fixed roof buffers contain 27,128 full-view vertices and 18,280 cutaway vertices across the same 28 layer units; the retained support body has 4,570 vertices. Progress, seeking and view changes do not add topology. Spatial support relief is cached with the retained contact samples. No geometry-object population, texture, reflection target, shadow target, particle population, process RAF or asynchronous geometry queue is added. The one extra directional fill has no shadow map and belongs to the existing section group. The GPU resource/disposal owner remains `Lake3DScene`.

Canvas `supportUpdates` joins the existing read-only work diagnostics and does not steer the experiment. There is no current-source CPU/GPU benchmark or frame-rate claim; the historical measurements below belong to the earlier source snapshot.

Parent browser review should inspect section p=.23/.30/.36/.40/.44, final closure at .48 and filling at .85/1; orbit slightly to see rear/side closure; seek back and replay; then switch to whole-lake and smaller-crater views. Also check the unchanged zero-input/high-leakage cases, Chinese/English desktop and 390px, pause, failure/retry, no related renderer warnings and inherited rainfall. The focused tests establish implementation contracts, not visual acceptance or empirical science. Current-source human/browser acceptance is separate from this local contribution.

---

# Historical collapse-performance checkpoint · 2026-10-21

This retained report describes the pre-opening source snapshot. Its counts and timings are historical and are not reasserted for the 2026-10-22 geometry above.

This checkpoint changes geometry3d.ts, scene3d.ts, their focused geometry/render-work tests and this topic's two developer documents. Model, content/locales, the unified controller, Reader, host and dist are unchanged. There is no commit, push or deployment.

## Cause and changed contract

The previous draw gate classified every progress change as a rock change. Even after subsidence ended, filling rebuilt eleven host units, both variants of twenty-eight block layers, storage, two deposits, terrain normals and bounds. Host units repeatedly evaluated the same source terrain and contacts; per-vertex array literals and motion objects increased garbage. A stable frame still recalculated the water intersection. Camera-control events could render partway through the same draw.

The revised owner separates shape, fracture, withdrawal and water work. Rock depends on branch/formation/subsidence; changing only water conditions or progress after settling does not rebuild it. Repeating the same progress and conditions performs no geometry update or render. Fractures and withdrawal markers retain their stages without deforming the roof early. A draw suppresses intermediate control-event renders and performs one final render. Only changed geology/fractures mark the static shadow map dirty; changing water still renders its required reflection once in the final scene render. No reflection target, particle count or process RAF is added.

Retained buffers own immutable spatial terms and contacts. Eleven host units share one bounded surface evaluation. Block motion coefficients and six failure states use one bounded scalar cache. Purely affine block normals transform from their sources; rough cut faces continue numerical normal updates and preserve safe normals at pinches. Water surface, cap and shore share one intersection calculation per frame. The model's clocks and source/final positions remain intact.

Three bounded slips with intervening rests and modest intermediate inclination replace continuous elevator travel. Source-linked clasts slide and roll to persistent talus; no independent time, random debris rain, missing rock or underground air chamber is introduced. Slip counts and timing are explanatory geometry, not measured earthquake or landslide chronology. README records equivalent Chinese/English qualifications and primary USGS/NPS sources.

## Measured CPU evidence

Reproducer: /private/tmp/lake-render-cpu-profile.mjs, Node v24.13.0, macOS arm64. It invokes the actual Lake3DScene.draw, production geometry helpers and Three buffers. The CPU fixture retains 138,580 vertices in 124 geometry objects; it omits the decorative sky mesh and renderer.render, so it measures neither WebGL/shaders, reflection cost, layout, input latency nor browser FPS. Real visual/interaction acceptance belongs to the root task.

One warm-up precedes each case. Playback cases have 16 samples and rapid seek has 8; the first sample repeats the warm-up state. Values are milliseconds, rounded. P95 is the measured sample quantile, not a performance guarantee.

| CPU case | Before mean / P95 | After mean / P95 |
| --- | ---: | ---: |
| Collapse, p .27–.48 | 417.76 / 474.14 | 12.29 / 18.81 |
| Filling, p .50–.95 | 454.20 / 487.73 | 6.64 / 7.33 |
| Stable p .85 | 28.32 / 28.81 | 0.003 / 0.013 |
| Alternating seek | 410.07 / 481.08 | 14.55 / 24.40 |

In the final filling case there are zero rock updates and zero terrain normal computations. Stable frames have zero geology/water/bounds/normal work. CPU fixture preparation was about 719 ms before and 329 ms after; this excludes a real browser's first WebGL context and shader creation and must not be used to explain the separate first-entry delay.

Raw machine-written reports:

- /private/tmp/lake-render-cpu-before.json
- /private/tmp/lake-render-cpu-final.json

V8 allocation sampling uses an 8,192-byte interval and includes allocations subsequently collected by minor/major GC. Twelve filling frames yielded estimated totals of 2,208,237,320 bytes before and 19,593,424 bytes after. These are sampled allocation estimates, not live-heap, retained-memory, leak or peak-RSS measurements. Source maps place some samples on the transpiled first line; function names/call stacks remain in the JSON. Residual scalar water intersection work remains measured rather than represented as free.

## Bounds and lifecycle

No GPU geometry/material/texture or particle population was added. The scene retains one WebGL renderer, one 256² procedural texture, one 512² reflection target, one 2048² shadow map, 400 instanced stones, 120 rain segments and sixteen arrows. Full/cut solids remain fixed buffers. Prepared spatial/contact/source-normal data occupy about 5 MB of extra bounded CPU storage; around 1 MB of immutable host sampling is module-shared and the rest is tied to retained buffers. The caches do not grow with progress or seek count. The 192 wall-source identities are fixed. Disposal and fallback/retry retain the prior GPU lifetime contract.

Read-only canvas data: progress, geologyUpdates, waterUpdates, lastGeologyMs, lastDrawMs. Durations are local CPU draw diagnostics, with the last draw including submission to the renderer but not waiting for GPU completion. They do not drive playback. Same-state draw reports zero geometry work. There is no queued process calculation; seek computes the requested frame directly. stopMotion still cancels the finite camera transition, while process-playback cancellation belongs to the unified controller.

## Focused checks and remaining acceptance

Passed: 38 tests (27 geometry, 6 model/content, 5 render-work).

```text
node --import tsx --test topics/volcanic-lakes/tests/model.test.mjs topics/volcanic-lakes/tests/geometry3d.test.ts topics/volcanic-lakes/tests/renderWork.test.ts
```

Coverage includes original phase/numeric contracts, no-input/high-loss basins, finite solids and shared contacts, valid normals, exact same-terrain water intersection, fixed geological section camera, material identity, source-linked failures/talus, deterministic rewind, cached/direct surface parity, bounded slips/rests, stable/filling invalidation, condition changes including mutated input objects, branch switching and latest-frame seek without queued work.

Affected-source strict TypeScript passed for the lake facade, geometry, materials, renderer and both TypeScript test files using the repository's ES2022/Bundler configuration. Focused source whitespace checks pass. No broad build was run by this owner; the root task owns the complete integration gate.

This checkpoint has not yet received current-source browser or human visual acceptance. Root must check continuous collapse playback, immediate pause, rapid seek, view/study switching, zero supply/high leakage, caldera/crater separation, Chinese/English desktop/390px, context fallback/retry, renderer warnings and actual startup versus stable-frame costs. Test and CPU results do not establish rock mechanics, calibrated chronology, mass conservation, optical accuracy or documentary realism.
