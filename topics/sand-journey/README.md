# 沙滩上的沙子从哪里来？ / Where does beach sand come from?

独立双语专题，模型、SVG场景、控件和 `learning.json` 均由本目录维护。公共平台只负责导航、语言和阅读方式。

16颗碎粒持续运动，金圈跟随其中一粒。岩石来源沿河旅行，贝壳来源在近岸移动；沉积后的颗粒留在沙滩。

跟随窗口与颗粒位置同步，大小和棱角连续变化。图示不计算质量损失，也不表示所有沙粒必然沿同一路线变圆。

提供播放/暂停、进度回拖、阶段按钮和局部视角。没有自动播放；隐藏页面或离开页面暂停。减少动态效果时直接显示目标帧。条件或阅读方式切换不清空进度。

16 fragments persist and a gold ring follows one. The rock source travels along a river; the shell source moves near shore. Deposited grains remain on the beach.

The following view tracks the grain as size and edges change. The illustration does not calculate mass loss or prescribe one rounding history for all sand.

Playback is finite and user-started. Pause, scrub, stage controls and a local view retain the same process. Hidden pages pause; reduced motion goes directly to the requested frame. Explanations, three academic notes and four narration segments are bilingual.

资料复核 / Source checked 2026-09-19: https://oceanservice.noaa.gov/facts/sand.html

专题测试覆盖身份保持、路径连续、末帧稳定与SVG投影。运行 `node --import tsx --test topics/sand-journey/tests/*`。整站构建、窄屏中英文浏览器检查与发布由整合任务负责。
