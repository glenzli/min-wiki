# 刹车了，为什么还要系安全带？ / If the car brakes, why wear a seat belt?

已并入 `/topics/friction/`「运动、摩擦与停下来」。旧 `/topics/car-safety/` 跳转到 `?chapter=braking`，安全带/座椅类锚点进入 `restraints`；语言、部署前缀、query 与 hash 保留。停车模型、金属刹车放大图、成人安全带和儿童座椅图例仍由此目录拥有。

Now part of the motion-and-stopping journey. The legacy entry redirects to the braking chapter, or restraints for belt/seat anchors. Scientific models and detailed illustrations remain here, with no iframe and no replacement by a generic friction model.

## 交互与职责

- `model.ts`：反应后匀减速的一维停车模型。初速 20–60 km/h；反应时间固定 1 秒；干燥/湿滑情景减速度分别为 6/3 m/s²。反应距离与制动距离分开，停止后不倒退。参数为教学设定，不代表实测路面。路线标尺一致，汽车图标尺寸为便于观看而放大。
- `study.ts`：速度/路面改变后回到起点；用户启动约 8 秒教学播放，可暂停、重播、拖动时间。遵循减少动态效果偏好（播放按钮直接展示终点，仍可手动拖动）；页面隐藏、切章和离开暂停并取消动画，往返缓存恢复保留进度，不自动续播，无音频。实时朗读只在三个物理阶段改变时更新，避免每帧刷屏。原 `main.ts` 仅为兼容跳转。
- `panel.html` / `contact.html` / `panel.css`：有局部样式的 SVG 示意与分段讲解，按车轮接触、停车、约束职责放入主路径；肩带/腰带按钮高亮正确部位；后向、前向、增高座椅按钮同时改变图形、方向、解释。示意中车头向右，车辆座位靠背在左侧；后向儿童座椅壳体靠背在右侧，前向壳体靠背在左侧。暂停会取消高亮插值并保留所选部位。
- `locales/en.json` / `i18n.ts`：正文、动态数值、图形说明与边界使用同一翻译机制。封面 `alt` 在专题中显式翻译。
- `catalog-entry.json` / `catalog-en.json`：与主入口同为物理分类，保持 `parentTopic: friction`；共享目录由主任务登记。

## 科学与安全边界

轮胎正常滚动且接触区域无相对滑动时，地面的制动力主要是静摩擦；常规刹车装置通过摩擦将机械能转成内能。惯性不是额外的向前推力。乘员减速需要真实外力；约束与车辆吸能结构分散身体上的作用并延长减速过程，但不应故意让安全带松弛。本页不计算人体峰值受力、伤害或存活概率。

儿童座椅依据儿童身高、体重、产品适用年龄与制造商要求选用，后向尽可能保持至对应上限，适用下一阶段后才转换。乘员在后排正确使用；前排启用气囊位置不安装后向座椅。图形不代替安装说明，不用一个固定生日判断转换，也不把美国建议写成中国法律。页面不鼓励道路实验，不用模型数字提供跟车距离。

The topic connects stopping distance, brake and tire contacts, inertia, snug adult belt placement and correctly sized child restraints. All explanations and qualifications are available in English. The interactive model distinguishes constant-speed reaction travel from constant-deceleration braking, with no reversal after stopping. Its chosen parameters and illustrated car scale are educational, not measured road data or driving guidance. Passenger protection is qualitative: no crash, injury model, force percentage or survival score. Seat-stage changes depend on product eligibility and fit, not one fixed birthday. All motion starts with an explicit action and pauses on hide or departure.

## Sources / 资料

NHTSA seat/seat-belt and CDC prevention pages rechecked live on 2026-09-20; original mechanics references remain linked in the expanded page. The CDC page is dated April 23, 2026. No product-size limits or numerical safety percentages are invented.

- [NHTSA: Car Seats and Booster Seats](https://www.nhtsa.gov/vehicle-safety/car-seats-and-booster-seats) — rear-facing limits, forward harness stage, belt positioning.
- [CDC: Preventing Child Passenger Injury](https://www.cdc.gov/child-passenger-safety/prevention/index.html) — back-seat use, body fit, limits and transitions; no injury percentages copied into the lesson.
- [NHTSA: Seat Belt Safety](https://www.nhtsa.gov/vehicle-safety/seat-belts) — adult shoulder/chest and low hip fit, no belt under arm or behind back.
- [OpenStax: Motion with Constant Acceleration](https://openstax.org/books/university-physics-volume-1/pages/3-4-motion-with-constant-acceleration) — reaction and braking distance model.
- [Georgia State University: Auto Stopping Distance](https://hyperphysics.gsu.edu/hbase/crstp.html) — rolling versus locked tire friction.
- [OpenStax: Impulse and Collisions](https://openstax.org/books/university-physics-volume-1/pages/9-2-impulse-and-collisions) — momentum change and average force; no numerical human-impact example adopted.
- [NHTSA: Light Vehicle ABS Performance](https://www.nhtsa.gov/sites/nhtsa.gov/files/nhtsaabst4finalrpt.pdf) — ABS does not universally shorten stops; loose-surface tradeoff.
- [U.S. Department of Energy: Electricity Basics](https://afdc.energy.gov/fuels/electricity-basics) — energy recovery during regenerative braking.

## Cover

`cover-v2.jpg` is a separate built-in imagegen illustration, 1200 × 800 pixels. The first generation incorrectly faced the child seat forward; a targeted edit corrected the adopted version to rear-facing. The complete prompts, original paths, correction and review are in `COVER.md`. No CLI fallback. Illustration is not a product installation diagram.

## Focused validation

- `node --import tsx --test topics/car-safety/tests/model.test.js`: 3 tests passed. Doubling-speed relationships, dry/wet separation, continuity, monotonic stopping and post-stop clamping.
- Strict isolated TypeScript compilation from `topics/car-safety/main.ts`: passed.
- Topic-local HTML/TypeScript/attribute extraction: 85 text occurrences covered, all 80 English messages nonempty, no untranslated Chinese in targets, matching placeholders. Includes image alt text.
- Whole-project test/build, packaged direct access, both languages, navigation, theme and 390-pixel layout: delegated to the integrating parent task; no separate full build run here.

No commit, push or external deployment was performed by this subtask.
