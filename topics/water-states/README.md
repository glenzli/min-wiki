# 水的三态 / Water states

## 本轮问题与边界

- 核心问题：同一份冰水，供热、取热和隔热会产生什么不同结果？另一杯敞口水怎样从液面到冷盖？
- 可变条件：热交换方向；当前一段相变进度。换条件保留现有冰水比例。
- 可见结果：杯中相界、36 个保留的分子符号、冰水质量与本段交换热量；另一条定性路径中水位、持续标记与冷盖下的液滴。
- 因果：热量交换改变相态比例；理想隔热不改变比例，时间播放本身不是原因。
- 防止误解：进度不是温度，不是所有吸热都表现为升温；水分子不变成别的物质。
- 模型：100 g 纯水、普通压强、熔点处的潜热账本，融化潜热取约 334 J/g。

`heatModel.ts` owns one latent-heat segment. Changing direction anchors a new segment at
the current liquid fraction. Replaying scrubs that segment deterministically. The reference
sample starts half ice, half liquid; Restart explicitly restores this sample. Switching to
a preset observation and back preserves the in-memory heat experiment. Language reload does not.
Positive heat enters the sample; negative heat leaves. Stop at completely liquid or solid:
no sensible heating, heat-transfer rate, supercooling or nucleation kinetics is calculated.
The 20-second playback is presentation time, not physical time. Source: [OpenStax latent heat](https://openstax.org/books/physics/pages/11-3-phase-change-and-latent-heat).

`model.ts`, `iceGeometry.ts` and `iceRenderer.ts` retain the original prescribed freezing,
melting, evaporation and condensation illustrations. The thermal model drives the same
freeze geometry with its current ice fraction. Grains, bubbles and molecular symbols are
different scales. Interface geometry is not a heat-transfer calculation. The other preset
observations are separate cases, not one conserved water cycle.

The surface-to-lid route is a **different open-cup sample**. One uninterrupted
scrub keeps that cup and a gold parcel marker in place: a portion leaves the
surface as invisible vapor; a cold lid enters later; some vapor condenses under
it. The cup is not refilled at condensation. Progress, level and condensate
yield are qualitative and cannot be read as a physical clock, mass balance or
rate. The 100 g latent-heat ledger belongs only to the ice–water experiment.
The older evaporation/condensation presets remain separate close-ups.

Kids start with the large cup, short explanations and optional molecular view.
Academic mode opens the molecular comparison, phase ledger, model caveats and
the local saturation condition `RH = p_v / p_sat(T)`. A cold lid can collect
condensate when nearby vapor is saturated relative to its surface temperature;
actual flux needs vapor pressure, thermal and airflow boundary conditions. The
route follows the [USGS evaporation](https://www.usgs.gov/water-science-school/science/evaporation-and-water-cycle)
and [condensation](https://www.usgs.gov/water-science-school/science/condensation-and-water-cycle)
explanations; it is not a fluid or heat-transfer solver.

Focus mode changes presentation only and preserves the same DOM and experiment state.
Validation: topic tests, translation/type/build gates and packaged bilingual browser checks.

## Presentation layout

The topic selects its existing scene and controls for the shared viewport-fitted presentation frame. At desktop widths the scene and primary playback stay together, with independently scrollable explanation/settings; immersion can hide and reopen that panel without remounting the experiment. Narrow screens retain normal document flow. Scientific state and geometry remain topic-owned.
