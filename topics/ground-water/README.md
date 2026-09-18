# 雨水落到地上以后呢？ / Where does rain go after reaching the ground?

独立双语专题，模型、SVG场景、控件和 `learning.json` 均由本目录维护。公共平台只负责导航、语言和阅读方式。

100份同一批雨水从空中到达地面，沿连通孔道下渗，沿坡流入杯中，或暂留地表。任意帧均核对空中、渗入、流走、暂留之和；杯中水位只计算已抵达的径流。

孔隙窗口保持进度。分配比例、孔隙形状和时间都是教学设定；不模拟深部含水层补给，也不表示土壤能够确保净化饮用水。

提供播放/暂停、进度回拖、阶段按钮和局部视角。没有自动播放；隐藏页面或离开页面暂停。减少动态效果时直接显示目标帧。条件或阅读方式切换不清空进度。

100 persistent parcels travel from the air into connected pores, across the surface into a cup, or into temporary surface storage. Airborne plus three destination categories always total 100; cup level counts arrived runoff only.

The pore window preserves progress. Fractions, pores and timing are illustrative; the model does not calculate aquifer recharge or certify purification by soil.

Playback is finite and user-started. Pause, scrub, stage controls and a local view retain the same process. Hidden pages pause; reduced motion goes directly to the requested frame. Explanations, three academic notes and four narration segments are bilingual.

资料复核 / Source checked 2026-09-19: https://www.usgs.gov/water-science-school/science/infiltration-and-water-cycle

专题测试覆盖身份保持、路径连续、末帧稳定与SVG投影。运行 `node --import tsx --test topics/ground-water/tests/*`。整站构建、窄屏中英文浏览器检查与发布由整合任务负责。
