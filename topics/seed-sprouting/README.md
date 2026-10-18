# 开花植物：从种子到下一代 / Flowering plants: from seed to next generation

This is the integrated entry for germination, cherry reproduction and seed dispersal. A condition map connects seed → conditional germination → seedling → maturity → pollination/fertilization → seeds and fruit → dispersal → a new establishment hurdle. Map status reads the actual retained case states; it does not pretend that a bean becomes a cherry, dandelion or burdock. Seedling-to-maturity is an explicit explanatory bridge, not a simulated growth stage.

## Case selection and retained evidence

The opening view shows the current case and one causal question above a large scene. A collapsed menu provides common bean germination, cherry flower to fruit, and dandelion/burdock dispersal: four species across three cases. Expanding it reveals each case’s status from `cycleEvidence`; selecting a case or moving to the next question retains its controls and progress. The detailed six-stage condition map is separately expandable below the study.

Child mode keeps one short case-specific explanation visible. Academic mode retains the mechanisms and sources in the study’s optional panel. Narrow screens keep the menu compact and show all case choices when expanded. These are bounded teaching states: visiting a case does not transfer history between species, and landing does not count as germination.

## Ownership and routes

- `main.ts`: the condition map, question transitions, validated chapter navigation, at most three retained native study fragments, and the page lifetime. Only the active fragment is attached; this avoids duplicate SVG/label IDs. Switches pause finite animation and keep each case’s controls and stage. Hidden/page-exit/reduced-motion events stop movement; bfcache return does not automatically resume.
- `lifecycleModel.ts`: pure `canGerminate`, `allowedGrowth`, `cycleEvidence`, `readPlantRoute` and `plantDestination` contracts. The graph consumes case outcomes rather than a second timeline.
- `study.ts` / `study.html`: the continuous common-bean illustration and controls, an explicit `mountStudy(root, initial, onChange)` owner with `read`, `pause` and `dispose`; it retains already observed fractional growth when conditions change. A linked soil-pore close-up now shows dry gaps, damp water films with air, and waterlogged pores while the same bean stays in the main scene. Three compact condition readings update with the controls; the academic sidebar adds stage- or condition-specific mechanism and limits.
- `../flower-fruit/study.ts` / `model.ts`: pollen identity, stigma contact, compatible versus incompatible tube development and cherry fruit/cutaway. Incompatible pollen is arrested in the model and never develops seeds/fruit; this is not merely alternate text.
- `../seed-travel/study.ts` / `model.ts`: wind settling and burr contact → attachment → transport → release → landing. Wind settings and the burr case keep separate finite progress records.
- `studyHost.ts`: translates scoped native fragments before insertion. No iframe or embedded whole old page; duplicate old discovery cards and page chrome are not mounted.
- `content.json` / `learning.json`: bilingual problem chain, qualifications, three academic notes and four narration pieces; old topic dictionaries still own their reused scene/control text.

Routes: `/topics/seed-sprouting/?chapter=germination|reproduction|dispersal`. Default is germination. Old `flower-fruit` and `seed-travel` entries replace-location into `reproduction` and `dispersal`, respectively, preserving valid language, applicable parameters, hash and deployment base. `plantDestination(chapter, search='', hash='', base='/')` is pure; runtime also uses `languageHref` for the mounted base/language. Initial route parameters are `stage=0..3`, `water=damp|dry|flood`, `air=yes|no`, `temp=warm|cold`; `journey=0..3`, `pollen=compatible|incompatible`; and `progress=0..1`, `kind=wind|fur`, `wind=0|1|2`. They initialize inspection states, not elapsed days. Chapter switches keep in-page state; refresh/language navigation does not promise restoration of the complete experiment history.

## Six design answers

1. Understand the conditional path to a new generation, not just watch three animations.
2. Change bean water/oxygen/temperature, pollen compatibility and dispersal case/wind.
3. Observe root/shoot progression, tube growth or arrest, fruit presence and continuous dispersal stages.
4. Each transition requires a mechanism or condition; arriving pollen and landed seeds are not sufficient outcomes.
5. Cases are different species; pollination ≠ fertilization, stone ≠ seed, dispersal ≠ germination, seedling ≠ reproductive maturity.
6. The original qualitative models remain owned by their cases. No durations, dimensions or propagation distances are measured simulations, and the general sexual pathway excludes several alternative reproductive routes.

## 原菜豆实验的边界 / Common-bean experiment

给豆子一点水、一点空气和合适的温度，再翻开成长相册。

种子吸水后恢复代谢；呼吸需要氧气，温度影响反应速度。以菜豆为例，胚根先突破种皮，随后胚轴伸长，将子叶抬起，真叶展开。早期养分来自种子储备，小苗建立后需要光合作用。

## 教学边界

相册不是按真实天数计时。这里只演示健康菜豆的典型过程；太冷用暂停表示，不代表所有种子都完全停止。积水把氧气供应不足合并表现；种类、休眠、病害和光照需求另有差异。

土壤孔隙局部放大图是定性示意：颗粒和孔隙的大小、含水量、氧气符号数量都不按比例，也不表示缺氧时氧气完全为零。儿童版直接对照同一株菜豆与条件图；学术版的机制、简化边界及大学植物学资料链接位于可滚动侧栏。手机视图把局部放大图和条件读数放在主画面下方，不盖住幼苗。

## References

