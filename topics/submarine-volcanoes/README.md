# 海底火山怎样长成岛？ / Underwater volcanoes and islands

Independent bilingual topic with three qualitative scenarios: slow pillow-lava extrusion in deep water, a shallow magma–water interaction, and long-term accumulation with two supply histories followed by illustrative erosion. These are selected environments and timescales, not inevitable stages of every volcano.

- `model.ts` owns bounded process state, finite lobe cooling and particle deposition. No numerical depth threshold or prediction of island formation is encoded.
- `scene.ts` owns the original SVG cutaway, environment crossfades and ocean / vent / mountain viewpoints. Legends remain outside the SVG. Orange interiors are explanatory cutaways.
- `main.ts` owns controls and finite playback. No autoplay; progress is preserved on viewpoint, environment and reading-mode changes. Hidden documents and `pagehide` stop playback; a restored page stays paused. Reduced motion selects the endpoint without animated travel.
- `learning.json` contains three academic notes and four child narration segments per language, with separate visual cues. References were read on 2026-09-18.
- `catalog-entry.json` and `catalog-translations.json` are integration inputs; the root task owns shared registration.

## Scientific boundaries

Pillow morphology is selected for low effusion, not required at every depth. Ambient water pressure influences gas expansion but does not prohibit submarine explosions: direct NOAA observations at NW Rota-1 at about 550–560 m document predominantly magmatic-gas-driven activity. Shallow interaction is also conditional. Sea level is fixed; accumulation, geometry, trajectories, cooling and erosion are teaching choices. The final island retains most of its depicted vertical height underwater. Limited supply never emerges. The model does not solve fluid dynamics, thermodynamics, landslides, tsunamis or subsidence.

Primary sources are the NOAA ocean-floor overview, NOAA PMEL pillow-lava notes and NW Rota-1 observations, plus USGS lava–seawater interaction and Hawaiian volcano evolution. Exact links and claim-specific explanations are in the page and learning file.

## Validation

`node --import tsx --test topics/submarine-volcanoes/tests/model.test.ts` covers finite deterministic inputs, supply-dependent emergence, erosion timing, crust-before-core cooling, stable particle deposits and view-independent process state. Source checks do not establish scientific prediction or integrated browser behavior. The root task owns the final registered build and bilingual mobile/browser review.

## Surface and water detail refinement

The SVG now uses deterministic irregular strata, fractures, scree, cooled pillow skins, advancing hot seams and a few explicit cutaways. Deep water uses compressed attenuation and local ROV illumination; sunlight shafts are limited to shallow scenes. Fine suspended particulate plumes are clipped below the surface, while condensed mist is clipped above it. Island coasts show a wet edge and illustrative surf. All details derive from bounded progress, so pause and the final frame are stable.

New scientific references: NOAA Ocean Exploration, *Light and Color in the Deep Sea*; NOAA PMEL, *What is a Hydrothermal Plume?*; NOAA NWS, *Cloud Development*. Exact URLs are in the page and learning file. These establish the light/particle/droplet distinctions, not the chosen terrain, particle trajectories, plume duration, brightness or shoreline geometry. Hydrothermal activity is not identical to a lava eruption, and ending the displayed plume does not predict when real hydrothermal discharge ends.

Focused scene tests additionally check deterministic endpoints, no sunlight shafts in the deep scene, finite submerged particle packets and separate underwater/above-water clipping. The process model is unchanged.
