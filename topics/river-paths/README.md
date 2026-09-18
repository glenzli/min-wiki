# 小河为什么弯弯曲曲？ / Why do rivers bend?

独立双语专题，模型、SVG场景、控件和 `learning.json` 均由本目录维护。公共平台只负责导航、语言和阅读方式。

22个水流标记与16颗泥沙各自保留身份。泥沙从外岸进入水流，再停在内侧；石头条件改变预设河道。

近看河湾的窗口不重置进度。河道不是流体求解器，不预测实际侵蚀速率或泥沙总量。

提供播放/暂停、进度回拖、阶段按钮和局部视角。没有自动播放；隐藏页面或离开页面暂停。减少动态效果时直接显示目标帧。条件或阅读方式切换不清空进度。

22 water markers and 16 sediment grains retain their identities. Grains move from the outer bank into the flow and settle along the inside; rock conditions select preset channels.

The bend window preserves progress. This is not a fluid solver or a prediction of erosion rates or a complete sediment budget.

Playback is finite and user-started. Pause, scrub, stage controls and a local view retain the same process. Hidden pages pause; reduced motion goes directly to the requested frame. Explanations, three academic notes and four narration segments are bilingual.

资料复核 / Source checked 2026-09-19: https://www.usgs.gov/educational-resources/find-feature-meander

专题测试覆盖身份保持、路径连续、末帧稳定与SVG投影。运行 `node --import tsx --test topics/river-paths/tests/*`。整站构建、窄屏中英文浏览器检查与发布由整合任务负责。
