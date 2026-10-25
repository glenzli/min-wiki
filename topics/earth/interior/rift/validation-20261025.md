# Rift A validation — 2026-10-25

Scope: the fourth interior station and its topic-owned `rift/**` model, geometry, content, renderer, controls and lifecycle; the corresponding seven Earth-interior authored learning/manuscript/narration files were updated together. No Reader, shared driver, route registry, deployment, push or merge is included in this work.

## Automated scientific and state contracts

`node --import tsx --test topics/earth/interior/tests/*.test.mjs`: **20 passed, 0 failed**, including the original eight tests and twelve rift contracts. The added checks cover strict/canonical nested restoration; fixed identities and continuous arbitrary-portion accounting; real no-extension, early-cessation and no-melt outcomes; melting before migration before crystallization; constrained transport; independent F1 progress; unloaded-event suppression; down-dip F1 displacement; matching crust/mantle mesh contacts; marker-bed endpoints on final inclined fault planes; and finite retained geometry.

A regression specifically reads **actual generated mesh positions**, rather than substituting the analytic helper: for both basin crust and lithosphere, at stages 0/53/100, every vertex on the F2 side—including intermediate vertical samples—must remain unchanged within `1e-7` through F1 progress 0→100. This closes the earlier depth-interpolation residual. The marker beds consume the tested `beddingPoint`; 2D and 3D consume the same fraction-based F1 displacement.

`npm run typecheck` and `npm run check:i18n` passed (7136 source messages, 81 English namespaces). `npm run check:entries` confirmed no stale projections in Earth-interior; its overall result still reported independently edited Earth and Earth-life projections awaiting the coordinating agent’s global preparation. This contributor did not rewrite those files.

## Actual standalone browser checks

The source was bundled with esbuild into `/tmp/earth-rift-browser` and actually viewed through localhost port 8779. Environment: Chromium 151.0.7922.173 on Linux, headless SwiftShader, 390×950 and 1280×950 CSS-pixel viewports, emulated DPR 2, touch enabled for narrow cases, and `prefers-reduced-motion: reduce`. These are **desktop software-rendered emulations, not physical-phone FPS results**. The harness uses the real interior adapter and shared Earth styles/ThreeStage; final Reader route behavior is separately checked after integration.

The final four language/width combinations passed **162/162 assertions**, exercising:

- Global→region→material continuity with one identical canvas, fixed Rift A/F1/P1 and twenty tag identities, unchanged geological stage and no horizontal overflow.
- Separate F1 and geological playback: one advances while the other coordinate remains held; explicit pause, parent pause and scale changes do not silently resume either.
- No-melt, restricted underground intrusion/cooling, early cessation and unloaded-event comparisons.
- Complete 2D fallback state and zero canvas, 3D reentry, actual keyboard rotation/zoom and emulated touch storing camera state.
- Full nested-state restoration in the other language, five evidence↔rift station cycles, and final removal of the root/canvas on disposal.

An additional **10/10 browser edge checks** passed: rotate to the globe’s back to hide the site label; Home restores the front; resize retains a correctly sized single canvas; deliberately lose the WebGL context and use the usable fallback; reload with full nested state; cold diagram entry requests no 3D scene chunk; abort the scene import and recover in a fresh document while preserving state. No runtime exceptions occurred in these non-injected scenarios.

## Measured bounded rendering resources

Values below come from actual `renderer.info` exposed on the canvas after the three-scale traversal, at stage 73. Geometry and texture counts are cumulative GPU allocations within this **one retained scene**, not separate contexts. They settle after the three scales have been visited and are disposed on station exit.

| Observation | 390 px | 1280 px |
| --- | --- | --- |
| Actual capped DPR | 1.35 | 1.5 |
| Global drawn triangles | 9,256 | 21,608 |
| Regional drawn triangles | 23,412 | 52,404 |
| Material drawn triangles | 7,232 | 7,232 |
| Geometries after global / regional / material traversal | 6 / 29 / 48 | 6 / 29 / 48 |
| Textures after global / regional / material traversal | 3 / 5 / 5 | 3 / 5 / 5 |

The unminified standalone lazy study entry measured 54,347 bytes and its lazy rift scene 31,302 bytes, excluding the shared Three.js chunk. These are local build-artifact sizes, not HTTP compressed transfer, production bundle or cold network timing claims. Hidden scopes do not rebuild their terrain/normals during another scope’s playback. No frame-rate benchmark is claimed.

## Visual inspection and evidence

Actual renders were inspected in both languages and at both sizes, including the low-relief globe, layered terrain/fault contacts, fitted residual domains, molten and faster-cooled phases, and accessible section fallback. Inspection corrected the initial regular wave texture, white color-space mismatch, crude loose source grains, premature shallow fill, long narrow-screen intrusion labels and the inherited host aspect ratio leaving blank viewport space. All new assets are procedural and original, with no supplied photographs or museum images copied.

Internal-only evidence:

- `/tmp/earth-rift-browser/validation-report.json` and `validate.py`: 162 final assertions and per-scale resource/layout samples.
- `/tmp/earth-rift-browser/edge-report.json`: ten context, network, occlusion and resize assertions.
- `/tmp/earth-rift-browser/final-{zh|en}-{global|region|material}-{390|1280}.png`, corresponding `fast-crystals` and `fallback` captures: inspected renders; screenshots are not uploaded to Library or delivered as user assets.

Remaining integration requirement: render this frozen source in the final production Reader, verify the independent route and parent-museum links with nested state, and include the broader gallery switching/performance report. Passing the standalone tests is not relabelled as that final production acceptance.
