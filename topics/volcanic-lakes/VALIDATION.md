# Volcanic-lake collapse performance · local contribution · 2026-10-21

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
