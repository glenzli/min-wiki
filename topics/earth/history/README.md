# Earth history study

This module owns a bilingual three-scale history journey, the retained linear geological ruler and a separate oxygen teaching ledger. `mountStudy(host, context)` uses the shared Earth study contract; the museum shell owns chapter selection, routes, lazy loading and saved state. The same module can be mounted by the independent Earth-history entry without copying its model or manuscript.

## Learning journey and scientific scope

- Ask how a changing planet and living things changed one another, using records rather than an inevitable ladder leading to humans.
- Explore 28 dated clues from accretion and differentiation through Moon formation, early water and life evidence, oxygenation, complex cells and multicellularity, animals, forests, land ecosystems, glaciations, five mass extinctions and recent human/megafauna history. Each clue has an explanation, mechanism, evidence, uncertainty and a family question in both languages.
- Preserve a **4540 Ma** full linear ruler. The last 600 Ma, 3 Ma and 1 Ma can be enlarged on separately labelled linear rulers; the full ruler stays visible. A native range, direct pointer/touch dragging, event selector and previous/next buttons select the same `ageMa`. At a 1 m whole-story scale, 0.3 Ma occupies about 0.066 mm; locating marks are not durations.
- Use approximate temporal context bands for Great Oxidation and selected ice-age contexts. These are not temperature, atmospheric oxygen or continuous worldwide ice-cover curves. Cryogenian context contains separate glaciations, and the late Paleozoic context includes advances, contractions and regional differences. Detailed climate mechanisms live in the climate gallery.
- Distinguish Earth age, surviving mineral age, an origin, an earliest surviving record, a period boundary and a long process. The default full ruler is 4540 Ma; it does not represent an exact accretion-completion date. The eon colour boundaries use the cited **ICS 2026/06** chart, including 4031 Ma, 2500 Ma and 538.8 Ma; the displayed Hadean segment starts at the chosen Earth-age estimate. The chart’s Hadean base at 4567 Ma is not labelled Earth’s exact birthday. The expanded evidence displays versioned period-base estimates with their listed uncertainties, separate from rounded family landmarks and fossil-community ages.
- Treat the giant impact as the leading Moon-formation hypothesis with unresolved details; 4.4 Ga zircons as indirect evidence for liquid-water interaction, not a complete ocean map or life detection; and 3.5 Ga life clues as evidence of presence by then, not a birthday.

## Oxygen mechanism

The ledger is a finite, deterministic bookkeeping comparison in **arbitrary oxygen units per teaching turn**. There is no conversion from turns to years or from stock to atmospheric concentration.

For each turn, gross photosynthetic release is `P`; aerobic recycling consumes `R = P × recyclePercent / 100`. Organic carbon corresponding to the unrecycled fraction is held outside this model's active recycling pool. Given the previous retained free-oxygen stock `A`, the available amount is `A + P − R`. Actual geological use is the smaller of this available amount and the chosen demand `D`. New stock is the nonnegative remainder.

The order is only a ledger convention; real reactions overlap. Geological demand is renewed each turn rather than being a finite worldwide reservoir that inevitably empties. The model explicitly accounts for all released oxygen as recycled, geologically consumed or retained. It does not model nutrient limitation, ocean–air exchange, separate ocean compartments, reduced-gas chemistry, organic-carbon oxidation beyond the selected recycling pool, climate feedbacks, animal origins or a calibrated trigger for the Great Oxidation Event.

With `P = 8`, recycling 50% and demand 6, oxygen is produced but none is retained. Keeping source and recycling unchanged while reducing demand to 2 leaves 2 units per turn. A dashed fixed-demand-2 comparison shares both axes with the current scenario; it is not a second historical reconstruction. Changing controls recomputes the inspected turn count under the new conditions, as stated beside the controls.

The separate banded-iron schematic illustrates one oxidation/deposition route and an original diagram of alternating layers. It is not a sample photograph, measured layer thickness or annual cycle. Expanded evidence explains that some iron oxidation can follow oxygen-independent microbial pathways, so banded iron is not a unique atmospheric oxygen gauge. User-supplied exhibition photographs were inspected only as research leads; none are copied, embedded or distributed.

## State and lifecycle

Every state change emits a complete string record through `context.onStateChange`; the initial normalized state is also emitted. Unknown keys are dropped. Numeric strings reject signs, whitespace, exponents, hex, nonfinite numbers, out-of-range values and unsupported increments. A restored event must be a nearest clue to its restored age, with equal-age Moon/differentiation choices preserved.

