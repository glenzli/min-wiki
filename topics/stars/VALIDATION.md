# Stellar surfaces and live orbits — 2026-09-21

Local-only refinement on the inherited dirty workspace. No commit, push or deployment.
Dev Mesh run: `wiki-stellar-live-20260921`, scope: `stellar-live`.

## Changed contracts

- A topic-owned photosphere painter serves comparison, circular orbit and numerical scenes.
  Stable spherical noise, projected active regions and limb shading replace screen-space dots
  and an externally lit sphere. It is an enhanced illustration, not a stellar observation.
- Main comparison disks share a linear scale (0.25, 1, 50, 800 solar diameters).
  Giant comparisons identify the Sun at actual scale, with a separately labeled enlarged inset;
  the supergiant also shows the 50-solar-diameter giant at the main scale.
- Binary/hierarchical motion remains an explicitly circular construction and now continues
  after the previous phase endpoint. Both it and integrated three-body motion show past-only,
  age-fading dashed trails.
- Numerical playback advances real fixed-step Verlet states during animation. A rolling buffer
  retains 1001 samples per trajectory, without restarting original diagnostics at the buffer edge.
  Guard stops, paused history review and return-to-live continuation remain distinct states.
- Parameter edits reset immediately and pause; chapter return preserves the current history.
  Controls are user-started; advanced initial conditions are under a disclosure.

## Automated evidence

- `node --import tsx --test topics/stars/tests/*.test.* topics/sun-star/tests/*.test.*`: **24 passed**.
  Includes continuous integration through 80 T₀, exact agreement with finite integration up to
  20 T₀, fixed allocation after several wraps, timestamp pairing, conserved quantities, resolution
  guards, deterministic batching and a real-controller DOM/clock adapter (including Canvas failure).
  The controller test covers seek capture, pause, chapter return, hidden-page stopping, reset,
  dispose and no more than one scheduled animation callback.
- `npm run typecheck`: passed after renderer/controller changes.
- `npm run check:i18n`: 6401 source messages, 66 complete namespaces. Bilingual JSON changes
  were also inspected; the extraction count alone is not evidence of scientific equivalence.
- `npm run build`: passed (typecheck, i18n, 131 image-delivery checks, Vite).
  Subsequent scoped UI refinements were repackaged with `npm exec vite build`; unchanged image
  evidence was reused. No full unrelated repository test suite was run.
- Final packaged topic: `dist/assets/stars-BRqDGa6C.js`.
  SHA-256: `bc9bb2a07f690f6c203197190455883ff8a1fe13be3439dca3fccda32ca9b0d8`.

## Actual browser evidence

Production preview: `http://127.0.0.1:4175/topics/stars/`.

- Desktop Chinese: solar-style surface and supergiant/Sun/giant chart; live binary and fading
  orbit; numerical figure-eight passed 48.66 T₀ without looping or stopping at 20 T₀.
- Seek regression found and fixed: pausing used to repaint the slider before its input was read.
  Final production interaction changed viewing time from 8.16 to 0.60, then 0.58 T₀ while the
  integrated endpoint stayed 8.16. Leaving and returning preserved 0.58 / 8.16 and overlay state.
- English 390×844: three-body running past 29 T₀, red-dwarf/Sun and supergiant comparison,
  short labels, scale note, enlarged-Sun disclaimer, controls and cutaway compatibility checked.
- English changed C's initial x to +0.3: initial state reset, playback began immediately,
  then stopped at the shared accepted 4.34 T₀ with a visible close-encounter/resolution explanation.
- Chinese 390×844: live three-star bodies/labels/dashes and paused status checked.
  Both languages reported page width 390, equal to the viewport (no horizontal overflow).
- Production-page console: no relevant warning/error observed. A transient development HMR error
  during an intermediate paired content/controller edit was not present after complete reload/build.

No claim is made about a guaranteed frame rate, infinite-time numerical accuracy, actual stellar
collision radii, observed star colors, arbitrary triple stability, or every browser's BFCache behavior.

Skills applied: `coordinate-shared-workspace` preserved inherited changes and bounded edit authority;
`maintain-source-cohesion` kept the shared stellar painter topic-local while integration stayed with
its existing owner; `validation-budget` selected focused physics/lifecycle tests plus packaged UI checks.

