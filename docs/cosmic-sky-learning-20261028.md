# Cosmic scale: the sky belongs to the same universe

Scope: supplement chapter 03 while retaining the four top-level observations, existing URLs and the
prior local observer-zoom work. No Reader source, unrelated topic, catalog status or deployment changes.

## Learning contract

| Question | Changed condition | Visible evidence | Main boundary |
| --- | --- | --- | --- |
| Why is the Milky Way a band? | Sightline along/away from disk; observer inside/outside | Same Sun and stellar population, retained ray and disk thickness | Enhanced structural projection, not live photometry or a local observing forecast |
| Are Orion stars equally far away? | Observer position; selected star | Same seven directions unfold into different depths; distance interval | Dated 2007 parallax inputs, not latest distance consensus or stellar motion |
| Is M31 one of our stars? | Galactic sightline and linked galaxy view | Foreground pattern stars versus a distant-galaxy locator | M31 patch enlarged; external geometry is not an observed 3D map |
| Are all galaxies spiral disks? | M31/M87 structural case and view angle | Flat disk versus smoother, nearly round stellar volume | Morphologies are alternatives, not stages or a shared size ruler |
| Is every planetary system like ours? | Common AU framing/close-up; shared elapsed days | Seven compact TRAPPIST-1 orbits inside Mercury's orbital radius | Enlarged locators; hypothetical surfaces; approximate circular coplanar motion |

Sky/observer geometry, selected star data and planetary orbital inputs remain topic-owned. Reader keeps
layout, localization shell, menu placement and focus. Existing stars/Solar System studies retain their
physics and surface responsibilities. New state fields have finite/clamped defaults for legacy links.

## Data and evidence

- Orion uses named ICRS/J2000 positions and the 2007 Hipparcos reduction as indexed by CDS SIMBAD:
  [catalogue](https://cdsarc.cds.unistra.fr/viz-bin/cat/I/311),
  [Betelgeuse](https://simbad.cds.unistra.fr/simbad/sim-basic?Ident=betelgeuse),
  [Bellatrix](https://simbad.u-strasbg.fr/simbad/sim-basic?Ident=Bellatrix),
  [Alnitak](https://simbad.cds.unistra.fr/simbad/sim-basic?Ident=Alnitak),
  [Alnilam](https://simbad.cds.unistra.fr/simbad/sim-basic?Ident=Alnilam),
  [Mintaka](https://simbad.u-strasbg.fr/simbad/sim-basic?Ident=Mintaka),
  [Saiph](https://simbad.u-strasbg.fr/simbad/sim-basic?Ident=Saiph),
  [Rigel](https://simbad.cds.unistra.fr/simbad/sim-id?Ident=RIGEL).
- Distance is the selected reciprocal-parallax illustration, with `1000/(parallax ± error)` parsecs
  converted to light-years. This is not a distance posterior or complete systematic-error budget.
  [Shenar et al. 2015](https://doi.org/10.1088/0004-637X/809/2/135) specifically discusses discrepant
  Mintaka estimates. Star surface variability/multiplicity and alternate measurements remain qualified
  in both languages. Source-table access timed out; the individual CDS records above were inspected.
- Galactic coordinates use the conventional J2000 rotation; x is reversed to match the existing
  centre-to-Sun axis. A rotation changes basis, not interstellar angular separations or distances.
- [NASA's Milky Way band](https://science.nasa.gov/image-article/apod-2005-june-5-a-milky-way-band/)
  and [constellations](https://starchild.gsfc.nasa.gov/docs/StarChild/questions/question9.html) support
  the inside-disk and projected-pattern explanations.
- [M31](https://science.nasa.gov/missions/hubble/hubble-maps-giant-halo-around-andromeda-galaxy/) and
  [M87](https://science.nasa.gov/mission/hubble/science/explore-the-night-sky/hubble-messier-catalog/messier-87/)
  supply named comparison context. No outdated collision forecast is adopted.
- [NASA TRAPPIST-1](https://science.nasa.gov/mission/webb/science-overview/science-explainers/what-is-webb-revealing-about-the-trappist-1-system/)
  and the [NASA Exoplanet Archive](https://exoplanetarchive.ipac.caltech.edu/overview/TRAPPIST-1)
  support the selected Agol et al. 2021 orbital values. Periods share one finite 20-day teaching clock;
  phases, enlarged spheres, surface materials and colours are illustrative.

## Validation — local, 2026-10-28

- All 70 cosmic-scale tests passed. After the final observer framing, annotation placement and M87
  smoothing changes, typecheck and the 11 directly affected galaxy/sky tests passed again. A new
  projection assertion covers all seven stars throughout the observer path at five viewport aspects.
- `check:i18n`, `check:entries`, `check:images`, `review:check` and `git diff --check` passed.
  Existing editorial classifications and unrelated topic ownership were retained.
- A packaged Reader build produced 82 entries with source digest
  `3e8effabc79335f85c346be29e63c3be8cac6070e9c512261cbd544e271a65a7`.
  All 45 cosmic-scale runtime input hashes match the current files. The Reader checkout is clean at
  the lockfile revision `48bd98efce93fcae75d196d3ef6a02474e8d2edb`.
- The installed `node_modules` Reader was stale despite its version number. The verified local
  checkout was therefore selected through `WIKI_READER_ROOT=/Users/g4i/lab/wiki-reader` for both
  the source preview and packaged build. Dependencies and Reader source were not changed.
- Actual in-app-browser checks covered Chinese and English desktop/390px rendering, Orion sky/depth
  and point selection, selection retained across language changes, the same stars located near the
  Sun in the Milky Way, M31 sightline/structure links, shared-AU and close-up TRAPPIST-1 views, finite
  20-day playback, and the M87 view. The final packaged consumer was also exercised in the browser.
  No console warnings/errors were observed in those checks.
- Renderer cache bounds, hidden-page scheduling, context loss/retry and disposal were exercised with
  production classes in the focused VM tests; actual-browser GPU loss and measured device frame
  rates are not claimed.

The local working preview remains at `http://127.0.0.1:55882/encyclopedia/`. The packaged artifact and
identity receipt live under `/private/tmp/cosmic-sky-learning-20261028/`. No commit, push or deployment
was performed for this addition.
