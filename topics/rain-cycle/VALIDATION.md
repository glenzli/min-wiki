# Water-cycle upgrade validation · 2026-10-22

## Scope and identity

Local, uncommitted upgrade of `topics/rain-cycle/**`. Base revision at claim: `e1d91046ef9f9c6d1eb3ddba6c424521649462db`. Dev Mesh owner `codex-four-water`, run `four-topic-20261022-water`, claim `rain-cycle-upgrade`. No dependency, catalog, shared-platform, glacier-budget or groundwater-budget source changes.

## Implemented contracts

- One retained Three.js scene, one supplied parent clock, 100 persistent instance slots. Camera/view changes retain the batch, progress, selected identity and independent child state.
- One teaching heightfield supplies terrain, the submerged river/outlet bed, downhill water courses, test-patch rill, glacier and water contact. Spatial store counts keep overland runoff on the surface, water in the lake/outlet inland until crossing the coastline, and final river storage upstream of the lake mouth.
- Same-cohort enlarged pore section retains IDs/progress/surface conditions with fixed grains and open gaps. The existing cloud microscope remains independently owned by `rain-formation` and receives parent progress. Neither detail creates another batch.
- Groundwater and glacier experiments retain independent budgets and clocks. They start paused, retain state on chapter changes and use existing bounded lazy lifecycle.
- Main stage uses a single Reader toolbar and fitted flex sizing with no nested width-driven aspect ratio. Transport remains outside the visual. A deterministic SVG fallback and explicit retry remain available; SVG visibility uses the actual `hidden` attribute.
- All new scientific explanations, scenarios, qualifications and static learning content have matching Chinese/English fields. Terrain, particle size, cloud volume and compressed time remain explicitly illustrative.

## Focused evidence

Executed 2026-10-22:

- `npx tsc --noEmit --pretty false`: passed after the 3D controller and geography integration.
- `node --import tsx --test topics/rain-cycle/tests/geography3d.test.ts`: 9/9 passed. Covers deterministic spatial identities/counts, submerged full ribbon edges, upward-facing water/ice mesh normals, downhill runoff/glacier paths, exact river contact, rainfall/soil contact, reversible path junctions, coast-before-ocean accounting, fixed pore gaps/IDs, bounded terrain and camera anchor projection, and bilingual question contracts.
- Combined topic and directly consumed model suites: 70/70 passed, including groundwater, glacier, lazy-study, original watershed, cloud microphysics, shallow infiltration and river/sediment contracts. A subsequent focused 9/9 run adds the mesh-normal regression after the browser found the initially reversed ribbon winding.
- `node scripts/check-i18n.mjs`: rain-cycle produced no missing, unwrapped or invalid messages. The shared-worktree run initially failed on in-progress `flight` and `lightning-thunder` namespaces; root integration owns the final global gate.
- Learning projection used the repository's exact `prepare-entries.mjs` logic narrowed to `rain-cycle`, omitting shared resource generation. Topic-only projection and check passed; other topics and `src/platform/learning/resources.ts` were not written.
- `git diff --check -- topics/rain-cycle`: passed at the implementation checkpoint.

## Visual and integration acceptance

The parent integration task owns the shared browser and final Reader build. An early browser check found the fallback SVG over the GPU view because assigning `hidden` on an SVG creates no HTML hidden attribute. The controller now uses `toggleAttribute('hidden', …)` and the topic's `[hidden]` style; the parent verified the overlay is gone. A later check found river/glacier ribbons culled from above because their triangle winding faced down. Winding is corrected and all four production ribbon types now have an upward-normal regression test. These targeted fixes are not a claim that the final visual matrix has passed.

Parent integration checks and source fixes:

- Actual Chinese/English Reader pages at 1280×720 and 390×844: overview, ground/ice close views and local cloud/pore entries. The ground patch is visibly clear after thinning nearby vegetation; shoreline, water, tree materials and pixel framing are presentation changes only.
- Actual soil/paved/dry comparisons, reverse-to-start and forward-to-end, and the same-cohort pore counts preserve the batch. Advancing the upper ice slider changes the batch's stores while the independent glacier experiment remains paused at year zero. Groundwater also mounts paused at step zero.
- Narrow-screen stage height and transport required selectors that survive Reader CSS scoping and toolbar relocation. The final mobile scene is approximately 374px tall; controls remain outside it and neither language overflows horizontally.
- Failure now redraws the current batch into SVG instead of revealing an old pre-GPU frame. Explicit retry disposes the old renderer and replaces its canvas before constructing a new one. Context restoration waits until Three.js's event listeners have restored its internals and never treats a renderer-less canvas as recovered. These lifecycle paths were source-reviewed; forced GPU loss/retry was not induced in the browser.
- Integration `npm run check` passed: 1240 tests, type check, 7109 messages / 72 English namespaces, image/content/editorial gates, 71-entry build and 71/71 Reader coverage. The focused nine geography tests were rerun after the final vegetation changes.

Final shared evidence and its limitations are recorded in `docs/upgrades-2026-10-22-validation.md`. OS reduced-motion, forced GPU loss and long-duration performance are not claimed as actual browser tests. No commit, push or deployment has been performed.

## Scientific sources verified for this change

- [USGS water cycle](https://www.usgs.gov/water-science-school/water-cycle): stores, exchanges and water in pores/cracks.
- [USGS runoff and surface conditions](https://www.usgs.gov/water-science-school/science/runoff-surface-and-overland-water-runoff): downslope runoff and the roles of soil, land cover and prior moisture.
- [NASA cloud formation](https://science.nasa.gov/kids/earth/how-do-clouds-form/): invisible vapor and visible droplets/ice.
- Existing glacier and groundwater sources remain in their owner READMEs and `learning.json`; no newly calibrated coefficients are claimed.
