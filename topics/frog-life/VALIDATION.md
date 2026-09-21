# Growth animation validation — 2026-09-21

Scope: frog and butterfly production models, SVG renderers, retained specimen camera, continuous butterfly progress and independent comparison playback. Existing unrelated dirty work is preserved. No commit or deployment.

## Automated

- `node --import tsx --test topics/frog-life/tests/*.test.* topics/butterfly-life/model.test.ts`: 26/26 passed.
- `npm run build`: passed, including strict TypeScript, 6,344 bilingual source messages across 66 namespaces, and 131 image delivery checks. Existing microbes mixed-import and large Three.js chunk warnings remain unrelated.
- `git diff --check -- topics/frog-life topics/butterfly-life`: passed.
- Production tests cover 4,001 butterfly middle states, continuous transforms, visible anatomy, deterministic reverse review, fixed body position during wing expansion, bounded invalid values, independent clocks, stale callback cancellation, finite completion, reduced motion and SVG reference integrity. Existing limb/tail overlap tests are retained.

## Browser observations

- Agent-owned background tab, development port 4174 then packaged preview 4175; user-owned tab not modified.
- Desktop Chinese comparison: frog growth 2.7 and 4; butterfly 1.6, 2.85 and 4 examined visually. Tail/limb overlap, froglet posture, pupal emergence and fully expanded wings visible. Fixed a body jump during wing preparation and added the hanging larva's silk attachment.
- Real packaged butterfly play from growth 3.5 advanced to 3.5289, then stopped at 4.0000; frog comparison progress stayed 2.7. No captured console errors.
- 390 × 844 Chinese comparison and English butterfly chapter examined; controls wrap and artwork remains contained. English document clientWidth and scrollWidth both 390. English labels and compressed-time/reverse-review boundary text visible.
- Model/controller tests prove pause, reverse, chapter cancellation and reduced motion; this pass did not browser-replay every possible combination or emulate every OS reduced-motion setting.

## Deliberate limits

General illustrative animals, not species-specific anatomy. Some life-stage transitions still blend retained artwork; not every moult or emergence movement is reconstructed. Playback duration is compressed display time. Grasshopper remains the labelled schematic no-pupa comparison, not a third refined animated specimen. Fractional butterfly growth is retained in-page; old stage/wing deep links remain supported.
