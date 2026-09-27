# 一片叶子的一生 / The life of a leaf

## Main-scene pass · 2026-09-28

The fitted desktop stage now reserves proportional space for corner labels, leaving more of its height for the same blade and its nested cell. A continuous extra zoom into tissue and cell views keeps the fixed sample point, hotspot and pigment compartments aligned. At 390 px the scene precedes the scale slider so the leaf appears earlier. During senescence, a few amber chevrons along the same midrib indicate partial nutrient remobilisation towards the petiole; they fade as the connection separates. Their speed and count are explanatory symbols, not tracked molecules or measured transport rates. The branch scar and earlier lifecycle conditions remain unchanged. Desktop leaf, cell and chloroplast endpoints and the mobile starting view were checked in the browser; other lifecycle and colour branches still need a full visual pass.

## Cell illustration refinement · 2026-09-21

The cutaway uses a restrained botanical palette: thin wall/envelope lines, a pale liquid compartment distinct from the cytoplasm, and a softly outlined nucleus with clipped chromatin. Peripheral chloroplast sizes and orientations vary deterministically along the existing cell contour; the selected chloroplast retains its camera anchor. Miniature and enlarged chloroplasts share the same flat membrane-stack drawing, with static miniature detail cached by pigment/season state. No new 3D layer, biological process or camera stop is introduced. Vacuole fill, tint particles and membrane still consume the same cached path.

## Unified microscopy · 2026-09-21

The current entry uses one restrained Canvas cutaway style, with an orthographic pseudo-3D turn only for inspecting leaf thickness. It no longer instantiates `LeafMicroScene`; that inherited renderer file is retained but is not consumed by this entry. `scene.ts` owns the tissue and its permanently nested mesophyll cell, vacuole and selected chloroplast. These share state, lifecycle and clipping, so no separate renderer/module was introduced.

The scale stops are leaf → upper epidermis (0.5) → tissue → cell → pigment compartment. The camera reaches the irregular surface sample at 0.44 and remains still until 0.60; guided playback pauses at 0.5 until the reader continues. Only then does the same sheet turn to expose the tissue. Thickness remains exaggerated, not measured. Manual navigation and reduced-motion stepping include the epidermis stop.

The selected mesophyll cell is rendered once inside the tissue; subsequent views magnify it rather than reveal a replacement image through an oval mask. The red route stays in that same cell. `VACUOLE`/`vacuolePoint` in `model.ts` supply the cached path used for liquid fill, membrane stroke and pigment clipping. A distributed increase in solution tint and small stable solute symbols replaces the expanding red underlay. The yellow route similarly magnifies the same anchored chloroplast while surrounding context fades. Pigment curves and lifecycle/water models are unchanged. Earlier implementation and validation sections below are historical.

## Blade illustration refinement · 2026-09-20

The live Canvas blade uses a tapered, gently asymmetric outline with small serrations, curved secondary veins connected by fine cross-veins, subtle surface grain and restrained backlighting. Repeated vein ridges and the abrupt central shading band were removed after visual feedback: they resembled quilted fabric. The tapered midrib joins the petiole at the existing branch attachment. Geometry is cached once; seasonal pigment variation recolors the same details without generating frame-to-frame noise. This is a general teaching illustration, not a species identification or calibrated venation map; the older raster assets are not used for the interactive blade.

The first transition now approaches a fixed sample beside the midrib, then uses one orthographic pitch/yaw projection for the blade surface, sample top, depth face and tissue front. Their shared upper edge stays coincident throughout the turn; the sample does not become a front-facing image pasted into a hole. The surrounding leaf fades in place while the sampled portion of its original surface remains. Surface-cell detail appears only locally, without a tiled net across the blade. At the tissue stop the view faces the section directly, then continues into the same nested cell and pigment compartment. `leafSectionAt` in `model.ts` owns the reversible projection/fade state; `SCALE_ENTRIES[0]` moves the shared sample, camera and hotspot together to the side of the midrib. The lifecycle transform and deeper local compartment coordinates are preserved. This is an explanatory section with exaggerated thickness, identified in Chinese and English, not a physical cutting/peeling simulation or a measured leaf volume.

## Integrated lifecycle · 2026-09-20

`/topics/leaf-colors/` now owns the leaf's life, microscopic observation and root-to-leaf water journey. The existing detailed blade, fixed tissue patch and WebGL pigment compartments are preserved. One branch stays fixed while the same blade unfolds, senesces and detaches; its scar remains on the branch. Yellow and red remain alternative pigment capabilities, not a compulsory sequence. The initial mature state is an inspection starting point; the age control revisits bud, maturity, senescence and detachment.

`lifecycle.ts` owns bounded leaf age, growth, senescence, nutrient-recovery/separation ordering, the transform shared by the blade and its microscopic anchors, and route validation. `main.ts` owns independent leaf-age, water-progress and observation-scale controls. Changing a lens pauses its operation and retains progress. A single finite controller clock advances requested processes; lifecycle playback lasts 36 illustrative seconds, not real biological time. Scene micro-motion can be disabled, as can diagram labels. Reduced-motion preference advances finite inspection stops instead of continuous life/water playback.

`?view=life|inside|water&age=0.34` is the public entry; invalid views fall back to life. `topics/plant-water/main.ts` now redirects into the water lens, preserving language, deployment prefix and hash. Its `model.ts` and newly extracted `scene.ts` retain the root/xylem/leaf pathway. The water diagram is a separately magnified structural map, not a measured map of the branch. It and the main leaf use one tracked cohort and water progress. The mature transport example is inactive before expansion or as its connection closes; it cannot keep receiving root water after detachment. The selected leaf's age is not reset by the water controls.

Microscopy covers expanded tissue before detachment; it does not invent the anatomy of an opening bud or cellular collapse after death. Bud expansion, senescence, browning and falling are explanatory geometry, not a species-specific calendar, cell-division model, wind solver or spectral measurement. Leaf litter decomposition and evergreen cohorts are not simulated in this first version. Returning the slider to a bud revisits a teaching state; next year's leaf is a new biological object.

Sources for the added connections: [USGS — evapotranspiration](https://www.usgs.gov/water-science-school/science/evapotranspiration-and-water-cycle), [University of Wisconsin — nutrient recovery and pigment changes](https://hort.extension.wisc.edu/articles/leaf-color-change-autumn/), [Schaberg et al. — sugar-maple colour, retention and abscission](https://research.fs.usda.gov/treesearch/15618). The last study is a species-specific example, not the calibration of this model.

Focused model/route checks are in `tests/lifecycle.test.ts` and the retained pigment tests. Production build, bilingual desktop/mobile interaction and final visual acceptance are performed by the integrating task; older validation statements below describe their original dated implementation, not fresh proof of this integration. No commit, push or deployment is included.

## Earlier colour-observation implementation

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

## Presentation layout

The topic selects its existing scene and controls for the shared viewport-fitted presentation frame. At desktop widths the scene and primary playback stay together, with independently scrollable explanation/settings; immersion can hide and reopen that panel without remounting the experiment. Narrow screens retain normal document flow. Scientific state and geometry remain topic-owned.