- [University of Minnesota · Seed physiology](https://open.lib.umn.edu/horticulture/chapter/9-2-seed-physiology/)
- [University of Minnesota · Germination](https://blog-nwcrops.extension.umn.edu/2023/05/its-magic-neat-process-of-soybean.html)

Interaction advances only on user input. Bean growth and cherry reproduction each provide a finite, user-started 24-second observation; dispersal keeps its own finite playback. No audio or background workers. On narrow screens tiny redundant SVG labels are omitted; the external case heading, control values, result and map preserve their explanation. Cherry cutaway zoom retains its readable labels.

## Shared scientific evidence

- [University of Minnesota · Flowers to fruit](https://fruit.umn.edu/content/flowers-to-fruit): pollination and subsequent fertilization/fruit formation.
- [Cornell / NYSHS · Sweet cherry pollination](https://nyshs.org/wp-content/uploads/2016/10/Sweet-Cherry-Pollination-Considerations-for-2001.pdf): compatibility and arrested pollen-tube development. The exact illustrated arrest length is not measured.
- [Kew · Dandelion](https://www.kew.org/plants/dandelion): pappus-assisted dispersal; [Plant scientists](https://www.kew.org/sites/default/files/2022-09/LKS2-Plant-scientists-pre-and-post-visit-resources.pdf): comparative dispersal.

## Validation

Focused command: `node --import tsx --test topics/seed-sprouting/tests/*.test.mjs topics/seed-travel/model.test.ts topics/flower-fruit/model.test.ts`.
Checks cover water/oxygen/temperature gates, fractional growth history, pollen contact/tube continuity, actual incompatible no-fruit outcome, wind settling, attachment/release, graph status, valid migration parameters, lifetime adapter boundaries and learning schema. Root integration owns production build and actual Chinese/English desktop/390px browser checks. A source test is not browser evidence.

## Presentation layout

The topic opts its existing scene and controls into shared viewport fitting and reversible immersion. Explanation/settings remain available in the adjacent disclosure panel. Multi-chapter studies retain their own state and clocks. Introductory diagrams can be expanded separately, and narrow screens retain document flow.

## 默认画面优先 · 2026-10-18

三个物种案例与讲解深度改在默认收起的切换菜单中选择，当前案例和观察问题继续可见。完整六阶段条件图移到实验下方保留展开入口，直接操作与原有各案例历史不变。
## Illustration refinement · 2026-10-19

菜豆真叶细化轮廓、中央折光、分级叶脉和柔和投影；同一组叶形、原有茎根连接与成长进度继续被保留。局部叶脉纹理不代表测量到的组织数量或新增运输机制。

Refined leaf contours, subdued fold shading and secondary vein details retain the specimen identity and growth state. They do not add a physiological model or turn the illustrated developmental stages into measured ages.

## Continuous organ development · 2026-10-19

`growthGeometry.ts` owns the qualitative common-bean morphology: a fixed root origin, hypocotyl arch lifting the cotyledonary node, opening of that same cotyledon pair, coat separation and drop, and the first opposite true-leaf pair unfurling above it. Leaf length and folded width develop separately. `growthScene.ts` mounts the botanical SVG once, then updates those organs’ attributes; the soil and leaf detail do not get replaced on every animation frame. The true leaves do not replace the cotyledons. Stem paint uses illustration coordinates so a perfectly vertical stem remains visible.

`growthPlayback.ts` owns only the finite clock used by this journey’s bean and cherry observations. The studies still own their morphology, conditions, results and camera. Play/pause, reset and review progress remain below the scene; conditions stay in the optional panel. Playback starts only on user input, pauses at the actually shown fractional extent, and cannot finish a cancelled seek after switching cases. A condition failure preserves already observed growth; restoration does not automatically resume it. Reduced motion advances one named stage without a frame loop. Scrubbing reviews the compressed illustration rather than reversing plant development.

插图连续性不是生理仿真：本例为菜豆的子叶出土型萌发。胚轴拱起、种皮脱落、子叶张开与真叶展开的相对时间是教学编排；不计算顶土力、膨压、器官尺寸、干物质或实际天数。落下种皮的两片形状简化了真实种皮撕裂。幼苗到开花成年的阶段仍明确省略，菜豆不会在动画中变成樱桃。

Primary morphology reference: [University of Minnesota · Introduction to seed germination](https://open.lib.umn.edu/horticulture/chapter/2-2-introduction-to-seed-germination/), including common bean (*Phaseolus vulgaris*) epigeal emergence. The illustrated hypocotyl, cotyledonary node and root preserve that relationship; their precise trajectory is authored illustration.

This is an epigeal common-bean illustration, not a physiological simulation. Hypocotyl arching, coat shedding, cotyledon opening and leaf unfolding use authored relative timing. Soil forces, turgor, organ sizes, biomass and elapsed days are not calculated. Two coat pieces simplify a real tear. Seedling-to-flowering maturity is still omitted explicitly, and the bean never turns into a cherry.

All three cases expose one authored `.study-transport` to the Reader. Dispersal’s existing `travel`/`progress` controls and live result join that surface without changing its wind/fur model or clock; case-specific conditions remain in settings.

The first true-leaf pair now opens with a small change in attachment angle as well as separate length/width unfolding; the final mature seedling retains the same geometry. Cherry motion uses `../flower-fruit/beeMotion.ts`, with no independent ambient clock.
