# Cosmic-scale depth refinement — 2026-09-21

Local-only contribution over the inherited dirty topic; no commit, push or deployment.
Scope: topic renderer/model/controller/content/styles, new flight/population owners and their tests, README and SKELETON ownership entry. Existing shared platform and unrelated topics are preserved.

## Evidence

- `node --import tsx --test topics/cosmic-scale/tests/*.test.*`: 10 passed, 0 failed. Covers logarithmic inverse, same-frame physical ruler, Earth anchor, smooth orientation, finite camera journeys, reversal/manual interruption/reduced motion, clamped frame deltas, deterministic finite volume populations, layer toggles and geometry disposal. Last model/galaxy/flight inputs unchanged after this successful run.
- `npm run build`: passed TypeScript, localization (6,401 messages / 66 English namespaces), asset validation (131 matching image copies), and packaged Vite build.
- Final production entry: `dist/assets/cosmic-scale-pshFTzMA.js`, SHA-256 `cd84e359d45bc0e17674606b4ba8032d46796c9aaa623a6d7830eed774a01dfd`.
- Browser readback at `http://127.0.0.1:4175/topics/cosmic-scale/` confirmed this final entry was loaded.
- Browser inspected mapped Earth/cloud atmosphere, tilted Solar System orbits, intermediate neighborhood at `scale=0.74709`, Milky Way face/edge views and independently toggled disk/bulge/halo/inferred-dark controls, plus Local Group endpoint. Observed the stop button start a finite journey and land at the Solar System; manual seeking interrupted a reverse journey. Start/pause and final return-to-Earth button were exercised.
- 390 × 844 Chinese Earth and English galaxy/control layouts visually inspected; DOM clientWidth and scrollWidth both 390. No warning/error logs in the inspected test tab.
- `git diff --check -- topics/cosmic-scale SKELETON.md`: passed for tracked changes; newly added files also passed the compiler/build/test gates.

## Boundaries

Galaxy/dust appearance and local unnamed stars are illustrative structural populations, not photorealistic observations or measured star counts. Earth/cloud maps are static and credited in the UI and README. Physical geometry uses one km ruler; fixed-size open markers/labels explicitly do not represent diameters. Shader point populations are allocated once; camera updates change transforms/uniforms, DPR is capped at 2, idle scenes have no animation loop.

Reduced-motion instant landing and bounded timing were unit-tested; system preference toggling, forced WebGL loss/restoration and bfcache were source-reviewed but not forcibly exercised in the live browser. No full-repository test-suite or performance benchmark claim. Existing build warnings remain for the shared Three.js chunk size and mixed static/dynamic imports in microbes-everywhere; neither is a build failure.

Applied skills: dev-mesh shared-workspace coordination for inherited dirty ownership; maintain-source-cohesion for the separate flight and galaxy-population responsibilities; validation-budget for focused contracts plus a packaged consumer/browser check.

## 2026-09-21 — Earth or Sun starting point

- Added explicit Earth/Sun close-up selection, origin-aware continuous camera centering, first stop/restart, URL restoration, bilingual stage/anchor explanations and narration. Legacy links keep Earth behavior. Origin switches explicitly return to a close-up.
- Kept physical radii and inter-body distances unchanged. Added an independently labeled equal-diameter-scale inset through Solar System scale; spacing does not encode Earth–Sun distance. Solar fact reference: NASA Sun Facts.
- Eleven focused model, flight and galaxy tests passed, including 1,001 Sun-origin samples, no offscreen origin, unchanged Earth–Sun separation and route defaults/clamping. Final build passed typecheck, i18n, image checks and Vite (2.37 s); existing unrelated chunk warnings remain.
- Actual 5173 browser: Sun full disk, animated travel to 120 AU Solar System view, retained size inset, Earth/Sun switch, manual galactic-scale scrub and animated return to Sun. English language navigation retains Sun origin; 390 px Sun view and comparison inspected with width/scrollWidth both 390. No captured console errors. Desktop restored and Chinese Sun starting page left open.
- Local changes only, no commit, push or deployment. Private build: /tmp/mini-wiki-cosmic-origin-20260921. Existing source server remains the only project host.

## 2026-09-21 — Comparison-first learning journey

