# Flight upgrade validation · 2026-10-22

## Source scope

Only `topics/flight/**` is owned by this task. Existing unrelated dirty work is preserved. The force/coefficient/replay model in `model.ts` and qualitative route generator in `flowGeometry.ts` were retained. New spatial rendering, routes, airframe poses, shared foil geometry, question content and UI composition remain topic-owned. No dependency, registration or shared platform file was changed.

## Completed source checks

- `node --import tsx --test topics/flight/tests/*.mjs` — **13 passed, 0 failed**. Existing seven model/relative-flow tests plus six route, vector, contact and geometry tests. Coverage includes no-flow support, lift versus stall outcomes, speed-squared conditions, force-vector sums, changing angle during ascent, deterministic reverse/replay, correct far-flow tangents, default whole-airframe/legacy wing routes, route roundtrip, both renderers' tyre contact, closed cambered wings and a closed fuselage clear of the runway across 0–26°.
- Focused strict TypeScript: `./node_modules/.bin/tsc --noEmit --target ES2022 --module ESNext --moduleResolution Bundler --lib ES2022,DOM,DOM.Iterable --allowImportingTsExtensions --resolveJsonModule --skipLibCheck --strict --types node topics/flight/main.ts src/assets.d.ts src/reader.d.ts` — **exit 0**.
- Focused source/HTML translation extraction using the repository checker rules — **108 Chinese source-message occurrences, 28 valid paired study messages, zero missing/unwrapped/invalid strings**, interpolation pairs matched. Both learning languages retain three academic notes and four narration segments.
- Flight-only entry/narration projection used the exact logic from `scripts/prepare-entries.mjs` and wrote only the two flight manuscripts, two spoken scripts and two storyboards. The repository script has no topic filter; it was not run globally and `src/platform/learning/resources.ts` was not touched.
- `git diff --check -- topics/flight` — **exit 0** at the source checkpoint.
- NASA Glenn pages on forces, lift equation and Bernoulli/Newton, and FAA Glider Flying Handbook chapter 3 were read for scientific mechanism checks. The page's coefficients, geometry, pressure colours and stall threshold remain explicitly hypothetical.

## Parent browser acceptance

Recovery follow-up: the original retry reused a canvas after `forceContextLoss()`. The controller now replaces it with a fresh element before constructing the replacement renderer; ID, ARIA, focus and display attributes remain, and the new renderer rebinds wing selection and keyboard handling. The same experiment snapshot and progress remain controller-owned. Two focused `canvasRecovery.test.mjs` DOM-identity fixtures verify new context ownership, retained accessibility attributes, one canvas slot and repeated retries without inheriting listeners. These fixtures do not emulate WebGL; actual loss/retry remains a parent browser check. The 13 prior model/geometry contracts have unchanged source inputs and their passing evidence is reused.

- `node --import tsx --test topics/flight/tests/canvasRecovery.test.mjs` — **2 passed, 0 failed**.
- The focused strict TypeScript command above and `git diff --check -- topics/flight` were rerun after the recovery change — **exit 0**.

The topic owner did not operate a browser. Early parent observations led to actual-stage camera fitting, a larger whole airplane, whole-airframe pitch/contact, and regrouping the generated Reader transport. Those observations precede final source changes and are not final browser acceptance.

Parent should check the final Reader page in Chinese and English at 1280×720, 1440×900 and 390px:

1. Whole airplane visible first, with legible cockpit, main wings, tail and wheels; no excessive runway padding, clipped stage or transport overlap.
2. Select the marked wing or close-up button, inspect the corresponding section, then return. Preserve speed, attitude, progress and pause/play state. Verify the wing is fixed to the pitched airframe.
3. At 0 m/s, no aerodynamic lift/drag or air routes; support carries weight. At 38 m/s, compare 12° lift-off and 26° ground contact under the same short window.
4. Pause, step, seek forward→back→forward; switch question, view, reading depth and theme. Force orientation and geometry remain tied to the same model frame. Inspect the 60 m/s, 20°, endpoint ascent.
5. Mouse/touch orbit and zoom, camera presets, wing click and keyboard alternative; labels/forces toggle. Camera controls are disabled when WebGL fallback is active.
6. Force WebGL loss, confirm same-state fallback and retry. Hide/show and pagehide/bfcache behavior; reduced-motion playback; one scene/controller after repeat switching.
7. Direct `?chapter=wing`, `?chapter=runway`, question/view route roundtrip, language navigation and Back/Forward.
8. No runtime/resource errors or 390px overflow; English controls and explanations fit.

Parent owns the once-per-integration repository gates and final browser evidence. There has been no commit, push or deployment.
