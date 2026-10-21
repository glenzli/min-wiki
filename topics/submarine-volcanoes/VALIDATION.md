# Local submarine rendering validation — 2026-10-21

## Summit and outlet geometry checkpoint

This local follow-up addresses the uniform round summit and raised pillow tiers. Only `geometry3d.ts`, `scene3d.ts`, focused geometry tests and topic documentation changed. `model.ts`, materials, camera/light parameters, the 24/13 supply histories and finite plume supports remain unchanged. No host, build output, commit, push or deployment was changed by this task.

- The selected deep case has unequal extrusion shoulders, a local narrow cleft and low slope-aligned pillow lobes. Old pillows no longer cover the very center with a uniform crown; a bounded subset of the existing rubble marks broken edges.
- The selected shallow fragment case has a finite solid floor, a broken irregular lip and concentrated angular tuff debris. Only 18 inherited pillows remain on its lower flanks. The lip is a conditional fragment-producing scene, not a crater required by shallow depth.
- The island uses bounded off-axis outlet/flow-exit relief with strengths from its existing fragment/cap deposits. The same monotone height mapping applies to every contact; the authored x section and ordered shared contacts remain intact. Early pillow geometry rests on contact seven, so later deposits bury it rather than carrying it onto the final cap.
- The fixed 32-ring/80-sector topology concentrates radial samples near the outlet. The exposed faces use identical radial coordinates. Geometry/instance counts, texture allocations, finite clocks, camera controls and disposal ownership do not grow.

The final focused submarine run passed **24/24 tests**, including new checks that the actual solid vertices and exposed face agree after radial redistribution, the selected outlet shapes differ, the shallow lip is breached with a solid floor, active lobes contact their supporting slopes, and later fragment/cap deposits leave early contacts fixed while burying them. Existing oriented closed topology, shared/ordered contacts, limited-supply non-emergence, finite cooling/particles and seeking tests still pass. Strict topic TypeScript with the repository ES2022/Bundler/DOM/isolated/strict settings also passed. Browser inspection of the changed summit shapes belongs to the root integration checkpoint; the prior accepted material/framing screenshots below do not validate this new geometry.

| Current input | SHA-256 |
| --- | --- |
| `geometry3d.ts` | `5d4156b94524a14a67232e075be6bf50cba0760fd6d7260e537e07dc445fdf04` |
| `scene3d.ts` | `4521c084bfe00bb28d9f16811753939a41ea650b6e0355e91e3b189921951bba` |
| `tests/geometry3d.test.ts` | `9b5e11c46fe9d4ba2646b63a2ae7a6d7c2b09a8f62355111a170fb0919f5b97f` |
| unchanged `materials3d.ts` | `080f22393f603acf1ff399ec9262eb7fb473354942716d843cd7a52544ee177a` |
| unchanged `model.ts` | `204b1405218f55414a7c976d4fea942b13637237a404c1776e75dbb500c12c63` |

The source review used NOAA PMEL morphology and northern Cleft observations, the 2019 West Mata AUV/ROV paper, and the USGS shallow-fragment explanation linked in the README. The latter is an older overview; its obsolete lack-of-direct-deep-observation statement is not adopted. The references support the range of possible forms, not the exact selected cleft, crater/lip dimensions, terrain or numerical fluid behavior. Nothing here establishes a universal large crater or forbids naturally rounded pillow mounds.

## Prior documentary refinement checkpoint

The subsequent local material pass changes only `geometry3d.ts`, `materials3d.ts`, `scene3d.ts`, the focused geometry tests and this topic's documentation. It preserves the authored scientific model and the public `SubmarineScene` interface. No commit, push or deployment was made. The integration owner performs the new build and browser inspection; earlier screenshots below do not establish this refinement's current appearance.

