# Earth interior gallery

This topic-owned module connects four questions: what is beneath the surface, how seismic evidence constrains it, how lithospheric plates interact, and how one continental rift connects whole, regional and material scales. `mountStudy(host, context)` in `study.ts` implements `StudyInstance.pause()` / `dispose()` from the parent contract. The parent owns chapter routing, language, URL history and lazy chapter activation. Scientific state and rendering remain in `interior/**`; the independent `earth-interior` manuscript/learning exports provide equivalent static explanations.

## Teaching contract

- **Question:** distinguish composition, physical state and mechanical behavior; use evidence rather than an imagined direct visit to the core.
- **Variables:** selected depth/layer, classification, 3D versus 2D, P/S wave, station angle, boundary case, relative motion, reversible process progress and expanded explanation.
- **Observations:** true-radius shell/cut-face position; a separate enlarged shallow-depth scale; contrasting main-wave arrival patterns; spreading, descending lithosphere, shortening/thickening or horizontal fault offset.
- **Causal order:** infer deep structure from several global wave patterns; distinguish short-time solid behavior from long-time creep; choose boundary prerequisites before observing their outcomes. The no-relative-motion control supplies a counterfactual that preserves the selected progress.
- **Misconceptions addressed:** crust is not lithosphere; mostly solid mantle is not a magma ocean; P is refracted rather than universally stopped by liquid; absence of direct S through the outer core does not alone prove a solid inner core; iron meteorites are not Earth-core samples; four boundaries are different cases, not inevitable stages of one landscape.
- **Limits:** spherical-average structure, representative 30/5 km crust and 100 km lithosphere inset, illustrative non-solved wave paths, and an uncalibrated process coordinate. No stress, mass-balance, geodynamic, seismic-ray, earthquake or eruption prediction is performed. [Source ledger](sources.md) gives exact links and retrieval limitations.

The default inside-Earth view loads a textured, rotatable 3D cutaway on demand. The 90° viewing wedge and two planar radial faces expose the same radii used by the 2D model; no layer is thickened. The 0–300 km inset uses a separate linear depth scale. Internal textures describe material character and do not depict measured mineral grains, actual thermal emission or photographed deep structure. The existing unchanged Earth day map is attributed to Solar System Scope / INOVE, CC BY 4.0, on screen and in the ledger. Visit photographs are not copied into the repository.

## Persisted state

Every meaningful control change emits all **15 keys**, including one bounded `interiorRift` JSON string for the fourth station. Restoration rejects unknown enums, malformed numbers, out-of-range integers and unsupported station angles. A depth takes precedence over a contradictory selected compositional layer. A layer without an explicit depth selects a representative depth.

| Key | Accepted values |
| --- | --- |
| `interiorView` | `layers`, `evidence`, `plates`, `rift` |
| `interiorLayer` | `crust`, `mantle`, `outerCore`, `innerCore`, `lithosphere` |
| `interiorLens` | `composition`, `mechanical` |
| `interiorDepth` | Integer 0–6371 km below the representative surface |
| `interiorWave` | `P`, `S` |
| `interiorStation` | `60`, `120`, `160` degrees |
| `interiorBoundary` | `divergent`, `subduction`, `collision`, `transform` |
| `interiorMotion` | `moving`, `still` |
| `interiorProgress` | Integer 0–100, a teaching coordinate without elapsed-year calibration |
| `interiorExplain` | `0`, `1` |
| `interiorRenderer` | `three`, `section` |
| `interiorYaw` | Integer −180–180 degrees |
| `interiorPitch` | Integer −65–65 degrees |
| `interiorZoom` | Integer 60–160; 100 is the reference camera distance |
| `interiorRift` | Canonical JSON described below; accepted input length at most 2048 characters |

Camera state is saved at gesture end or keyboard key-up. Geometry is retained while controls change and while visiting another station within this module. There is at most one live WebGL stage; pause hides/stops drawing and disposal aborts module listeners, removes the root and invokes the shared geometry/material/texture/context release. There is no continuous animation loop. Context or texture failure switches to a complete usable 2D view with a working retry button. Late texture loads check disposal before changing the scene.

The last paragraph describes the original cutaway station. Entering `rift` now releases that cutaway stage before requesting its own scene. Leaving the rift disposes its scene and two finite clocks; returning restores the canonical nested state. The three rift scales reuse one canvas/context rather than retaining three renderers. There is no idle rift animation; explicit finite playback uses the shared presentation clock, with stepped reduced-motion behavior and offscreen/background pause.

## Rift A: one site and two observation branches

`rift/model.ts` owns the prerequisite comparisons and coordinates. `geometry.ts` owns retained terrain volumes, shared layer contacts, per-block marker beds, authored spherical continents and twenty fitted Voronoi material domains. `scene3d.ts` projects these into one shared ThreeStage. `rift/study.ts` owns the accessible 2D counterpart, bilingual explanation, observations, controls and lifetimes.

