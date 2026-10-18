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

For each step, nonnegative bounded rainfall first enters soil, limited by pore-water capacity and `1.4 × permeability`. Rejected rainfall is surface runoff. Soil percolation is limited by `0.075 × permeability × U` and the remaining aquifer capacity. The fixed well then withdraws only accessible water above its intake, with reduced response when its screen is partly exposed; unmet demand is reported. Signed river exchange is `2 × permeability × (h − 0.38)`, bounded by water availability or capacity. Applying this last ensures the displayed post-step head and exchange arrow agree even when pumping first draws the head below the river. River inflow becomes available to pumping in the following step. The sequence is an explicit lumped teaching scheme, not a calibrated solver.

### Fixed well / 固定井 · 2026-10-01

`WELL` keeps the wellhead at normalized head 1, screen top at 0.22, intake/screen bottom at 0.12 and casing bottom at 0.10. These are authored elevations in the same coordinate as `h`, not pixel cutoffs or surveyed dimensions. Accessible storage is `max(0, S − 12)`; submerged fraction in model head coordinates is `clamp((h − 0.12) / 0.10, 0, 1)`. Actual withdrawal is the smaller of accessible storage and demand multiplied by submerged fraction. The fraction is an illustrative supply response, not a calibrated screen conductance/yield law. Water below the intake remains in the aquifer and in all budgets. River inflow is counted and becomes available on the following step, never as a direct river-to-well shortcut.

取水口、筛管和井底由同一模型高程投影，深度不会随水位移动。蓝色井内水位与含水层平均水头来自同一状态，只有浸没筛管画成蓝色；取水箭头从固定取水口出发。筛管部分露出后，模型供水响应变弱；水低于取水口时，井不能抽取更深处仍存的水。这个平均水头模型不求解井周降落漏斗或井内额外降深，也不能预测实际产量。

The scene projects those same elevations into the screen, casing, fixed intake and blue well-water column. Only the wetted screen is highlighted; the pumping arrow starts at the fixed intake. Actual pumping/demand and submerged fraction are readable beside the drawing. The mean-head projection does not resolve the well's additional drawdown or a local cone of depression. Model and mounted-SVG regressions cover low/partial/full submergence, retained inaccessible storage and river replenishment; parent browser acceptance remains separate.

The cross-section uses one smooth monotonic **nonlinear teaching height projection**, not a metric elevation scale: `y(h) = 410 − 152h / (a + (1−a)h)`, where `a ≈ 0.330025` is derived from the three fixed anchors. Zero head maps to the base at y410, the unchanged river head 0.38 to its surface at y311.2, and full storage/head1 to the fixed wellhead at y258. The actual river-water shape, river-side flow endpoint, screen, intake, well bottom and water column all derive from this projection. No independent upper clipping of the water column hides an overflowing reference head. The history chart and numeric readings still use normalized model head; display projection does not change storage, pumping, tracer budgets or exchange direction. The drawing and its adjacent caption explicitly say vertical distances cannot measure head differences.

剖面共用平滑、单调的非线性教学高度投影：零水头对应井下基底，固定河流水头对应图中河面，最高储量对应固定井口；筛管、取水口、井底、河面与井内蓝柱都由同一函数得到位置。图中纵向距离不能量水头差，历史图与数字仍使用归一化模型水头。它是布局尺度，不改变两箱收支、抽水规则或河流方向，也不把示意坐标变成实测水位。

The two-store model still does not resolve local surface seepage or wellhead overflow; the horizontal mean-head reference is not a surveyed water surface following this hill. The unsaturated-soil label stays outside blue water. 仍不计算局部地表出渗或井口溢流，水平平均水头也不是随山坡变化的实测地下水面；非饱和土壤标注不会留在蓝色饱和区域内。

### Same-section well camera / 同剖面的井筒近看

Native 44px buttons switch the retained SVG between the full section and the `450 215 210 225` well viewBox. This crop includes the fixed wellhead/title, screen, intake and bedrock, using the same paths and current water column rather than a second illustration. Screen/intake callouts and a water-level leader are visible in the close view; the leader follows the actual column and disappears if the water is below the casing. Both views retain explicit non-metric teaching bounds. Switching camera pauses/cancels the timer while preserving experiment conditions, step and all scene nodes; repeated view/parent-visibility changes do not respawn or reset geometry. Abort-based teardown removes the new button listeners along with the original controls.

The camera controls and its hint are inside `.gw-scene`, so the parent's presentation frame moves them together. Only `.gw-study` styles change: the normal desktop frame reserves at least590px including its camera/transport/caption, and the actual SVG viewport at least330px. Close-view labels and the scale note are13 SVG units, enlarged by the same viewBox on narrow screens. Parent production-browser verification determines their actual rendered size and checks the full/close view, Chinese/English, desktop/mobile and immersive layouts.

原生按钮只改变同一幅剖面的取景范围，不新画一口井。近看包含井口、筛管、固定取水口和基岩，蓝色井水与引线随原状态更新。切镜头暂停并清除定时器，但保留条件、步骤与全部路径；说明仍明确放大与纵向高度是教学示意。专题图窗增高，桌面和手机的实际文字/筛管可辨性由父任务做生产浏览器复验。

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
- [USGS — Groundwater Wells](https://www.usgs.gov/water-science-school/science/groundwater-wells), checked 2026-10-01: fixed screens/intakes, wells drawing from saturated ground, and losing access when water falls below the intake. The screen elevations and linear supply response above remain teaching choices.
- [USGS — Groundwater Decline and Depletion](https://www.usgs.gov/water-science-school/science/groundwater-decline-and-depletion), checked 2026-10-01: water-table decline can leave wells unable to reach water and can reduce well yield; pumping can also alter river–aquifer exchange.

## Focused validation / 范围验证

```sh
node --import tsx --test topics/rain-cycle/groundwater/tests/groundwater.test.mjs
```

Scoped TypeScript validation covers this directory's four production TypeScript files using the repository compiler options. Parent integration owns full repository gates and actual desktop/mobile Chinese/English browser acceptance. Passing model tests is not visual acceptance or a real-aquifer validation claim. No commit, push or deployment is implied.
