# 风：从微风到风暴 / Wind: from breezes to storms

One observation workspace connects three questions: why wind forms, how air moves, and what wind does. The same coastal environment contains sea, land, vegetation, a hill or house, a sail, seed tracers and a wind wheel. Heating contrast drives one signed circulation phase, so the scene and its objects respond together. Changing a question preserves the scene, controls and time.

Typhoon and tornado are independently scaled environments within the same page. They use their original scientific models and renderers through lazy adapters. Each visited environment keeps its canvas, parameters and progress. Switching environments pauses playback, without resetting the experiment. The old `/topics/typhoon/` and `/topics/tornado/` entries redirect into the workspace, retaining language and section fragments. The catalog exposes one wind project and searches child metadata.

## Ownership

- `model.ts`: prescribed coastal paths and terrain geometry shared by rendering and tests.
- `session.ts`: environment state, legacy routes, pause/reset, development and motion clocks.
- `coastScene.ts`: persistent Three.js coastal world and its qualitative responses.
- `sceneSlot.ts`: lazy storm adapters, cached canvases, loading/error feedback, disposal and stale-load isolation.
- `observation.ts` and `content.ts`: the common questions, contextual explanations and model limits. Storm explanations remain owned by the existing storm topics.
- `main.ts`: controls, route updates, lifecycle and the shared learning companion.
- `learning.json`: one bilingual explanation and narration journey spanning the three environments.

Nothing plays automatically. Backgrounding suspends frame updates; scrubbing pauses playback. Reduced-motion preferences suppress camera/heating transitions and automatic formation replay. Mature formation progress stays at its endpoint while air continues moving. Tornado rendering accepts an independent motion clock, retaining its original default for other callers. Text updates are throttled separately from frame rendering. Disposal releases observers, controls and GPU resources.

## Scientific scope

These are teaching illustrations, not forecasts. Air paths and object responses are prescribed; distance, time, wind load and power output are not calibrated. Equal heating stops only the local thermal forcing in this example. The terrain paths omit turbulence. Coastal breezes, typhoons and tornadoes are not successive wind-strength levels. The storm views have independent scales, and cloud visibility is distinct from air motion. References and qualifications accompany the explanations.

The naturalistic cover is a separate editorial illustration, not a rendered simulation. See `COVER.md` for generation provenance and the full prompt.

Validate with topic/session tests, existing storm and catalog tests, strict types, localization/image/build gates, then inspect desktop and mobile production pages. Key browser checks: retained conditions while switching questions/environments, old-route language, day/night reversal, pause/reset, storm formation, condensation visibility, typhoon structure/section, and repeated switches without canvas duplication.

## Guided airflow and scale

`airJourney.ts` keeps the same three questions and colors across the coast, tropical cyclone and tornado. `journeyModel.ts` owns continuous side-view teaching routes: only the coastal path is closed; storm endpoints fade to indicate exchange with the surroundings. Selecting a segment highlights it and switches the main scene to airflow/side view without changing physical settings. The guided next action preserves experiment state and supplies a comparison prompt. Tropical-cyclone exploration includes a direct top-view action to separate rotation around the center from vertical circulation. The main playback clock drives the marker; signed coastal circulation and monotonic diagram travel are separate quantities so night reversal remains meaningful.

`scaleModel.ts` and `stormScale.ts` own a separate finite zoom from a 100 m playground through an imaginary city area 20 km wide to 500/1000 km example cloud envelopes. All objects use one metric projection in every frame. Logarithmic zoom interpolation preserves the central location, supports interruption and respects reduced motion. The two cloud spans share the same final viewport, so selecting 1000 km doubles the displayed diameter. A readable locator ring is explicitly not a physical boundary. This is an imaginary scale comparison, not a geographic map, observed storm or wind hazard forecast. Cloud extent and wind thresholds are distinguished, with NOAA source links in the component and learning references.