- Four fixed, asymmetric pillow buffers replace the single flattened sphere. Their feeding necks, broken lips, local shrink joints and lower silhouettes are shared by at most 220 retained instances and 14 active lobes. Different current lobes retain their own cooling uniforms; stable retained groups do not acquire a second clock. Current and retained forms enter the same rock surface rather than sitting as isolated rounded bags.
- Basalt uses predominantly matte dark rind, small glassy patches and sparse interrupted contraction fractures. Continuous geometric folds and shader striations were removed after the first actual preview produced a fabric-like result. Fine material noise and all sea-surface slope bands are filtered by the pixel footprint. Mean sea level and opaque rock depth remain unchanged.
- The existing 16 finite plume supports retain internal light attenuation and the scene's local ROV direction. Eight underwater supports now overlap along a narrow source and bending rising column rather than aggregating into one detached ellipsoid; their shared emission envelope comes from the existing finite packet schedule. A smooth illustrative source anchor consumes the current pillow pile geometry. The density volumes are optical supports, not eight tracked material identities or a measured vent. Nested detail tears the upper column's edges. Underwater and air density remain separate even after domain warp; the cutaway and opaque source-depth stop still apply.
- The final deep vent camera retains the original close rock view, lifts its target according to the readable plume core and retreats only 10% while that plume is visible (about 0.54 world units of lift at 35%). The local searchlight is lowered 0.6 world units, aimed at the original pile center and compensated from intensity 48 to 56; deep ambient light, background, exposure, materials and the no-sunlight rule are unchanged. An earlier conservative AABB/corner fit with an 18% field margin was rejected after preview: it moved too far back and lost readable foreground detail. That fit is historical and is no longer the current implementation.
- The noise volume remains 32³ bytes, created once per scene. The four pillow prototypes use 48 × 28 sphere subdivisions; shared buffers are held in the scene's disposal set. Retained instances use four allocations of 55, and each instance allocation is explicitly disposed. Rubble (420), settling fragments (49), plume steps (40 desktop / 28 narrow) and the at-most-640-px plume target keep their previous bounds. These are allocation bounds, not measured performance.

Focused source checks for this checkpoint:

- `node --import tsx --test topics/submarine-volcanoes/tests/model.test.ts topics/submarine-volcanoes/tests/scene.test.ts topics/submarine-volcanoes/tests/geometry3d.test.ts`: **21/21 passed**. Added coverage checks deterministic asymmetric extrusion, the sphere seam, finite shape/support bounds, seeking backward, the source support touching the same current pile anchor and overlap between all successive rising supports.
- Strict topic TypeScript check passed with the repository's ES2022, Bundler, DOM, isolated-modules and strict settings, including `scene3d.ts`, `materials3d.ts`, `geometry3d.ts` and its tests. The integration owner runs the final whole-repository checks after the parallel contributions are complete. A temporary unary-exponent syntax error was corrected before the passing checkpoint.
- Tracked and new source whitespace checks reported no issues. No shared build output or preview service was changed by this material task.

Source SHA-256 at this checkpoint:

| File | SHA-256 |
| --- | --- |
| `geometry3d.ts` | `9b584dce35f14f7464ec24df77d19429ec6340e622bb0ac6ffb377b3f14a4765` |
| `materials3d.ts` | `080f22393f603acf1ff399ec9262eb7fb473354942716d843cd7a52544ee177a` |
| `scene3d.ts` | `1bf99ea7d943d14a5b2e0c3852184e94b2ffe07d524a408cbc358e437817c6c5` |
| `tests/geometry3d.test.ts` | `674c274636496ed5070d0d1960b7f817d1a38215068b87c6ce8551e8cc82e03d` |
| unchanged `model.ts` | `204b1405218f55414a7c976d4fea942b13637237a404c1776e75dbb500c12c63` |

The tests establish bounded deterministic geometry and retained scientific contracts. They do not establish documentary visual quality, fluid dynamics or measured optical coefficients. The first new preview (`/private/tmp/mini-wiki-volcano-refinement-20261021/submarine-deep-first-review.png`) showed glossy bag-like pillows and a detached soft plume; it motivated the second material/source refinement described above. The root's actual second preview (`submarine-deep-final.png` in the same directory) rendered the new shaders and showed the improved matte rock and connected rising plume; that direction was accepted, with a remaining plume-head crop. The conservative fit in `submarine-deep-framed-final-zh.png` then kept the head but was rejected for excessive distance and dark foreground. The final closer camera/searchlight correction passed the same 21 focused tests and strict topic typecheck. The root's actual final Chinese 35% screenshot, `submarine-deep-final-accepted-zh.png`, was accepted with readable rock crust and a complete plume. The deep 35% → 15% → 35% pixel comparison, shallow/island views, bilingual desktop/mobile checks and clean-page console evidence belong to the root integration checkpoint.

Reference pages and source image captions checked on 2026-10-21 are linked in the README: NOAA PMEL pillow morphology and West Mata imagery, and NOAA's Vailuluʻu pillow-lava entry. No external media were downloaded or bundled. Optical detail and off-axis topography remain illustrative; the selected low-effusion deep flow does not inherit explosive behavior from the West Mata reference.

## Prior reconstruction checkpoint

This is local preview evidence, not acceptance of photorealism, measured bathymetry or a deployment. No commit, push or deployment was made. Existing land-volcano and unrelated buoyancy work was preserved.

## Changed scope

