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
