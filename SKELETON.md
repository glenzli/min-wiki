# Source boundaries

- `content/catalog.json`: lightweight category and topic registry; no simulation state or imports.
- `src/catalog/`: encyclopedia discovery, URL filters, bounded list projection and generic covers. `model.ts` is the build/runtime metadata contract.
- `src/visuals/`: content-free rendering utilities. `blackHoleOptics.ts` owns camera-dependent ray integration and material disposal; `canvasSurface.ts` owns Canvas sizing and drawing primitives. `cloudTexture.ts` owns cached procedural cloud density and lighting textures; topic dynamics remain local. `teachingCamera.ts` owns the content-free narrow-lens projection and distance compensation. These utilities do not own topic dynamics, controls or language.
- `src/platform/`: language selection and URL propagation (`i18n.ts`), shared English messages (`locales/en.json`), appearance preferences, semantic color tokens and topic navigation. No topic renderer dependencies.
- `topics/<id>/`: complete independent topic, including HTML entry, renderer, content, references, styles, cover and focused tests. Full-page navigation owns the document lifetime.
- `topics/black-hole/`: migrated black-hole experience. Physics, worker, rendering and audio retain their previous boundaries; `main.ts` composes topic controls and shared navigation.
- `topics/galactic-center/`: companion binary with detached, overflowing and wind-fed scenarios; barycenter, gas paths and Three.js scene stay here. The old URL is retained.
- `topics/planet-black-hole/`: independent density comparison and continuous parcel encounter; deterministic frame buffers belong to its model, Three.js rendering and bounded cache to its scene.
- `topics/leaf-colors/`: leaf-to-pigment-compartment teaching illustrations, seasonal pigment state and distinct yellow/red pathways; the topic owns its Canvas renderer and bilingual explanations.
- `topics/earth-moon/`: phase geometry, synchronous-facing Moon and independent true-scale comparison, with a Three.js orbit view and a geocentric observer using the same lunar surface and lighting geometry.
- `topics/saturn-moons/`: seven selected satellites, sourced physical/orbital data, moon selection and Three.js orbit/close-up/size views.
- `topics/lunar-craters/`: impact energy, ballistic ejecta and illustrative simple-crater excavation.
- `topics/volcano-eruption/`: magma paths, single/multiple vents, ballistic clasts and qualitative eruption styles; whole-section, vent and lava-slope cameras share one state, with separate surface/interior cooling cues.
- `topics/volcanic-lakes/`: crater/caldera geometry and bounded illustrative water balance.
- `topics/typhoon/`: ocean/shear/hemisphere conditions and broad tropical-cyclone circulation.
- `topics/tornado/`: a supercell-related vorticity pathway with condensation visibility independent of near-ground circulation.
- `topics/planet-surfaces/`: selected planetary compositions, surface/fluid encounters and procedural surface illustrations, with model limits distinct from geography.
- `topics/mimosa/`: touch propagation, pulvinus turgor and reversible leaf movement; continuous whole-plant, primary-pulvinus tissue and single-motor-cell views share local anatomy and deformation.
- `topics/hydrangea/`: cultivar-dependent aluminum uptake and later sepal color, distinct from immediate recoloring.
- `topics/rain-formation/`: cloud droplets, warm/ice growth pathways and subcloud evaporation; event positions and volume transfers remain topic-owned.
- `topics/lightning-thunder/`: charge separation, branching discharge and light/sound arrival timing.
- `topics/buoyancy/`: displacement, floating balance, clay hull capacity and immersion comparison, with a topic-owned static water tank and focused force tests.
- `topics/shadows/`, `water-states/`, `magnets/`, `sound-vibrations/`, `friction/`: independent everyday-object experiments; each owns its controls, illustration, scientific qualifications and translations.
- `topics/butterfly-life/`, `frog-life/`, `ant-trails/`, `fish-gills/`, `duck-feet/`, `camouflage/`: animal life cycles, structures and behavior through independent illustrated explorations.
- `topics/seed-sprouting/`, `seed-travel/`, `plant-water/`, `flower-fruit/`, `cactus-water/`: plant growth conditions, transport, reproduction and dry-habitat adaptations.
- `topics/rain-cycle/`, `river-paths/`, `sand-journey/`, `ground-water/`: water journeys and landscape changes, with qualitative process illustrations and water partition conservation tests.
- `topics/sun-star/`, `meteors/`: apparent solar size versus distance and distinct meteoroid, meteor and meteorite stages. Meteors owns continuous entry/dark-flight trajectories, mass loss and persistent wake parcels in its model, with SVG projection in its scene.
- `topics/cells/`, `bacteria/`, `viruses/`, `microbes-everywhere/`: cell structure, bacterial roles, host-dependent viral replication and microbial habitats; each owns its bilingual explanations and event-driven SVG exploration.
- `topics/tap-water/`, `car-safety/`, `handwashing/`: water composition and boiling limits, braking and passenger restraints, and soap-assisted handwashing; each owns its everyday-safety illustrations, bounded interactions, bilingual explanations and primary references.
- `topics/<id>/i18n.ts` and `locales/en.json`: topic-owned translations, loaded only with that topic. Chinese source messages are the fallback; do not import another topic to reuse its text.
- `scripts/check-i18n.mjs`: source/HTML/metadata translation coverage, interpolation and template-contract checks.
- `tsconfig.json`: strict TypeScript for browser code, simulations, workers and build configuration; Vite emits the static site.
- `tests/`: catalog and shared platform contracts. The native Node runner also discovers tests inside each topic.
- `vite.config.ts`: registered published topics become actual multi-page build entries. `dist/` is generated, not versioned.

