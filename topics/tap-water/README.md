# 自来水里有什么？ / What is in tap water?

独立双语亲子百科 `/topics/tap-water/`，支持 `?lang=zh` 与 `?lang=en`。入口沿用公共主题、语言与百科导航；目录登记片段为 `catalog-entry.json`，共享目录英文为 `catalog-en.json`，由整合任务合入全局目录。

## 读者可以做什么

- 选择水、溶解矿物质、消毒保护、可能的风险，突出显示对应示意符号并阅读解释。
- 切换正常供水、微生物警示、化学污染警示。切换情境保留进度，并将警示情境的风险符号突出显示。
- 比较煮沸前与按适用指引煮沸后的变化：病原体由棕色变为灰色划线（灭活而非捞走），矿物质仍保留；化学污染符号及警示在煮沸后仍保留。
- 展开家长说明，了解配送消毒、地区差异、CDC 的应急煮沸指引、化学污染限制和保存防再污染。

所有按钮可键盘或触摸操作，状态用文字完整说明，不依靠颜色单独传达。没有实际煮沸计时器、自动播放、音频或真实水质输入。有限的概念动画由读者播放，可暂停与回拖；隐藏页面暂停。`pagehide` 释放专题事件监听，往返缓存 `pageshow` 恢复。

## 科学与使用边界

本页不判定任何实际水源是否可以饮用，不提供水质检测、安全百分比、微生物存活率、去除率或儿童加药消毒实验。符号大小与数量不成比例。正常情境未画病原体不等于绝对无菌，消毒也不等于实验室灭菌。含氯消毒剂仅示意适用系统的受控余量，加热后的残留未模拟，绿色虚线轮廓表示加热后的残留未建模，不表示除氯完成。

烧开能灭活致病微生物，但不能去除铅等重金属、盐类或多数化学污染物。正常供水是否可直接饮用，需当地标准、供水情况和卫生部门建议；存在化学污染或勿饮用／勿使用通知时，使用安全替代水源并遵循通知。明确提示烧水和倒热水请成人，放凉后饮用，用清洁消毒的有盖容器保存。

CDC 应急煮沸指引在家长折叠区标明：清水持续滚沸 1 分钟；海拔超过 6,500 英尺（约 1,981 米）时 3 分钟。不同机构/地区的具体指引可能不同，因此不混用 EPA 的高海拔数字，实际使用以适用当地通知为准。

## Sources checked 2026-09-12

- [CDC: How Water Treatment Works](https://www.cdc.gov/drinking-water/about/how-water-treatment-works.html): treatment and distribution protection.
- [CDC: Chlorine and Chloramine](https://www.cdc.gov/drinking-water/about/about-water-disinfection-with-chlorine-and-chloramine.html): controlled disinfectant residuals.
- [CDC: How to Make Water Safe in an Emergency](https://www.cdc.gov/water-emergency/about/index.html): pathogen inactivation, rolling-boil durations with elevation qualifier, cooling and clean covered storage.
- [CDC: Drinking Water Advisories](https://www.cdc.gov/water-emergency/about/drinking-water-advisories-an-overview.html): boil-water versus do-not-drink/do-not-use advisories.
- [EPA: Emergency Disinfection of Drinking Water](https://www.epa.gov/ground-water-and-drinking-water/emergency-disinfection-drinking-water): boiling does not remove heavy metals, salts and most other chemicals.
- [USGS: Hardness of Water](https://www.usgs.gov/water-science-school/science/hardness-water): dissolved calcium and magnesium, mineral dissolution, calcium-carbonate scale during heating.

The bilingual interactive page compares water ingredients and boiling in three qualitative supply situations. It never certifies a sample as safe. The visual grammar uses highlighted symbols and inactivation marks with matching text, not measured counts or a survival curve. Adults handle all hot-water tasks. Scientific qualifications and local-advisory precedence are present in both languages.

## Visual ownership

`style.css` draws the glass, refraction, natural tabletop and magnification connection using CSS. `main.ts` draws persistent illustrative component symbols in a finite, scrubbable SVG process and updates accessible descriptions. The photographic-style kitchen cover is AI-generated editorial illustration, with full prompt and original output provenance in [COVER.md](./COVER.md). It is a separate built-in imagegen generation saved as `cover-v2.jpg` at 1200 × 800. The image is not evidence of water quality.

## Focused validation

- `node --import tsx --test topics/tap-water/tests/model.test.js`: 6 tests passed for persistent chemical warning, microbial inactivation, retained minerals, and no drinking-safety certification.
- Strict TypeScript check starting at `topics/tap-water/main.ts`: passed with the repository's ES2022, Bundler, strict and JSON settings.
- Topic-local HTML/TypeScript translation extraction: Chinese messages checked, no missing or unwrapped messages, all English values nonempty and without untranslated Chinese.
- Generated cover inspected visually; natural material detail and 3:2 composition verified.
- Final repository tests, production build, shared navigation and 390px browser verification belong to the integrating task. No commit, push or deployment performed.

## 2026-09-19 refinement

Water, mineral and risk symbols now keep their positions along bounded paths during a user-started comparison. Inactivation markings appear continuously; chemical warning symbols persist. Progress is not temperature, duration or a microbial survival fraction. Scenario switching preserves progress and visible endpoint results remain stable. The same three academic sections and four narration segments now include matching pause/scrub cues.

Rechecked CDC emergency-water guidance and [lead in drinking water](https://www.cdc.gov/lead-prevention/prevention/drinking-water.html). All hot-water handling remains an adult task; no child experiment or new treatment instructions were added.