# Nebulae, stellar branches and 3D morphology — 2026-10-23

Local contribution for Dev Mesh owner `codex-cosmos-stars`, run
`cosmos-stellar-life-20261023`, scope `stars-stellar-life`, bounded to `topics/stars/**`.
Base revision: `2eec13784fef78620e398779d00fb1b998011f01` on `main`.
No commit, push or deployment was performed.

## Changed contracts

- Six visible learning questions retain every old `chapter` value. New nebular routes validate
  `nebula=nursery|planetary|supernova`, `light=emission|reflection|dark`, and `cutaway=1`.
  Evolution retains reversible progress and adds the explicitly theoretical `low-mass` branch.
- Default evolution and nebulae use one lazy, retained rotatable 3D viewport. `view=comparison`
  retains the old evolution radius/orbit comparison without changing the selected mass or phase.
  Types now include a 30000 K main-sequence representative and distinct lifetime/luminosity readouts.
- Cloud illumination preserves parcel geometry. Formation continuously flattens the same field
  into a disk; an expanded envelope and outgoing shell keep one center. The low-mass branch
  does not receive an explosion shell. Neither cloud geometry nor stellar anchors are physical solves.
- Planetary and core-collapse shells distinguish matter source, illumination, extended gas and
  compact center. The near-side opening uses the same plane for shell, parcels and filaments.
  Remnant markers have separate recognition magnifications, not measured relative diameters.
- 3D import and context failure retain the latest science snapshot in Canvas, with explicit retry.
  A disposed viewport cannot mount a late import. Nebulae hide the irrelevant surface button
  and stop that clock; other chapters preserve its user choice.
- Chinese/English learning keeps three academic notes and four narration segments. Handwritten
  manuscript supplements sit outside generated markers. Root integration owns their projection.
  The established Newtonian model, runners and controller sources were not changed.

## Automated evidence

- `node --import tsx --test topics/stars/tests/*.test.*`: **38 passed** at the implementation
  checkpoint, including the original three-body regressions, new spatial model and lazy-lifecycle tests.
- After adding the explicit learning-schema regression,
  `node --import tsx --test topics/stars/tests/space.test.mjs`: **8 passed**. This adds one test
  to the earlier complete 38-test checkpoint; the total is not presented as a rerun of every suite.
- Focused TypeScript consumer check passed after the final renderer/cutaway edit:
  `node_modules/.bin/tsc --noEmit --target ES2022 --lib ES2022,DOM,DOM.Iterable --module ESNext --moduleResolution Bundler --allowImportingTsExtensions --resolveJsonModule --isolatedModules --strict --skipLibCheck --types node src/assets.d.ts src/reader.d.ts topics/stars/main.ts`.
  It includes the actual lazy-imported renderer. TypeScript does not compile GLSL or prove visual quality.
- `node scripts/check-i18n.mjs`: **passed**, 7290 messages and 74 complete English namespaces
  at that workspace checkpoint. Authored bilingual JSON and scene-study qualifications were also read.
- `git diff --check -- topics/stars`: **passed** after the final source changes.
- Final implementation/content/test input fingerprint (37 `.ts`, `.mjs`, `.json`, `.css`, `.html`
  files in sorted topic-relative path order, hashed with path/NUL/content/NUL):
  `58a2a21d049535c1256a70b4a84137a279bebd70936236840f1de575a3761948`.

No global entry projection, full build or full unrelated test suite was run by this contributor.
The root integration performs the required repository and production-delivery gates after all topics settle.

## Real-browser evidence and remaining acceptance

Root inspected the first 1280×800 implementation on its 5193 preview and found two concrete
visual issues: a regular soft-particle cloud and an overly opaque supernova shell. The final
revision replaces the cloud with a bent uneven dense filament, sparse diffuse field and local cavity;
reduces shell sprite size/opacity; retains a faint rim plus 26 continuous short filament paths;
and preserves the center through a shared opening plane. Root then confirmed that the cloud
illumination retained shape and the transparent shell showed its center. A final readability revision
raises the short filaments’ local contrast and gives the smaller illuminating-star marker a bounded
soft halo, with no scientific-state or animation change. The unrelated nebular surface control
was removed from that chapter and its clock suspended.

