# 空调怎样让房间凉下来？ / How does an air conditioner cool a room?

Ages 4–6 with adults. The same split-system illustration supports room, transparent-circuit and indoor-unit observation views. A marked refrigerant parcel follows one closed route. Cooling/fan-only and humid/drier comparisons preserve cycle progress. No audio or automatic playback.

`model.ts` owns the route, qualitative pressure/phase state and cycle energy accounting; `scene.ts` projects the state into original SVG; `main.ts` owns finite playback, camera transitions and controls. Hidden/pagehide stop playback. Reduced-motion preferences are respected by the shared finite-transition helper.

The idealized enthalpy sequence 1→4→5→1→1 gives evaporator uptake 3, compressor work 1 and condenser rejection 4. Expansion is approximately isenthalpic. These units and phase fractions are illustrative, not refrigerant property data; fan work is excluded from the three-bar cycle balance and explicitly addressed in fan-only mode. Condensation is qualitative and requires the selected below-dew-point condition; no room cooldown or thermostat simulation is implied.

Primary sources are linked in `learning.json` and on the page: DOE cooling/heat-pump explanations, Natural Resources Canada and OpenStax energy balances. Four-segment narration and separate visual cues are available in Chinese and English. No equipment disassembly or live wiring experiment is offered.

Validation: `node --import tsx --test topics/air-conditioner/tests/model.test.mjs` covers closed-path continuity, cycle energy balance, vapor compression and fan-only/condensation boundaries. Integration additionally checks TypeScript, translations and actual narrow-screen views.

The controller lifecycle suite executes the real topic modules against a small DOM adapter and controlled animation scheduler. It checks both mid-mode-switch restoration directions, rapid reversals, state/readout agreement and stopped outdoor fan behavior. This does not establish browser BFCache eligibility.
