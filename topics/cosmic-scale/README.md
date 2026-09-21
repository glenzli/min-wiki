# 星系与宇宙尺度 / Galaxies and cosmic scales

The default learning journey begins with diameter comparisons, continues with schematic system membership, and then opens the retained physical zoom. The comparison and membership views are not physical orbital layouts.


One continuous length-coordinate journey starts at a selectable Earth or Sun close-up and connects the Solar System, selected nearby stars, the Milky Way and representative Local Group members. Scale changes do not reset the location anchor. Milky Way structure can be rotated face-on to edge-on and its components independently inspected.

## Ownership and units

`model.ts` owns km/AU/light-year conversions, logarithmic half-width, linear within-frame orthographic projection, smooth center/orientation transitions, ruler intervals and bounded URL scale state. `scene.ts` owns the Three.js orthographic scene, mapped Earth/cloud/Moon spheres, physical orbit geometry, illustrative local-star population, screen-space annotation overlay and GPU lifetime. `galaxy.ts` owns bounded deterministic disk/dust/bulge/halo point populations and shaders. `flight.ts` owns a finite, cancellable eased camera journey. `main.ts` binds controls, URL state, user-started travel, scrubbing, reduced-motion preferences and page visibility. `content.json` and `learning.json` own both languages and scientific qualifications.

Every physical position and radius uses kilometers. The camera’s view width changes logarithmically; body geometry does not. A horizontal ruler measures the same linear projection as objects. Small disks disappear into explicitly distinguished crosshairs/open circles. Label spacing and position markers never count as physical diameter. The selected Earth or Sun remains the same anchor while the camera shifts toward the galactic center at large scales.

Milky Way disk radius is a rounded 50,000 light-years, Sun-to-center distance 26,000 light-years. Andromeda and Triangulum are placed at rounded distances of 2.5 and 2.7 million light-years with illustrative directions and inclinations. Only three Local Group representatives are drawn. The external galactic view is a structure reconstruction, not a photograph taken outside the Milky Way or a measured individual-star catalog. The inferred dark-matter layer is off by default.

## Limits

Nearby-star directions, circular planetary phases, stellar-point positions, halo extent and galaxy tilts are illustrative. No orbit dynamics, cosmic expansion, collision forecast, dark-matter particle distribution or cosmological lookback-time calculation is claimed. The central black hole does not control the entire galaxy as a giant Solar System. Existing black-hole scale content is linked directly.

Sources: [ESA Guide to our galaxy](https://www.esa.int/content/view/full/423444), [NASA Earth](https://science.nasa.gov/earth/facts/), [NASA Andromeda](https://www.nasa.gov/universe/galaxies/andromeda-galaxy/), [NASA Solar System](https://science.nasa.gov/solar-system/solar-system-facts/).

Earth, cloud and Moon maps reuse the existing [Solar System Scope assets and attribution](../solar-system/assets/ATTRIBUTION.md), licensed CC BY 4.0. These are static visual maps, not live weather or current illumination. Lighting, circular orbit phases, nearby-star distribution and galactic dust attenuation are illustrative. The local population represents structure, not measured counts. Maps remain spherical at every scale; there is no switch to a differently sized planet illustration.

Buttons fly to their stop from the current scale; manual seeking cancels the journey immediately. Reduced-motion mode lands directly. A full user-started outward journey lasts 65 seconds of bounded visible frame time; hidden pages pause rather than catching up. Resize and texture completion redraw once, without an idle animation loop. GPU populations are allocated once, DPR is capped at 2, context loss exposes the text fallback, and non-bfcache page exit disposes geometry/materials/textures/observer/renderer. Bfcache retains the stopped scene.

Focused command: `node --import tsx --test topics/cosmic-scale/tests/*.test.*`. Browser acceptance: intermediate zoom states, returning to Earth, linearly correct ruler, marker identity, galaxy side view and each layer, reduced motion/user-started travel, pause, rapid manual scrubbing, language/mobile and direct scale URL. See `VALIDATION.md` for the local verification record.

`origin=earth|sun` selects the retained camera anchor. Missing/invalid origin preserves legacy Earth behavior; Sun links without scale open at a 2.2-million-km half-width. Choosing an origin explicitly resets to its close-up; stop 1 and restart return to that origin. The Sun uses the same physical geometry and kilometer ruler as the other bodies. The diameter comparison now lives in the first chapter, independent of the physical zoom. Source: https://science.nasa.gov/sun/facts/.

## Comparison ownership and compatibility

`comparisonModel.ts` owns the six body radii, continuous shared diameter scaling and chapter route defaults. `comparison.ts` owns its finite cancellable animation, Canvas comparison and membership diagrams, resize/image completion and disposal. `comparisonContent.json` owns bilingual labels and distinctions. Main binds chapter state while the existing physical scene initializes only on first opening the zoom chapter.

`mode=compare|homes|zoom`, `pair=0..4`, and `home=0..2` preserve the new journey state alongside `origin` and `scale`. Fresh links default to comparisons; legacy links with origin or scale retain zoom. Chapter switching stops motion and keeps both view states. Diameter ratios use Earth6371/Jupiter69911/Sun695700 km radii and Arcturus25.4 solar radii, an estimate from https://arxiv.org/abs/1109.4425. The former static Sun/Earth inset is removed in favor of the full comparison chapter. Membership diagrams show selected representatives, not orbital distances, census data or solid galaxy surfaces. Earth/Jupiter illustrative maps reuse the attributed Solar System Scope assets.

Comparison stellar disks use two cached, deterministic spherical photosphere illustrations with granulation, limb darkening and restrained glow; Sun-only spots are illustrative. Texture scale and colors are not measured surface data. The comparison represents a static snapshot, with no timed convection claim.

Antares extends the final comparison at approximately 700 solar radii, sourced from ESO eso1726; the existing Arcturus pair index remains 2. Membership galaxy images are three cached 720px procedural structural illustrations with diffuse disks, spiral populations, warm centers and dust lanes. Projection, directions and texture details are illustrative, not observed maps or a distance scale.

## Viewport and immersive interaction — 2026-09-22

The comparison, membership and physical zoom chapters share a viewport-sized observation workspace.
Explanation and settings are independently collapsible; immersive entry closes them and Escape restores
the reading layout and previous disclosure choices. Changing layout preserves chapter, pair, origin,
zoom progress and the original renderer. The comparison reads its actual CSS canvas height and applies
one scale to every body, preserving diameter ratios. Narrow/mobile layouts retain natural scrolling.

Physical zoom expands the horizontal camera span uniformly when width exceeds twice the available
height, keeping the origin globe visible in a short theater. The same framing factor is applied to
positions, radii and the physical ruler. The width readout consumes the renderer's actual framed span,
including after resize; URL progress and the identity of the Earth/Sun anchor remain unchanged.
This is responsive camera framing, not a change in physical body size or a new distance measurement.


VY Canis Majoris adds pair 4 after Antares without changing older pair indices. Its drawn
photospheric radius is the central value 1420 R☉ of the 1420 ± 120 R☉ estimate by
[Wittkowski et al. (2012)](https://arxiv.org/abs/1203.5194). The bilingual explanation distinguishes
this model-assisted photospheric estimate from the extended molecular/dust envelope and from
any largest-star ranking. The black-hole reference chooser consumes this same body entry.
