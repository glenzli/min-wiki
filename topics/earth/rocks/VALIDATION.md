# Rock gallery validation — 2026-10-25

Current native-Reader process/material refinement: [REFINEMENT-20261025.md](REFINEMENT-20261025.md). The older harness observations below do not validate the newer 3D process renderer.

The later finite-playback revision is recorded in [Animation validation](../../earth-climate/ANIMATION-VALIDATION.md), including actual continuous and reduced-motion browser checks. Earlier screenshots below document the original manual scene and specimen visuals.

Scope: only `topics/earth/rocks/**`. Shared `topics/earth/threeStage.ts` is consumed, not modified by this gallery. Browser checks below use a standalone harness bundling the real `study.ts` and parent Earth CSS, not a mocked renderer. The parent task owns the final Reader production build, routing and full-repository gate.

## Automated checks

- `node --import tsx --test topics/earth/rocks/tests/*.test.mjs`: **13 passed, 0 failed**.
- `npm run typecheck`: **passed** after all gallery owners' modules were present.
- `npm run check:i18n`: **passed**, 7,063 source messages / 79 namespaces at that invocation. Rock TypeScript contains no unpaired Chinese literals; all authored copy is selected from the bilingual JSON.
- Model assertions cover exposed/buried prerequisites, separate weathering/transport/lithification, solid-state metamorphism versus melting, optional repeated stays, divergent histories, same origin IDs, reverse/redo/branch semantics, reversible intermediate previews, malformed/impossible histories, 48-step bounds, same-composition cooling, bilingual content parity and bounded camera restoration.
- Geometry assertions cover all seven specimen surfaces: finite positions/normals, deterministic regeneration, bounded size, separate device triangle budgets and slate's thin morphology.

## Actual browser observations

Environment: Linux container, system `/usr/bin/chromium`, Python Playwright, headless Chromium with software ANGLE/SwiftShader (`--use-angle=swiftshader --enable-unsafe-swiftshader`). Tests used unthrottled loopback HTTP. Desktop viewport 1280×900 at device scale 1; narrow viewport 390×900 at device scale 2 with touch/mobile emulation. All four language/viewport combinations used `prefers-reduced-motion: reduce`.

Checked Chinese and English at both widths:

- Initial journey did not request the lazy 3D chunk or create a WebGL context.
- A 63% weathering preview survived full dispose/remount with identical state.
- Weather → transport → lithify → metamorphose → melt → fast-cool produced distinct material states. Going back to melt and choosing slow-cool replaced the old future with the coarse buried-rock route.
- All seven 3D specimens rendered; their actual screenshots were visually inspected for recognizable texture differences. Surface noise remains fixed during rotation. Screenshots informed improvements to the originally overregular gneiss bands, aligned Canvas palettes, and faceted marble/limestone normals.
- Camera rotation/zoom via arrows, +/−, mouse drag and wheel updated stored camera state. Module remount restored the state and specimen.
- Twelve round trips between journey/specimens retained one context and stable reported geometry/texture counts; no page errors or shader compilation errors were observed.
- A 350 ms idle interval did not increase frame counts. Explicit `pause()` stopped pending work; a deliberate later gesture resumed the viewer. Synthetic document-hidden/visible transitions were also exercised.
- No horizontal page overflow; English controls and labels remained readable at 390 px. Full-page and stage screenshots were captured in both languages.

Additional 390×844 touch-emulation checks dispatched real Chromium touch input: one-finger drag changed camera orientation and a two-finger pinch changed camera distance. The open mineral/cooling disclosures and the remaining closed panels were restored through module re-entry. Deliberately disabling WebGL produced the bilingual fallback/retry message, visible Canvas specimen and working specimen selector without an unhandled page error. Aborting the lazy module request while immediately switching back to the journey created no late context and left the 31% weathering slider operational. Results: `touch-fallback-results.json`; supporting screenshots: `touch-rotated-pinched.png` and `webgl-fallback.png`.

Measured scene budgets (actual `renderer.info` counters after interaction):

| Viewport | Render dimensions | DPR | Triangles | Geometries | Image textures |
| --- | --- | --- | --- | --- | --- |
| 1280 CSS px, scale 1 | 1214×759 | 1 | 12,564 | 2 | 0 |
| 390 CSS px, emulated scale 2 | 437×351 | 1.35 | 4,564 | 2 | 0 |

The measured click-to-first-ready interval for opening 3D was 559/570 ms in the two desktop pages and 562/599 ms in the narrow pages. These pages shared a browser session and warm local tooling/cache; this is neither a cold-network benchmark nor a mobile-device FPS claim. No sustained FPS, Web Vitals or genuine phone GPU result is asserted.

The standalone esbuild harness generated a separate lazy Three.js/specimen chunk. Its unminified build size is an internal test detail; final Reader compression and shared-chunk accounting belong to the production build, so those figures are not reported as deployed transfer cost.

Browser evidence is stored outside the repository in `/tmp/earth-rocks-browser/`: `final-results.json`, screenshots named `{zh|en}-{390|1280}-3d-{specimen}.png`, the matching final weather/cooling/full screenshots, and touch/fallback evidence. This directory does not include the user's exhibition photographs.

## Limits

These checks demonstrate an interactive, representative procedural specimen gallery and conditional teaching route. They do not prove geological identification from appearance, measured crystal sizes, actual geological timing, modelled chemical/mass conservation, true mobile GPU frame rates or a scanned-specimen quality level. Public deployment, external publishing and final parent Reader integration are outside this child task; none were performed here.
