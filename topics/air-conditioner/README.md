# 制冷：热量怎样被搬走 / Cooling: where does the heat go?

统一入口包含空调、冰箱和房间边界三个连续问题，不是旧页面菜单。上方同一收支参照读取当前设备的真实教学状态：冷端取热、输入功与热端放热。空调使用任意份数，冰箱使用累计 kJ；第三章是独立假想循环，不比较真实产品能效。

The primary entry combines three connected questions: air conditioning, food cooling, and the room boundary. A persistent heat ledger projects each device's actual teaching state. Arbitrary air-conditioning shares, cumulative refrigerator kJ and a separate hypothetical boundary cycle are not appliance-efficiency comparisons.

## Routing, ownership and lifecycle / 路由与归属

- `?chapter=air|fridge|room` selects the chapter; invalid values default to air. Unknown query parameters and hashes survive chapter navigation. Platform language URLs preserve deployment bases. The refrigerator legacy entry redirects to `chapter=fridge`.
- `main.ts` owns composition, chapter/history state and the shared ledger. `projectModel.ts` owns route parsing and the independent room-boundary accounting example; no fluid properties move into it.
- `airStudy.ts` owns the complete AC control and cancellation lifecycle. `../refrigerator/study.ts`, `panel.html` and `panel.css` retain the refrigerator model's control/render ownership. At most one instance of each device exists; chapter changes pause playback and camera/mode transitions while preserving conditions and progress. Hidden/pagehide cancels finite work. Returning does not automatically resume.
- 冰箱两种开门情景切换仍明确重置自己的观察时钟；这与切换章节保留状态是不同操作。The refrigerator's scenario selector deliberately restarts its clock; merely changing chapters does not.
- `learning.json` is the combined bilingual learning journey; refrigerator-specific source content and all model assets remain in its directory. Catalog fragments match the root canonical parent relation.

Ages 4–6 with adults. The same split-system illustration supports room, transparent-circuit and indoor-unit observation views. A marked refrigerant parcel follows one closed route. Cooling/fan-only and humid/drier comparisons preserve cycle progress. No audio or automatic playback.

The transparent view now emphasizes the route section matching the current evaporating, compressing, condensing or throttling explanation. The focused outline and highlighted pipe section follow the same `cycleState` as the marked parcel; fan-only hides the focus. This is a camera cue, not a measured temperature or pressure field.

`model.ts` owns the route, qualitative pressure/phase state and cycle energy accounting; `scene.ts` projects the state into original SVG; `airStudy.ts` owns finite playback, camera transitions and controls. Hidden/pagehide stop playback. Reduced-motion preferences are respected by the shared finite-transition helper.

The idealized enthalpy sequence 1→4→5→1→1 gives evaporator uptake 3, compressor work 1 and condenser rejection 4. Expansion is approximately isenthalpic. These units and phase fractions are illustrative, not refrigerant property data; fan work is excluded from the three-bar cycle balance and explicitly addressed in fan-only mode. Condensation is qualitative and requires the selected below-dew-point condition; no room cooldown or thermostat simulation is implied.

Primary sources are linked in `learning.json` and on the page: DOE cooling/heat-pump explanations, Natural Resources Canada, Danfoss and [OpenStax §4.3](https://openstax.org/books/university-physics-volume-2/pages/4-3-refrigerators-and-heat-pumps). Narration and separate visual cues cover both devices and the room boundary in Chinese and English. No equipment disassembly or live wiring experiment is offered.

Validation: `node --import tsx --test topics/air-conditioner/tests/model.test.mjs` covers closed-path continuity, cycle energy balance, vapor compression and fan-only/condensation boundaries. Integration additionally checks TypeScript, translations and actual narrow-screen views.

The controller lifecycle suite executes the real topic modules against a small DOM adapter and controlled animation scheduler. It checks both mid-mode-switch restoration directions, rapid reversals, state/readout agreement and stopped outdoor fan behavior. This does not establish browser BFCache eligibility.

The same suite also executes the real composed entry with both device models, SVG renderers and controllers, covering direct chapter URLs, history, shared-ledger projection, independent saved progress, and hidden/chapter cancellation. `project.test.mjs` tests boundary conservation and route compatibility. Focused command: `node --import tsx --test topics/air-conditioner/tests/*.test.mjs topics/refrigerator/tests/*.test.mjs`. Packaged browser and 390 px inspection belong to the root integration check, not this DOM adapter.

Scientific boundary: Qh = Qc + W is a cyclic working-fluid balance. Refrigerator transient room exchange additionally subtracts cabinet leakage and tracks air/food stored energy. Neither the fixed-room-temperature refrigerator nor the room-boundary example predicts room warming. A cool sensation near an open fridge door does not establish sustained whole-room cooling.

The room-boundary SVG is the final chapter's main stage, with its net room balance immediately below. Moving the hot end between outdoors and the same room interpolates the diagram; the result waits until the move finishes so an intermediate drawing is not mistaken for either settled energy boundary. The intermediate position is a visual transition, not a continuously solved partial-room heat-exchanger model. Leaving the chapter cancels the transition and settles its selected endpoint; reopening keeps the chosen case and work input.

## Presentation layout

The topic opts its existing scene and controls into shared viewport fitting and reversible immersion. Explanation/settings remain available in the adjacent disclosure panel. Multi-chapter studies retain their own state and clocks. Introductory diagrams can be expanded separately, and narrow screens retain document flow.
