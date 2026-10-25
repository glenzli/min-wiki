# T1–T3: material direction versus terminus position — 2026-10-25

This final small revision uses the existing local `glacierFrame.round` and original `iceShape(mass)`. It adds no scene, scientific budget, URL key or clock. All implementation/revisions used Sol 6.1 Max. The seven learning/manuscript/narration files were untouched, so the parent's unified projection was unaffected.

## Implementation and interpretation

`glacierTracers.ts` retains IDs T1/T2/T3, with initial fixed valley coordinates −4.2/−3.3/−2.4. Increasing the existing round adds an illustrative positive down-valley displacement. Coordinates are not normalized to the changing ice length; that would incorrectly drag markers uphill with a retreating front. The local terrain tangent establishes direction, not physical velocity. The ice front continues to consume only the original mass shape.

`scene3d.ts.update(mass, observationRound=0)` updates markers even when mass is unchanged. Existing glacier/terrain buffers are not rewritten and the shadow map is not refreshed in that balanced case; the requested frame still draws the scene. One shared six-triangle cone, instanced three times, adds **18 main-view triangles and one draw call**. Three HTML T labels update on camera changes/resize, are removed on disposal, and are visibly separated on a narrow screen. No image texture is added.

The 2D diagram uses the same absolute down-valley coordinates, IDs and tracking status. Its front uses the same mass-to-front relation on a fixed illustrative coordinate mapping. Arrow symbols and DOM explanations are separate from the mass/history readouts.

If the planned marker lies outside the drawn ice, it becomes a gray dashed † identity. The nearby bilingual status states that its fate is not followed; a ghost does not represent a later real trajectory, transformation into water, or newly generated ice. Scrubbing returns to the same teaching snapshot. Displacement/time are uncalibrated; no ice-velocity, stress or erosion equation is solved.

## Executed verification

- Three new unit tests: negative budget/front retreat versus increasing marker coordinates; balanced mass with fixed front and advancing markers; zero ice retaining untracked identities rather than replacing or respawning them. All passed.
- Full owned models/geometry suite: **36 passed**, including 23 climate tests. Typecheck passed after runtime implementation.
- Actual Chromium/Playwright continuous playback in desktop 1280 English and emulated-touch 390 Chinese, each with balanced and negative budgets: **four cases passed with no page errors**. 2D/3D marker IDs and absolute coordinates agree; forward/back scrub and remount restore identical snapshots.
- Balanced case: mass **60** and front **2.6592** remain fixed; T1/T2/T3 coordinates advance from **−4.2/−3.3/−2.4** to **−0.84/0.06/0.96** by round twelve.
- Negative case: mass **60 → 24**, front **2.6592 → 1.5875**, while the same marker coordinates still increase. Actual intermediate playback observed round approximately 1.46–1.60, not only endpoint scrubbing.
- Zero-ice case: all three IDs remain as † ghosts with the explicit untracked-fate text. No assumed meltwater transformation occurs. Disposing the study removes all label nodes.
- Narrow label bounding boxes are asserted pairwise non-overlapping in both balanced and retreat endpoint views; the owner inspected the actual final images after moving T3's label to the opposite side.
- Instrumented main-view draw calls, including `drawElementsInstanced`: valley **56,244 desktop / 22,628 narrow**. Global counts remain **31,168 / 12,864**. No extra WebGL context or image texture was added.

Environment remains headless Linux system Chromium/ANGLE SwiftShader and unthrottled localhost, with 390×844 DPR2 touch emulation capped near DPR1.35. These are not real-phone FPS results. The parent owns final Reader production and route/network verification.

## Artifacts

In `/tmp/earth-playback-browser/`:

- `tracer-validation.json`: numeric playback, endpoint, cross-view and restore results.
- `tracers-frozen-steady-390-zh.png`, `tracers-frozen-retreat-390-zh.png`: final non-overlapping 3D labels, actually inspected.
- `tracers-retreat-2d-1280-en.png`: same-marker 2D direction/front contrast, actually inspected.
- `tracers-untracked-390-zh.png`: zero-ice ghost identity view, actually inspected; the final CSS additionally separates T3's label.
- `journey-budgets.json`: updated actual instanced triangle counts and unchanged drawing-buffer sizes.

Runtime was explicitly frozen before the parent opened final repository gates. No commit, push or deployment was performed by this owner.