- **Continuity:** `Rift A`, inward-dipping normal fault `F1`, and mantle parcel `P1` remain fixed names in all three scales. A common seam function locates the global point and trace. Scale changes preserve geological stage, the local event coordinate and material identities, and pause both clocks. Per-scale cameras persist independently. Labels follow projected anchors; the global label is hidden behind the planet, and long regional labels are replaced by F1/P1 badges on narrow screens.
- **Geological prerequisites:** continuing extension thins the representative lithosphere and lowers a basin; early cessation retains its already developed basin, while a no-extension-from-start control does not produce the sequence. These are comparisons under different premises, not pause commands. The late continuing case explicitly specifies connection to the sea in both global and regional views; no hydrologic solution or real paleogeography is implied.
- **F1 branch:** a selected preloaded elastic-strain event displays locking/deformation, down-dip normal slip and retained offset. An unloaded control cannot play unexplained slip. This 3-second presentation pauses the 18-second geological presentation, and neither duration represents a physical time conversion. F1 deformation fades across the basin, with every actual F2-side mesh vertex fixed across the local event, including intermediate depths. Both marker beds end on their own final inclined fault surfaces. The model does not predict rupture, stress, magnitude, wave speed, hazard or recurrence.
- **P1 branch:** upwelling of predominantly solid mantle only partially melts when the selected path crosses the illustrative conditions. The contrasting path stays solid. F1 progress never affects this melting, transport or cooling. Melt first appears at the source; a draw-range front and moving intrusion prevent premature shallow fill. An open path permits shallower underground intrusion; restricted transport retains material deeper. Neither requires eruption.
- **Material ledger:** twenty fixed tags may split among residual, molten and crystallized portions; those arbitrary portions total twenty before rounding. Four melt-capable tags are an authored teaching choice, not a measured 20% melt fraction. Residual domains stay at the source, while molten portions migrate. Slower versus faster cooling gives larger granular domains or fine grains with dark groundmass, without depicting quartz clusters, identified minerals or an atomic lattice. Chemical partitioning, thermal energy and actual volume/mass conservation are not solved.
- **Assets:** all new coasts, relief, layer textures, grain domains and phase representations are authored procedural assets. No modern Earth map, user photograph, museum artwork, terrain dataset or specimen scan is reused in this rift scene. ThreeStage caps DPR at 1.35/1.5; retained geometries update only for the currently visible scale.

`interiorRift` contains: `scale` (`global|region|material`), integer `stage` and `quake` (0–100), `motion` (`extend|still`), `evolution` (`continue|stall`), `thermal` (`warm|cool`, UI names the condition rather than a measured temperature), `path` (`open|sealed`), `cooling` (`slow|fast`), `event` (`loaded|unloaded`), `focus` (`structure|fault|magma`), `renderer` (`three|diagram`), integer `tag` (0–19), and `camera` (up to three scale-keyed finite vectors, each length 3 and radius 3–16). Unknown fields are dropped. Camera coordinates round to four decimals before emission. Changing a global prerequisite pauses both clocks and resets the local event for a new comparison; changing only scale does not reset either coordinate.

Stable QA selectors: `.rift-study[data-rift-site="Rift A"][data-rift-fault="F1"][data-rift-parcel="P1"]`, **`button[data-rift-scale]`**, `[data-rift-key]`, `[data-rift-action]`, `[data-material-tag]`, and `[data-rift-count]`. Clock elements are distinct: `[data-finite-playback="interior-rift-geology"]` and `[data-finite-playback="interior-rift-quake"]`; both observe `[data-rift-viewport]`. Counts are continuous arbitrary portions, not integer completed-tag classes. Runtime `data-rift-stage`, `data-rift-effective-stage` and `data-rift-quake` expose the distinct coordinates.

Rift tests and actual rendering evidence are recorded in [rift/validation-20261025.md](rift/validation-20261025.md). The original validation below predates the rift extension and is retained under its original scope.

## Validation, 2026-10-25

`node --import tsx --test topics/earth/interior/tests/*.test.mjs`: **8 passed**. Tests cover true radius scaling, actual thin crust, overlapping layer classifications, coarse seismic-arrival evidence, all still/moving boundary branches, reversible process state, strict restoration including camera state, 3D face radii/planes, and bilingual structure. Repository `npm run typecheck` and `npm run check:i18n` also passed after the other galleries became available. Parent integration owns the final production build and full repository gate.

Actual browser checks used local esbuild-bundled source with the shared Earth CSS and ThreeStage, Python Playwright, **Chromium 151.0.7922.173 on Debian 13**, headless **SwiftShader**, Node 24.19.0. They were run at Chinese/English **390×950 and 1280×950 CSS pixels**, emulated DPR 2 and reduced-motion preference. These are desktop software-rendered emulations, not physical-phone FPS measurements or production loading benchmarks.

| Measured observation | 390 px | 1280 px |
| --- | --- | --- |
| Actual rendering DPR | 1.35 | 1.5 |
| Drawn triangles | 21,472 | 50,528 |
| Renderer geometries / textures | 15 / 5 | 15 / 5 |
| First readiness check completed, zh / en | 741 / 406 ms | 902 / 894 ms |

The readiness number is when `canvas[data-render-state=ready]` and the completed day-map resource entry had both been observed on a localhost uncompressed harness; it is not a Web Vitals or first-textured-pixel measurement. Frames stayed at three during the subsequent 400 ms idle check. Entry directly into the evidence view fetched no 3D chunk and created no canvas.

Four-language/viewport combinations passed keyboard rotation/zoom/reset, desktop mouse or emulated two-touch operation, 14-key restore, details persistence, five 2D/3D toggles, four station return cycles, forward/backward plate replay, still-motion comparison and no horizontal overflow. Repeated switches retained one active WebGL context; disposal reduced active contexts to zero. Deliberate WebGL context loss and a separately aborted surface-map load each produced the usable 2D fallback, and retry recovered one 3D canvas. Browser page errors were empty. These checks constrain resource growth but are not a full heap profile.

The actual renders were inspected at `/tmp/earth-interior-browser/3d-en-390-canvas.png`, `3d-en-390-layers.png`, `3d-en-390-subduction.png`, `3d-zh-1280-layers.png`, and the final lithosphere front/back images. The final front/back check verified that cut-face guides are occluded by the globe when rotated to its uncut side. The harness and captured evidence are temporary, outside the repository. No commit, push or deployment was performed by this module owner.
