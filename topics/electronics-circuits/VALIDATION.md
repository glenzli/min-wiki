# Validation · 2026-10-01

This is the topic author's **source-preview** verification. It is not production/deployment acceptance. Root integration owns the final registered production build, complete repository gates, screenshot upload status and the batch coverage matrix.

| Check | Actual evidence |
| --- | --- |
| Model | `node --import tsx --test topics/electronics-circuits/tests/model.test.ts`: 8 pass, 0 fail. Covers independent circuit breaks, threshold equality, reversed rules, valid control with broken lamp return, unavailable sensor input, manual independence and repeatable/bounded state. |
| Topic messages | Local TypeScript/HTML AST inventory: 105 source messages, no missing English, unwrapped Chinese, blank English or interpolation mismatch. Bilingual learning counts are 3 academic notes and 4 spoken segments each. |
| TypeScript | Repository `npm run typecheck` passed after implementing topic modules. The final later renderer refinements adjusted SVG connection and label geometry only; root's final repository gate remains required. |
| Actual browser | Chromium via independent Playwright process, shared Vite source preview `http://127.0.0.1:4175`; Chinese/English × 1440×1000 desktop / touch-enabled mobile 390×844, reduced motion: **116 assertions pass, 0 runtime errors**, 16 screenshots. |
| Interactions | Native click/tap, real Home/End/Space input, mechanical lever endpoints join/separate, return gap keeps an ON command while lamp goes off, sensor unplug is unavailable rather than zero, equality chooses bright, reversed rule changes output at unchanged input, repeated views/depth/themes preserve conditions, reset, adjacent language links, invalid route and browser history. |
| Layout / visual | Actual page widths have no horizontal overflow; SVG text bounds fit their respective responsive viewboxes. Inspected mobile English, desktop Chinese, academic English and original cover preview. Moved battery/bulb labels off power wires and moved the compact bulb label above the bulb to clear the control path as well. Bulb wires terminate at base contacts rather than glass. |
| Cover | Original detailed 3:2 authored SVG with explicit provenance. Rendered 600×400 preview inspected. Parent integration still must check real catalog card/search crop and image delivery. |

Evidence is in `/workspace/wiki-modern-technology-artifacts/electronics-draft/`: `browser-draft.json`, replay script, final screenshots and `cover-preview.png`. Final screenshots show automatic light at input 15, dark rule, intact loop with supply switch closed; broken-return screenshots retain the same ON control but no lamp glow.

Two early probe results remain: the first stopped its layout probe because SVG `getBBox()` does not have DOMRect's `toJSON()`; the corrected probe serializes its coordinates. The second used pointer modality before a focus-visible assertion and encountered one mid-run condition reset while shared source files were being integrated. These were not declared successful. The final run uses keyboard modality, records frame navigation and passes every assertion; production must still be tested without source hot reload. Early screenshots and results are retained under the preflight paths.

No generated audio, actual electronic hardware, calibrated photometry, numerical circuit solver, outlet wiring, offline caching or real lamp/sensor feedback was tested or claimed. The topic has no playback clock, polling, audio, network model call or continuous animation, so play/pause/GPU/visibility-timer checks do not apply to its own experiment.
