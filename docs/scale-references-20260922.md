# Visible black-hole scale references — 2026-09-22

## Design and scope

The question is how a black-hole horizon compares with a recognisable object, including when
that object is smaller than one pixel. Readers can change the black hole, reference and
hypothetical disk; mass and reference dimensions remain unchanged by layout or illustration.
The main view and rulers consume one linear conversion. Separate framed recognition insets
and the picture chooser identify objects without changing that conversion.

The city is an imagined 50 km width, not a geographic measurement; individual buildings are
not to scale. The middle stop now recommends Arcturus so both objects are visible. Planets,
stellar surfaces, a city silhouette and orbital markers distinguish the reference types.
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
