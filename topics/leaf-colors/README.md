# 叶子的颜色 / The colors of leaves

独立互动专题 `/topics/leaf-colors/`，支持 `?lang=zh` 与 `?lang=en`。点击“一键走进叶子”或叶片上的圆圈，26 秒连续旅程会依次停留并深入组织和细胞，再按变色类型进入叶绿体（黄叶）或液泡（红叶）；可暂停、继续或直接选择尺度。季节滑块、三个季节停靠点及 18 秒播放共享同一色素状态，切换观察尺度保留季节。两种教学路径分别呈现黄色显现与花青素积累。

叶绿素和类胡萝卜素画在叶绿体的类囊体膜中；花青素画在液泡中，不会将叶绿体染红。固定色素点随状态减弱，保留黄色点，避免把叶绿素画成另一种色素。放大通过比例变化和剖面过渡呈现，不是显微镜实拍。旅程由点击开始，无配乐。可关闭场景微动；页面隐藏或画布离开视野时停止微动，页面隐藏时暂停旅程与季节推进，离开时取消动画并释放观察器。支持减少动态效果偏好。

`model.ts` 拥有定性的色素趋势、区室色素投影与两条观察路线，`scene.ts` 拥有自然叶片纹理、Canvas 组织切面与放大过渡，`microScene.ts` 拥有细胞、叶绿体和液泡的立体剖面及其显存释放（WebGL 不可用时回退到 Canvas 示意），`content.ts` 拥有儿童/学术讲解，`main.ts` 组合交互。趋势不是实测浓度，叶色不是光谱积分，组织形状与尺度范围为教学近似。两种路径不代表某一物种，也不包含最终枯褐和落叶动力学。

An independent bilingual topic, with synchronized leaf, tissue, cell and chloroplast views. The 18-second seasonal playback, slider and presets all control one qualitative pigment state. Zooming preserves the season. The yellow pathway reveals retained carotenoids; the red pathway adds anthocyanins in vacuoles. Chloroplasts never acquire the red vacuolar pigment. Shapes, pigment dots, colors and timing are illustrative, not measured anatomy, concentrations or species predictions. A click starts a 26-second guided journey through the leaf, tissue and cell, then branches to a chloroplast for yellow leaves or a vacuole for red leaves. Changing the leaf capability updates the last scale, camera target and explanations together, with pause/resume and manual scale selection. Gentle motion can be disabled; off-screen or hidden canvases stop animating. Hidden pages pause the journey and seasonal timeline. Page departure releases animation resources.

Sources:
- [Harvard Forest: leaf color change](https://harvardforest.fas.harvard.edu/education-opportunities/classic-outreach-resources/autumn-foliage-color/leaf-science/leaf-process/)
- [UC Berkeley: leaf color and cell anatomy](https://news.berkeley.edu/2021/12/03/berkeley-talks-transcript-why-do-leaves-change-color-in-the-fall/)
- [University of Wisconsin: autumn leaf color](https://hort.extension.wisc.edu/articles/leaf-color-change-autumn/)

- [Photosynthetic physiology of blue, green and red light](https://www.frontiersin.org/journals/plant-science/articles/10.3389/fpls.2021.619987/full)
- [Chlorophyll-protein complexes in thylakoids](https://pubmed.ncbi.nlm.nih.gov/6750355/)

Validation: `npm run check` and production-browser checks of zoom, both pathways, playback, language, theme, navigation and narrow layout. Tests establish the implementation's qualitative contracts, not biological calibration.

The natural leaf texture and cover-v2.jpg are AI-generated illustrations, not species-identified photography. The interactive leaf tint preserves surface detail while following the topic pigment state. Microscopic structures remain drawn and labeled; pigment locations are unchanged. Motion and light/energy markers are qualitative teaching cues, not measured transport velocities or molecular footage.

## 2026-09-12 色素区室与摄影构图 / Compartments and composition

红叶的第四站是液泡，明确区分“细胞质侧合成、转运进入、液泡中积累”；黄色与绿色依旧留在液泡外的叶绿体中。组织切面也只在各细胞的液泡区着红色。叶片视图采用稍偏离中心的斜向姿态、柔和林间逆光与前后景分离；季节颜色保留固定的局部差异。这仍是说明色素位置的教学图，不能用颜色反推 pH 或含量。

The red route ends at a vacuole, separating synthesis on the cytoplasmic side, transport and vacuolar accumulation. Chlorophyll and carotenoids remain in plastids outside it. The tissue cutaway likewise confines red to vacuolar regions. The whole-leaf view uses a diagonal composition, restrained contrast, soft woodland backlighting and fixed local differences during seasonal tinting. This remains a teaching illustration, not a pH or concentration measurement.

Additional primary sources:
- [Merzlyak et al. (2008): Light absorption by anthocyanins in juvenile, stressed, and senescing leaves](https://doi.org/10.1093/jxb/ern230) — microscopy and vacuolar absorption in leaf sections.
- [Sun et al. (2012): Arabidopsis TT19 functions as a carrier to transport anthocyanin from the cytosol to tonoplasts](https://pubmed.ncbi.nlm.nih.gov/22201047/) — synthesis/transport/storage are separate processes; the scene does not claim one universal transport mechanism.
- [Mattila et al. (2018): Degradation of chlorophyll and synthesis of flavonols during autumn senescence](https://doi.org/10.1093/aobpla/ply028) — individual leaves and cells do not senesce as a perfectly uniform surface.

`assets/woodland-light.png` was generated with the built-in imagegen tool (not the CLI) on 2026-09-12; it is an illustrative background, not an observed site. Existing `assets/leaf-natural.png` is preserved. Two attempted leaf cutouts lacked usable transparency and were not adopted.

Final background prompt:
> Use case: photorealistic-natural. Asset type: quiet background plate behind a sharply focused leaf in a science exhibit. Create a wide horizontal 3:2 photograph of distant deciduous woodland seen through a 100mm macro lens at f/3.5. The entire background is naturally out of focus, beautiful organic overlapping areas of pale olive, muted sage, warm creamy sunlight. Very soft suggestion of slender vertical branches on the far right and background foliage near lower corners. Bright airy soft spring morning side light upper left. Keep the central two thirds open and quiet medium-light sage with no foreground subject: a separate green leaf will be composited there by the webpage. Restrained contrast and saturation, subtle photographic grain, irregular bokeh with mostly blurred continuous foliage rather than uniform repeated circles. No identifiable sharp leaves, no subject, no text, no border, no dark vignette, no artificial pattern.

Focused validation: six pigment/route tests; strict TypeScript compilation from this topic's entry; shared translation extraction (16 registered namespaces at validation time). Final production build and browser checks belong to the integrating task.
