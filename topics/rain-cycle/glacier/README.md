# Same valley, many years: glacier formation and budget

## Six design questions

1. **Question:** When can retained snowfall accumulate into a moving glacier rather than melt away each summer?
2. **Conditions:** Annual snowfall, warm-season melt strength, and an optional warmer regime after model year 20.
3. **Observations:** Snow/firn/ice water mass, illustrative compacted volume, annual input/loss/net balance, terminus position and downhill ice tracers.
4. **Causality:** Snow arrives; a melt season removes exposed material; surviving snow becomes firn; older firn gradually becomes ice. Compaction changes material/volume, not water mass. Long-term input minus output controls stored mass.
5. **Misconceptions:** Snowfall does not ensure ice survives. A retreating terminus does not mean solid ice moves uphill. A shrinking snow layer through compaction does not imply water disappeared.
6. **Limits:** A deterministic fixed-valley teaching budget, not observed data, a forecast, a whole-glacier flow solver or the upper scene's 100-portion cohort.

## Integration contract

`mountGlacierStudy(host: HTMLElement, language: 'zh' | 'en')` from `index.ts` returns `{setActive(active: boolean): void; dispose(): void}`. Import includes scoped CSS. Initially paused. `setActive(false)` pauses immediately; reactivation never autoplays. `dispose` cancels frames, aborts listeners and removes the mounted root. The caller owns when/where to show it; it does not read or mutate the parent's water batch, camera, route or slow-ice clock.

The landscape retains the upper watershed's number-5 mountain shape and imports its head/foot anchors. This window reconstructs that valley under a separate, initially ice-free, multiyear experiment. It does not claim the parent landscape's current ice mass changed.

## Model ownership and scientific scope

- `model.ts` owns climate presets, seasonal addition/ablation, surviving annual cohorts, snow/firn/ice fractions, water-equivalent accounting, year history, geometric extent and cumulative downhill motion cues.
- One cycle is a **model year**. Snow arrives in its first 40%, melt occurs between 40% and 85%, then compaction is visually highlighted. These season fractions and rates are uncalibrated educational settings.
- A cohort surviving its first model melt season becomes firn. The model blends old firn into ice in model year five. This is a teaching delay, **not a universal real firn-to-ice conversion time**; actual timing varies greatly.
- Ablation uses a single exposed-column approximation, newest material first. It cannot resolve a snow-covered accumulation zone and bare-ice ablation zone simultaneously. Inputs and actual outflow, not unused melt potential, enter the budget.
- Compaction conserves each cohort's water mass. Illustrative density factors 0.3/0.6/0.9 only demonstrate pore-space loss; volume graphics are not measured depths.
- Ice extent responds algebraically to ice mass, so the model omits dynamic response lag. Downhill tracer travel has a separate nonnegative accumulated motion coordinate: retreat never reverses it. Tracer marks illustrate flow direction, not tracked mass parcels or calibrated speeds.
- It omits avalanches, sublimation, refreezing, calving, spatial energy balance, basal sliding and full glacier mechanics. Cumulative outflow is not instantaneous stream discharge. Nothing here modifies the independently conserved 100 portions in the main water-journey scene.

`scene.ts` projects one model state into the valley, annual budget and compaction column. `index.ts` owns bounded playback, deterministic scrubbing, pause/reset, conditional reruns, reduced-motion behavior, host activity and disposal. Controls recompute the full chosen history at the same observation time; only the warming scenario introduces a climate change in year 20.

## Verification

Run `node --import tsx --test topics/rain-cycle/glacier/model.test.mjs`. Tests cover all stores plus outflow, seasonal and annual continuity, compaction without mass loss, no-ice/growth/retreat alternatives, downstream tracer motion during retreat, deterministic reconstruction, rendering and bilingual structure. These tests are not empirical glacier validation. Root integration owns production compilation and browser checks (Chinese/English, 390 px, preset comparisons, year 25–26 retreat, pause, scrubbing, hidden state and disposal).

## Primary sources

- [NSIDC · Science of glaciers](https://nsidc.org/learn/parts-cryosphere/glaciers/science-glaciers): surviving snow and firn, compaction, motion, retreating terminus while ice still flows downslope.
- [USGS · Fifty-year glacier change and mass balance](https://pubs.usgs.gov/fs/2009/3046/): accumulation minus ablation and annual/seasonal mass-balance observations. These observational principles motivate the accounting, not the model coefficients.
