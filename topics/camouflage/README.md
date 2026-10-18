# 谁藏在树叶和树枝里？

原创示意插画用于比较背景匹配和形态拟态，不用于物种识别。竹节虫与叶䗛的形态特点参考澳大利亚博物馆资料；蛾为泛化的褐色斑纹示例。这里不暗示动物能按意愿马上改变形状，伪装也不是绝对隐形。不同观察者、光线、运动和背景都会影响发现概率。

- [Australian Museum · What do stick insects look like?](https://australian.museum/learn/species-identification/ask-an-expert/what-do-stick-insects-look-like/)
- [Australian Museum · Insects](https://australian.museum/learn/animals/insects/)

Original SVG illustrations; no external media or runtime dependencies. Controls use native buttons and ranges. No background animation or audio.

## Continuous observation refinement · 2026-09-19

The existing static background-match comparison is retained deliberately: inventing a wiggle or colour-changing loop would alter the variables being compared. Added continuous background blending and three bounded camera close-ups. Hotspots are projected through the current SVG screen transform, including responsive resizing; hidden off-view targets are removed from focus. Animal geometry and color remain fixed during background comparison.

Camera and backdrop transitions are finite and respect reduced motion. Page exit cancels transitions and disconnects the resize observer. Existing insect geometry, identification boundaries and bilingual narration are preserved. Root task owns desktop/mobile browser acceptance.

Selected source explanations were rechecked; the linked institutional material and primary research support the mechanism, not the drawn timing, dimensions or trajectories. No external figures were copied.

## Presentation layout

The topic selects its existing scene and controls for the shared viewport-fitted presentation frame. At desktop widths the scene and primary playback stay together, with independently scrollable explanation/settings; immersion can hide and reopen that panel without remounting the experiment. Narrow screens retain normal document flow. Scientific state and geometry remain topic-owned.

Reader 中的透明图内点击区显式标记 `data-scene-hit-target`，保留透明背景与可见键盘焦点，避免通用按钮明暗配色盖住动物。按钮位置和尺寸仍从当前 SVG 投影计算，发现标记与背景对照保持不变。

## Local refinement · 2026-10-19

原创矢量插画增加叶脉、体节、翅脉、细腿与柔和的明暗。昆虫仍是泛化的教学插画，不用于物种识别。换背景只改变原有 `forest` 组的透明度；三只昆虫的节点、位置与绘图保持不变。背景对比、查找和复位留在主画面旁，视角选择与说明按需展开。

The original vector drawings add veins, segments, slender legs and restrained material shading. They remain generalized teaching illustrations, not species-identification plates. Changing the background changes only the original forest group's opacity; the three insects retain identical nodes, positions and artwork. Comparison and finding actions stay beside the scene.
### 枝叶材质续修 · 2026-10-19

背景叶片采用四种较自然的确定轮廓，加入局部弯曲叶脉、明暗与沿原枝条走向的树皮线条。细节只属于原来的 `forest` 组，三只昆虫的节点、位置、绘图、点击中心和相机目标不变；素色对照仍只改变背景。

Four authored foliage profiles and restrained surface shading reduce repeated-template shapes. They are original generic botanical illustrations, not species identification. Background transitions retain the same insects and world-coordinate observation anchors.
