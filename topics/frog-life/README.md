# 变态发育：动物怎样长大

主线不是把两页并列：先问「长大只是变大吗」，保留同一个蛙的连续形变和同一只蝴蝶各阶段观察，然后从身体、食物、呼吸与环境、运动四个角度比较。每个阶段的解释在画面下方直接可读；尾组织回收、蛹期储备与重塑有独立机制链。蝗虫仅提供卵—若虫—成虫的无蛹路线图，不冒充第三个精细生长模拟。

## 路由与控制

- `/topics/frog-life/?chapter=frog|butterfly|compare`；默认蛙。`butterfly-life` 原 URL 精确跳入 `chapter=butterfly`。
- `metamorphosisModel.ts` 导出 `readMetamorphosisRoute(search)` 与 `metamorphosisDestination(chapter, search='', hash='', base='/')`。旧蝶入口保留有效 `stage`（0–3）、`wing`（0–1）、`peek=1`、`view=whole|detail`、`aspect=structure|food|breathing|movement`，以及语言、部署 base 和 hash。蛙支持 `growth`（0–4）。比较入口可同时带两侧进度。
- `controller.ts` 是界面实际使用的唯一时间与状态控制器。两物种进度、视角和蛹透视各自保留。切章暂停；比较预设明确改变两侧观察点、不是等龄配对。镜头或阅读角度不重置状态。
- 蛙完整播放的界面时长为 26 秒，蝴蝶完整成长为 32 秒；独立蝶翼展开与准备为 12 秒，都不是生物学用时。比较中可以分别播放两侧；一个时钟仅驱动当前选中的物种，另一侧保留。无自动播放或永久循环。隐藏页面暂停；再次显示不自动追赶；减弱动态使用离散观察；pagehide 非缓存离开会注销订阅、取消帧和清理 SVG。
- `specimen.ts` 各创建一幅保留的 SVG，并给所有 id 与引用加物种命名空间。比较重用同一对象而非复制页面、iframe 或重复 SVG id。`scene.ts` / `model.ts` 保留原蛙形态；蝶的 SVG、翼模型与渲染仍归 `butterfly-life` 所有。

## 科学边界与资料

蛙模型代表有自由游泳蝌蚪期的一类常见路线；部分蛙直接发育。四肢与尾吸收重叠，肺功能可在变态完成前出现，不能用腿长推出精确呼吸比例。最后显示的是尚未性成熟的蛙苗，不是可以繁殖的成蛙。蝴蝶蛹内部是解释图，不是缩小成蝶躲在壳里，也不是全身变成无结构液体；羽化后翼展开仍需硬化。不以昆虫完全／不完全变态给蛙分类。模型不对应特定物种的大小、天数、解剖测量或水动力／飞行模拟。

- [NHM · Frogspawn, tadpoles and froglets](https://www.nhm.ac.uk/discover/frogspawn-tadpoles-and-froglets.html)：蛙幼体、腿尾变化、蛙苗继续成熟。
- [Australian Museum · Frog life cycle](https://australian.museum/learn/teachers/learning/frog-life-cycle/)：蛙的代表性生活史。
- [Burggren & West · 呼吸器官贡献变化的实验](https://pubmed.ncbi.nlm.nih.gov/6803316/)：鳃、肺、皮肤贡献并非简单开关。
- [ABRS · Amphibian morphology and physiology](https://www.dcceew.gov.au/sites/default/files/env/pages/dc11235d-8b3b-43f7-b991-8429f477a1d4/files/04-fauna-2a-amphibia-morphology.pdf)：卵、皮肤与呼吸生理。
- [Florida Museum · Butterfly FAQ](https://www.floridamuseum.ufl.edu/discover-butterflies/faq/)：蝴蝶阶段与取食；本页不采用「全部融成汤」的简化说法。
- [AMNH · Metamorphosis in arthropods](https://www.amnh.org/learn-teach/curriculum-collections/biodiversity-counts/arthropod-identification/arthropod-morphology/metamorphosis-in-arthropods)、[NSW Education · Grasshopper](https://fieldofmar-e.schools.nsw.gov.au/fact-sheets/invertebrates/grasshopper-fact-sheet)：两类昆虫路线与若虫无蛹阶段。
- [Oregon State · Internal anatomy](https://open.oregonstate.education/entomology-lab-manual/chapter/lab-2-assignment-internal-anatomy/)：气门、气管及口器差异。原尾吸收论文、蝶翼来源继续列于 `learning.json`。

## 验证

`node --import tsx --test topics/frog-life/tests/*.test.* topics/butterfly-life/model.test.ts` 覆盖实际控制器的独立保态、有限终态、阅读不重置、旧帧取消、暂停恢复、减弱动态与 dispose，以及原蛙形态连续性、翼展开和旧入口路由。浏览器需另查 390px 中英文、四镜头文字、两侧独立拖动、蛹透视与翼展开、页面隐藏暂停和实际导航；通过模型测试不等于已完成视觉验收。

## English boundary summary

One learning journey compares independently retained frog and butterfly observations through four lenses. Original SVG geometry and continuous frog/wing models are preserved. The grasshopper is an explicitly schematic no-pupa comparison, not a third timed animation. The final frog is an immature froglet; insect complete/incomplete metamorphosis categories do not classify frogs. Stage sizes and durations are not equal or quantitative. Pupa interiors are explanatory, not anatomical reconstructions. User-started finite playback, paused chapter switching, reversible review, reduced-motion observations and cancellation are controlled by the same tested production controller. No autoplay, audio, external runtime dependency, commit or deployment is introduced by this integration.

## 成长动画细化（2026-09-21）

蛙的鳍与尾肌共享尾根和连续波形，后肢划动与尾吸收重叠；眼睛不再被皮肤细节透明度覆盖。身体细粒纹理与动态轮廓使用同一裁剪边界。所有动作由成长进度确定，暂停不再运动，回退返回完全相同的画面。

蝴蝶新增独立的 0–4 成长滑条：卵裂开、幼虫显露与生长、转为悬挂、化蛹、羽化、展翅和准备。细节镜头连续插值，展开翅膀时不再同时搬动身体。部分交接仍是插画透明度与几何过渡，不声称逐组织重建，也省略了多次蜕皮的逐次过程。旧 stage/wing URL 参数保持兼容；完整成长的小数中间态目前仅在页面控制器中保留，不新增分享参数。

- [Florida Museum · Butterfly life cycle](https://www.floridamuseum.ufl.edu/educators/resource/butterfly-life-cycle/)：幼虫蜕皮、体液帮助翅膀展开。
- [Florida Museum · Monarch metamorphosis video](https://www.floridamuseum.ufl.edu/exhibits/blog/monarch-metamorphosis-video/)：羽化、展开、硬化的先后。本图不是帝王蝶物种复原。
- [St Andrews · From tadpole to frog](https://tadpoles.wp.st-andrews.ac.uk/from-tadpole-to-frog/)：摆尾与后肢划动的运动方式。波形与频率仅作观察示意。
