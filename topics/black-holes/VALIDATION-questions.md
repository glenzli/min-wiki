# Question-led scale and presentation validation

2026-09-22. Local changes only; no commit, push or deployment.

## Scope and identity

Changed: `scaleModel.ts`, `chapters/scale.ts`, new `scaleContent.json`, shell
`main.ts` / `index.html` / `style.css`, English dictionary, scale tests, README;
project-level design checklist: `docs/project-questions-20260922.md`.
The other eighteen reviewed projects have design proposals only.

Runtime identity: SHA256 `0009a29836e1760aa7d3f563ef787f9f6ae77050c5df76b4dd39f72fdc499ffa`,
computed by concatenating each UTF-8 path then file bytes, in this order:
`scaleModel.ts`, `scaleContent.json`, `chapters/scale.ts`, `main.ts`, `index.html`,
`style.css`, `locales/en.json`, all prefixed by `topics/black-holes/`.
No runtime edits followed this identity or the final production browser checks.

## Automated checks

- `node --import tsx --test topics/black-holes/tests/*.test.mjs topics/cosmic-scale/tests/comparison.test.mjs`: **14 passed**. Existing routes/scene lifecycle plus shared reference radii, size ratios with/without disk, narrow-frame bounds, real subpixel horizons, angular ordering and conditional low-mass sizes.
- `node --import tsx --test tests/transition.test.mjs`: **5 passed**. Existing finite-transition implementation, cancellation, reduced-motion changes and hidden-page behavior. This is not a browser test with the OS reduced-motion setting enabled.
- `npm run build`: passed strict TypeScript, i18n extraction (6453 source messages, 67 namespaces), image delivery and Vite production build. Final log: `/private/tmp/mini-wiki-questions-20260922/build-final.log`.
- Bilingual JSON recursively checked for identical structural keys/types and angular-text placeholders. Chinese and English scientific qualifications also inspected in the browser.
- Design document: all local Markdown links resolve; exactly 19 numbered topics. `git diff --check` passed. Because topic files are inherited untracked files, this Git check alone does not validate all their contents.

The final build followed a presentation-only reduction of repeated source text in demonstration
mode. Model inputs were unchanged after the 14-test run. No full `npm run check` claim is made:
this is one existing topic and its direct numerical dependency, not a new topic or a site-wide
integration. The existing shared Three.js chunk warning remains.

## Actual browser checks

Used the existing source server at `localhost:5173` after verifying its process CWD.
Final production consumer was Vite preview at `127.0.0.1:4176`; the temporary preview was stopped
after inspection. The user's original source server was retained.

- Chinese desktop: Arcturus/Antares and solar/galaxy references, optional disk, explicit scale
  boundaries, pure-mode single primary canvas. Inspected normal and demonstration layouts.
- Chinese 390px: M87* versus the Milky Way shows a position cross and a roughly 24.6-million
  diameter ratio; clientWidth and scrollWidth both 390. Caption explicitly denies an enlarged
  physical black hole and identifies the Milky Way as a comparison, not M87*'s host.
- English 390px: native language switch retained the chapter; final short disk explanation,
  Sun/Arcturus comparisons, visible exit and playback controls inspected. clientWidth and
  scrollWidth both 390. Table has its own horizontal scroll region rather than stretching the page.
- M87* at 100%: pure mode hides the reading panel; Escape restores it and leaves progress at 100%.
- Sagittarius at 69% with Arcturus/disk: scale → anatomy → scale retained 69%, reference and disk
  choice. No repeated comparison panel remained. Playback continued across leaving demonstration
  mode and could then be paused at 71%.
- Anatomy chapter: English mobile pure-mode optical image, annotations, geometric qualification,
  pause/reset and Escape visually inspected. This does not revalidate the underlying ray model.
- Opened distance and low-mass disclosures: source-linked Gaia/Sgr A*/M87* table, computed horizon
  diameters, candidate interval/classification and no false “confirmed smallest” claim.
- Legacy `/topics/black-hole/?lang=en` reached the stellar chapter with English retained.
- Captured browser console had no errors or warnings on the checked paths. Temporary viewport
  override reset. Local source scale page retained for the user.

An automation locator timed out once during rapid chapter activation; the subsequent rendered
state showed the expected retained selection and progress. A separate English locator used the
wrong translated button name and was corrected from the live snapshot; neither is reported as
a product failure.

## Limits

No whole-galaxy feeding dynamics, primordial-hole simulation, uncertainty distribution renderer,
direct image of a low-mass hole, new distant-object catalogue or predictive accretion solver was
added. New questions use dated primary sources and separate observation, inference and hypothetical
geometry. No comprehensive revalidation of all five physical models, all parameters, BFCache or
all devices is claimed. Reduced-motion behavior is covered by the existing helper tests and the
new mode adds no animation; the OS preference was not toggled during browser inspection.