| Key | Accepted values | Default |
| --- | --- | --- |
| `ageMa` | 0 to selected window maximum; multiples of 0.001 Ma | 2400 |
| `zoom` | `all`, `animals`, `ice`, `human` (4540, 600, 3, 1 Ma) | `all` |
| `event` | A model-owned event ID consistent with age | `oxygen` |
| `oxygenSource` | Integers 0–12 | 8 |
| `oxygenRecycle` | 0–100, multiples of 10 percent | 50 |
| `oxygenSink` | Integers 0–12 | 6 |
| `oxygenSteps` | Integers 0–24 | 8 |
| `rockEvidence` | `open`, `closed` | `closed` |
| `deepTime` | `open`, `closed` | `closed` |
| `deepOxygen` | `open`, `closed` | `closed` |

Choosing an event outside an enlarged window returns to the full ruler while retaining the oxygen experiment and disclosure states. Pointer dragging, the range and keyboard all use the same time mapping. Keyboard arrows step by 1 Ma in the overview, 0.1 Ma in the animal window and 0.001 Ma in the recent windows; Page keys or Shift multiply this by ten. Home/End select window endpoints. Native range precision stays at 0.001 Ma so choosing the 0.3 Ma human clue does not silently round the control to today.

The evidence/ruler owner has no advancing clock. The optional three-dimensional journey owns one finite, user-started presentation clock, one renderer and bounded view/camera state. `pause()` stops that clock and rendering and ends any ruler pointer capture. `dispose()` invalidates pending imports, releases the scene and listeners, and removes only the mounted root. The licensed existing modern Earth texture is requested only for the present-day stop; ancient coastlines are original qualitative display fields, never that modern map. All queries and events are scoped to the mounted root. Reduced-motion CSS preserves all information. Cross-gallery buttons use `data-earth-chapter` and are delegated by the shell; this module does not mutate a shared URL.

## Files and verification

- `model.ts`: common dates, windows, serialization and oxygen calculations.
- `content.json`: equivalent `zh`/`en` explanations, labels and source titles.
- `study.ts` / `style.css`: scoped DOM, accessible controls and original diagrams.
- `sources.md`: specific sources, claims, selected rounding and source-access caveats.
- `tests/model.test.mjs`: linear mapping/scale, temporal bounds, strict state, independent state preservation, reversible budget histories, contrasting outcomes, complete oxygen accounting and bilingual evidence coverage.

Run `node --import tsx --test topics/earth/history/tests/*.test.mjs`. Integration status and measured browser evidence are in [validation-20261025.md](validation-20261025.md); passing model tests does not establish a science review or visual quality.

## Science review applied on 2026-10-25

The existing 28 clues remain in scope. Applied corrections include the selected ICS 2026/06 version and uncertainties; the 445–443 Ma Ordovician crisis interval; Late Devonian pulses around 372 and 359 Ma; named Siberian Traps and CAMP mechanisms; impact evidence with appropriate causal weight at 66 Ma; birds as surviving dinosaurs; and regional, function-dependent ecological recovery without extinct species returning. Cairo at about 386 Ma is explicitly root-network evidence rather than a guaranteed canopy or an oldest-forest claim. It is separated from later coal swamps, and a lack of lignin-degrading fungi is not used to explain the coal peak. The 508 Ma Burgess example is separated from the Cambrian boundary. Existing branching-life, earliest-record, true-nucleus/multicell/animal distinctions and source–sink limitations are retained and strengthened. Paris Canyon at about 249 Ma is not an event or rendered scene in this module; no claim of global recovery is inferred from it. The static history manuscript and learning exports carry equivalent qualifications.

## Scene refinement on 2026-10-25

The linear ruler and selected evidence now share a desktop workspace, stacking on narrow screens. Zoom tuning and oxygen conditions use single native disclosures; progress and clue navigation stay visible. A cumulative allocation bar reads the same oxygen-budget frame as the ledger and accounts for recycled, geological and retained oxygen; it is not an oxygen-concentration graph. The banded-iron drawing is an original cut-slab schematic with irregular authored bands and grains, not a specimen, measured band thickness, annual sequence or unique atmospheric-oxygen gauge. Models, dates, source claims and all existing saved keys are unchanged. Current refinement checks and remaining limits are recorded in [refinement-20261025.md](refinement-20261025.md).

## Three-scale history journey · 2026-10-26