Final desktop/390px Chinese/English visual recheck, reduced-motion/hidden behavior, pointer and
keyboard gestures, WebGL context-loss recovery, all legacy routes and packaged delivery remain
owned by root's aggregate browser gate. This contributor has not claimed that those final browser
checks, GPU memory measurements or the production build have already passed.

## Fixed resource budget

One 3D renderer; 2800 field parcels; 220 outflow points; 360 background points; one illuminating-source halo point; a shared 56×32
sphere; 26 filament paths with 30 line segments each. Retained geometry attributes are approximately
165 kB before driver overhead. Pixel ratio is at most 1.75 and the drawing buffer at most two million
pixels. There are no textures, post-processing targets, remote 3D assets or workers. Cases reuse
geometries/materials; surface-time changes do not rewrite parcel buffers. Teardown/context failure
releases observers, controls, canvas events, buffers, materials, renderer lists and context.

The renderer owns no animation loop. User-started evolution and the existing at-most-8-Hz stellar
illustration clock supply snapshots. Hidden pages stop updates; reduced-motion starts surface
activity off; nebulae stop that clock entirely. No measured frame-rate or startup-speed claim is made.

## Root integration acceptance · 2026-10-23

The integrated repository gate passed 1,325 tests, build and 73/73 Reader coverage. Root also
made the current evolution stage the scene title and the selected branch its context. Final
packaged desktop/390px evidence, source-preview observations, artifact identity and unexercised
hardware/lifecycle cases are recorded in [the integrated acceptance record](../../docs/strict-visual-review-20261023.md).
That record supersedes the pending root-gate status above without extending the contributor's
original observations. Editorial draft status is retained; no commit, push or deployment occurred.


# Shared stellar/nebular material sync — 2026-10-23

Local contribution: owner `codex-stars-sync`, Run `stars-topic-sync-20261023`, Claim
`stars-topic-sync`; inherited baseline `a64850e8290785aa1dd5718c16126a8e9add3ac384c508bdebc7059850211125`
on `2eec13784fef78620e398779d00fb1b998011f01`. All inherited changes were preserved.
No commit, push or deployment.

- Promoted both complete guide visual owners and their focused tests into `src/visuals/`.
  The root agent migrated/deleted the former guide consumers; the shared APIs remain compatible.
- The real stars 3D scenes consume shared emissive granules/dark regions and smooth compact
  surfaces. The volume is derived from the original numbered cloud/disk/shell parcels rather
  than substituting the guide's static cloud. Lighting/opening changes uniforms without changing
  that field; the original near-side plane cuts the volume, shell and faint remnant filaments.
- Canvas photospheres sample the same field and preserve deterministic replay; their compact
  profile has no moving solar granulation. Radius/planetary-orbit comparisons retain their scale.
- Bounded camera close-ups expose the main-sequence material while preserving radius order;
  cloud/outflow and shell framing and narrow-layout limits prevent the close-up from cropping
  their context. Camera target, user view direction/distance, coordinates and progress persist.
  The paired camera/shading qualifications are in scene JSON, learning JSON and both manuscripts.
- Removed the unused GPU parcel/halo materials and old noise-only star shader. Resource limits
  and texture disposal are updated in the topic README; no performance timing is inferred.

Automated evidence at the runtime checkpoint:

- `node --import tsx --test topics/stars/tests/*.test.* topics/sun-star/tests/*.test.* src/visuals/tests/stellarPortrait.test.mjs src/visuals/tests/nebulaPortrait.test.mjs`: **60 passed**.
  Covers all original dynamics/lifecycle regressions plus external-medium identity, exact
  illumination/replay field equality, continuous disk projection, hollow shells, bounded
  empty faces, close-view radius order, shared CPU sampling and disposal.
- Focused TypeScript check of `topics/stars/main.ts` and `topics/universe-guide/main.ts` and
  their actual lazy/shared dependencies: **passed**. GLSL/visual quality is not established by it.

