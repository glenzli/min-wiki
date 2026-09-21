# 细菌是什么？都会让人生病吗？ / What are bacteria?

2026-09-20：独立 UI 已收归 [微生物统一工作区](../microbes-everywhere/README.md)。本目录 `main.ts` / `index.html` 只保留兼容跳转，进入 `?chapter=bacteria` 并保留有效参数、语言、base 和 hash；旧页面 CSS 已移除。`model.ts`、`scene.ts`、`habitats.ts` 及封面仍保留，前述科学模型和插画由新工作区直接消费。局部 catalog 片段已标记 `parentTopic`；根 `content/catalog.json` 才是正式登记。

The standalone UI is integrated into the microbial workspace. Compatibility entries redirect to its bacteria chapter; models, detailed renderers, community illustrations and covers remain. The descriptions below document the retained science, not an independently mounted old controller.

面向幼儿的双语专题。整颗杆状细菌始终保留为观察参照，金色标记与四处局部放大相对应：肽聚糖细胞壁、细胞膜、拟核与 DNA、核糖体。膜的局部图可播放、暂停、继续一次特定物质交换。另一条有限过程展示生长、DNA 复制与分配、中间分隔以及两个子细胞，可播放、暂停或用进度条停在任意位置。酸奶、土壤、肠道的生活场景平滑交替，各自代表不同细菌群体。

This bilingual topic keeps the whole rod-shaped cell visible as a reference for four details: a peptidoglycan wall, membrane, nucleoid and DNA, and ribosomes. One illustrative membrane exchange can be played, paused and resumed. A separate finite sequence shows growth, DNA copying and partitioning, constriction and two daughter cells. It supports playback, pause and a keyboard-accessible progress slider. Yogurt, soil and gut illustrations crossfade as distinct communities.

## 科学边界 / Scientific scope

- 主图选择一类较厚细胞壁的细菌；另一些有外膜，少数缺壁。颜色、网格、结构数量和厚度不是真实测量。细菌没有核膜包围的细胞核，也没有线粒体；不把鞭毛或单一外壳当作所有细菌共有。
- 壁提供支撑，膜是选择性边界。物质交换只示意两条选定路线，不能推断所有营养物都穿过同一种通道或都不需要能量。核糖体用信使 RNA 合成蛋白质，没有把它画成膜包住的小细胞。
- 二分裂突出 DNA 先复制再分配，不把一份遗传信息剪成两半。演示一次后停止，阶段按观察需要展开；真实过程可以重叠，速度依种类和条件变化，资源限制增长。
- 保留菌株、环境与宿主条件的限定；外形不决定作用或致病性。这不是菌种识别、培养、食用或食品安全判断工具。

The main cell is one thick-walled example, not a universal bacterial envelope. Some bacteria have an outer membrane; a few lack a wall. Membrane routes are selected examples with no general claim about transport energy. DNA, ribosomes and envelope layers are enlarged and simplified. Binary fission shows copying before separation, runs once, and is not timed as real growth. Real processes can overlap and growth is resource-limited. Shape does not establish biological function or disease risk.

## 文件与验证 / Ownership and checks

`model.ts` owns bounded presentation phases, transport positions and interrupted selection interpolation. `scene.ts` renders lightweight SVG anatomy, details and division; `habitats.ts` owns the three everyday illustrations. The integrated `microbes-everywhere/workspace.ts` owns controls and cleanup; its renderer preserves finite structure transitions. Hiding or leaving pauses; no process timer runs while idle.

`learning.json` supplies paired academic notes, misconceptions and four child-friendly narration segments with separate visual cues. All visible UI copy is covered by `locales/en.json`. Original covers remain untouched.

Focused model tests cover DNA-before-separation ordering, continuous and monotonic phases, opposite membrane crossing directions, fixed endpoints and interruption-safe selection. Parent integration performs final browser/build checks. Sources: OpenStax Biology 4.2 and Microbiology 3.3/9.1, with the topic’s existing microbiology, fermentation and ecosystem references retained.
