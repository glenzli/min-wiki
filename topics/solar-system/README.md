# 太阳系：太阳、行星与卫星 / Solar system explorer

## Main-scene pass · 2026-09-28

The desktop presentation now gives the orbital renderer its own stage. Scenario and planet choices remain above it, while story and stage steps live beside it; selecting a world keeps the same explorer controller and renderer. At a 1280×720 browser viewport the orbital canvas grows from about 143 px to 327 px high. The lineup spaces planet positions farther apart so Chinese and English names remain readable, while globe diameters still follow the same linear diameter scale. Lineup gaps are deliberately arranged for labeling and do not represent orbital distance. Globe, lineup, and Earth-focus browser views were checked; the full planet descent and all world surfaces still require a new visual pass.

## Worlds on one ruler / 同一把尺上的世界

The integrated page now also owns `comparisonModel.ts`, `comparison.ts` and bilingual `comparison.json`: a two-world workbench separates true-diameter disks from linear mass/density bars. It reuses the existing eight-planet numerical table and adds sourced 55 Cancri e and WASP-39 b comparisons. Mean density is calculated from mass and spherical volume, not confused with surface density. The WASP-39 radius conversion explicitly uses the exoplanet convention of 71492 km per Jupiter radius rather than silently using Jupiter’s mean radius. These are dated rounded catalog values, not live queries. Illustration colors do not claim observed exoplanet surfaces; transit/radial-velocity inference and nonunique interiors are explained. Existing globe/descent/interior rendering is unchanged.

The workbench preserves its independent `compareA`, `compareB` and `metric` query state without replacing the existing `body/view/site` navigation. `#world-comparison` links to the workbench. New stellar and cosmic-scale owners remain separate full pages with question-specific onward links. Focused added gate: `node --import tsx --test topics/solar-system/tests/comparison.test.mjs`.

统一入口保留公转全景和等比例大小比较。选择太阳或八大行星后，可以观察整球、从太空连续下降、查看局部环境与内部剖面。行星视角还可观察代表卫星；月球和土卫六可以继续深入，父级按钮回到地球或土星。月相与土星卫星的详细大小比较保留后续链接。

The unified entry keeps orbital motion and true-diameter comparison. The Sun and all eight planets have globe, continuous descent, close-view and interior modes. Selected moons appear around their parent planets; the Moon and Titan support deeper exploration. Moon phases remain a separate follow-up topic.

`explorer/model.ts` owns validated URL selection, bounded continuous descent and circular satellite motion. `activity.ts` owns animated solar granulation, sunspots, prominence tracers, independent Earth clouds and differential giant-planet cloud bands. `scene.ts` owns one renderer, camera, stable local terrain, cutaway and moon-system resources. `controller.ts` owns navigation and independent activity/descent playback. Bilingual authored data lives in `explorer/*.json`; the public explanations do not depend on importing another topic's translated UI.

`topics/planet-surfaces/` remains the semantic owner of material categories, terrain and scientific interior profiles. The integrated renderer consumes these directly; Saturn, Uranus and the Moon extend that owner. Its old URL enters the integrated descent view. `?world=cancri` preserves the separate 55 Cancri e extension. The surface entry is a catalog child of this topic.

Orbital motion solves Kepler's equation with the existing data table. True-diameter comparison retains its orthographic projection. Descending controls a continuously moving observation camera, not a free-fall calculation, measured altitude or survivable flight. Whole-globe rocky maps use existing attributed Solar System Scope assets; named observation sites bind a body-fixed latitude/longitude to the globe marker, descent camera and regional terrain. Local relief is an illustrative reconstruction within that region, not a measured elevation map. Cloud and solar flows are accelerated illustrations, not weather or magnetohydrodynamic solutions. Cutaway thicknesses are schematic; uncertain regions remain labeled. Satellite sizes and spacing are scaled separately, but relative periods share one clock. No full satellite census is implied.

Activity initially runs unless reduced motion is requested, with a visible pause control. Descent starts only on request and can be scrubbed, paused and reset separately. Hidden pages and the about dialog suspend updates. Entering another world stops descent. WebGL failure leaves navigation and explanations available. Disposal releases controls, geometries, materials and textures.

