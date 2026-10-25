# Earth history study

This module owns a bilingual, manually explored history of Earth and a separate oxygen teaching ledger. `mountStudy(host, context)` uses the shared Earth study contract; the museum shell owns chapter selection, routes, lazy loading and saved state. The same module can be mounted by the independent Earth-history entry without copying its model or manuscript.

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

There are no timers, automatic advancement, animation frames, global IDs, window listeners, WebGL resources or external assets. `pause()` ends any current pointer capture. `dispose()` is idempotent, aborts all listeners and removes only its own root. All queries and events are scoped to the mounted root. Reduced-motion CSS preserves all information. Cross-gallery buttons use `data-earth-chapter` and are delegated by the shell; this module does not mutate a shared URL.

## Files and verification

- `model.ts`: common dates, windows, serialization and oxygen calculations.
- `content.json`: equivalent `zh`/`en` explanations, labels and source titles.
- `study.ts` / `style.css`: scoped DOM, accessible controls and original diagrams.
- `sources.md`: specific sources, claims, selected rounding and source-access caveats.
- `tests/model.test.mjs`: linear mapping/scale, temporal bounds, strict state, independent state preservation, reversible budget histories, contrasting outcomes, complete oxygen accounting and bilingual evidence coverage.

Run `node --import tsx --test topics/earth/history/tests/*.test.mjs`. Integration status and measured browser evidence are in [validation-20261025.md](validation-20261025.md); passing model tests does not establish a science review or visual quality.

## Science review applied on 2026-10-25

The existing 28 clues remain in scope. Applied corrections include the selected ICS 2026/06 version and uncertainties; the 445–443 Ma Ordovician crisis interval; Late Devonian pulses around 372 and 359 Ma; named Siberian Traps and CAMP mechanisms; impact evidence with appropriate causal weight at 66 Ma; birds as surviving dinosaurs; and regional, function-dependent ecological recovery without extinct species returning. Cairo at about 386 Ma is explicitly root-network evidence rather than a guaranteed canopy or an oldest-forest claim. It is separated from later coal swamps, and a lack of lignin-degrading fungi is not used to explain the coal peak. The 508 Ma Burgess example is separated from the Cambrian boundary. Existing branching-life, earliest-record, true-nucleus/multicell/animal distinctions and source–sink limitations are retained and strengthened. Paris Canyon at about 249 Ma is not an event or rendered scene in this module; no claim of global recovery is inferred from it. The static history manuscript and learning exports carry equivalent qualifications.
