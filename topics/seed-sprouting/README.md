# 开花植物：从种子到下一代 / Flowering plants: from seed to next generation

This is the integrated entry for germination, cherry reproduction and seed dispersal. A condition map connects seed → conditional germination → seedling → maturity → pollination/fertilization → seeds and fruit → dispersal → a new establishment hurdle. Map status reads the actual retained case states; it does not pretend that a bean becomes a cherry, dandelion or burdock. Seedling-to-maturity is an explicit explanatory bridge, not a simulated growth stage.

## Ownership and routes

- `main.ts`: the condition map, question transitions, validated chapter navigation, at most three retained native study fragments, and the page lifetime. Only the active fragment is attached; this avoids duplicate SVG/label IDs. Switches pause finite animation and keep each case’s controls and stage. Hidden/page-exit/reduced-motion events stop movement; bfcache return does not automatically resume.
- `lifecycleModel.ts`: pure `canGerminate`, `allowedGrowth`, `cycleEvidence`, `readPlantRoute` and `plantDestination` contracts. The graph consumes case outcomes rather than a second timeline.
- `study.ts` / `study.html`: the existing continuous common-bean illustration and controls, now an explicit `mountStudy(root, initial, onChange)` owner with `read`, `pause` and `dispose`; it retains already observed fractional growth when conditions change.
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

## References

- [University of Minnesota · Seed physiology](https://open.lib.umn.edu/horticulture/chapter/9-2-seed-physiology/)
- [University of Minnesota · Germination](https://blog-nwcrops.extension.umn.edu/2023/05/its-magic-neat-process-of-soybean.html)

Interaction advances only on user input. Bean growth uses cancellable finite transitions; the cherry and dispersal studies use finite user-started playback. No audio or background workers. On narrow screens tiny redundant SVG labels are omitted; the external case heading, control values, result and map preserve their explanation. Cherry cutaway zoom retains its readable labels.

## Shared scientific evidence

- [University of Minnesota · Flowers to fruit](https://fruit.umn.edu/content/flowers-to-fruit): pollination and subsequent fertilization/fruit formation.
- [Cornell / NYSHS · Sweet cherry pollination](https://nyshs.org/wp-content/uploads/2016/10/Sweet-Cherry-Pollination-Considerations-for-2001.pdf): compatibility and arrested pollen-tube development. The exact illustrated arrest length is not measured.
- [Kew · Dandelion](https://www.kew.org/plants/dandelion): pappus-assisted dispersal; [Plant scientists](https://www.kew.org/sites/default/files/2022-09/LKS2-Plant-scientists-pre-and-post-visit-resources.pdf): comparative dispersal.

## Validation

Focused command: `node --import tsx --test topics/seed-sprouting/tests/*.test.mjs topics/seed-travel/model.test.ts topics/flower-fruit/model.test.ts`.
Checks cover water/oxygen/temperature gates, fractional growth history, pollen contact/tube continuity, actual incompatible no-fruit outcome, wind settling, attachment/release, graph status, valid migration parameters, lifetime adapter boundaries and learning schema. Root integration owns production build and actual Chinese/English desktop/390px browser checks. A source test is not browser evidence.

## Presentation layout

The topic opts its existing scene and controls into shared viewport fitting and reversible immersion. Explanation/settings remain available in the adjacent disclosure panel. Multi-chapter studies retain their own state and clocks. Introductory diagrams can be expanded separately, and narrow screens retain document flow.
