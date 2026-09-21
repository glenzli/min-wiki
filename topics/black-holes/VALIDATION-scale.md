# Familiar scale references — 2026-09-21

Local-only change over the inherited black-hole chapter. No commit, push or deployment.

## Scope and design

Add a persistent side-by-side comparison before the existing zoom view, without changing
encounter simulations or the shared chapter controller. The chapter owns the comparison
DOM/canvas, cached draws and disposal. Model constants and pixel geometry are in
`scaleModel.ts`; both objects use the same linear conversion within the explicitly
independent comparison box. Captions and ratios stay readable when optional zoom-view
annotations or guides are disabled.

References: stipulated straight 50 km journey, nominal solar diameter, and Neptune orbit
diameter. The second is also rendered as a row of solar disks spanning the black-hole
diameter, clipping the final disk to the exact physical length. This is not volume packing.
Physical sources and limitations are recorded in README; no geographic claim is made for
the road, and the orbit boundary is not confused with Neptune's physical body.

## Checks

- `node --import tsx --test topics/black-holes/tests/*.test.mjs`: 8 passed, 0 failed.
  Includes existing radii/zoom/routing/async chapter-lifetime contracts plus exact reference
  span ratios and common-scale fitting at 280, 326, 650 and 900 CSS-pixel widths.
- `npm run typecheck` and `npm run check:i18n`: passed.
- `npm run build`: passed TypeScript, localization (6,410 messages, 66 English namespaces),
  image checks (131 matching copies), and Vite packaging. Existing shared Three.js size and
  microbes-everywhere mixed-import warnings remain; no new build failure.
- Browser checked Chinese desktop road and solar comparisons; Chinese 390×844 M87/orbit
  comparison; and English 390×844 solar row, multiline captions and ratio. Mobile DOM
  scrollWidth and clientWidth were both 390.
- Production preview at port 4175 loaded `black-holes-DVm02yKk.js`; scale chapter packaged
  as `scale-D-CdaGk3.js`.
- Optional guides and annotations were disabled: comparison remained visible and readable.
- Scale → anatomy → scale: comparison count 1 → 0 → 1; return retained the Sagittarius
  reference at the scrubbed progress, with exactly two expected canvases in the theater.
- Browser warning/error log was empty. Temporary tab closed and viewport override reset.
- `git diff --check -- topics/black-holes`: passed for tracked paths; the inherited topic
  itself remains untracked, and its changed TypeScript/JSON files passed the gates above.

No full-repository test-suite or performance benchmark claim. Existing zoom values,
chapter animation timing and scene sources are unchanged. Source inputs did not change
after the successful packaged browser check; only documentation was completed afterward.

Skills: dev-mesh scoped and preserved inherited dirty work; validation-budget limited
validation to the changed chapter contracts, one production build, and live browser checks.
