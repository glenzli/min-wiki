# Hillside groundwater study / 山坡下的地下水慢旅程

Topic-owned module for the **② hillside** ground view of the water-cycle journey. It is an **independent long-time water-budget experiment**, not another allocation of the watershed's 100-portion cohort. Existing `topics/ground-water/` still owns the older shallow infiltration model and is not changed here.

## Integration / 接入

```ts
import { mountGroundwaterStudy } from './groundwater';
const study = mountGroundwaterStudy(host, language); // 'zh' | 'en'
study.setActive(currentView === 'ground');
// On view changes: call setActive(false); state and position remain available.
// On parent teardown:
study.dispose();
```

Mounting is initially inactive and paused. The parent owns visibility; it must call `setActive(true)` when this host is shown. Only the user's play button starts time. Repeated activation does not restart or interrupt playback. Leaving the view, hiding the document or `pagehide` pauses. Returning does not auto-resume. Disposal is idempotent and removes the owned section, event listeners and pending timer without clearing other host children. No global selectors, recurring background animation or shared scientific model are installed.

挂载不自动运行；由父页面切换可见性，用户点击后才启动。离开、隐藏、回放或修改参数均暂停，最多保存 241 个状态。修改参数明确从同一初始状态重算；“先下雨，再停雨”预设只在前 24 步供雨，普通滑块修改恢复恒定供雨。时间步没有真实日历含义。

## Owned responsibilities / 所有权

- `model.ts`: deterministic two-store budget, signed river exchange, capacity-limited withdrawals, a finite conservative tracer pulse and bounded history.
- `scene.ts`: fixed hillside–river section, 132 persistent grain geometries, three stable sampling labels, storage-driven water-table projection and flux-driven arrows. It updates the same SVG nodes; grains are never shuffled.
- `playback.ts`: finite, user-started lifecycle and replay state.
- `index.ts`: local controls, DOM composition, active/visibility lifecycle, actual model metrics, tracer destinations, history and budget.
- `content.json`: equivalent Chinese/English authored content, controls and scientific qualifications.
- `style.css`: `.gw-study`-scoped styles; the drawing is supplemented by a readable external legend on narrow screens.
- `tests/groundwater.test.mjs`: water/tracer conservation, capacity and no-flow boundaries, delayed recharge, signed exchange, pumping, deterministic rendering/history, local-language parity and playback lifecycle.

## Model contract / 模型边界

Two well-mixed stores represent unsaturated soil water `U` (capacity 12) and shallow unconfined groundwater `S` (capacity 100), starting at `U = 0`, `S = 52`. All quantities and coefficients are illustrative. The normalized mean groundwater head is `h = S / 100`; the external river head is fixed at `0.38`.

For each step, nonnegative bounded rainfall first enters soil, limited by pore-water capacity and `1.4 × permeability`. Rejected rainfall is surface runoff. Soil percolation is limited by `0.075 × permeability × U` and the remaining aquifer capacity. Actual pumping then takes at most available groundwater; unmet demand is reported. Signed river exchange is `2 × permeability × (h − 0.38)`, bounded by water availability or capacity. Applying this last ensures the displayed post-step head and exchange arrow agree even when pumping first draws the head below the river. River inflow becomes available to pumping in the following step. The sequence is an explicit lumped teaching scheme, not a calibrated solver.

The audit identity is:

`initial groundwater + rainfall + river inflow = remaining soil water + remaining groundwater + surface runoff + river outflow + actual pumping`.

The first eight steps of rain carry a virtual conservative label. Label transfer uses the donor box's mixed concentration and follows the same water fluxes. River inflow is untagged. Four outputs partition that finite label: soil, aquifer, river outlet, and runoff/pumping. Gold indicates the label, not contamination or a literal drop trajectory. Marker positions A/B/C never move; displayed amounts are box totals, **not local concentrations measured at those plotted points**. Brightness is illustrative; numeric amounts carry the quantitative contract.

初始的地下水已经存在，不是假设雨落下后地下才突然出现水。孔隙排列固定，渗透性改变通水能力而不改变孔隙数量。水位与储量来自同一个状态；地下水头较高时向河流排泄，较低时河流补入；零通水能力不强制循环。停雨之后的土壤储水可继续补给，抽水过多会降低水位且受可用量约束。

The section is an illustrative projection of mean storage, **not a two-dimensional hydraulic-head solution**. It omits layered/confined aquifers, variable river stage or river depletion, disconnected unsaturated streambeds, preferential fractures/karst flow, groundwater evapotranspiration and local cones of depression around wells. The fixed river boundary is external and its cumulative supply is included explicitly in the budget; it is not an assertion that real rivers have infinite water. Most groundwater occupies pores/fractures, not cavern rivers. This cannot estimate actual travel years, predict well yield, or certify filtration or drinking-water safety.

## Primary sources / 一手来源

Reviewed 2026-09-20; the formulas, capacities and section geometry above are authored teaching choices, **not USGS parameter recommendations**.

- [USGS — Infiltration and the Water Cycle](https://www.usgs.gov/water-science-school/science/infiltration-and-water-cycle): infiltration can remain in shallow soil or recharge deeper groundwater; saturated soils and low-permeability material restrict infiltration; stored groundwater can sustain streamflow after rain stops; pumping beyond replenishment can lower water levels.
- [USGS — Groundwater Flow and the Water Cycle](https://www.usgs.gov/water-science-school/science/groundwater-flow-and-water-cycle): pore/fracture storage, distinction between unsaturated and saturated zones, permeability versus porosity, and highly variable groundwater travel times.
- [USGS — Rivers Contain Groundwater](https://www.usgs.gov/water-science-school/science/rivers-contain-groundwater): streams can gain or lose groundwater; the relative water-table and river-surface elevations determine direction.
- [USGS Circular 1139 — Hydrologic Cycle and Interactions](https://pubs.usgs.gov/circ/circ1139/htdocs/natural_processes_of_ground.htm): gaining/losing reaches and groundwater–surface-water exchange. Supports the direction of the conceptual boundary, not the particular lumped coefficient.

## Focused validation / 范围验证

```sh
node --import tsx --test topics/rain-cycle/groundwater/tests/groundwater.test.mjs
```

Scoped TypeScript validation covers this directory's four production TypeScript files using the repository compiler options. Parent integration owns full repository gates and actual desktop/mobile Chinese/English browser acceptance. Passing model tests is not visual acceptance or a real-aquifer validation claim. No commit, push or deployment is implied.