Start with `docs/architecture.md` when adding a topic. Do not move simulation engines or scientific content into the catalog or platform merely to reuse a layout.

- `src/platform/readingMode.ts`: content-free reading-mode controls for step-based topics; each topic selects its own deeper notes. Switching preserves experiment state and sources remain accessible.
- `src/platform/learning/`: lazy presentation of topic-owned bilingual observation prompts, academic notes and narration; exports spoken text separately from visual directions. Topic prose lives in `topics/<id>/learning.json` and loads only for the current page.
- `src/platform/disclosure.ts`: finite native-details transitions, including rapid reversal. `src/visuals/transition.ts` owns reduced-motion-aware numeric interpolation; model state and trajectories remain with topics.
- `scripts/export-narration.mjs`: exports all published topic scripts and storyboards; `docs/narration.md` documents the audio-production boundary.

- `topics/pain-signals/`: nociceptive pathways, spinal withdrawal reflex and conscious pain, with a safe virtual stimulus and explicit model limits.
- `topics/taste-smell/`: oral/nasal anatomy, taste-bud signal transduction and retronasal smell; flavor is distinct from the five taste qualities.
- `topics/blood-cells/`: red-cell oxygen delivery, neutrophil migration/phagocytosis and platelet/fibrin clotting as three independent processes.
- `topics/body-cells/`: epithelial barrier, skeletal-muscle filament sliding and a myelinated-neuron chemical synapse, with topic-owned state and illustrations.

- `topics/hearing/`: air-conduction mechanics, cochlear place comparison and inner-hair-cell transduction; continuous ear/detail observation windows preserve the same journey.
- `topics/soap-bubbles/`: fixed-volume shape comparison, spherical-film drainage and two-interface interference; whole-bubble and enlarged-film views share the selected patch and thickness.
- `topics/digestion/`: connected digestive-tract journey, intestinal peristalsis and epithelial absorption; whole-body and villus observation windows distinguish bloodstream and lymphatic transport.

- `topics/air-conditioner/`: one closed refrigerant path, qualitative phase and pressure changes, cooling/fan-only and condensate comparisons; room, circuit and indoor-unit views share state.
- `topics/refrigerator/`: cabinet/food heat balances, thermostat cycling and door-load comparisons, with topic-owned refrigerant and cabinet observation views.
- `topics/batteries/`: a closed toy circuit, lithium-ion discharge illustration, chemical-energy accounting and independent electron/ion paths; the topic owns circuit, cell and motor views.