Root's source-browser review observed the first volume pass in Chinese at 1280×800 with no GPU
warning, retained cloud outline across all three light conditions, and an effective shell opening.
It found the small cloud/star framing and planetary wire-like linework; the final implementation
responds with bounded close-ups and planetary volume-only filaments. The final desktop/390px,
Chinese/English, context-loss and production-artifact checks remain root-owned and must not be
inferred from unit tests or the earlier browser checkpoint.


# Soft photosphere and larger observation stage — 2026-10-23

Owner `codex-stars-sync`, Run `stars-surface-layout-20261023`, Claim `stars-surface-layout`.
Reviewed inherited baseline `7eeec58774d36f2fe95839f5a740437fbddd6ea10806fed8da52a3a0b58f3695`;
scientific data, spatial model and the previous full repository evidence are unchanged.
No commit, push or deployment.

The changed contract is presentation: softer multiscale emitting photospheres and a larger default
observation stage with collapsed secondary choices. Compact remnants retain their original smooth
material. Both Canvas/GPU projections retain deterministic object-bound sampling, active-region
identity, a bounded texture, independent supplied surface time and idempotent disposal. Native
branch/phase/case disclosures preserve their open state; scientific playback/progress remains
outside them. Paired Chinese/English labels were added to topic-owned JSON. No new narration or
scientific claim was introduced; the established manuscript qualifications remain in force.

Focused evidence:

- `node --import tsx --test src/visuals/tests/stellarPortrait.test.mjs topics/stars/tests/stellarSurface.test.mjs`:
  **8 passed**, including the new restrained-emission-range/fine-coherence regression, replay,
  compact-surface distinction and material/texture ownership tests. The numeric texture bounds
  are display-regression criteria, not measured photospheric statistics or visual acceptance.
- Exact TypeScript consumers `topics/stars/main.ts` and `topics/universe-guide/main.ts`, with
  their actual shared/lazy dependencies: **passed** at the frozen runtime checkpoint. This evidence
  is reused after documentation/test-only changes; the sources and generated dependencies did not change.
- `node scripts/check-i18n.mjs`: **passed**, 7,377 messages and all 74 English namespaces.
  `node scripts/prepare-entries.mjs --check` and scoped `git diff --check`: **passed**.
- After root found a clipped upper polar jet at solar progress `.14`, the same Claim was
  extended to `spaceModel.ts`, `spaceScene3d.ts` and the framing regression. Only the bounded
  outflow magnification cap was changed; coordinates, camera target/direction and the confirmed
  main-sequence/giant/nebular framing are preserved. The focused `close framing` test passed,
  including `.14`/`.20` headroom and unchanged main-sequence/radius-order cases. The exact
  TypeScript consumers passed again after this final framing-source edit.
- Root's full 1,404-test/type/content checkpoint precedes this material refinement. Its unaffected
  model/lifecycle results are reused rather than rerunning the full stars or repository suite.

Root's real source-browser review after the final appearance change measured a 1238×472 canvas
at 1280×800, a 330px-high canvas at 390px in English, and page width equal to viewport width.
It confirmed the hard honeycomb/eggshell edges were removed, fine soft granules/spots/glare
remained visible, and the disclosure, playback and progress slider worked. The final candidate
was frozen at solar evolution progress `.66667` for comparison. Root owns the subsequent
nebula/formation/guide-consumer and final production-build acceptance.


Root then rechecked solar progress `.14` after the bounded outflow-framing correction and
confirmed a clear upper-tip margin with the full jet retained inside the 472px canvas.
Material, layout and framing were frozen for the final production build. This confirms the
source-browser candidate; final output identity and packaged verification remain root-owned.

# Luminous profiles and extended cooling — 2026-10-23

Local follow-up by root Run `stars-glow-cooling-root-20261023`, with parallel Sol 6.1 max
contributions `stellar-glow-20261023`, `stellar-pacing-20261023` and the bounded compact-radiance
follow-up `stellar-compact-radiance-20261023`. All inherited dirty work was preserved. No commit,
push or deployment.

- Shared solar, orange-giant and compact profiles differ in patch scale, contrast, active regions
  and glare. Solar features were softened after the first actual screenshot showed excessive
  mottling. The halo matches the apparent perspective limb instead of being hidden by the sphere.
  Compact-only display-radiance compression keeps the later warm-white remnant visibly emitting;
  model emission, disk opacity and radius remain separate.
