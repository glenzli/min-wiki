# Earth conditions: experiments and real-world comparisons

The first complete track is distance → real Venus/Mars observations → infrared escape → Earth. A second complete track is axial tilt → real-world comparison including Uranus → Earth. These are alternative learning routes, not a required physical evolution of one planet into another.

## Scientific owner

`model.ts` owns a bounded, zero-dimensional grey energy balance: solar irradiance `S = 1361/r² W/m²`, whole-sphere absorbed flux `Q = S(1 − A)/4`, and equilibrium `e σ T⁴ = Q`, with `A = 0.30`. Distance is limited to 0.65–1.7 AU and the effective outgoing-to-surface-radiation factor to 0.4–1. The starting factor 0.61 puts the teaching model near Earth's representative global mean temperature. It is not an independently observed gas emissivity, pressure or CO₂ concentration. Increasing air or clouds is not modeled as a universally warming single process.

The two energy bands have one linear 0–600 W/m² scale. The outgoing band uses the **starting reference temperature**, so the sign of the imbalance indicates the initial warming/cooling tendency relative to that reference. The equilibrium-temperature readout in the academic disclosure is a separately calculated final balance, with no claimed adjustment time. Actual surfaces and clouds are object references, not model-predicted climate maps. No weather, ice/cloud feedback, ocean heat storage, coastline, liquid-water or life prediction is supported. Moving the reference distance assumes a circular orbital position; it does not model an instantaneous physical orbital transfer.

Tilt composes `earth-seasons/physics/solarGeometry.ts` and `earth-seasons/data/seasonsData.ts`: a circular 1-AU orbit, selected place, four reference orbital positions, and 0–98° axial tilt. Both daylight readings and the 3D light use the same geometry at the chosen location's local solar noon. Zero-tilt polar horizon remains undefined daylight, not a fabricated twelve-hour day. No temperature is inferred. Real eccentric orbits can vary incident energy even without axial tilt. A highly tilted Earth does not acquire Uranus's composition, distance, rotation or year length.

The hypothetical lens keeps the axis and equator but hides the renderer's fixed modern-Earth tropic/polar reference rings through an explicit renderer option. Those circles must not be presented as current boundaries for a changed tilt. Only the selected city marker is shown; the separate subsolar marker is hidden so it cannot be mistaken for that place. The normal Seasons page retains its original reference display. The existing `selectCity` method supplies the selected surface highlight.

Real distances, mass/radius and tilt remain owned by `solar-system/data/planetsData.ts`. Representative Venus/Earth/Mars pressure and temperature remain owned by `atmosphere/model.ts`; these are not outputs of the new model. Uranus has **null solid-surface readings**, never invented zero pressure or a fabricated ground temperature.

## Representation and lifetime

`view.ts` consumes the existing Solar System `ExplorerScene` for one current actual body/site, with globe, reversible approach, local surface/cloud view and interior cutaway. It does not copy terrain or materials. The same observation site remains selected across views. Each world retains its own site, view, approach and cutaway progress. Uranus labels its near view as clouds and does not gain a solid landing surface. Interior captions, layer selection, evidence and uncertainty remain owned by `planet-surfaces/interior.ts`.

`tiltView.ts` independently owns the lazy static-condition Seasons viewport, latest-selection admission, failed-render retry, camera keyboard/gesture projection and disposal. Camera settling/texture preparation uses bounded frames; it has no scientific playback clock. It is created only when that lens is visited. At most one planetary renderer and one daylight renderer are retained; only the active visible lens draws. A page that only visits the energy route never constructs the daylight renderer.

Both activity and descent begin paused. Hidden/offscreen pages pause activity and travel; reduced motion never starts either. Context failure leaves controls, numeric results, scientific text and onward/return links usable. Async imports do not construct a renderer after disposal. Existing attributed maps remain under [their original asset provenance](../../solar-system/assets/ATTRIBUTION.md); no generated or external asset was added.

## Route and handoff owner

`route.ts` validates the track, step, distance, escape factor, tilt, place, orbital position and the four worlds' observation snapshots. `if.*` parameters own only this experiment; unrelated Earth-study state is preserved locally. External handoffs carry only validated experiment fields, language and static mode. Known topic destinations are constructed from the current deployment base; caller-provided return URLs, legacy chapter values and unrelated native-view fields are not copied into Earth.

The original eight Earth topics remain independent catalog/review owners. Old `chapter` links still redirect before the laboratory mounts. No topic is promoted from draft by this integration.

Solar System's existing controller accepts an optional validated initial observation snapshot. Its public observation snapshot lets the return adapter carry the latest supported actual-world site/view/progress back to the experiment. Atmosphere and Seasons offer a return to the saved experiment while retaining independent scientific models and clocks. Their existing standalone navigation remains available.

The shared `entry.ts` distinguishes ordinary discovery from a contextual return. Without `if=1`, the Earth-experiment recommendation joins an existing `nav.related` after the study (Atmosphere), or follows the observation workspace in its own “Continue exploring” region (Solar System and Seasons). It does not occupy the top of the primary scene or become part of its fitted height. With `if=1`, the adapter retains the existing return navigation and bounded experiment snapshot, including Solar System's latest observation capture on activation. This placement change introduces no scientific state or Reader-owned topic routing.

## Primary references

- [NASA: climate and Earth's energy budget](https://science.nasa.gov/earth/earth-observatory/climate-and-earths-energy-budget/).
- [NASA Goddard: solar irradiance and effective temperature](https://sunclimate.gsfc.nasa.gov/science).
- [NASA: Venus facts](https://science.nasa.gov/venus/venus-facts/), [Mars facts](https://science.nasa.gov/mars/facts/) and [Uranus facts](https://science.nasa.gov/uranus/facts/).
- [NASA: seasons on Earth, Mars and beyond](https://science.nasa.gov/helio-and-you-seasons-on-earth-mars-and-beyond/).
- Terrain, coordinate and interior sources remain with the existing scientific owners.

Focused check: `node --import tsx --test topics/earth/conditions/tests/*.test.mjs`. Broad integration gate: `npm run check`. Actual browser evidence and exact checked artifact are recorded in [the implementation record](../../../docs/earth-conditions-20261026.md).
