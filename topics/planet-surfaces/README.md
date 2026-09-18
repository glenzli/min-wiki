# 行星的表面与内部 / Planetary surfaces and interiors

Eight comparative worlds: Mercury, Venus, Earth, Mars, Jupiter, Neptune, **Titan (Saturn’s moon)** and **55 Cancri e (a rocky exoplanet)**. Close terrain, globe and whole-world cutaway views answer different questions: what the outside may look like, how a world appears as a whole, and what evidence suggests lies beneath. Chinese/English child explanations, academic notes and four narration segments accompany the same observations.

## Views and ownership

`camera.ts`, `terrain3d.ts` and `scene3d.ts` own the 3D camera, stable terrain geometry and GPU rendering. Changing a viewing angle or dragging observes the same geometry rather than swapping illustrations. Camera presets ease between front, oblique and overhead views. Pointer drag, wheel zoom and focused arrow/plus/minus keys manipulate the same geometry. User-started orbital tours move the camera at a visible pace; cutaway tours stay on the exposed side. A separate 32-second radial journey reaches the exact center; direct layer stops, center and exterior buttons remain available while paused. `scene.ts` coordinates 3D availability and the Canvas fallback, texture preparation and resource lifetime. `surfacePainter.ts` and `surfaceWorker.ts` retain deterministic representative texture preparation. A failed or unsupported rendering path must remain bounded and leave explanations accessible; page disposal releases workers, textures and renderer resources.

`model.ts` owns world/material categories and procedural detail helpers. `content.ts` owns the exterior explanations. **`interior-data.json` owns the paired Chinese/English internal-layer descriptions and per-world sources**; these intentional bilingual records are not duplicated into the UI locale map. `interior.ts` owns their TypeScript contract and the radial lookup. `learning.json` keeps exactly three academic notes and four spoken segments in each language.

The existing surfaces distinguish water, hydrocarbons, silicate melt and dense giant-planet fluids. Titan’s close view represents a polar lakeshore, not the Huygens landing site. Neither Jupiter nor Neptune provides an Earth-like landing floor. A procedural color or texture is not a measured terrain map or an inferred material composition by itself.

## Interior data contract / 内部数据约定

All eight profiles reach the center. Each has ordered `layers`, a bilingual `summary` and `evidence`, and primary `sources`. Layer fields are `id`, bilingual `name`, `kids` and `science`, `color`, normalized `inner` and `outer`, and optional `uncertain`. There are 30 teaching regions in total.

- Layers run outside to inside. The outermost `outer` is 1; the innermost `inner` is 0; neighbors meet without gaps or overlaps.
- `interiorAt(worldId, progress)` uses radial progress: 0 is the exterior, 1 the exact center, and radius is `1 − progress`. At an exact interface it selects the newly entered deeper region. Finite progress is clamped; nonfinite progress starts at the exterior. A stale runtime world id safely falls back to Earth.
- `layerStop(worldId, index)` uses a region’s middle, except that the last region returns **1**, reaching the center. Invalid/nonfinite indexes cannot produce a nonfinite stop.
- **All thicknesses and colors are schematic.** Thin crusts are enlarged. Layer stops are not measured depths, travel times or survivable probe routes. For giants, a drawn boundary can mark a change of explanatory region rather than a sharp physical interface.
- `uncertain` marks an especially unresolved interpretation. An unflagged internal region is not thereby a directly photographed one. Earth’s oceans and Titan’s hydrocarbon lakes are local exterior features, **not global thick liquid shells** in this radial model.

## Scientific choices, checked 2026-09-19

| World | Exterior-to-center interpretation and limit |
| --- | --- |
| Mercury | Rocky crust, relatively thin silicate mantle, liquid outer core, inferred solid inner core. The large metal interior is well supported; the inner-core size and light elements remain model-dependent. |
| Venus | Rocky crust, hot silicate mantle and an iron-rich core. Do not impose a confirmed solid-inner/liquid-outer split: current bulk and rotational constraints permit different states. |
| Earth | Crust, mostly solid upper/lower mantle, liquid iron-rich outer core, solid inner core. The mantle can creep without becoming a global magma ocean. Seawater is confined to exterior basins. |
| Mars | Crust, mostly solid mantle, liquid outer core and a solid inner-core interpretation from **Bi et al. (2025)**. That study infers roughly 613 ± 67 km radius; the illustrated radius is not a reproduction of its inversion. Earlier core models differ, and candidate molten material above the core is not represented as a universally liquid mantle. |
| Jupiter | Cloud atmosphere, progressively dense molecular envelope, metallic-hydrogen-rich region and a **dilute core**. Heavy elements may be mixed outward. A sharply bounded hard central sphere is not established. |
| Neptune | Cloud atmosphere, dense envelope, high-pressure mixed interior and candidate central heavy-material region. **Morf and Helled (2025)** permit both water-rich and rock-rich structures. The conventional “ice giant” name does not demonstrate an exposed water ocean, everyday ice shell or known pure-material layers. |
| Titan | Water-ice exterior with local hydrocarbon lakes, candidate near-melting high-pressure ice with possible liquid-water pockets, rock-rich core. **Petricca et al. (December 2025)** challenge a global subsurface ocean using Cassini tidal dissipation. The newer ocean-free model is labeled as a candidate; observed methane lakes are a separate fact. |
| 55 Cancri e | Hot exterior that may be molten on the dayside, candidate silicate interior and candidate metallic center. Every region is uncertain. **No radial edge is a measured magma-ocean floor**, no melt thickness is assigned as an observation, and a hot outer band does not assert an equally molten nightside or uniform global melt shell. |

