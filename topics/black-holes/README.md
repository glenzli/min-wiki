# Black holes

One topic with five lazy chapters: anatomy, stellar encounter, planetary encounter,
a companion binary, and physical scales. The shell owns playback, chapter history, mode, annotations,
loading/error affordances and active-renderer lifetime. Original topic directories
continue to own their simulations, workers, translations and scientific notes.

The old three page entries redirect to the corresponding `?chapter=` URL. Catalog
`parentTopic` metadata retains deployable legacy pages while listing one project.

Anatomy uses the shared non-spinning thin-disk optics. The event-horizon selection
switches to an explicitly labelled geometric diagram: it does not depict a photograph
of the interior. The 2.60 shadow-to-horizon reference applies to the distant-observer
Schwarzschild limit; emitted colors and time are illustrative.

Sources: https://science.nasa.gov/universe/black-holes/anatomy/ and
https://www.nasa.gov/universe/nasa-visualization-shows-a-black-holes-warped-world/.
The encounter and binary chapters retain their own original references.

`scaleModel.ts` owns rounded masses, Schwarzschild-radius conversion, logarithmic
camera zoom and physical ruler values. `chapters/scale.ts` draws linear, concentric
size overlays within each frame, not co-located black holes or their optical shadows.
It uses a hypothetical 10-solar-mass hole, Sagittarius A* (4 million solar masses),
and M87* (6.5 billion). Solar, Mercury and Neptune references share the same ruler.
Spin and observational uncertainties are not modeled.
Source: https://www.eso.org/public/images/eso2208-eht-mwe/.

The scale chapter also owns a side-by-side comparison, mounted with the zoom canvas and removed with the chapter.
The workspace shows either comparison or continuous zoom, retaining the same progress and choices. It uses a separate, explicitly labeled
framing: both objects within the box share one linear km-to-pixel conversion, but the
box does not share the zoom canvas's camera. It remains available when optional guides
or in-scene annotations are hidden. Stage changes update both the object captions and
length ratio; no control silently inflates a subpixel physical disk.

References are a stipulated straight 50 km journey (not a real city's measured extent),
the 1,391,400 km solar diameter, and the diameter of Neptune's rounded 30.07 AU orbit.
Ratios are approximately 1.2, 17 and 4.3 respectively. All ratios compare diameters or spans,
not volume packing. The orbit diagram's center cross is a position symbol, not a drawn-to-scale Sun. The physical
reference constants and pair layout live in `scaleModel.ts`, with the chapter scene
retaining its rendering and DOM lifetime ownership.

The solar reference uses the nominal 695,700 km radius from
[IAU 2015 Resolution B3](https://www.iau.org/static/resolutions/IAU2015_English.pdf).
The orbital reference retains the topic's rounded 30.07 AU Neptune value; see
[NASA Neptune facts](https://science.nasa.gov/neptune/neptune-facts/) for its approximately
30 AU mean distance. The 50 km road span is a stipulated ruler, not external geographic data.

## Familiar references and questions — 2026-09-22

The pair comparison now lets readers keep a chosen reference across all three black-hole stops:
Earth, Jupiter, Sun, Arcturus and Antares are consumed directly from the cosmic-scale numerical
owner; the Milky Way disk uses that owner's rounded 100,000 light-year span. No renderer or
translated UI is imported from the other topic. The old suggested road/Sun/Neptune defaults remain.
Subpixel bodies retain their physical sizes and receive explicitly labelled position crosses.
The Milky Way is a diffuse structural illustration, not a solid disk, measured star catalogue or
M87*'s host galaxy. `scaleModel.ts` continues to own these comparisons and dated observation values;
`chapters/scale.ts` owns both canvases, native controls, question disclosures and their disposal.

A face-on hypothetical accretion disk can be added to the pair view. Inner radius is 3 horizon
radii (the Schwarzschild ISCO reference); the outer radius of 6 horizon radii is an arbitrary
teaching choice, not a measured extent for any of these objects. Both objects and the disk share
the same linear conversion; the dimension line measures only the horizon. This geometrical view
contains no lensing. Anatomy retains the separate ray-based optical illustration. Showing the
disk changes framing, not mass, horizon size or the physical length ratio.

`scaleContent.json` owns paired Chinese/English questions, evidence links and labels. Distance
examples use Gaia BH1 (~10 solar masses, 1,560 ly), Sagittarius A* (~4 million, 27,000 ly) and
M87* (~6.5 billion, 55 million ly). The table's diameters and angular comparison are calculated
from `OBSERVATION_EXAMPLES`, not independent copied measurements. The older cosmic overview
retains its separately rounded 26,000 ly Sun-centre reference. Sources:
[ESA 2023](https://www.esa.int/Science_Exploration/Space_Science/Gaia/Gaia_discovers_a_new_family_of_black_holes),
[ESO 2022](https://www.eso.org/public/news/eso2208-eht-mw/),
[ESO 2019](https://www.eso.org/public/news/eso1907/).

The low-mass example [GW230529](https://dcc.ligo.org/LIGO-P2300352-v9/public) has a 2.5–4.5 solar-mass
90% credible interval and uncertain compact-object classification. Its 15–27 km equivalent
horizon is conditional, not photographed or declared the confirmed smallest black hole.
Primordial holes remain hypothetical. Galaxy capture is discussed through orbital motion and
angular-momentum transport; no whole-galaxy accretion solver or swallowing animation is claimed.

## Viewport and immersive interaction — 2026-09-22

All five chapters use the shared presentation-only observation mode. The active chapter, playback,
progress, chosen reference and optional accretion disk remain topic-owned and survive layout changes.
Desktop reading mode fits the observation workspace to the remaining viewport height; long explanations
scroll inside their own panel. The scale comparison and continuous zoom are alternative windows, not
stacked canvases. A compact chapter selector remains available in immersive mode.

Explanation and settings buttons work in both layouts. Entering immersive mode collapses these panels;
readers can reopen either without leaving the demonstration. Escape restores the reading layout, panel
choices and scroll position. Small screens retain reachable controls through natural scrolling instead
of clipping overflowing content. The shared helper does not start playback, remount renderers or change
scientific state. Canvas framing consumes both available width and height with one km-to-pixel scale;
subpixel objects are still not artificially enlarged. Expanded geometry qualifications remain available
inside the comparison without pushing the playback controls out of the workspace.
