# Interactive scene polish — 2026-09-12

## User-visible changes

Magnets now accelerate toward contact, attach, and follow the movable magnet. Flipping a second magnet produces a clear separating impulse, damping and a bounded end-stop response. Users can drag the magnet, use the slider or keyboard, play an approach, and reset. Copper, aluminum and wood stay still in this everyday demonstration. The scene uses shaded magnet bodies, metal reflections, contact shadows and a textured wooden tray.

The same pass refined five other topic-owned illustrations: buoyancy (glass/water/materials and short transitions), frog life (eggs, translucent tadpole tail, limbs and adult posture), butterfly life (leaf veins, caterpillar segments, chrysalis and wings), seed sprouting (soil layers, roots and leaves), and flower-to-fruit (flower structure, pollination and fruit cutaway). Existing cover artwork was not changed.

## Scientific and interaction boundaries

Magnetic motion is qualitative and exaggerated, not a measurement of force or speed. The visible-onset threshold represents tray friction, not magnetism switching on. Magnets are constrained against rotation, and the tray has an end stop. These limits are explained in Chinese and English. The other topics retain their existing scientific models. Decorative motion respects reduced-motion preferences. The magnet animation stops scheduling frames after settling and pauses in hidden documents.

## Validation

- Four focused magnet-motion tests passed: approach/contact/follow; repulsion and reattachment; non-attracted materials; bounded outcomes at 30/60/120 Hz.
- Strict TypeScript, source translation coverage and one combined production build passed. Build log: `/tmp/mini-wiki-interaction-polish-build.log`.
- Real packaged page at `http://127.0.0.1:4173/topics/magnets/?lang=zh`: direct pointer drag snapped the clip to contact; Home moved the magnet back and clip remained attached at x=282; second-magnet approach and flip visibly produced repulsion. Browser errors/warnings: none.
- Magnet English mobile at 390px: automatic snap and copper non-attraction passed; document scroll width equaled 390.
- Five parallel topic owners visually checked Chinese/English controls and stages. Root additionally checked 390px seed, flower, frog and butterfly illustrations; all had document scroll width 390. Buoyancy owner checked Chinese desktop and English390 empty hull, flooding, depth and force labels; quantitative model unchanged.
- Existing unrelated model-test evidence is reused; no repeat whole-repository test run was needed for illustration-only owners.
- No commit, push or external deployment.

## Source identity

SHA-256 of sorted topic-relative paths plus contents (main, renderer, model, entry, styles and English dictionary where present): `139dae7d5febba5ec38cc469aaf235c106892d520e79a928f85be49d5099ace3`.
