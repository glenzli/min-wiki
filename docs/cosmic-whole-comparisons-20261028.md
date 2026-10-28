# Complete systems and galaxies: local refinement, 2026-10-28

Scope: preserve inherited cosmic-scale work, its four chapters and topic ownership. The user asked
for another complete planetary system and another complete galaxy as reference objects, and an
explicit switch between Earth's ground sky and spatial along-disk viewing. No commit, push or deployment.

## Observation contract

1. Question: how can complete objects at the same level have different arrangements? Distinguish a
   planetary family from a galaxy before comparing their members and spatial forms.
2. Identity: Solar System's central Sun and eight planets; TRAPPIST-1's central star and seven known
   planets; the same retained Milky Way and M87 structural populations used in their individual views.
3. Actions: compare full systems, select any planet, rotate, play a shared finite twenty days, switch
   to a common AU ruler, or examine TRAPPIST-1 separately. Turn the whole galaxies face/edge-on or open
   either separately. Chapter 02's corresponding address stops lead directly to the complete comparisons.
4. Observable result: the Solar System has giant-planet members absent from TRAPPIST-1's known
   seven-planet set; the latter's orbits all fit inside Mercury's. A galaxy's flat disk narrows edge-on,
   while M87's smoother stellar body retains thickness. These are contrasting objects, not an evolution.
5. Explanation: membership, orbital distance, apparent orientation and physical body diameter are
   different questions. A readable whole-system layout is explicitly separate from the orbital ruler.
6. Boundaries: whole planetary systems here include central stars and major planets, not every moon,
   small body or remote reservoir. TRAPPIST surfaces are hypothetical; circular coplanar motion is an
   approximation. Galaxy point volumes are structural reconstructions, not individual measured stars.

## Source and responsibility

`planetarySystems.ts` reuses canonical Solar System radii/AU inputs and owns selected TRAPPIST-1
inputs, circular poses and the separate spread layout. Solar periods use a circular Kepler approximation.
`skyScene.ts` retains all fifteen planet meshes, eight attributed Solar System Scope maps and bounded
GPU/Canvas resources. `skyStudy.ts` owns selection and finite playback. No additional renderer or clock
is introduced for the comparison. Moons and planetary exploration remain in `solar-system/`; detailed
stellar and binary physics remain in `stars/`.

The paired galaxy case reuses a bounded sample of the individual Milky Way and M87 populations.
Each object rotates around its own centre and is fully framed at default zoom; narrow screens stack
the pair. Both captions and explanations identify independent framing without a shared size ruler.

The ground sky has its own retained `skyView=ground` state. Direction buttons enter spatial mode,
without terrain blending into observer travel. Ground mode hides spatial playback, retains its stored
progress and uses the same Sun location and fixed stellar population. Legacy links default to space.

Primary sources:

- [NASA Solar System facts](https://science.nasa.gov/solar-system/solar-system-facts/): eight major planets.
- [NASA TRAPPIST-1](https://science.nasa.gov/mission/webb/science-overview/science-explainers/what-is-webb-revealing-about-the-trappist-1-system/): seven known rocky planets and red dwarf.
- [NASA orbit comparison](https://science.nasa.gov/asset/webb/trappist-1-system-orbit-comparison/): all seven orbits inside Mercury's.
- [NASA Exoplanet Archive](https://exoplanetarchive.ipac.caltech.edu/overview/TRAPPIST-1): selected Agol et al. (2021) orbital inputs.
- [ESA Galactic guide](https://www.esa.int/Science_Exploration/Space_Science/Gaia/Guide_to_our_galaxy): Milky Way disk, bulge and halo.
- [NASA Hubble M87](https://science.nasa.gov/mission/hubble/science/explore-the-night-sky/hubble-messier-catalog/messier-87/): smooth giant elliptical morphology.
- [Solar System Scope textures](https://www.solarsystemscope.com/textures/): existing attributed CC BY 4.0 maps.

## Verification

Typecheck and all 73 cosmic-scale tests passed, including independent route state, all eight/seven
members, physical AU poses, supplied-day motion, bounded resource lifetime, ground/spatial separation
and default whole-galaxy framing across desktop and mobile aspects. Content gates passed: 7,540 i18n
messages, 83 English namespaces, authored entry projections, 161 delivered image copies and unchanged
editorial status (11 complete, 71 draft). Whitespace checks passed.

Actual source-preview inspection covered whole planetary families, selectable members, common-AU
and solo-TRAPPIST views, a stopped twenty-day endpoint, paired galaxy rotation and single-M87 return,
both Chapter 02 comparison entries, and explicit ground/space switching. Chinese and English whole
planetary views and the English galaxy pair were inspected at 390×844. A specificity conflict that
kept the whole-system stage at 363px was corrected; it now uses 607.68px there, with no horizontal
overflow. Compact controls wrap and the pair remains fully framed. No console warnings/errors were
observed in the inspected source views.

Final packaged build: 82 entries, source digest `dd4f51f31d7f`. The 45 cosmic-scale runtime inputs
match the packaged manifest. Reader is the clean lockfile checkout at
`48bd98efce93fcae75d196d3ef6a02474e8d2edb`, selected using `WIKI_READER_ROOT`.
The packaged whole-planetary scene, mapped bodies, common/full selection roundtrip and refresh
were inspected without console warnings/errors. A later packaged mobile galaxy screenshot attempt
timed out in browser debugger synchronization; it is not counted as a completed packaged mobile check.
Source mobile inspection and the manifest-to-source match remain the evidence for that layout.

The viewport override was reset and the task-private packaged HTTP server stopped. The working
source preview stays at port 55882. Screenshot and machine-readable receipt artifacts are under
`/private/tmp/cosmic-whole-comparisons-20261028/`. No commit, push or deployment was performed.
Existing dated sky/pole records describe prior implementations; this record supersedes their
automatic ground fade with the explicit ground/space switch.
