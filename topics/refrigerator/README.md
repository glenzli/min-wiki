# 冰箱怎样让食物变凉？ / How does a refrigerator cool food?

Independent bilingual topic for ages 4–6 with an adult. Exterior, cutaway and refrigerant views preserve the same SVG geometry and transition continuously. Food materials, lining, insulation edges, compressor and tubing are original vector artwork.

- `model.ts` owns two lumped heat stores, door-dependent heat leakage, hysteresis control, cumulative heat/work accounting and a conceptual refrigerant phase cycle. It also owns the sealed pipe geometry; `scene.ts` owns cabinet artwork and plotted temperatures. No shared refrigeration engine.
- Choose a closed-door scenario or one opening and closing midway. Switching scenarios explicitly restarts the observation. Air and food temperatures remain continuous within each experiment. A dashed food curve provides the closed-door reference.
- Finite cooling playback lasts 22 seconds; a separate 10 second circuit follows a sealed parcel through absorption, compression, rejection and throttling. Each can pause or seek. Reduced-motion preference resolves finite transitions without playing them; hidden/pagehide cancels work. No ambient animation or audio.
- `learning.json` has child prediction/operation, three academic notes, misconception/boundary and four spoken segments with separate cues in both languages. `catalog-entry.json` and `catalog-en.json` are for root integration.

## Scientific limits

Room environment is fixed 24 °C, air/liner heat capacity 4000 J/K, food 6000 J/K. Illustrative running cooling/work rates 120/60 W, heat leakage 2–35 W/K, food-air conductance 3 W/K and 2/4 °C thermostat thresholds are chosen to expose behavior, not represent a measured appliance or safe storage timetable. Scenario time 7200 s is compressed. The refrigerant parcel is separately conceptual; no real fluid property table, humid-air enthalpy, frost, fan, defrost or freezer model.

Cumulative rejected heat equals extracted heat plus electrical work. Room net exchange subtracts heat entering the cabinet. Both cabinet stores plus room net gain equal the electrical input. An open refrigerator therefore cannot continuously cool the same closed room.

## Focused verification

`node --import tsx --test topics/refrigerator/tests/model.test.mjs` checks energy conservation, bounded temperatures, thermostat restarts, continuous door load, recovery, zero-time invariance and cycle phase closure. Run the scoped strict TypeScript and topic translation checks before handoff. Root registers the topic and performs final build / 390 px production proof.

Sources: US DOE Consumer Guide to Kitchen Appliances; Danfoss compressor/heat-exchanger and temperature-control engineering explanations; Rice University/OpenStax University Physics 2 §4.3. URLs and qualifications are kept with the page and learning material.
