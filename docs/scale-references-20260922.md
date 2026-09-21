# Visible black-hole scale references — 2026-09-22

## Design and scope

The question is how a black-hole horizon compares with a recognisable object, including when
that object is smaller than one pixel. Readers can change the black hole, reference and
hypothetical disk; mass and reference dimensions remain unchanged by layout or illustration.
The main view and rulers consume one linear conversion. Separate framed recognition insets
and the picture chooser identify objects without changing that conversion.

The city is an imagined 50 km width, not a geographic measurement; individual buildings are
not to scale. The middle stop now recommends Arcturus so both objects are visible. Planets,
stellar surfaces, an aerial city and planetary orbit diagrams distinguish the reference types.
The largest stop retains the orbital-span comparison, with the new stellar references available
in the picture chooser. Orbital rings are not a solid ball or measured planet disks.

`scaleIllustrations.ts` owns black-hole-topic recognition drawings. Cosmic-scale continues to
own stellar radii; VY Canis Majoris extends its sequence after Antares (pair 4), preserving
pairs 0–3. Selected reference links point to the corresponding pair or membership diagram.
VY CMa uses the central photospheric-radius estimate 1420 ± 120 solar radii from
[Wittkowski et al. 2012](https://arxiv.org/abs/1203.5194). Antares retains the representative
700 solar radii from [ESO 2017](https://www.eso.org/public/news/eso1726/). Both languages
qualify the estimate, surrounding envelope and absence of a largest-star ranking.

## Verification

- Initial complete `npm run check` passed 661 tests, typecheck, localization, image checks and
  production build (`/private/tmp/mini-wiki-reference-check.log`).
- After enlarging the usable canvas geometry, 30 focused astronomy tests passed
  (`/private/tmp/mini-wiki-reference-focused.log`): common ratios, disk envelope, subpixel
  geometry, new reference links, old pair identity, final pair continuity and short viewports.
- Final content and mobile CSS refinements passed `npm run build`, including typecheck,
  localization and image checks (`/private/tmp/mini-wiki-reference-build.log`).
- Browser inspection covered Chinese/English, 1280×720, the Chinese cosmic comparison at
  1366×768, and 390×844 mobile. Production assets were served on local preview port 4176.
  City, Arcturus, VY CMa, picture choices, tiny-object insets, optional disk, focus restoration,
  immersive entry/exit and Escape closing the chooser before exiting immersion were exercised.
- At 1280×720, the English M87/VY/disk reading layout had the stage buttons ending at y=671
  and workspace ending at y=707, with no horizontal overflow. Cosmic pair 4 controls ended
  at y=655. The new pair also rendered in Chinese and at intermediate progress 3.5.
- Final mobile checks: Chinese chapter selector width 180 px, stage buttons ending y=812;
  English M87/Sun/disk footer ending y=628, playback starting y=647, stages ending y=793.
  Neither language had horizontal overflow. A discovered inherited broad canvas selector was
  scoped to the main canvas so recognition thumbnails cannot expand to demonstration height.
  Mobile chapter selection has a minimum width, and the main canvas uses remaining space.
- `git diff --check` passed. Final 11 changed runtime/test files, path-and-byte SHA256:
  `9b205d8e32698847c767b288c0133da15a2291bbbbaef625ae30eaba69dc86e8`.

Browser automation lost debugger synchronization during cross-page/locale navigation. The
rendered reference hrefs and both language destination pages were verified separately;
that automated navigation round trip is not claimed as passing. These checks are not a child
usability study, telescope-image model or site-wide visual audit. No push or deployment is
part of this change. The existing Three.js chunk-size warning remains unchanged.


## Aerial city and Solar System follow-up

The city now looks straight down onto blocks, roofs, streets, parks, a river and bridges.
Its stipulated horizontal extent remains 50 km. Enlarged landmarks are recognition details,
not a measured map. The same deterministic drawing appears in the main view, picker and inset.

The Neptune reference now shows the Sun and all eight planets, with Earth land shapes,
Jupiter bands, Saturn rings and a highlighted outer Neptune orbit. Main-view orbit distances
remain linear; body icons are explicitly enlarged. Recognition cards and insets spread the
inner orbits apart, with separate labels, while the main ruler still measures the same
60.14 AU orbital diameter. Angular positions and circular paths are illustrative. Neither
orbital motion nor a planetary ephemeris was added. The bilingual note distinguishes the
Neptune orbit from the Solar System boundary. The multi-body reference receives a larger
recognition inset below 140 screen pixels, without changing its physical span or comparison ratio.
Narrow inset labels wrap into two short lines, and box height follows the available drawing width.

Verification for this follow-up (separate from the initial complete suite above):

- Ten focused scale-model tests passed with
  `node --import tsx --test topics/black-holes/tests/scale.test.mjs`
  (`/private/tmp/mini-wiki-aerial-solar-tests.log`). Later changes affected presentation only;
  the tested physical model and test inputs remained unchanged.
- Final `npm run build` passed typecheck, bilingual and image checks, and production bundling
  (`/private/tmp/mini-wiki-aerial-solar-final-build.log`). The existing chunk warning remains.
- Actual browser inspection used the existing Vite development preview on port 5173.
  Chinese/English 1280×720 reading views, Chinese desktop immersion, and both languages at
  390×844 in immersive mode covered
  the aerial city, Solar System, recognition cards, separate city/solar insets and reference
  retention while changing scale. Escape restored the reading layout with the city reference
  retained. This is a development-preview visual check, not a fresh packaged-preview audit.
- At 1280×720 the English Solar System reading view's stage controls ended at y=671 and
  workspace at y=707. In 390×844 immersive views, stage controls ended at y=793 (English)
  and y=812 (Chinese); neither had horizontal overflow. Mobile inspection caught and corrected
  compressed English inset text and excess empty height in the Chinese recognition box.
- Final three runtime files (`scaleIllustrations.ts`, `scaleContent.json`, `chapters/scale.ts`),
  sorted path-and-byte SHA256: `0178d5707bac6ea6e07a4fc0f6fbfa8daf8ae7b0b7c0f786ad1e8ebf30580c7b`.
- `git diff --check` passed. No push or deployment is included.
