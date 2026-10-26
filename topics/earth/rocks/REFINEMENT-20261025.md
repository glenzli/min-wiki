# Local refinement and validation — 2026-10-25

Scope: `topics/earth/rocks/**` and `topics/earth-rocks/**`; base `705f68bb44d7cf8da77a9f40cf87c83b5a4f8bff`. This is a refinement record, not an editorial completion or publication approval.

## Changed contract

The 24 retained batches now partition a closed irregular volume. `parcelGeometry.ts` clips a common hull into full-volume fracture chunks and supplies fixed origin coordinates to the material. `parcelFrame.ts` retains whole, slope, basin and cemented arrangements from the committed history; transport no longer returns to the pre-transport position when committed. Poses, water context, matrix and flow phase meet the committed endpoints. Solid-state texture changes preserve deposited geometry; melting retains the remaining solid's pre-melt texture. Origin marks are not surviving mineral crystals, grains, atoms or a chemical budget.

The close-up now has subdued terrain, terrain-clipped water banks, finite transport streaks, contact shadows, an irregular cement matrix, aligned representative recrystallization bands and a textured molten lens. Whole-rock shadows conform to terrain; fragment shadows disappear when a whole rock reforms. The setting is stated beside the picture. The local window is not a measured landscape, a burial cross-section or a temperature display; the separate 2D setting diagram supplies the spatial explanation.

## Scene review

| Scene | Current inspection and refinement |
| --- | --- |
| Initial exposed granite | Actual Reader view inspected; closed natural hull and origin-bound crystalline material replace parallel extruded slices. |
| Weathering | Actual 100% endpoint inspected; volumetric batches open and turn onto their faces. Midpoints are deterministic authored releases, not fracture mechanics or gravity integration. |
| Transport/deposition | Actual 50% view and committed endpoint inspected. River surface meets terrain instead of sitting below it; final basin arrangement and displayed streak phase persist. |
| Lithification | Actual 100% and restored committed view inspected. Fragments compact locally into an added irregular matrix instead of rebuilding the original stone or receiving a rectangular slab. The displayed chunks are not literal sand-size grains. |
| Metamorphism | Actual solid endpoint inspected. Consolidated placement persists; new bands use aggregate coordinates. The representative banded result does not imply every metamorphic rock is foliated. |
| Melting | Actual 50% and 100% views inspected after material revision. Remaining solid keeps pre-melt texture, added matrix recedes, and a base-contact melt lens replaces regular orange waves. Shading is illustrative, not thermometry or a liquid-flow solution. |
| Slow/fast cooling | Both 100% outcomes inspected; slow cooling shows coarse silicic rock and fast cooling fine rhyolitic rock. A saved slow-cooling future was replaced through Back → fast cooling; history became `weather, transport, lithify, heat, melt, fastCool`. |
| Burial, uplift, stay | Existing condition and identity contracts retained and source/model-tested. These change setting or preserve the parcel; the 3D close-up does not calculate overburden, tectonic motion or dates. |
| Seven hand specimens | Granite, basalt, sandstone, limestone, slate, marble and gneiss inspected in the actual viewer. Common scene height keeps controls nearby. Material differences and slate's thin form remain legible; no scan/identification guarantee is made. |
| 2D and supplementary views | 3D → 2D setting → 3D retained the six-step route, with zero/one WebGL canvases as appropriate. Four mineral sketches and the same-composition cooling comparison were inspected; these remain explicitly schematic. |

## Evidence

- `node --import tsx --test topics/earth/rocks/tests/*.test.mjs topics/earth/systems/tests/*.test.mjs`: 28 passed, 0 failed across the two owners. Added checks cover full-volume finite chunks, source coordinates, committed transport/deposit continuity and retained solid geometry. They test geometry/state contracts, not empirical geology.
- Final `npm run typecheck`, `npm run check:i18n` (7,522 messages / 83 English namespaces), `npm run check:entries` and scoped `git diff --check` passed. Local Markdown targets: 43 checked across nine paired scoped documents. The root task owns all-topic tests, review gates and the production build.
- Actual Reader: `http://127.0.0.1:55291/encyclopedia/`, in-app browser, observed 1280×720 screenshots, DPR 1.5. No viewport override was set by this child. Root owns the final 390×844 Chinese/English matrix.
- Keyboard specimen orbit changed the saved camera from `[2.8,1.9,3.5]` to `[3.19886,1.9,3.13964]`. Seven specimen selections retained one canvas, two uploaded geometries, zero image textures and 12,564 rendered triangles. These are bounded local counters, not performance benchmarks.
- Final molten view reported `ready` and no console errors. All seven final specimen images were visually inspected. English restored history kept seven stops, cursor 3, the saved future and only valid underground processes; no desktop horizontal overflow was observed.
- Screenshots: `/tmp/earth-rocks-ocean-refine-20261025/`: `rocks-zh-transport50.jpg`, `rocks-en-restored-deposit.jpg`, `rocks-zh-melt50-final.jpg`, `rocks-zh-melt100.jpg`, `rocks-zh-slow-cool100.jpg`, `rocks-zh-fast-cool-contact-final.jpg`, `specimen-*.jpg`, `mineral-*.jpg`, `rocks-zh-cooling-comparison.jpg`, `rocks-zh-2d-context.jpg`. Earlier same-directory pictures can precede final polish; the named final files identify the reviewed revision.

Owner runtime/test input fingerprint (SHA-256 of sorted path/file-hash lines for `.ts`, `.css`, `.json`, `.mjs` in the two scoped directories): `d42ccf9f6233ee46bcaadb66c963a78b4efbe0125a59a413ca7be3e643b50da8`. Shared Reader/style inputs are tracked by the integrator separately.

## Scientific and delivery limits

The procedural partitions, aggregate form, textures, melt color and transport path are original qualitative teaching geometry. No collision, fluid, reaction, pressure/temperature, grain-size, time or chemical-conservation solver was added. [NPS sedimentary processes](https://www.nps.gov/subjects/geology/sedimentary.htm) was rechecked for compaction/cement filling spaces; [sources.md](sources.md) retains the broader claim audit. Both native manuscripts and learning content qualify the batch/matrix representation. Existing URLs and the state schema are unchanged.

No commit, push, installation or deployment was performed. Final mobile, reduced-motion/media, context-loss and whole-Reader acceptance belong to the parent integration record; this note does not reuse the older Linux harness as evidence for the new renderer.