- The reversible authored timeline lasts 84 screen seconds, including a 22-second remnant tail.
  The old first six phase URLs remain valid, the remnant starts at `.9`, and its phase button
  selects that beginning. Cooling does not fabricate physical ages or temperatures. Shell geometry
  and fading are independent, so the same numbered parcels stay outside the center while fading.
  The camera approaches after fading has begun. Both Canvas and 3D consume the same state.
- Final affected-owner and shared-consumer tests: **101 passed, 0 failed**, including stars,
  shared visuals, guide, legacy Sun entry, small bodies and cosmic paths. Log:
  `/private/tmp/mini-wiki-stars-glow-final-tests-20261023.log`.
- Full repository TypeScript passed before the final compact-only display formula; exact affected
  consumer TypeScript passed again after it. The formula did not alter unrelated type inputs.
  Latest i18n: **7,377 source messages / 74 complete English namespaces**, and entry projection
  check passed. No learning schema, manuscript, narration, image or catalog change was needed.
- Final Reader production build: **73 entries / 1,557 inputs**, source digest
  `22b8002cb79b90248a24607506658f63192434d8b5cd72d370e23f04a135ea0d`.
  All **186 astronomy-related build inputs** match current source SHA-256. Fixed artifact:
  `/private/tmp/mini-wiki-stars-luminous-22b8002cb79b`, served read-only at local port 5194 with
  `/encyclopedia/`. Build log: `/private/tmp/mini-wiki-stars-luminous-build-20261023.log`.
- Actual browser: desktop Sun, giant and late white dwarf; the `.9` remnant button played through
  cooling to a paused endpoint. Final packaged comparison/3D switching preserved `.97`; backward
  playback reduced it, pause persisted `.9291045…` as `.92910`, and reload restored `.9291` without
  autoplay. Chinese and English 390×844 widths matched content width; the canvas stayed 368×330.
  Source guide Sun/Earth retained correct size order and shared luminous morphology. No warning
  or error was captured in the final packaged checks.

Full screenshots, iterations and evidence limits are in the appended section of
[the integrated visual record](../../docs/strict-visual-review-20261023.md).
The 84/22-second figures are authored playback allocation, not a timed hardware benchmark or
physical lifespan. Full 84-second playback, every branch/action combination, forced GPU loss,
BFCache and real-phone performance were not all manually exercised. The final appearance still
awaits the user's feedback.

# Compact controls and vivid nebulae — 2026-10-23 to 24

Root Run `stars-compact-layout-20261023` compacted the topic-owned presentation while Sol 6.1 max
Run `nebula-vivid-20261023` refined the shared nebular material. No commit, push or deployment.

- Desktop controls use 12px text and 32px minimum height; phones retain at least 44px touch
  targets. Playback/progress/direction form one group, with observation tools on a separate row.
  The original playback button and handler are retained across chapter/view changes. Direction
  arrows have local inset space. Reader dependencies and unrelated topic styles were not edited.
- Cloud color coordinates occupy connected cyan, violet and rose regions instead of averaging
  independent parcel colors into gray. A common highlight gain retains color ratios. The accepted
  cloud optics use irregular object-space emitting and foreground absorbing layers, with a low
  diffuse base and smooth illuminated cavity. Repetitive grooves, featureless blur and analytic
  sine ribbons were rejected after actual screenshots. Planetary/remnant shell identities remain
  separate. The guide consumes the same material; Canvas uses coherent colors and depth ordering.