- Added topic-owned closed 3D deposit geometry, matching exposed contacts, stable pillows/debris, actual storage volumes and a finite feeder. The authored `model.ts` remains unchanged. The existing 24-unit sustained / 13-unit limited-supply comparison and erosion timeline are retained.
- Added opaque basalt/tuff and cooling-seam materials, water-path attenuation, searchlight-only deep lighting, a fixed mean sea surface and finite 3D particulate/condensation density. The cutaway explicitly removes front water and rock; it is not an underwater photograph or a subsurface scan.
- Integrated one scene into the existing case/view/progress controller, with orbit/keyboard/reset and source-owned disposal. The existing SVG remains a fallback; retry uses a fresh canvas and retains the last scientific frame. Bilingual labels and qualifications were updated.

## Automated checks and source identity

- Full repository `check` passed **926/926 tests**, all build gates and **71/71** Reader routes at source digest `098e9a7f0859221e94813828316fc3866813b34b34e8fa1d2a2f4e5d037642ef`.
- Final changes after that run were optical refinement (searchlight intensity, plume texture, filtered water normals/opacity and distant surface extent) and the fallback's accessible label. The scientific model and deposit topology inputs did not change. Existing full-suite evidence was reused for those unchanged contracts.
- The final focused run covers submarine model/SVG/3D geometry, land eruption regressions and compatibility routes: **54/54 passed**. The submarine subset is **18/18**, including six new 3D tests.
- The final packaged build passed strict types, bilingual coverage, image/entry/editorial checks and Reader compilation. Final source digest: `0d2bac63c72386031ed2a14c5367cb3e682e1721fc1422966161b4d48757a5f9`.
- The local Reader 0.6.0 preview at `http://127.0.0.1:64494/encyclopedia/` serves the same digest and byte-identical topic JS/CSS as `dist`. Final JS: `document-volcano-eruption-S63BYAYI.js`, SHA-256 `2269cfbda06970752d847625f7cb3577c1cfad73901cf44429530971c84d80a7`. CSS: `document-volcano-eruption-IV2XHFL3.css`, SHA-256 `682f0ba8f90e9d5a9597b336ab51e400ab76df0a21598ea793a58569586bb004`.

The new tests establish the retained exposed profile, limited-supply non-emergence, oriented closed topology, bounded buffers, ordered/shared contacts during erosion, replay determinism, grounded settled fragments and finite separated particle media. They do not validate a fluid solver, temperature, calibrated depth or real geology.

## Actual browser inspection

Chinese and English were checked in the in-app browser at desktop size and 390 × 844, using the compiled local Reader page. Both narrow layouts reported document width and scroll width of 390 px. The English view selector can scroll horizontally to its later lenses.

- Deep water: illuminated rough opaque pillows, narrow incandescent fractures, particulate plume, orbit, keyboard rotation/zoom, reset and cooled endpoint. No solar light is enabled for this environment.
- Shallow water: submerged cone, finite fragments and separate below-water particles / above-water condensation. The sea and distant floor were refined after the first visual pass to remove the visible finite-patch edge and ripple aliasing.
- Island: 78% sustained supply exposes only the upper part of the edifice; the 100% limited-supply case stays below the fixed surface. Exposed contacts and storage retain actual 3D depth.
- Deep vent 35% → 15% → 35% reproduced identical 1054 × 750 canvas pixels: raw SHA-256 `8d9eea6a0058ae1f912be1365fea49d8ea3570058e9b9e876b738c008719e503` for both captures. Later sea-surface changes do not render in that deep vent view.
- Switching from the sea to the land eruption and back retained sea progress at 35%; the page kept its three fixed canvases and exactly one visible scene. Land 3D cutaway/HUD remained available. This is a DOM/lifecycle check, not a live GPU-memory benchmark.
- A fresh page loading the final build compiled and displayed the water material with **no console warnings/errors**. The older iterative tab retained a historical shader error from a transient naming conflict; that conflict was corrected before the final build and the clean-page check.

Artifacts are under `/private/tmp/mini-wiki-submarine-3d-20261021/`: desktop/mobile screenshots, `resource-audit.json`, `replay-audit.json` and `fresh-page-console.json`. Build and focused-test logs are in `/private/tmp/mini-wiki-submarine-final-build.log` and `/private/tmp/mini-wiki-submarine-final-focused.log`; the earlier full check is `/private/tmp/mini-wiki-submarine-check.log`.

## Limits

No actual-phone/GPU performance benchmark or forced WebGL-loss/retry injection was performed. Context cleanup/fallback were inspected in source; no claim is made that those failure paths were exercised in a real device. Surface shading, particle trajectories and radial depth extension remain illustrative. Visual quality still requires the user's judgment of this local first version.
