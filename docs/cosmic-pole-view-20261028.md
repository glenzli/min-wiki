# Out-of-disk sky view: local repair, 2026-10-28

Scope: the existing sky bridge only, including the user's follow-up request to start with Earth's
night sky. Preserve all uncommitted sky/zoom work, the stellar positions,
four chapters, route values, finite playback and other topic ownership. No commit, push or deployment.

## Observation contract and cause

The question is why the Milky Way band retreats when we look away from the disk. Direction is changed
at the same solar position; observer travel then reveals that same location and sightline externally.
Sparse visible stars remain. Contrast is an enhanced structural display, not a calibrated sky panorama
or apparent-magnitude model. [ESA's guide](https://www.esa.int/Science_Exploration/Space_Science/Gaia/Guide_to_our_galaxy)
describes a flattened stellar disk and the isolated stars and globular clusters of the surrounding halo.

The reported saved link had `skyDirection=pole&skyObserver=0.2721`. It reproduced a virtually blank
frame. The previous camera crossed above the disk while its interpolated target still pointed farther
up; the Sun and most of the disk were behind the observer. The initial pole camera's up vector was
also parallel to its sightline. Existing halo points were present but too dim to convey a sparse sky.

## Change

- Retain every original star position and point count. Increase the existing halo markers' readable
  contrast and screen size; no camera-following background or invented measured star catalogue.
- Back away opposite the selected sightline, then curve to the existing external endpoint. Preserve
  the same starting solar position, ending camera position, sightline direction and route parameters.
- Use an independent pole-view up direction and aspect-aware framing. The Sun stays inside the frame
  at default magnification during the path; manually zooming can still crop the view.
- Clarify the Chinese and English pole-view cue. No new controls or reset semantics.
- Along-disk viewing starts over layered, illustrative ground silhouettes and the same star field.
  The ground reference fades before the Galactic camera moves. A user-started 6.5-second sky journey
  connects that band to the external disk and retained Sun locator. The night-sky framing is not a
  photographed sky, mapped terrain, actual local orientation or a real travel-time scale.

## Verification

Typecheck, eight focused sky tests, i18n and whitespace checks passed. A new projection regression checks
all three sightlines at ten progress values, including 0.2721, and three aspect ratios: a nondegenerate
camera basis, solar-anchor framing and visible pole-facing halo samples. Existing resource/lifecycle,
route, Orion and finite orbital playback tests remain green. The Earth horizon fades before movement,
and the stellar positions and scene entry remain identical when changing direction. No unchanged
global suites were rerun.

The final Reader build contains 82 entries, source digest `f817181eb353`;
its full source digest and the 45 matching cosmic-scale runtime input hashes are in the local receipt.
Reader is the clean lockfile checkout at
`48bd98efce93fcae75d196d3ef6a02474e8d2edb`, selected through `WIKI_READER_ROOT` as in the previous work.

Actual desktop checks: pole start, the user's 0.2721 checkpoint, complete user-started travel and its
stopped external endpoint. Star points, the solar anchor and disk remain visible as appropriate, and
no console warnings/errors were observed. The along-disk ground-sky start, user-started travel to the
external galaxy and direct return were exercised. Final packaged 390px English pole/ground-sky views
and Chinese ground-sky views were visually inspected, including button wrapping and the solar anchor.
The viewport override and task-private packaged HTTP server were removed after checking; the existing
working Reader preview remains at port 55882. Receipt and screenshots are under
`/private/tmp/cosmic-pole-view-20261028/`. No commit, push or deployment was performed.