- Default entry now starts with Earth/Jupiter, Jupiter/Sun and Sun/Arcturus diameter comparisons. Continuous transitions retain body identity and a common diameter scale. The previous small inset is replaced by this chapter. Arcturus uses an explicitly approximate radius of 25.4 solar radii (arXiv:1109.4425).
- A second chapter illustrates Solar System, Milky Way and Local Group membership, explicitly without metric spacing or solid-ball interpretations. The original physical zoom remains the third chapter. Existing origin/scale links open zoom; explicit mode, pair and home selections survive refresh.
- 79 focused checks passed (13 cosmic model/flight/galaxy/comparison checks and 66 shared learning-content checks). Final build passed TypeScript, localization, image validation and Vite (2.35 s), with existing chunk warnings. Private output: /tmp/mini-wiki-cosmic-comparison-20260921.
- Actual source-server browser checks at 5173: desktop comparison endpoints and intermediate transition, all three membership diagrams, lazy physical zoom, preserved scale across chapter switches, finite next-pair animation, legacy Sun link and refreshed Local Group selection. Chinese and English comparison/relationship layouts inspected at 390 px; measured clientWidth and scrollWidth both 390. No captured console errors. Viewport restored after checks.
- New comparison-model tests cover diameter ratios, finite geometry, endpoints, continuity and route compatibility. Reduced-motion and disposal branches were source-reviewed; OS preference changes and bfcache were not forcibly exercised. No new repo-wide performance claim.
- Local changes only; no commit, push or deployment.

## 2026-09-21 — Stellar comparison surfaces

- Replaced smooth planet-style shading for Sun/Arcturus with cached 640px spherical procedural photospheres, deterministic multiscale granulation, symmetric limb darkening, restrained glow and Sun-only illustrative dark spots. Geometry and size ratios are unchanged. Two maps at most are retained and released on disposal; this is a static illustration, not simulated convection or measured stellar imagery. Bilingual on-canvas-adjacent qualifications updated.
- Final build passed typecheck, localization, image gates and Vite (2.56 s), output /tmp/mini-wiki-cosmic-texture-20260921. Existing shared chunk warning remains. Model/route source is unchanged, so prior model evidence is reused; no redundant model tests added.
- Actual 5173 browser: desktop Sun and Arcturus endpoints, 390px intermediate zoom with stable texture identity, English mobile rendering, no horizontal overflow (390/390), no captured console errors. Viewport restored and Chinese Arcturus comparison left open. No commit, push or deployment.

## 2026-09-21 — Antares and galaxy membership detail

- Added Antares at an approximate 700 solar radii (ESO eso1726) as pair 3, retaining legacy Arcturus pair 2. The common-scale model derives its final pair from body count. Expanded ratio/endpoint/route tests; continuity uses relative tolerance because newly included offscreen giant radii span larger magnitudes.
- Replaced sparse galaxy glyphs with three bounded, cached 720px structural illustrations: diffuse stellar disk, spiral populations, central light and dust lanes, with different schematic projections. Same Milky Way image is reused in its chapter and Local Group. Solar System marker and bilingual non-metric/reconstruction qualifications retained. No measured galaxy image or physical projection accuracy claim.
- 14 focused cosmic tests passed. Final build passed TypeScript, localization, image gates and Vite (2.49 s), output /tmp/mini-wiki-cosmic-galaxy-20260921. Existing chunk warning remains.
- Actual 5173 browser: Chinese desktop Milky Way and Local Group, Antares endpoint and legacy pair 2, language change retaining pair 3, English 390px galaxy and explanatory copy. clientWidth/scrollWidth 390/390, no captured console errors. Viewport restored and Chinese galaxy page left open. Physical zoom renderer unchanged. No commit, push or deployment.

## 2026-10-23 — Manual galactic structure observation

Local contribution over base `2eec13784fef78620e398779d00fb1b998011f01`, limited to `topics/cosmic-scale/**`. No commit, push or deployment. Source/content snapshot SHA-256: `e9ed2ae0a54833ac1f9522eea40708de2a06dfe3cad2116f922e5d713885bb9e` (35 sorted topic text/source files; hash input is each relative path, NUL, bytes, NUL; excludes this validation file and binary cover assets).

### Changed contracts

