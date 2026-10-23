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
