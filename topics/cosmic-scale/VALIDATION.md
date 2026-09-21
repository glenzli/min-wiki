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
