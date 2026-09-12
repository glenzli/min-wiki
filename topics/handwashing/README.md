# 肥皂为什么能帮忙洗手？ / How does soap help wash our hands?

独立生活类双语专题 `/topics/handwashing/?lang=zh|en`。五站屏幕练习依次介绍打湿、用皂、搓洗、冲净和擦干。搓洗站点选五个区域，解释掌心、手背、指缝、拇指、指尖与指甲周围的覆盖动作。每个区域只记录“看过说明”；只有五处均看过才进入冲洗，不统计真实手部动作或真实搓洗时长。

左右两幅示意同步显示手部位置与皮肤表面去污过程。油污在用皂与搓洗后松动，随后被清水带走，皮肤上保留少量微生物符号，避免暗示灭菌。图形尺寸、符号、数量和位移都是定性教具，不测清洁效果、不提供杀菌率、不宣称所有微生物有害。

An independent bilingual everyday-life topic. Five stations cover wetting, soap, rubbing, rinsing and drying. During the rubbing station, users select five areas to learn how to cover palms, backs, finger spaces, thumbs, fingertips and nail edges. The state records explanations viewed, never real hand movements, washing duration or cleanliness. Close-ups show loosened dirt being rinsed away; remaining microbe symbols make the non-sterile outcome explicit. Shape, size, counts and displacement are qualitative teaching choices.

## Content scope

- 家庭日常用皂搓洗至少 20 秒，随后冲净擦干；与 WHO 医疗场景 40—60 秒整套流程的计时范围分开解释。
- 干净流动冷水或温水，不需烫水；泡泡数量不是清洁指标。
- 普通肥皂或水洗型洗手液即可；本文不演示酒精免洗消毒剂。
- 讲清微生物并非全都危险，洗手不保证去掉全部微生物或所有化学污染物。
- 无音频、无自动教学播放；仅水流装饰动画，`pagehide` / 隐藏页面暂停，`pageshow` 恢复可见状态；支持减少动态效果偏好。
- Buttons and content remain keyboard/touch accessible; the mobile layout stacks the two diagrams. Light/dark reading themes use platform semantic variables; diagrams preserve their material palette.

## Sources, checked 2026-09-12

- [CDC: About Handwashing](https://www.cdc.gov/clean-hands/about/index.html) — everyday timing and basic steps.
- [CDC: Handwashing Facts](https://www.cdc.gov/clean-hands/data-research/facts-stats/index.html) — soap, friction, rinsing and drying evidence.
- [CDC: Hand Hygiene FAQ](https://www.cdc.gov/clean-hands/faq/index.html) — temperature, ordinary soap and community settings.
- [WHO: How to handwash?](https://www.who.int/publications/m/item/how-to-handwash) — hand-area coverage and timing for the entire healthcare procedure.
- [NIH / NIGMS: What Is the Microbiome?](https://nigms.nih.gov/biobeat/2024/03/what-is-the-microbiome) — harmless and beneficial microbes.
- [ACS: Celebrating Chemistry, Water](https://www.acs.org/content/dam/acsorg/education/outreach/celebrating-chemistry/2014-cced-celebrating-chemistry-english.pdf) — surfactant water/oil interactions.

## Ownership and integration

`model.ts` owns screen-lesson transitions; `main.ts` connects the translated content and diagrams; `style.css` owns the responsive reading design and decorative motion. Cover prompt, source and image review are in `COVER.md`. `catalog-entry.json` and `catalog-en.json` are prepared for the integrating task; this contribution does not edit the shared registry.

Focused validation passed on 2026-09-12: 3 state tests; strict TypeScript compilation from `main.ts`; 89 topic source messages checked against English with no missing or unwrapped messages and matching interpolation; cover dimensions confirmed as 1200 × 800. Full build, final registry checks and live bilingual browser validation belong to the integrating task. No commit, push or deployment is included.
