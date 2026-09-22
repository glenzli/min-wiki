# 2026-09-22 delivery preparation

This release includes the viewport work recorded in `viewport-stars-20260922.md` and reduces astronomy texture delivery size before the dev-site synchronization.

## Changes

- Generate ten quality-90 WebP texture copies for seven Solar System planets and the Earth day, night and cloud maps. Original images, attribution and pixel dimensions remain intact. The image-delivery manifest records source and output hashes.
- Reuse unchanged image outputs when their parameters and hashes match, avoiding needless writes to other topic directories. A missing manifest can still be bootstrapped.
- Observe Earth Seasons and Solar System scene containers, so switching the presentation frame updates renderer dimensions and camera aspect even without a window resize. Disconnect the observer on disposal and constrain canvas CSS to the scene.

## Size evidence

Comparable production builds, excluding the Vite manifest:

| Measurement | Before | After |
| --- | ---: | ---: |
| All 577 published files | 22,249,480 B | 19,975,511 B |
| 147 raster images | 16,894,114 B | 14,619,621 B |
| Ten converted textures | 4,378,759 B | 2,104,266 B |

This saves 2.27 MB overall (10.2%) and 51.9% across the converted textures. These are file sizes, not measured first-load transfer or loading speed. Shared lunar and Earth assets used by other topics and transparent ring textures remain unchanged.

## Validation

- Final `npm run check`: all 667 tests pass, TypeScript passes, bilingual and image-source checks pass, production build passes.
- All 141 delivery copies match their manifest hashes. `git diff --check` passes.
- Actual 1280 × 720 browser checks: Solar System Jupiter texture and orbital presentation; Cosmic Scale English Jupiter/Sun comparison; Earth Seasons globe with day/night/cloud texture layers. Earth and Solar System immersive scenes settle within their containers and return correctly with Escape. Renderer backing dimensions track the visible scene. No console errors or warnings in these checks.
- This is a targeted release check, not a repeat of every topic's visual audit. The earlier audit's scope and limitations remain in `viewport-stars-20260922.md`.

Git push, dev-site synchronization and production deployment are separate steps; their receipts are reported when completed.
