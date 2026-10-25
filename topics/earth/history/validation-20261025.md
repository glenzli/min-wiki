# History study validation — 2026-10-25

The original isolated-module validation below covered `topics/earth/history/**`. Later explicitly delegated integration work also updated the Earth shell, the climate tick-path typo, the independent history manuscript and a separately branched generic Reader navigation feature. No commit, push, merge or deployment was performed by this contributor. The measurements below remain labelled by their actual scope and build stage.

## Later scientific revision and integration checks

The frozen 28-node revision uses ICS 2026/06, displays versioned period-base uncertainties separately from evidence ages, distinguishes 4567 Ma from Earth's 4540 Ma age estimate, and strengthens the Cairo, coal, Cambrian and five-extinction qualifications documented in README.md and sources.md. State keys and the oxygen calculation are unchanged. The seven independent-history learning/manuscript/narration files were projected together without rewriting other galleries.

After this revision, history model tests passed **14/14** and shared journey tests **6/6**; `npm run typecheck` and `npm run check:i18n` passed (7136 source messages, 81 English namespaces). The separate Reader branch passed **21/21 tests plus pack dry-run**, including actual-build preservation of author-specified empty fragments and generic same-group links. Final eight-gallery production rendering is separately tested through `/workspace/earth-validation/validate_routes.py` after the coordinating agent's build freeze. Earlier screenshot, DOM and bundle measurements below predate this scientific-copy revision and are not relabelled as final-build results.

## Automated checks

- `node --import tsx --test topics/earth/history/tests/*.test.mjs`: 13 passed, 0 failed. Covers the 4540 Ma linear ruler, enlarged windows and human-time compression; bounded temporal intervals; strict state normalization and full round trips; preserving independent oxygen state during navigation; deterministic reversal; real contrasting oxygen outcomes; no oxygen creation or negative inventory; cumulative oxygen accounting; complete bilingual mechanisms/evidence/uncertainties; and rejection of obsolete 4.6-billion-year ruler text.
- `npm run check:i18n`: passed against the then-current parallel integration, 7072 source messages / 79 English namespaces.
- `npm run typecheck`: passed against the then-current parallel integration.

These are not claims that the final repository-wide gate or final Reader production output was tested by this contributor. The shell owner performs those after parallel integration.

## Actual browser interaction and inspection

Environment: Linux container, Chromium 151.0.7922.173, headless CDP; 390 × 900 and 1280 × 900 viewports, device scale factor 1. Both Chinese and English were tested. `prefers-reduced-motion: reduce` was enabled for the main interaction run. Touch was emulated through Chromium's actual input protocol; this was **not a physical phone test**.

The isolated esbuild harness loaded the module plus the actual shared Earth CSS. It did not load the Reader navigation shell, route adapter or final production bundle.

Verified in each of the four language/width combinations:

1. No horizontal overflow and all buttons at least 44 CSS pixels tall.
2. Selecting the human clue retained `ageMa = 0.3` and the matching native slider value even on the full ruler; changing to the 1 Ma window preserved that time.
3. A real keyboard ArrowRight moved 0.300 → 0.299 Ma in the 1 Ma window.
4. Real emulated touch dragging across 60% → 80% of the ruler reached approximately 0.2 Ma with the same linear mapping.
5. With eight turns, case A produced oxygen but retained 0; case B changed only geological demand and retained 16. Moving back and forward restored 14 and 16. Setting the source to zero displayed the no-source explanation and retained 0.
6. Disclosure state, all experiment parameters and the selected time survived language remounting through the complete serialized record.
7. Calling `pause()` produced no subsequent time/ledger advancement.
8. No runtime exceptions.

Additionally, all 28 clue selections were opened with every evidence disclosure expanded at 390 px in both languages: 56 clue/language combinations, no overflow. A simulated dark palette was checked in both languages at 390 px. Actual screenshots were inspected for the overview, both oxygen conditions and the banded-iron evidence diagram. Inspection caught and corrected cramped adjacent initial tick labels; removing the redundant 4000 Ma tick did not change the time mapping. Native slider precision and zero-source explanations were also corrected before the final run.

Evidence files in the shared temporary workspace:

- `/tmp/earth-history-browser/report.json` and `check.mjs`: four viewport/language interaction cases.
- `/tmp/earth-history-browser/extended-report.json` and `extended.mjs`: complete clue/disclosure and fresh-document lifecycle cases.
- `/tmp/earth-history-browser/*-timeline.png`, `*-oxygen.png`, `*-rock-evidence.png`, `*-dark-*.png`: inspected browser captures.

## Lifecycle and bounded resources

A fresh single-document test avoids confusing browser back/forward-cache documents with module resources. After garbage collection, the initial mounted baseline was 1 document, 690 DOM-counter nodes and 20 event listeners. Samples after 25, 50 and 100 total dispose/remount cycles all remained at **1 document / 690 nodes / 20 listeners**, with exactly one mounted `.history-study` root. After final disposal and releasing the harness's instance reference: **1 document / 15 nodes / 0 listeners**, and no study root. No runtime exceptions occurred.

This is evidence for the tested cycle, not proof of every possible leak scenario. The study has no WebGL context, texture, worker, timer or animation-frame loop. Hidden/background behavior therefore has no ongoing renderer to suspend; the shell still calls `pause()` and `dispose()` through the shared contract.

## Measured size and practical limits

The isolated, unminified esbuild artifact was 134920 bytes of JavaScript and 18487 bytes of CSS; separately gzip-compressed for size comparison, 38082 and 3322 bytes. These are measured local artifacts, not the final Reader chunk sizes or actual HTTP compressed transfer sizes.

The last repeated localhost navigation run recorded 18.8–29.5 ms navigation duration across the four cases. Browser cache state and container scheduling were not controlled, so these are local observations rather than cold-start, network or mobile performance promises. This manual study has no meaningful animation FPS target; no phone FPS is claimed.

Remaining integration checks: final Reader build and independent `/topics/earth-history/` route; cross-gallery buttons under the shell's delegated navigation; browser back/forward across real gallery routes; final production theme and loading behavior. Climate simulation, mineral specimens and 3D geological exhibits are outside this module and are handled by their gallery owners.
