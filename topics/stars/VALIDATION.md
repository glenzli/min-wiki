# Stellar surfaces and live orbits — 2026-09-21

Local-only refinement on the inherited dirty workspace. No commit, push or deployment.
Dev Mesh run: `wiki-stellar-live-20260921`, scope: `stellar-live`.

## Changed contracts

- A topic-owned photosphere painter serves comparison, circular orbit and numerical scenes.
  Stable spherical noise, projected active regions and limb shading replace screen-space dots
  and an externally lit sphere. It is an enhanced illustration, not a stellar observation.
- Main comparison disks share a linear scale (0.25, 1, 50, 800 solar diameters).
  Giant comparisons identify the Sun at actual scale, with a separately labeled enlarged inset;
  the supergiant also shows the 50-solar-diameter giant at the main scale.
- Binary/hierarchical motion remains an explicitly circular construction and now continues
  after the previous phase endpoint. Both it and integrated three-body motion show past-only,
  age-fading dashed trails.
- Numerical playback advances real fixed-step Verlet states during animation. A rolling buffer
  retains 1001 samples per trajectory, without restarting original diagnostics at the buffer edge.
  Guard stops, paused history review and return-to-live continuation remain distinct states.
- Parameter edits reset immediately and pause; chapter return preserves the current history.
  Controls are user-started; advanced initial conditions are under a disclosure.

## Automated evidence

- `node --import tsx --test topics/stars/tests/*.test.* topics/sun-star/tests/*.test.*`: **24 passed**.
  Includes continuous integration through 80 T₀, exact agreement with finite integration up to
  20 T₀, fixed allocation after several wraps, timestamp pairing, conserved quantities, resolution
  guards, deterministic batching and a real-controller DOM/clock adapter (including Canvas failure).
  The controller test covers seek capture, pause, chapter return, hidden-page stopping, reset,
  dispose and no more than one scheduled animation callback.
- `npm run typecheck`: passed after renderer/controller changes.
- `npm run check:i18n`: 6401 source messages, 66 complete namespaces. Bilingual JSON changes
  were also inspected; the extraction count alone is not evidence of scientific equivalence.
- `npm run build`: passed (typecheck, i18n, 131 image-delivery checks, Vite).
  Subsequent scoped UI refinements were repackaged with `npm exec vite build`; unchanged image
  evidence was reused. No full unrelated repository test suite was run.
- Final packaged topic: `dist/assets/stars-BRqDGa6C.js`.
  SHA-256: `bc9bb2a07f690f6c203197190455883ff8a1fe13be3439dca3fccda32ca9b0d8`.

## Actual browser evidence

Production preview: `http://127.0.0.1:4175/topics/stars/`.

- Desktop Chinese: solar-style surface and supergiant/Sun/giant chart; live binary and fading
  orbit; numerical figure-eight passed 48.66 T₀ without looping or stopping at 20 T₀.
- Seek regression found and fixed: pausing used to repaint the slider before its input was read.
  Final production interaction changed viewing time from 8.16 to 0.60, then 0.58 T₀ while the
  integrated endpoint stayed 8.16. Leaving and returning preserved 0.58 / 8.16 and overlay state.
- English 390×844: three-body running past 29 T₀, red-dwarf/Sun and supergiant comparison,
  short labels, scale note, enlarged-Sun disclaimer, controls and cutaway compatibility checked.
- English changed C's initial x to +0.3: initial state reset, playback began immediately,
  then stopped at the shared accepted 4.34 T₀ with a visible close-encounter/resolution explanation.
- Chinese 390×844: live three-star bodies/labels/dashes and paused status checked.
  Both languages reported page width 390, equal to the viewport (no horizontal overflow).
- Production-page console: no relevant warning/error observed. A transient development HMR error
  during an intermediate paired content/controller edit was not present after complete reload/build.

No claim is made about a guaranteed frame rate, infinite-time numerical accuracy, actual stellar
collision radii, observed star colors, arbitrary triple stability, or every browser's BFCache behavior.

Skills applied: `coordinate-shared-workspace` preserved inherited changes and bounded edit authority;
`maintain-source-cohesion` kept the shared stellar painter topic-local while integration stayed with
its existing owner; `validation-budget` selected focused physics/lifecycle tests plus packaged UI checks.