- The nearby Chinese/English caption identifies filtered-composite-style enhanced colors, not
  naked-eye color or a composition measurement. Morphology references include the
  [Bubble Nebula image](https://science.nasa.gov/asset/hubble/mosaic-image-of-the-bubble-nebula/)
  and the [ESA/Hubble Veil image](https://esahubble.org/images/potw2508a/). These are presentation
  references, not reconstructed geometry. No remote image is added to the product.
- One retained 32³ detail texture remains; cloud steps take three detail samples, with the same
  48-step topic integral and existing 48³ medium. No texture, particle, mesh or clock count was
  added. A separate comparison found byte-identical gas/emission/dust channels in 24 supplied
  snapshots. This does not mean rendered brightness is a measured radiation field.
- Packaged phone inspection found the nursery's right edge clipped. Only narrow nursery camera
  magnification was widened; desktop magnification and material coordinates remain unchanged.
  A projection check now includes extended luminous voxels at phone, intermediate and desktop
  aspect ratios. The observed phone canvas remains 368×330.

Validation evidence:

- Frozen material and affected consumers: **87 passed, 0 failed** in
  `/private/tmp/mini-wiki-stars-nebula-vivid-tests-20261023.log`. After the final phone-framing
  correction, **16 passed, 0 failed** in
  `/private/tmp/mini-wiki-stars-vivid-framing-tests-20261024.log`; these overlap the 87 and are
  not 103 unique tests. Full-project TypeScript passed during integration; final affected-consumer
  TypeScript passed again after material and framing changes. Final framing type log:
  `/private/tmp/mini-wiki-stars-vivid-framing-types-20261024.log`.
- i18n: **7,377 messages / 74 complete English namespaces**. Agent evidence also covers 12
  focused material/volume tests, 24 field-preservation snapshots and 18 finite Canvas combinations;
  these numerical checks are distinct from browser appearance acceptance.
- Final Reader artifact: **73 entries / 1,559 inputs**, digest
  `dd73687f197e3c236b7471e4410dc5cc0ab20d01d82375ebd2e886a532d4f6aa`, fixed at
  `/private/tmp/mini-wiki-stars-vivid-dd73687f197e`. All **186 astronomy build inputs** match
  source SHA-256. Log: `/private/tmp/mini-wiki-stars-vivid-framing-build-20261024.log`.
  The first candidate artifact was rebuilt only after actual phone clipping required a source fix.
- Browser: source emission/reflection/dark modes, keyboard rotation/reset, PN/SNR and shell opening,
  guide cloud/galaxy and PN/remnant distinctions. Final packaged Chinese/English 390px views have
  content width 390 and one visible 368×330 canvas. Packaged backward playback reduced progress
  from 1 to `.96052`, then paused; one playback button remained. Final desktop controls measure
  32px / 12px, with a 450px canvas in the native 1280×720 viewport (472px at the earlier 1280×800
  source check). Final page checks captured no warning/error. A stale automation tab was replaced
  by a fresh temporary tab; this was not treated as a product failure.
- Local port 5194 serves the fixed artifact. The user's original nebula URL and its experiment
  parameters were preserved and reloaded to the final version. Temporary tabs and viewport
  overrides were cleaned up. Earlier unaffected manuscript/catalog/image checks were reused;
  no full repository test suite or complete `npm run check` was rerun for this scoped follow-up.

Screenshots and limits are in the appended section of
[the visual record](../../docs/strict-visual-review-20261023.md). No physical-phone performance,
calibrated radiation, forced context loss or exhaustive action-combination claim is made.

# Classic nebular morphology and natural volume detail — 2026-10-24

Run `nebula-classics-root-20261024` integrates the released classic-reference UI
(`nebula-classic-ui-result-20261024`) and a read-only optical/science review. Baseline:
`db5ee02ef4dd713664054ef97d91fee1d548c308`. Local edits only; no commit, push or deployment.

- Three independent nursery references: Orion's open cavity and foreground dust lane,
  Eagle/Pillars' unequal connected dense trunks, Horsehead's absorbing head/neck and parent cloud.
  The topic owns all authored depth/density and source positions. Official images are linked;
  the Horsehead composite's visible/near-IR inputs and the non-reconstruction boundary are paired
  in both languages. Selection is serialized as `cloud`, while old URLs remain valid.
- Common material detail is correlated and isotropic through the full volume, replacing thin
  repeated bright sheets. The existing 48³ medium, 32³ detail field and 48-step topic integral
  remain bounded. Classic Canvas fallback projects the same medium; extinction now samples its
  actual radial backdrop rather than painting a brighter fixed sky. New tests explicitly caught
  and guard this bug. Uneven parent-cloud edges and wider framing resolved narrow-view clipping.
- **92/92 focused tests passed** across stars, sun-star, universe-guide and shared visuals.
  Full-project TypeScript passed after the concurrent topic owner resolved its earlier type
  blocker; affected-consumer TypeScript also passed. i18n passed **7377 messages / 74 namespaces**;
  entry projection, editorial status and `git diff --check` passed.
- Actual source-page inspection covered all three classic references, illumination modes,
  keyboard rotation, reference/light/language persistence, PN/full-open shells, SNR, stellar
  formation and the guide consumer. Final packaged Chinese/English 390px pages measured body
  width 390 with no horizontal overflow. The classic dropdown measured 344px width, `appearance:
  none`, 30px right padding and arrow positions 17px/13px from the right. These are real browser
  checks, separate from the deterministic Canvas/context-lifecycle harnesses.
- One final packaged build: **73 entries / 1560 inputs**, digest
  `c521d98f69c89aaf112ae614a97c9140d708356da620b8205767cb81198f6c9c`, fixed at
  `/private/tmp/mini-wiki-nebula-classics-c521d98f69c8`. All inputs matched source immediately after
  build, including **211 astronomy/shared-display inputs**. HTTP readback from local port 5194
  returned the same digest. The original user URL was preserved and refreshed to this version.

Tests: `/private/tmp/mini-wiki-nebula-classics-tests-20261024.log`.
Build proof: `/private/tmp/mini-wiki-nebula-classics-build-proof-20261024.json`.
Reference/design record: [classic nebulae](../../docs/nebula-classics-20261024.md).
No complete repository test rerun, calibrated astrophysical appearance, forced browser context
loss or physical-device frame-rate claim is made.

# Cloud detail and direct choices — 2026-10-24

Run `nebula-detail-flow-root-20261024` integrates the released UI result
`nebula-detail-flow-ui-result-20261024`. Existing uncommitted astronomy and unrelated topic work
are preserved. No commit, push or deployment was authorized or performed.

- Classic clouds now use one current 64³ field / 80 integration steps; evolution and shells keep
  48³ / 48 steps. Shared isotropic detail is 64³. Replacement/disposal and deterministic replay
  across both quality levels are tested. No per-case cache, new clock or image texture is added.
- Dark clouds separate variable-density interiors, diffuse fringes and background emission;
  solid-surface normal highlights are removed. Parent cloud and Horsehead neck remain connected.
  Authored depth, enhanced colour and the non-reconstruction boundary remain explicit in both languages.
- Six chapters and five nebula choices are directly visible. Illumination and shell opening are
  direct controls. Full accessible names remain paired with short labels. Mobile choices are
  44px high. Selecting a case or leaving/re-entering the chapter preserves unrelated URL state.
- **78/78 scoped tests passed**, with full-project TypeScript, i18n (7377 messages / 74 namespaces),
  entry projection, editorial status and `git diff --check`. The scope covers affected stellar,
  shared material/viewport and guide contracts, rather than repeating the full repository suite.
- Real-browser source checks covered five cases, all three illumination modes, drag/keyboard
  rotation/reset, open shells, chapter/language persistence, stellar formation and guide material.
  Final packaged desktop Chinese and 390px Chinese/English checks passed; page width was 390px,
  direct choice height 44px, with no captured warning/error. Temporary viewport and tab were cleaned up.
- One final Reader build: **73 entries / 1560 inputs**, digest
  `9d3874707fae25f6e61fee5c5c08edf91bbeb31e991fad6f80787e9aebdb1be6`.
  All inputs, including 211 astronomy/shared-display files, matched source after build. The fixed
  artifact `/private/tmp/mini-wiki-nebula-detail-9d3874707fae` is served on local port 5194;
  HTTP digest matched. The user's then-current Pillars URL and other experimental parameters
  were read and retained before refreshing the original tab.

Tests: `/private/tmp/mini-wiki-nebula-detail-tests-20261024.log`.
Build proof: `/private/tmp/mini-wiki-nebula-detail-build-proof-20261024.json`.
[Design, limits and screenshots](../../docs/nebula-detail-flow-20261024.md).
The volume remains an illustrative model; these checks do not claim photographic fidelity,
user appearance acceptance, physical-device performance or forced browser context-loss coverage.

# Photo contrast and resolved optical fronts — 2026-10-24

Run `nebula-photo-contrast-root-20261024` follows the user's repeated blur feedback and a direct
comparison with Hubble's 2015 visible-light Pillars image. An independent Sol 6.1 max read-only
review identified the bounded bright sky wall, accumulated edge softening, coarse pre-baked
interfaces and later wood-like internal streaks/continuous bright rims. These were revised without
changing the direct chapter/case controls or interpreting the photograph as a measured depth field.

- Pillars/Horsehead supply one optional 64³ distance field alongside their 64³ optical coefficients.
  The shared owner reconstructs narrow interfaces and integrates their compact profiles across
  ray segments. Dense dust remains non-emitting; a small diffuse-light scattering term exposes folds.
  The extra 262,144-byte input/texture is reused for the current dark cloud and released elsewhere.
- No renderer/clock/worker/case cache was added. Classic clouds use 64 segments during existing
  camera gestures; settled dark clouds 96, Orion 80, evolution/shells 48. Guide default remains 64.
  Counts and input sizes are resource bounds, not frame-rate claims.
- **81/81 scoped tests passed**, and full-project TypeScript and diff checks passed. New checks
  include distance encoding, thin-front/core separation, singular-source safety, current-field
  reuse, representation changes and texture disposal. No full repository test rerun is claimed.
- Actual source-page checks covered classic references, illumination, drag/keyboard/reset,
  chapter state, shells, stellar formation and the guide consumer. The final packaged English
  desktop and Chinese/English 390px pages were inspected; content width 390 and canvas 368×330,
  without captured warning/error. Viewport override and temporary tab were cleaned up.
- One final Reader artifact: 73 entries / 1560 inputs, digest
  `13f71b387e5b5b6e922c444db2349599828041961430b36921b1c06760e8b30c`.
  Every input matched source after build, including 211 astronomy/shared-display inputs.
  Fixed at `/private/tmp/mini-wiki-nebula-photo-13f71b387e5b`, served on 5194 with matching HTTP
  readback. The user's current 65181 source URL was read and retained before refresh.

[Photo comparison, sources, remaining limits and screenshots](../../docs/nebula-photo-contrast-20261024.md).
Test log: `/private/tmp/mini-wiki-nebula-photo-tests-20261024.log`.
Build proof: `/private/tmp/mini-wiki-nebula-photo-build-proof-20261024.json`.
Still illustrative, without photographic-fidelity or user-acceptance claims. Local only;
no commit, push or deployment, and unrelated inherited dirty work is preserved.

# Surrounding environment — 2026-10-24

After accepting the previous Pillars subject, the user requested a restrained surrounding environment.
The accepted foreground medium/material stays intact. `nebulaEnvironment.ts` supplies object-bound
distant gas/dust weights and illustrative star positions; the existing world owns their one current
texture/geometry. The flat fallback attenuates the actual current sky, including its stars.
No new controls, clock, renderer, worker, photo asset or per-case cache was added.

- 22/22 environment/cloud/volume/viewport tests passed. The final palette and removal of obsolete
  backdrop fields were then covered by 10/10 environment/cloud owner tests; unchanged integration
  evidence was reused. TypeScript, i18n (7377 messages / 74 English namespaces) and diff checks passed.
- Source-page visual checks: Pillars/Orion/Horsehead, emission/reflection/dark and keyboard rotation.
  Packaged checks: English desktop, Chinese/English390px and planetary-case isolation. Actual
  mobile width/content390, canvas368×330. No captured warning/error on final pages. Temporary
  tabs/viewport cleaned up; original65181 full URL and English selection restored.
- Reader artifact:73 entries /1561 inputs, source digest
  `62652a2963eb12d8493dd323886179d2baf2898db8357074434a845062483365`.
  All inputs matched source, including212 astronomy/shared-display files; HTTP readback matched.
  Fixed artifact `/private/tmp/mini-wiki-nebula-environment-62652a2963eb`, local port5194.

[Reference images, resource bounds, remaining limits and screenshots](../../docs/nebula-environment-20261024.md).
Build proof: `/private/tmp/mini-wiki-nebula-environment-build-proof-20261024.json`.
Local only, without commit/push/deployment or physical-device performance claims.
