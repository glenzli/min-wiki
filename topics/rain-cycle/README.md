# 水循环：水的许多旅程 / The water cycle: many journeys

## Main-scene pass · 2026-09-28

The fitted desktop frame now gives the same watershed SVG a direct visual stage instead of shrinking it inside a column with its key and time note. The location question stays beside the camera choices; settings and a live summary of the largest stores sit alongside the map. The 100-portion denominator is explicit, and the full nine-store ledger remains below. Longer-term study shortcuts move into the explanation panel, allowing the main watershed to appear sooner on a narrow screen. A few broken blue pore-route marks replace nine continuous white strands that resembled roots; paved ground shows far fewer. These marks are explanatory paths, not measured pores or water trajectories. No parcel route, cohort accounting or independent slow clock was changed. Browser checks covered desktop Chinese before and after changing the surface, camera switching without resetting progress, and 390 px Chinese/English child and English academic layouts. This pass does not validate every microscopic or long-term scene's visual detail.

One persistent watershed connects ocean evaporation, cloud particles, rain or mountain snow, hillside infiltration/runoff/storage, a meandering river, a lake and the sea. Observation windows change the camera, not the place, water batch or process progress. This replaces the former compulsory-looking closed loop.

## Ownership

- `watershedModel.ts`: the 100-portion teaching cohort, destinations, pool accounting, common geographic anchors, river projection, independent ice clock and validated routes.
- `watershedScene.ts`: deterministic SVG watershed, visible soil pores, stable terrain/trees, river and sediment, tracked water and optional numbered labels.
- `main.ts`: finite playback, camera transitions, independent ice-time control, lazy microscopic canvas, errors/retry, route/history and document lifecycle.
- `studies.ts`: bounded lazy study slots, explicit retry, inactive-result and disposal guards; child studies retain their own state without resuming automatically.
- `glacier/`: independent multiyear snow/firn/ice cohorts, accumulation/ablation budget, fixed-valley projection and controls. See its README for uncalibrated conversion times and geometric limits.
- `groundwater/`: independent unsaturated-soil and shallow-aquifer budget, delayed recharge, head-driven river exchange, pumping, cross-section and controls.
- `watershedContent.json` and `learning.json`: equivalent Chinese/English controls, mechanisms, scope and narration.
- `rain-formation/model.ts` and `scene.ts`: existing contact-before-transfer coalescence, icy growth, evaporation and detailed particle renderer. The new optional detail-only mode renders just the magnification window, not a second landscape.
- `ground-water/model.ts`: prescribed surface partition and connected-pore geometry.
- `river-paths/model.ts`: source river geometry and persistent sediment grains; one projection is shared by watershed drawing and water routes.

The cloud canvas is loaded only when requested, kept as one bounded instance, and disposed on a non-bfcache departure. Asynchronous results cannot mount after disposal. Visibility changes stop playback; returning from bfcache retains one instance. Reading mode, location labels and camera changes do not reset the batch. Reduced-motion settings allow deterministic endpoints and direct camera changes.

## Routes and compatibility

Canonical: `/topics/rain-cycle/?view=basin|cloud|ground|river|ice`.

Optional parameters: `p=0..1`, `humidity=0..100`, `route=warm|ice`, `surface=soil|clay|paved`. Invalid values fall back or clamp. Language, hash and deployment base are preserved. Chapter changes push history; scrubbed progress/conditions replace current history. Slow ice time and the tracked ID persist in the document, not after a full reload or language navigation.

Legacy `rain-formation`, `ground-water` and `river-paths` entries redirect to `cloud`, `ground` and `river` respectively. Their source models remain independently owned, not copied into shared platform code. Root integration owns catalog parent registration.

## 科学边界 / Scientific limits

- 100 份是一个示意批次，不是全球水量百分比，也不是流域预测。守恒测试只证明这个批次各位置计数之和。
- 云的可见成分是液滴和/或冰晶；水蒸气不可见。云下干湿对比与既有蒸发公式一致，固定粒径与停留时间是教学取值。
- 暖层内冰晶融化成雨，与高海拔寒冷降雪是两个分支。地表类型只改变地面分配，不改变这批水的出生位置。
- 主图的土壤孔道不是深层含水层。下方慢实验单独计算非饱和土壤向浅层含水层的延迟补给、河流交换与取水；不是三维地下水模型，不承诺入渗可净化饮用水。植被蒸腾、污染物迁移和深层含水层尚未模拟。
- 主图慢时间追踪已有冰川中的水份，再在消融区转为融水；下方另一实验才从无冰状态重建多年降雪、粒雪和冰的收支。两者不共用数量或时间。模型第五年成冰仅是教学延迟，不是真实统一年限；压实保留水当量，末端几何不求解应力与动态滞后。
- Terrain, paths, time and soil fractions are illustrative. Ocean, lake, soil, ice and surface storage are real distinct destinations, not points on one mandatory circle. Some branches stop in storage.
- The river retains sediment identity and an outer-bank-to-inner-bank transfer, but is not a hydrodynamic or full sediment-budget solver.
- 地点编号可隐藏，读数和主要解释在画布外。中文和英文有相同限制。

## Evidence and next checks

The two longer studies are embedded in the corresponding ground/ice observation windows. Top shortcut buttons scroll to them. The same hillside/valley provides geographic context, but their independently conserved budgets must never be added to the upper 100 portions. They load on demand and start paused; window changes pause without resetting their histories. Their controls and times are document-local, not serialized in the parent URL.

Focused model/route/projection tests: `node --import tsx --test topics/rain-cycle/tests/*.mjs topics/rain-formation/tests/*.mjs topics/ground-water/tests/*.mjs topics/river-paths/tests/*.ts`.

Additional budget and lifecycle tests: `node --import tsx --test topics/rain-cycle/glacier/*.test.mjs topics/rain-cycle/groundwater/tests/*.test.mjs topics/rain-cycle/tests/studies.test.mjs`.

These checks prove deterministic accounting, continuity, route validation, shared dry-air outcomes, the ice/melt distinction and SVG IDs. They do not prove visual quality. Root integration must run the full repository gate and production-browser checks in Chinese and English, including 390 px, old links, history, cloud loading, rapid switching, pause/scrub, ice intermediate states and reduced motion.

Sources: [USGS water cycle](https://www.usgs.gov/water-science-school/water-cycle), [NASA cloud composition](https://gpm.nasa.gov/resources/faq/what-are-clouds-made-are-they-more-likely-form-polluted-air-or-pristine-air), [USGS glacier flow](https://wa.water.usgs.gov/pubs/fs/fs_rainier.html).

## Presentation layout

The topic opts its existing scene and controls into shared viewport fitting and reversible immersion. Explanation/settings remain available in the adjacent disclosure panel. Multi-chapter studies retain their own state and clocks. Introductory diagrams can be expanded separately, and narrow screens retain document flow.
