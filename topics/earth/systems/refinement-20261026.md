# Bounded section-contact and Reader refinement · 2026-10-26

The water section now carries the same A/B contacts from the front onto its top and right cut faces. `waterScene.ts` projects the existing `waterFrame` polygons; it adds no hidden flow solver, mixing, pressure calculation or clock. Thirty-two tracer nodes, EOS values, source identities, saved keys and the existing seven-second finite explanation remain unchanged.

The workbench opts into Reader controls, transport, action groups, scrubs, readouts, legends, captions and prose. Progress markup uses label / range / output, with existing callbacks retained. The front diagram and geometry remain topic-owned.

Validation: ten existing systems tests passed within the 47-test owner run. One additional projection test checks all five presets at 101 progress samples each: complete top/right coverage, exact shared contact anchoring, stable A/B identity, deterministic repeatability and opposite upper-water outcomes. TypeScript, bilingual extraction and scoped whitespace checks passed.

Actual Reader at 1280 × 720 was inspected for Chinese dense-A endpoint and English cold/fresher midpoint. The endpoint button and range returned 50 → 100 → 50 without changing conditions. Captured warning/error logs were empty. Proof: `/tmp/earth-ui-evidence-20261026/ocean-faces-dense-zh-desktop.png`, `ocean-faces-mid-en-desktop.png`, and `browser-logs.json`. Temporary browser tab was closed. The parent owns final 390 px and production-consumer validation. NOAA's existing [thermohaline circulation](https://oceanservice.noaa.gov/education/tutorial_currents/05conveyor1.html) source was reopened; the local drawing remains a bounded explanation rather than a reconstruction of actual current paths. No commit, push or deployment.