- Added `mode=galaxies`, with `galaxy=milky-way|spiral|elliptical|irregular|star-cluster|local-group`. Old comparison pair, membership home and continuous-zoom links retain their interpretation. The address chapter now leads into galactic observation, then the physical zoom. A return link opens the new universe guide.
- One deterministic 3D population supports face-on/edge-on/manual rotations without reshuffling. The Milky Way solar locator remains at 26,000 / 50,000 of the reference disk radius. Other morphology cases use independent framing and do not represent evolutionary stages. Cluster context/detail connector endpoints use the two actual transformed owners, tested at three elevations.
- Manual sliders/component controls are disclosed, outlines default off, the Sun label is external with an anchor leader, and desktop stage height is at least 380px. Non-disk cases use direction A/B labels and expose no ineffective disk controls. Reference visibility preserves magnification.
- WebGL and a rotatable simplified Canvas drawing share spatial samples. The scene has no automatic clock, coalesces pointer changes, skips hidden/inactive draws, retains at most two cases, releases evictions, and provides context-failure retry. Continuous-zoom galaxy buffers allocate at first relevant scale; retry removes the previous wrapper. Three academic notes and four narration segments remain in each language.

### Focused evidence

- `node --import tsx --test topics/cosmic-scale/tests/*.test.*`: **33 passed, 0 failed**, including five new tests for route compatibility, finite/nonuniform deterministic populations, camera identity and solar position, bilingual qualifications/primary sources, production-scene cache/disposal and mocked GPU loss/retry. The scene test also verifies reference-toggle magnification and projected cluster connector endpoints at face-on, oblique and edge-on elevations.
- Focused TypeScript entry: `tsc --noEmit --strict --skipLibCheck --target ES2022 --lib ES2022,DOM,DOM.Iterable --module ESNext --moduleResolution Bundler --allowImportingTsExtensions --resolveJsonModule topics/cosmic-scale/main.ts topics/cosmic-scale/tests/galactic.test.ts src/assets.d.ts src/reader.d.ts`: passed.
- `node scripts/check-i18n.mjs`: passed with 7,183 checked messages and 73 English namespaces at that checkpoint. Later UI labels live in explicitly paired topic JSON; the parent task performs the final repository-wide gate.
- Reused the production `prepare-entries.mjs` in read-only mode with its entry list restricted to `cosmic-scale` and shared resource projection excluded: both entry manuscripts and four narration exports match `learning.json`. No whole-repository prepare/write was run.
- `git diff --check -- topics/cosmic-scale`: passed. The final code cleanup removed an empty eager-galaxy loop; it changes no allocation or output relative to the tested lazy path.

### Measurements and remaining acceptance

An in-process Node sampling run (12 preparations per case, first two discarded, concurrent workspace checks active) measured model-preparation medians of 7.89ms for Milky Way, 3.35ms spiral, 2.42ms elliptical, 2.87ms irregular, 2.56ms cluster context/detail and 2.89ms Local Group. Case sample counts are 18,500 / 18,500 / 14,500 / 13,000 / 15,050 / 15,009. This measures CPU array preparation only, without GPU upload, browser layout, interaction latency or frame timing; it is not a speed comparison or frame-rate claim.

The parent task owns production packaging and real-browser acceptance. Its first 1280×800 source-preview inspection found the original new-stage layout too short and its labels too concentrated; the layout/labels/controls were corrected as described above. The parent then confirmed the latest 5193 Chinese source preview at 1280×800: Milky Way oblique → edge-on kept the solar locator in the disk, the structure/labels were clear, selecting the star-cluster case retained the projected connector, and the revised layout was acceptable. Production-output English 390px checks and other-case smoke checks remain with the parent. This contribution does **not** claim actual GPU-loss recovery, bfcache or repeated real-browser switching has passed. GPU failure/lifecycle evidence here uses a production-scene test with a mocked renderer. No full build or full repository test suite was run by this contribution; the parent performs those gates once for the integration.

