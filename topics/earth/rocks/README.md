# A rock's journey / 一块石头的旅行

This gallery is mounted by `topics/earth/main.ts` through `mountStudy(host, context)`. Its owned paths are only `rocks/**`; global navigation, URL writing, the study contract and the shared Three.js stage are parent-owned.

The core question is which conditions can change one parcel of rock material, and which let it remain. A granite-like silicic parcel begins exposed at the surface. Weathering separates material in place; transport/deposition moves it into a basin; lithification adds a separate cement context. Existing rock must be buried before the model offers underground metamorphism or melting. Metamorphism remains solid. Cooling returns melt to igneous rock; the comparable silicic pair is granite/rhyolite, not granite/basalt. Uplift/exhumation permits renewed surface processes. Every state also permits a stay; no compulsory cycle or completion score exists.

`model.ts` owns prerequisites, route/history, bounded restoration, preview endpoints and the qualitative cooling comparison. `scene.ts` consumes those same snapshots for continuously draggable Canvas teaching geometry and fixed origin tracers. Optional finite playback observes the selected step over seven display seconds; this compressed presentation time has no geological rate calibration. It starts paused and stops at 100%. A step is committed only with the explicit completion button; playback never chooses another process or completes a compulsory cycle. Revisiting an earlier stop preserves the saved forward route until a new step is completed, which then replaces the future branch. The 48-step bound keeps route/resource size finite.

The specimen view separately offers granite, basalt, sandstone, limestone, slate, marble and gneiss. It defaults to the lazily imported `specimen3d.ts`, which uses the parent `threeStage.ts` for a single render-on-demand context. `specimenGeometry.ts` creates irregular fractured hand specimens with bounded relief, merged normals and separate slab morphology for slate. Stable spatial procedural materials reveal representative interlocking crystals, grain/cement relations, groundmass/pores, bedding, cleavage, veins or mineral bands. They are original illustrative specimens, not scans or guaranteed identifications. The Canvas specimen illustration and all prose remain available when WebGL or its module cannot load; users can explicitly choose the 2D view.

Both languages have the same observation prompts, mechanism explanations, process prerequisites, relative time scales, evidence prompts, misconceptions, examples and limitations in `content.json`. Additional disclosure panels compare mineral/rock/ore terms, selected minerals, cooling textures, deeper mechanisms and sources. Dedicated mineral structure, identification and resources live in the linked `/topics/earth-minerals/` gallery. Related authored links remain app-root relative for the Reader's base/language conversion.

## State contract

Every user-visible scientific/view change emits a full `Record<string,string>` via `onStateChange`. Restoration accepts only the following validated values:

| Key | Values / bounds |
| --- | --- |
| `rockPath` | JSON array of known, sequentially possible process IDs; at most 48 entries and 1,800 characters. An impossible or malformed path restores the initial rock. |
| `rockCursor` | Integer stop index from 0 through path length. |
| `rockProcess` | A currently available pending process, or empty. |
| `rockProgress` | Integer 0–100; only meaningful for a valid pending process. |
| `rockView` | `journey` or `specimens`. |
| `rockSpecimen` | One of the seven specimen IDs. |
| `rockMineral` | `quartz`, `feldspar`, `mica` or `calcite`. |
| `rockCooling` | Integer 0–100 for the independent qualitative comparison. |
| `rockDeep` | `0` or `1` for selected-process conditions/evidence. |
| `rockPanels` | Integer bitmask 0–15 for the mineral, cooling, deeper and source disclosures. |
| `rockRenderer` | `3d` or `2d` specimen view. |
| `rockCamera` | JSON numeric `[x,y,z]`, radius 2–7 with a small serialization-rounding tolerance. Invalid positions use the exhibit view. Camera saves at gesture end or keyboard release. |

The 24 material-origin markers are never claimed to be conserved mineral crystals or atoms. Their identities persist through illustration changes, while real metamorphic reactions, melting, dissolved products, sorting and added cement are expressly qualified. This model does not solve mass budgets, pressure/temperature, flow, cooling kinetics or dates. Detailed claim-to-source provenance is in [sources.md](sources.md).

## Lifecycle and budgets

- The process uses the shared presentation-only `finitePlayback.ts` driver. Explicit play/pause, rewind, 10% advance and scrub consume the existing `frameStates`; no scientific clock or new material model is introduced. Playback is transient and never restored as active.
- Continuous writes are requested no faster than 80 ms desktop / 125 ms narrow or coarse-pointer. Reduced motion uses ten discrete stages. The process picture is the visibility target; leaving the view, host pause, backgrounding, scrolling the picture away and disposal stop playback. No automatic resumption or looping occurs. Final pause/end emits a complete state.
- Native progress output is silenced during playback and announces a final value when paused; controls retain keyboard focus and visible pressed state.
- No 3D import or WebGL context is requested until the specimen view is opened in 3D mode. It is retained paused during local 2D/journey viewing, and destroyed when the owning study is disposed.
- Geometry tier: 12,500 specimen triangles desktop, 4,500 for narrow/coarse-pointer devices; the contact ellipse adds 64. Two geometries and zero image textures are resident.
- Shared stage limits DPR to 1.35 for narrow/coarse-pointer devices and 1.5 for desktop; rendering is requested only after changes. Intersection, visibility, page pause and explicit re-entry are handled without a free-running loop.
- Shape/material replacement disposes previous resources. `dispose()` aborts all study listeners, disconnects its resize observer, invalidates late imports, clears Canvas surfaces and destroys the shared stage/context. A late import after a view switch does not create an invisible context.
- Canvas descriptions, native selects/ranges/buttons, 44px target sizes, visible focus, keyboard camera controls, touch rotation/pinch, explicit view reset and reduced-motion styling are provided.

See [VALIDATION.md](VALIDATION.md) for actual tests, browser evidence and the limits of the measurements. No commit, push or deployment is performed by this child gallery task.
