# Battery journey validation — 2026-09-21

## Local family and pack refinement — 2026-09-28

- `topics/batteries/tests/*.test.ts`: 11/11 focused battery tests passed. `npm run build -- --outDir /tmp/mini-wiki-batteries-build-20260928` passed TypeScript, 6,879 i18n source messages across 67 English namespaces, 141 image copies and Vite; the isolated Vite output was refreshed after the final color adjustment. `git diff --check` passed. The existing mixed-import and large-chunk warnings remain.
- In a real browser, the built Chinese desktop family view opened on the AA pair, with two equally framed exteriors and one shared cutaway. The development view also switched to the lithium and vehicle pairs; both changed the examples, selected detail and chapter question together. The academic view displayed material, structure and source notes; the child view kept a short conclusion.
- The built English 390 px child pack view showed the four-cell series preset and its matching 14.4 V / 2 Ah / 28.8 Wh ideal values. Switching to academic kept that combination; both sliders read 4 and 1, matching the displayed result. The ideal relation and its limits appeared in the academic view. Document width and viewport width were both 390 px.
- Browser checks covered selected family and pack states, the three pack layer buttons and the academic/child transition, not every possible slider value or every form factor. The preview server was stopped after inspection. The ordinary development server was left running. This batch remains uncommitted and undeployed.

Local expansion of the existing batteries topic. Shared catalog and translations were edited only for this entry; inherited dirty work was preserved under the accepted Dev Mesh baseline. No commit, push or deployment.

## Automated evidence

- `npm run check`: full repository tests and production build passed during integration.
- After final owner-model refinements, `node --import tsx --test topics/batteries/tests/*.test.ts`: 11/11 passed; `npm run build` passed strict TypeScript, i18n (6,401 messages, 66 namespaces), image delivery (131 copies) and Vite.
- Final CSS-only ledger layout uses `npm exec vite build`; unchanged type/i18n/model evidence is reused, not presented as a second full-suite run.
- Focused tests exercise retained energy across loads, externally powered compatible charging, primary/incompatible/no-source rejection, repeated-cycle energy accounting, reverse scrubbing, open-circuit invariance, route defaults, orthogonal family classifications and ideal series/parallel values.
- Existing unrelated microbes mixed-import and large Three.js chunk warnings remain.

## Real browser evidence

Agent-owned background tab; user-owned tab left untouched. Development port 4174 followed by packaged preview 4175.

- Desktop Chinese: switch closure, motor discharge to 60%, load change preserving stored energy 0.40 and mechanical output 0.39. Charging from that state to full produced external input 0.75 and total heat 0.36, while mechanical output remained 0.39. Incompatible charger disabled playback. Finite playback reached a stopped endpoint; final normalized segment scrubbing reached 100% at full charge.
- Family: selected AA alkaline and traction pack; keyboard-operated cutaway updated actual SVG opacity. One automation range fill changed the DOM value without delivering its input event; a native keyboard action verified the real application handler. No workaround writes were injected into the page.
- Pack: series changed from four to three while parallel stayed three, showing nine cells, 10.8 V, 6 Ah and 64.8 Wh; close-up retained the gold-marked cell.
- 390 × 844 English family/pack and Chinese charging inspected. Both document clientWidth and scrollWidth were 390. No duplicate DOM IDs or captured JavaScript errors in the inspected packaged page.
- Original URL and direct chapter URLs opened. Browser back from family returned to charging with stored energy intact and its external supply disconnected, as on other charge-mode changes. Forward navigation and hidden-page cancellation were not exhaustively browser-replayed; reduced-motion behavior reuses the existing finite animateValue utility and was not OS-emulated here.
- Final CSS ledger correction was visually checked in the packaged Chinese 390px page: each label and value occupies one aligned row.

## Boundaries

Original SVG teaching diagrams, not photorealistic product cutaways. No quantitative family energy-density ranking, real vehicle model, detailed charging control, ageing or recycling simulation. Nominal pack numbers and fixed energy allocations are deliberately illustrative and labelled. Family specimens do not replace the lithium-ion laboratory cell. Language switching/reloading restores the chapter, not the in-memory experiment history. The existing cover is retained.
