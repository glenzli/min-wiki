# 火山湖是怎样形成的 / How volcanic lakes form

火山喷发之后，为什么可能留下一座湖？比较火山口和破火山口，试着让雨水积起来，或从地下漏走。

湖盆外形与水位为简化示意，不对应特定火山。没有模拟真实冷却时间、热液化学或地下水流场；无输入时不会凭空生水。

Basin shape and water level are simplified and do not model a particular volcano. Cooling time, hydrothermal chemistry and groundwater flow fields are omitted; no water appears without input.

## Ownership

`model.ts` owns the scientific teaching state and numeric contracts; `scene.ts` owns rendering; `content.ts` and `locales/en.json` own bilingual explanations. `main.ts` owns controls and playback. Full-page navigation releases rendering resources. Nothing plays automatically.

## Sources

- [USGS · Mount Mazama and Crater Lake](https://pubs.usgs.gov/fs/2002/fs092-02/)
- [USGS · Post-caldera volcanism and Crater Lake](https://www.usgs.gov/volcanoes/crater-lake/science/post-caldera-volcanism-and-crater-lake)
- [USGS · Volcano types](https://pubs.usgs.gov/gip/volc/types.html)

## Validation

Run `npm run check`, then verify the production page in both languages, controls, playback and narrow layouts. Model tests validate implementation assumptions, not empirical calibration.

## 剖面呈现 / Cutaway presentation

分步表现岩浆撤出、支撑减弱与裂隙扩展、岩体下沉，随后再积水；同一进度控制地形、岩层错动和说明。新增的成因步骤可直接定位观察。储存区不显示为长期空洞。火山口选项不套用破火山口塌陷流程。岩层、断裂与残留岩浆只作地质教学示意，不是岩体力学求解。

The cutaway sequences magma withdrawal, weakening support and fractures, subsidence, and later water accumulation. One timeline controls surface shape, displaced layers and explanations. The reservoir remains a rock/magma region. The smaller-crater option has its own explanation. These are teaching stages, not a rock-mechanics solver.

Source: [USGS Kīlauea 2018 withdrawal and collapse](https://www.usgs.gov/volcanoes/kilauea/science/2018-lower-east-rift-zone-eruption-and-summit-collapse).

## Child reading milestones · 2026-10-01

集成页面的破火山口案例采用专属儿童短导读，与模型共同经历岩浆撤出、支撑减弱和裂隙发展、下沉、随后可能积水。中英两版都区分已形成的盆地与需要水量条件的湖，不在岩层下沉时提前说明湖水到来。

The integrated caldera case now uses its own short child observations for withdrawal, weakening support/fractures, subsidence, and possible later water retention. Both reading modes follow the same topic-owned milestone selector. Children no longer receive the generic lake sentence about incoming water while rock is still subsiding. Chinese and English retain the distinction between an existing basin and conditional lake formation. The [USGS Kīlauea account](https://www.usgs.gov/volcanoes/kilauea/science/2018-lower-east-rift-zone-eruption-and-summit-collapse-kilauea) was checked for withdrawal/collapse order and the later water lake. Focused tests compare the child wording to no-subsidence/no-water intermediate states and a zero-input basin; integrated browser checks remain separate.