Earth’s layering is strongly supported by seismology; Mars has single-station InSight constraints. The other profiles rely on combinations of gravity, rotation, tides, magnetism, spectra, mass/radius and material models. Many different interiors can fit the same limited data. A manipulable 3D cutaway makes a model easier to inspect, not more directly observed.

## Primary sources / 一手依据

- [NASA Mercury facts](https://science.nasa.gov/mercury/facts/) and [NASA’s 2019 inner-core evidence summary](https://www.nasa.gov/solar-system/a-closer-look-at-mercurys-spin-and-gravity-reveals-the-planets-inner-solid-core/).
- [NASA Venus facts](https://science.nasa.gov/venus/venus-facts/), [Margot et al. (2021), spin and moment of inertia](https://www.nature.com/articles/s41550-021-01339-7), and [Shah et al., interior models](https://arxiv.org/abs/2112.03225). Bulk agreement is not a measurement of a unique core phase.
- [NASA Earth structure](https://science.nasa.gov/earth/facts/), [USGS Inside the Earth](https://pubs.usgs.gov/gip/dynamic/inside.html), and especially [USGS: plates do not float on a global magma ocean](https://www.usgs.gov/faqs/are-tectonic-plates-floating-magma), which distinguishes solid-state mantle flow from liquid outer-core material.
- [Bi et al. (2025), Mars solid inner-core seismic evidence](https://www.nature.com/articles/s41586-025-09361-9), [Le Maistre et al. (2023), contrasting radio-tracking constraints](https://www.nature.com/articles/s41586-023-06150-0), and [NASA’s 2025 Martian mantle study summary](https://www.nasa.gov/missions/insight/nasa-marsquake-data-reveals-lumpy-nature-of-red-planets-interior/).
- [NASA Juno](https://science.nasa.gov/mission/juno/) and [Wahl et al. (2017), dilute-core models](https://arxiv.org/abs/1707.01997).
- [NASA Neptune facts](https://science.nasa.gov/neptune/neptune-facts/) gives the familiar simplified model; [Morf and Helled (2025), Icy or rocky?](https://arxiv.org/abs/2510.00175) demonstrates broader compositional possibilities. We do not promote the simplified water-rich picture to a unique result.
- [NASA Titan facts](https://science.nasa.gov/saturn/moons/titan/facts/) covers observed surface lakes. For the evolving deep-interior interpretation, use [NASA, December 2025](https://www.nasa.gov/solar-system/planets/saturn/saturn-moons/titan/nasa-study-suggests-saturns-moon-titan-may-not-have-global-ocean/) and [Petricca et al. (2025)](https://www.nature.com/articles/s41586-025-09818-x); older ocean summaries should not override the stated uncertainty.
- [NASA Webb: 55 Cancri e](https://science.nasa.gov/missions/webb/nasas-webb-hints-at-possible-atmosphere-surrounding-rocky-exoplanet/), [Hu et al. (2024)](https://www.nature.com/articles/s41586-024-07432-x), and [Dorn et al., Bayesian interior inference](https://arxiv.org/abs/1609.03909). These constrain possible atmospheres and bulk structures, not photographed coastlines or a measured deep core.

## Validation and integration

Focused scientific-data tests: `node --import tsx --test topics/planet-surfaces/tests/interior.test.js`. They cover eight-world completeness; every bilingual field and source URL; contiguous radial regions; exact boundary behavior; reversible monotonic layer selection; center-reaching presets; invalid input; and the stated liquid/core evidence limits. Learning-package validation preserves three academic notes and four narration segments per language.

Integration checked 2026-09-19: 19 focused topic tests, the 402-test repository suite, strict typecheck, complete bilingual extraction and production build passed. In-app WebKit checks covered all eight 3D near views, camera presets, visible orbital parallax and dragging, Earth’s center preset, and center endpoints for all eight worlds in both languages at 390 px without horizontal overflow. Scientific layer selection, paused travel and camera angle remain independent. Browser checks observed no rendering warnings or errors. The Canvas path retains a full radial cutaway if 3D is unavailable; worker lifecycle tests protect cancellation, invalid pixels and disposal.