Science pages read for the new scope: [NASA galaxy types](https://science.nasa.gov/universe/galaxies/types/), [ESA Gaia guide](https://www.esa.int/Science_Exploration/Space_Science/Gaia/Guide_to_our_galaxy), [NASA star clusters](https://science.nasa.gov/universe/star-clusters-inside-the-universes-stellar-collections/), and [NASA Andromeda](https://www.nasa.gov/universe/galaxies/andromeda-galaxy/). Rendering geometry is an authored teaching reconstruction, not imported imagery or a measured star catalogue.

## Root integration acceptance · 2026-10-23

The root repository gate passed 1,325 tests, build and 73/73 Reader coverage. The final production
artifact was inspected for the Chinese desktop Milky Way, English 390px Local Group, observable
region endpoint and a bounded set of legacy routes. The final camera-preset accessibility label
also follows the selected case instead of describing every case as a disk. Exact artifact identity,
earlier source-preview observations and limitations are in [the integrated acceptance record](../../docs/strict-visual-review-20261023.md).
This closes the pending integration gate above; it does not claim hardware GPU-loss, bfcache or
frame-rate testing. No commit, push or deployment occurred.

## 2026-10-23 — Planet-size order and orientation audit

This local contribution accepts the existing cosmic-scale work as its baseline
(`c51be878bf883ba62facc1de24239114ab052b2063bf68b844537a6493e2c717`); it does not
replace or attribute the preceding galactic implementation to this audit. Changes remain confined
to the topic and are uncommitted.

- Fixed a concrete reversal in the Solar System membership drawing: Earth formerly had a 5px
  radius and Jupiter 3px. All eight recognition symbols now derive from the existing rounded
  physical radii through one monotone compression. Their body-size order remains Jupiter >
  Saturn > Uranus > Neptune > Earth > Venus > Mars > Mercury; the 18px Sun remains larger than
  every planet. Inner projected positions clear the Sun, and object-specific globe details distinguish
  Earth, Jupiter and Saturn. This is an illustrative membership view, not a physical ruler.
- Moved the same radii into `model.ts` for the physical scene, comparison data and recognition
  symbols, without changing any selected radius or the linear diameter/zoom conversions.
  `planetGlyph.ts` owns the compressed symbols only. In the quantitative stellar/orbit overlay,
  crosses now locate unresolved planets while the star outline and orbital radii keep their shared
  physical scale. A separate legend uses the correctly ordered recognition symbols.
- Removed fixed left/right wording from the bilingual cluster cue so rotating its two owners
  cannot make the explanation point to the wrong image. Existing deterministic structure samples,
  Sun anchor, view state, layer toggles and cache limits were inspected and left intact.
- `node --import tsx --test topics/cosmic-scale/tests/*.test.*`: **36 passed, 0 failed**.
  New tests exercise every pairwise planet-size relation at both symbol scales, the production
  membership drawing at 342px and 1100px, Sun clearance, and the bounded spherical icon outlines.
- Strict targeted TypeScript check over `main.ts`, `tests/galactic.test.ts`,
  `tests/planetGlyph.test.ts`, `src/assets.d.ts` and `src/reader.d.ts`: passed.
  `node scripts/check-i18n.mjs`: passed with 7,377 messages and 74 English namespaces at this
  checkpoint. `git diff --check -- topics/cosmic-scale`: passed.
- Checked the rank against [NASA's size comparison](https://science.nasa.gov/solar-system/planet-sizes-and-locations-in-our-solar-system/)
  and the existing radii against [JPL's parameter definitions](https://ssd.jpl.nasa.gov/planets/phys_par.html).
  These are rounded representative body radii, not ring extents. Colours, maps and tiny surface
  landmarks remain recognition illustrations rather than live or measured surface data.

The parent task owns the next actual-browser pass: Solar System membership, a Sun/giant orbit
overlay, all six galaxy cases, drag → switch chapter → return, and 390px English layout. The
earlier browser acceptance above does not validate these new symbols. No production build,
commit, push or deployment was performed by this audit.

### Narrow-screen galaxy controls follow-up

The parent browser pass at 390×844 in English found the three viewing presets squeezed beside
View options, splitting words such as “compare” and “thickness”. At widths up to 699px the presets
now occupy their own full-width three-column row, with View options on the following row. Preset
labels use normal word wrapping and a 13px font; they may occupy multiple whole-word lines.
The existing desktop rules and the controls' DOM, meaning, selected state and handlers are unchanged.

This follow-up changes only `style.css` and this record. Source review confirms that the new layout
rules stay inside the narrow-screen media query; `git diff --check` passes. The 36-topic-test and
targeted-typecheck evidence above is reused because their source inputs did not change. No test
suite or production build was rerun for this CSS correction. The parent owns actual-browser
verification of the new 390px English layout and the unchanged desktop arrangement. No commit,
push or deployment occurred.