Focused validation: `node --import tsx --test topics/solar-system/tests/*.test.js topics/planet-surfaces/tests/*.test.js`. Production gates: `npm run typecheck`, `npm run check:i18n`, `npm run build`. Browser checks must include intermediate descent, independent pause, every planetary core, parent/moon navigation, old URL routing and narrow English/Chinese layouts.

Sources: [NASA Sun](https://science.nasa.gov/sun/facts/), [NASA Jupiter](https://science.nasa.gov/jupiter/jupiter-facts/), [NASA Uranus](https://science.nasa.gov/uranus/facts/), [NASA Saturn](https://science.nasa.gov/saturn/facts/), [NASA Moon](https://science.nasa.gov/moon/facts/), [JPL satellite elements](https://ssd.jpl.nasa.gov/sats/elem/) and [physical parameters](https://ssd.jpl.nasa.gov/sats/phys_par/). Existing interior profiles retain their study-specific sources. Texture license and attribution remain in `assets/ATTRIBUTION.md`.

Observation sites / 观察地点：`explorer/sites.json` owns bilingual site descriptions, coordinates and descent stages; `model.ts` validates `site` selection and spherical mapping. Fixed site coordinates do not imply a live storm longitude or an exact surveyed landing site. Mars south-cap is a fixed spring illustration. The terrain owner accepts an optional region; legacy callers retain their previous relief.

Atmospheric shaders sample sphere directions, including at both poles; Jupiter has separate polar vortices, Saturn a northern hexagonal jet, and Uranus/Neptune different contrast and cloud patterns. Persistent spherical cloud decks share the same regional field; `regionalAtmosphere.ts` adds a bounded advected cloud volume with depth-dependent lighting and obscuration during approach. These are qualitative animations, not numerical weather solutions. `interiorActivity.ts` renders textured layer surfaces and confined illustrative transport; `motions.json` explains solid-state mantle motion, liquid outer-core flow, solar convection and net radiative energy transfer. Uncertain layers receive no invented circulation.

Validation adds coordinate-to-sphere-UV consistency, regional terrain selection, no spurious water under desert/ice sites, and confinement of interior transport to its layer. Browser checks cover polar/canyon descent, gas poles and close clouds, per-layer motion, pause, route persistence and mobile layout.

Site coordinate references: USGS Gazetteer [Caloris](https://planetarynames.wr.usgs.gov/Feature/979), [Ligeia](https://planetarynames.wr.usgs.gov/Feature/14400), [Valles Marineris](https://planetarynames.wr.usgs.gov/Feature/6288); west-positive longitudes are converted to east-positive before rendering. The south-polar site follows [JPL seasonal-frost observations at 86.3°S, 99°E](https://www.jpl.nasa.gov/images/pia10137-carbon-dioxide-frost-settling-from-seasonal-outbursts-on-mars-movie/).

## Saturn rings / 土星环

Saturn adds an integrated rings view with C/B/A/F regions, the sparsely populated Cassini Division, an enlarged ice-particle patch and two tracers sharing a Keplerian clock. Ring radii use NASA PDS boundaries; Saturn GM and equatorial radius use JPL. Fine ringlets, particle size/spacing/thickness and accelerated time are explicitly illustrative. Local shear excludes collisions and self-gravity. Pause activity freezes both tracers and particles.

土星环提供分区、卡西尼缝、冰粒近景和内快外慢四种观察方式。旧“土星和它的卫星们”入口并入太阳系，旧网址跳转到卫星视图；月相专题保留。

Sources: [NASA](https://science.nasa.gov/saturn/facts/), [PDS ring boundaries](https://pds-rings.seti.org/saturn/saturn_tables.html), [JPL planet radius](https://ssd.jpl.nasa.gov/planets/phys_par.html), [JPL Saturn GM](https://ssd.jpl.nasa.gov/sats/phys_par/).

## Scientific and material review — 2026-09-20

The explorer is a sourced visual reconstruction, not a weather forecast, terrain survey, spectral renderer or interior fluid simulation. These are separate confidence levels: measured broad surface appearance; observed atmospheric mechanisms; model-dependent deep structure. `fidelity.json` exposes this distinction per world. `materialFields.ts` supplies one spherical cloud field to global optical decks, shadows and regional cloud coverage. `interiorActivity.ts` owns texture transport and disposal; it no longer draws loop tracks or bead tracers.

| World | Review and rendering decision | Evidence |
| --- | --- | --- |
| Mercury | Preserve crater albedo and exosphere; no cloud decks. Liquid outer core has flowing material; proposed inner core remains uncertain. | [NASA Mercury](https://science.nasa.gov/mercury/facts/) |
| Venus | Sulfuric-acid cloud envelope obscures the ground. The descended rocky landscape is reconstructed, not visible through clouds in ordinary light. Core state remains uncertain. | [NASA Venus](https://science.nasa.gov/venus/venus-facts/) |
| Earth | Multi-height cloud optical depths, wispy upper structure, shade and synchronous shadows; local volume uses the same advected coverage field. Heights are enlarged. Mantle is mostly solid; outer core is liquid metal. | [NASA clouds](https://www.nasa.gov/earth/what-are-clouds-grades-5-8/), [USGS mantle](https://www.usgs.gov/faqs/are-tectonic-plates-floating-magma) |
| Mars | Retain site-locked CO₂/water polar ice versus canyon terrain; no global liquid surface. Keep 2025 seismic inner-core interpretation explicitly model-dependent. | [NASA Mars](https://science.nasa.gov/mars/facts/), [Bi et al. 2025](https://doi.org/10.1038/s41586-025-09361-9) |
| Jupiter | Irregular advected belt filaments and local vortices; no polar UV spokes. Juno polar structure combines instruments, not a calibrated naked-eye view. Deep mixed-core boundaries softened. | [NASA Jupiter](https://science.nasa.gov/jupiter/jupiter-facts/) |
| Saturn | Muted belts and polar jet; cutaway has diffuse transitions, with an illustrative mixed region reaching 0.6 radii. Stable/uncertain deep structure is not animated as established convection. | [Mankovich & Fuller 2021](https://arxiv.org/abs/2104.13385) |
| Uranus | Pale cyan-green, low-contrast visible clouds; selected dark narrow rings replace the reused Saturn disk. Ring widths enlarged, weak outer rings omitted. Mixed interior stays unresolved. | [PDS ring table](https://pds-rings.seti.org/uranus/uranus_rings_table.html), [Morf & Helled 2025](https://arxiv.org/abs/2510.00175) |
| Neptune | Desaturated cyan-blue following recalibrated observations. A representative dark vortex, not a permanent fixed geographic landform. Interior water/rock mixtures remain uncertain. | [Oxford / Irwin et al. 2024](https://www.ox.ac.uk/news/2024-01-05-new-images-reveal-what-neptune-and-uranus-really-look-0) |
| Sun | Granules, cooler spots and prominence flow remain enhanced-color illustrations. Cutaway distinguishes circulating plasma from radiative energy transport; the latter does not advect material. | [NASA Sun](https://science.nasa.gov/sun/facts/) |

Internal textures convey material character, not photographed mineral grains or exact thermal color. Convection cells are illustrative and do not establish impermeable geological boundaries. Surface microtexture does not turn albedo into measured height. No source images or generated realistic-looking bitmap assets were added. Existing terrain remains a representative regional reconstruction, not photogrammetry. Faint Jupiter/Neptune rings and full spectral/seasonal weather are outside this renderer.

Validation: focused solar/surface contracts, type/i18n/image gates, one full production build, and browser inspection of all eight planets plus the Sun, with Earth globe/descent/interior pause checks and narrow-screen checks. See task validation evidence for actual outcomes.

## Presentation layout

The topic opts its existing scene and controls into shared viewport fitting and reversible immersion. Explanation/settings remain available in the adjacent disclosure panel. Multi-chapter studies retain their own state and clocks. Introductory diagrams can be expanded separately, and narrow screens retain document flow.
