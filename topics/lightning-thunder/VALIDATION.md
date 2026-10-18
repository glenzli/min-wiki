# Lightning/thunder artwork validation · 2026-10-19

Base: `5a98e483b6b7c2ad8ca01d009b48fffd2d9f9120`. Scope: topic-owned fixed-view cloud, landscape and indoor building materials, deterministic branches/charges, and progress-sampled local light. The numerical model, path anchors, distance/temperature inputs and controller clock are unchanged. This records implementation and browser checks, not empirical weather accuracy or editorial promotion.

## Final runtime identity

- `scene.ts`: SHA-256 `81f3dac827595c60722a8eb6897103dfd1a0029520049222612c3afe55aaa7ce`.
- `stormArtwork.ts`: SHA-256 `1e89be039004c85ac958a66c031fdf1390b8778797d476b84c9c1746ffbbeb50`.
- `locales/en.json`: SHA-256 `d5162b8b73c2e463d0a9ca5129356d0f1331b0e1b7e4b6faae8a9086216419f1`.
- Three compressed assets total 627,472 bytes. Original/delivery hashes, sizes and pixels are in `scripts/image-delivery.json`; original prompts and nonmetric mapping are in [asset provenance](assets/PROVENANCE.md). The built output contains the three WebPs, without their source PNGs.

## Checks

- The six existing focused model tests passed in this task. Model/path/test inputs stayed unchanged through the subsequent illustration passes, so that evidence was reused. No drawing-instruction mirror tests were added.
- Final `WIKI_READER_ROOT=/Users/g4i/lab/wiki-reader npm run build` passed: TypeScript, 6,903 localized source messages / 72 English namespaces, 150 image delivery copies, entry projections, editorial review (24 complete / 47 draft), and 71 packaged entry routes. Source digest `a51958fa6451aebb3a756853933484963ef9c59517b99ef299d89434f483a2d7`. Reader source `c4c5a17` was unchanged. `git diff --check` passed.
- Actual managed Reader preview at `127.0.0.1:64494`: Chinese 1152 × 1106 and 1280 × 720; 390 × 844 Chinese/English, light and dark. Cloud contours/materials, roof/window detail, hillside depth, contact shadows and terrain edge blending were inspected at actual display sizes. A flat rectangular horizon and an earlier tall-screen bottom boundary were removed and re-inspected. The mobile document and scroll widths both measured 390 px.
- Inspected charge separation, faint descending leader (.55), attachment without a bright return (.59), advancing return (.61) and full return (.675). The .5 km house remains separate from the mast. Reverse seeking .61 → .55 → .61 retains the branch geometry; playback then advanced to .626 and paused.
- English 8 km: 20.0 sound-travel seconds still reports propagation; 30.0 seconds reports arrival after approximately 23.3 seconds. No sound autoplays. Sound arcs/track retain the original projection and physical arrival result; they are schematic and do not claim measured wavelength, loudness or a point-source origin for real thunder.
- Captured warning/error logs were empty. Temporary responsive viewport override was reset. The primary Chinese tab remains paused at the full return; a separate Atmosphere preview retains its height-guide refinement. Evidence screenshots: `/private/tmp/wiki-storm-art-20261019/`, final primary capture `final-lightning-desktop.png`.

## Limits and delivery

The artwork is generated illustration, with independently illustrative cloud, architecture and distance scales. Pixel quality does not calibrate the atmosphere, terrain, field or cloud microphysics. Source review confirms bounded retained layers, error captions and disposed-scene callback guards; actual forced image-load failure, browser context loss and physical-device memory/frame-rate measurements were not performed. The full unrelated repository test suite was not repeated. No editorial status was changed. Local preview and local commit only; no push or deployment.
