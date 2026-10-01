# Programs contribution validation — 2026-10-01

This record covers this topic's final scoped contribution on baseline `6b0bdfd4980aa6c78cff5882695aa079e3d53f91`. The parent owns integration, full repository checks, production-preview acceptance and publication.

## Checked

- `node --import tsx --test topics/programs/tests/model.test.mjs`: **13 tests passed**. Order, parcel identity, both sampled branches, input changes before/after sampling, the separate screen-overlap guard, pause/resume timing, hidden-gap caps, reset and independent scenario state are covered.
- `npm run typecheck`: passed after the parallel AI contribution corrected its temporary locale indexing error; no Programs type error was observed.
- A scoped adaptation of the repository's own `scripts/check-i18n.mjs`, without changing the registry: **162 source messages, 2 namespaces** (shared + Programs) passed source, HTML, interpolation and markup checks. The parent subsequently registered Programs and owns the complete registry check.
- Real Chromium against the registered Vite source page `http://127.0.0.1:4175/topics/programs/`: **92 assertions in four cases** (`zh-CN`/`en` × 1440×1000 / mobile 390×844), zero runtime errors. It exercised pickup, middle and end states; continuous execution and a stable pause; retained state after scene/reading changes; both branches; input sampled only at the decision; late-box screen guard; wrong order and corrected order; repeat/reset; focus after swapping; reduced motion and overflow.
- A separate source browser audit: **24 assertions in two English viewport cases**, zero runtime errors. Direct condition/academic route; Enter/Space execution; keyboard checkbox affecting branch; actual shared theme selector to dark; state preservation; duplicate-ID check; explicit overlap-guard boundary; dark layout and visible native focus.
- Inspected actual desktop Chinese and mobile English detour screenshots, dark academic desktop/mobile notes, and the authored cover at 480×320. The mobile scene crops spare table margin while retaining pickup, both routes and destination; the crop is reversible on media-query changes.

The first browser preflight exposed the duplicated SVG/input ID `obstacle`, which made the control target ambiguous. The SVG ID is now `road-obstacle`; the passing rerun includes actual checkbox-driven branch changes. Its failing preflight remains preserved, rather than counted as a pass.

## Evidence

Parent-visible local evidence directory: `/workspace/wiki-modern-technology-artifacts/programs-draft/`.

- `browser.json`: four-case source interaction run.
- `browser-keyboard-theme.json`: direct-route/keyboard/dark-theme audit.
- `*-detour.png`, `*-scene.png`, `*-full.png`: four bilingual/viewport scene captures.
- `en-390-study.png`, `en-1440-dark-academic.png`, related dark captures: readable academic notes and actual theme/focus state.
- `cover-480-inspection.png`: vector cover rasterized only for inspection.
- `browser-preflight-duplicate-id.json` and `*-failure.png`: retained pre-fix diagnostics.

These are native local artifacts, **not Library uploads**, and this is **source preview evidence, not built-production acceptance**. No shared catalog mutation, commit, push or deployment was performed by this contributor. The known Library authorization blocker was not retried.

## Explicit remaining boundaries

There is no real motor/robot/AI API, arbitrary user code, or personal data input. The sensor is ideal and samples once. A separate screen constraint refuses overlap with a later box; a real robot without sensing again could collide. New full-build/browser acceptance, final catalog cover cropping and all-topic learning/translation checks remain the parent integrator's responsibility.