The primary scene now follows twelve representative observation stops from accretion to today, with whole-Earth, attached local-example and enlarged material/evidence lenses. This is an original teaching reconstruction, not a continuous measured paleogeographic film, an N-body formation simulation, a geodynamic model or a climate/oxygen curve. Globe pigment, relief and cue intensities are illustrative. The leading giant-impact Moon hypothesis is distinguished from direct observations, and old mineral ages are not labelled birthdays of oceans or life. Sources and access limits are recorded in [formation-sources-20261026.md](formation-sources-20261026.md).

Each display interval first holds the named age/event for observation (45% of its presentation interval), then accelerates to the next representative age. Equal display durations therefore represent unequal geological intervals. This is separate from the retained **linear** 4540 Ma ruler and its enlarged linear windows. Exact-age Moon/K–Pg transient examples do not continue through millions of interpolated years. The equal-age differentiation/Moon pair retains both identities without inventing elapsed geological time.

`journeyModel.ts` owns this pure, reversible projection; `journeyContent.json` owns bilingual view/phase qualifications and source associations; `journeyStudy.ts` owns the renderer lease, finite playback, native controls, camera restoration and fallback. `journeyScene3d.ts` composes one retained Earth, attached local geometry and lazily loaded `microScene.ts` evidence groups. The evidence factory has no renderer, independent timer or camera. `study.ts` continues owning the original historical/oxygen state and keeps its full ruler/ledger available in a disclosure; changing scale preserves the same age/event and oxygen experiment.

The old ten scientific state fields and their meanings remain intact. Four optional presentation fields are added: `historyView` (`globe`, `local`, `evidence`), `historyJourneyProgress` (0–1, accepted only when it projects to the same age/event), `historyCamera` (bounded finite azimuth/elevation/distance JSON for the current context), and `historyDetails` (`open`, `closed`). A fresh unqualified visit starts at formation; valid older age/event routes keep their scientific state.

History connects time and evidence. Contemporary internal/plate mechanisms remain in `earth-interior`; detailed ancient community/anatomy studies in `earth-life`; glacial history and mass budgets in `earth-climate`; material processes and specimens in the rock, mineral and ore owners; present ocean density/circulation in `earth-systems`. The historical local examples are not replacements for those independently qualified models. All three-scale evidence geometry is original illustrative artwork, not a sample photograph, scan or measured grain map.

The local environment is a finite, magnified illustration window. Default desktop and 390px framing keeps its cut edge outside the view; arbitrary orbit rotations can still reveal a boundary. Camera limits match the saved elevation/radius grammar. The renderer bakes its original fixed material fields once and only samples supplied display phase; this is not a measured graphics-performance or geological-rate claim. Final local input hashes and actual consumer observations are recorded in the task receipt referenced by `docs/earth-reader-ui-20261026.md`.

### Early-surface refinement · 2026-10-26

The early surface now shares a deterministic thermal field between actual radial relief and material boundaries: rough cooled rafts stand above exposed melt, while hot windows show varying skin/flow finish. These are illustrative fragments of an early heating/cooling history, not measured molten fractions, modern tectonic plates or a claim that every early stage had one cracked-shell appearance. The fragment arrivals, surface flow and lighting variation remain functions of the supplied finite presentation phase; scrubbing is reversible and no independent clock is introduced.

The metal-rich central region grows during the differentiation illustration, with differently sized elongated parcels. It is not a reconstruction of the modern solid inner core. The lunar scene gates ejecta on body contact, gives fragments spatial spread and shows the lunar aggregate later. Path, material mixing, spin, planet growth and timings remain authored teaching choices, not a collision or fluid solver. Context is supported by the original [Elkins-Tanton magma-ocean model](https://arxiv.org/abs/1011.2710), [Deguen et al. mixing experiments](https://arxiv.org/abs/1402.1666) and the existing NASA lunar formation account; source access and conditional scope are retained in `journeyContent.json`.

`assets/build-fields.mjs` produces the original packed numerical material fields as lossless WebP. Run `node --import tsx topics/earth/history/assets/build-fields.mjs` from the repository root after changing the field functions; the producer checks all four decoded channels against the numerical source. No external texture or ancient-world image is copied. The renderer begins with a small synchronous fallback and atomically adopts one 1024px field pair after loading; phone geometry and pixel ratio remain bounded, while close views retain the same material detail. The geometry owner disposes accepted textures; the scene lease releases failed or late completions. Camera, historical age, event, playback and evidence state do not change when detail arrives.

### Compact Reader controls · 2026-10-26

The existing journey buttons and scrub use the shared content-width action row and optional control collapse. Historical age, current observation, scale qualification and the unequal-display-time qualification remain outside the collapsible operation group. This is a DOM presentation change only: scientific state, finite playback, camera restoration and scene/geometry ownership are unchanged.
