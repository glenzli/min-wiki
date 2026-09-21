# 火山：从岩浆到山、岛与湖 / Volcano explorer

One bilingual project at `/topics/volcano-eruption/` combines shield and composite volcanoes, an Omuroyama-inspired scoria cone, submarine volcanism and volcanic lakes. Case cards select distinct conceptual histories rather than successive stages of one universal lifecycle.

## Ownership and continuity

- `main.ts` owns case/chapter selection, per-case progress, camera navigation, controls, playback and disposal. Changing views preserves time. The mountain story and eruption detail have separate progress. Playback is opt-in; hiding or leaving stops it, reduced motion selects the endpoint, and bfcache restoration remounts paused.
- `projectModel.ts` owns validated case routes, stable deposit schedules, shape profiles and later erosion/vegetation states. `landscapeScene.ts` and `landformMesh.ts` project those histories to an oblique, shaded SVG surface and a geological cutaway. Radial surface patches preserve identity; the scoria profile has a depressed crater floor, the shield is broad, and the composite surface has drainage relief. Deposits persist after eruption; erosion modifies their surface and retains an earlier outline. The 18 units are teaching deposits, not dated strata or individual historical eruptions.
- `magmaSystem.ts` owns a bounded, qualitative recharge/overpressure/dike-advance sequence, including stalled intrusion. `magmaGeometry.ts` owns stable sills and sheet paths shared by both renderers; `magmaScene.ts` draws crystals, melt, feeding paths, propagating tips and bubbles. `mechanismContent.ts` explains the six causal stages. Surface-product time starts only after the same dike reaches the surface; magma retained underground cannot generate surface ejecta.
- `ecologyModel.ts` owns the separate cooling, substrate, seed arrival and establishment timeline; `ecologyScene.ts` keeps 100 fixed slope sites and a magnified soil patch. Wet, dry, cold and thick-ash comparisons change growth and burial on the same mountain. `ecologyContent.ts` owns the child-facing causal narration.
- `model.ts` / `scene.ts` retain the single-eruption magma, gas, supply, clast, cooling and camera model. A landform parameter changes terrain used by lava and ballistic intersections together. `context.ts` owns independent activity evidence.
- `../submarine-volcanoes/model.ts` / `scene.ts` retain deep/shallow examples and bounded island accretion. `../volcanic-lakes/model.ts` / `scene.ts` retain crater/caldera formation and water balance. The unified controller consumes these directly; no iframe or duplicate player is mounted.
- The two old HTML/main entries redirect to `?case=submarine` and `?case=lake`, retaining language and deployment base. Published `parentTopic` entries keep old URLs buildable while the directory shows a single project.
- `projectContent.ts`, `locales/en.json` and `learning.json` own the integrated bilingual explanations, academic notes and four narration segments.

## Scientific scope

Mountain geometry, deposit timing, cooling appearance, weathering and vegetation are illustrative. There is no calibrated time axis or real-vent reconstruction. Shield volcanoes can erupt explosively; scoria cones can also produce lava. The default scoria landscape uses Omuroyama as an example, including the role of traditional burning in its current grassland. Its mountain shape formed during eruption, not as a consequence of extinction.

The caldera guide follows magma withdrawal, reduced support, fractures and sinking rock before water accumulation. It does not require a completely empty underground chamber or imply that every eruption triggers collapse.

Ecological recovery is a qualitative comparison, with compressed, uncalibrated time. Organisms need suitable substrate, water and temperatures; drought, cold, rapid drainage and renewed deposits can interrupt recovery. Neither a universal species sequence nor a forest endpoint is prescribed. Omuroyama’s managed grassland is distinguished from this general comparison.

The lake case is another basin history, not a claim that the selected land cone necessarily collapses or becomes a lake. Lake water must have input; a lake does not establish extinction. Dormancy and extinction assessments remain independent of shape, erosion, vegetation and eruption intensity. Deep/shallow/island submarine examples are selected conditions and timescales, not an inevitable sequence.

The mechanism is one recharge-driven scenario, with buoyancy and regional stress held fixed. Rock resistance is an illustrative aggregate barrier, not a measured strength. Pressure and connection bars are normalized conceptual indicators; there is no pressure-volume solver, calibrated fracture mechanics, or eruption forecast. Alternative tectonic triggers are described, not simulated. The lower feeder enters from greater depth: the shallow storage region is not the origin of melt and the drawing does not include the whole mantle. Cooling and crystallization are compressed teaching time.

## Sources

- [Izu Peninsula Geopark: Omuroyama](https://izugeopark.org/geosites/omuroyama/)
- [USGS: Future eruptions around Crater Lake](https://www.usgs.gov/volcanoes/crater-lake/science/future-eruptions-around-crater-lake)
- [USGS: Active, dormant and extinct](https://www.usgs.gov/observatories/yvo/news/active-dormant-and-extinct-clarifying-confusing-classifications)
- [USGS: Principal volcano types](https://pubs.usgs.gov/gip/volc/types.html)
- [USGS: Intrusion versus eruption](https://www.usgs.gov/observatories/hvo/news/volcano-watch-eruption-intrusion-whats-difference)
- [USGS: Failed magmatic eruptions](https://www.usgs.gov/publications/failed-magmatic-eruptions-late-stage-cessation-magma-ascent)
- [USGS: Magma mixing and crystal mush](https://www.usgs.gov/observatories/hvo/news/volcano-watch-petrologic-monitoring-kilauea-volcano-update-rockhounds)
- [NPS: Plants at Sunset Crater](https://www.nps.gov/sucr/learn/nature/plants.htm)
- [USGS: 2018 Kīlauea eruption and summit collapse](https://www.usgs.gov/volcanoes/kilauea/science/2018-lower-east-rift-zone-eruption-and-summit-collapse-kilauea)
- [NOAA: Submarine volcanoes](https://oceanexplorer.noaa.gov/facts/volcanoes.html)

Additional claim-specific eruption, cooling, submarine and caldera sources are retained in `learning.json` and the process owners' READMEs.

## Validation

Run `node --import tsx --test topics/volcano-eruption/tests/*.mjs topics/submarine-volcanoes/tests/*.ts topics/volcanic-lakes/tests/*.mjs`, then the repository `npm run check`. Browser review covers all cases, independent timelines, playback/pause, camera changes, retained deposits, water leakage, limited supply, old routes, language, reduced motion and narrow layouts. Model tests establish implementation contracts, not geological prediction.
