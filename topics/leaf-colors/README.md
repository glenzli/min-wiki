# 一片叶子的一生 / The life of a leaf

## A connected cut edge, rather than a detached block · 2026-10-19

The active turn retains the rear surface of the same blade and removes only the foreground that conceals its transverse section. An open guide marks the cut while the surface is still whole. The tissue continues beyond both sides of the microscopic viewport, without a closed sample outline or lateral box edges. This is a local mesophyll example, not a complete leaf-width anatomy map. The 60 mm mature blade, 200 µm thickness, 30 µm epidermal pitch and orthographic projection remain the same teaching assumptions; no independent axis stretch or mid-turn zoom was introduced.

The rear plane stays clear at the cut edge. Its distant detail softens over a 150–600 µm viewing window, expressed in the same model units, before the macroscopic blade becomes edge-on. This is an illustrative attention cue, not a calibrated microscope depth-of-field calculation. Only opacity changes. The finite surface-to-section seek now takes 2.6 seconds; the camera still holds its magnification throughout .60–.84 and zooms uniformly afterwards. Manual movement retraces the same geometry.

The renderer culls bounded horizontal tissue bands with fixed, varied cell contours. Only band zero owns the retained mesophyll cell and its nested compartments. One upper-epidermis seam spans the complete visible cut, so internal band boundaries cannot add false cell walls; expanding the view preserves existing intersections and cell contours. At most 16 seam ranges and one viewport-sized rear-surface layer are retained, and disposal releases both.

表面先显示横切标线，随后只移去挡住视线的前方叶面，后方叶面仍与同一条切缘相连。组织向画面两侧延续，不再像单独取出的方块。转向末段仅柔化远离切缘的细节，不改变长度单位、厚度或倍率。叶肉采用更克制的植物色阶，空隙用暗部区分；表皮、细胞液与间隙的画面颜色不代表它们都含有绿色色素。叶绿体继续承载绿／黄色素，花青素仍仅在对应液泡中表现。配色是帮助辨认结构的科学插画，不是组织染色图、实拍颜色或色素浓度测量。

The anatomy and compartment distinction remain grounded in [OpenStax — Leaves](https://openstax.org/books/biology-2e/pages/30-4-leaves); the palette, attention window and procedural cell variation are illustration choices. The earlier active observation prompt that still called thickness exaggerated has been corrected in Chinese and English. The topic remains a draft. This section supersedes the isolated-sample presentation described in the historical records below. Local preview and local commit only; no push or deployment.

## One spatial scale from blade to tissue · 2026-10-19

The earlier turn joined a separately exaggerated section to the blade. Calling it exaggerated did not make that transition scientifically coherent. The active model now maps a 60 mm mature blade, 200 µm lamina thickness and 30 µm mean epidermal grid pitch through one `UNITS_PER_UM` conversion. These are rounded teaching assumptions, not measurements of a named tree or species. The nested mesophyll cell and its compartments inherit the same conversion; no independent thickness multiplier remains.

The camera first approaches the permanent sample and resolves the same periodic epidermal sheet across the visible surface. At slider positions .60–.84 only the orthographic viewing direction changes: magnification stays fixed and the same upper wall intersections meet the section. A further uniform zoom begins after the turn. The old lateral extrusion and adaptive mid-turn pullback were removed. A 1/2/5 model scale bar is computed from the actual rendered pixels per micrometre, including the later uniform framing adjustment. The title, scale readout and accessible slider value name the same turn. The minor blade-contour pass softens terminal teeth and the lower taper without changing length, tip, petiole or sample identity.

叶长、叶厚、表皮细胞网格与剖面共用一套长度单位。本例成熟叶长 60 mm、厚 200 µm，表皮网格平均间距 30 µm，均为教学设定，不是特定树种的实测值。先在同一叶面连续放大、看清表皮，再以固定倍率转向横切面；转向结束后才继续等比例放大。厚度不单独拉伸，也不在侧转中偷偷缩放镜头。标尺随实际绘制倍率更新；组织形状、色素符号和时间仍为简化示意。显微入口只对完全展开且尚未脱落的叶片开放。

[Buckley et al., Plant Physiology (2015), Table IV](https://pmc.ncbi.nlm.nih.gov/articles/PMC4528767/) documents substantial interspecific variation in epidermal and mesophyll dimensions; it supports treating those dimensions as explicit assumptions rather than assigning one drawing a species-wide measured thickness. [OpenStax — Leaves](https://openstax.org/books/biology-2e/pages/30-4-leaves) remains the qualitative anatomy reference. Neither source is the measured specimen behind this drawing. This supersedes the compressed-scale/exaggerated-thickness descriptions in the historical records below. The entry remains a draft; no push or deployment is included.

## Continuous surface approach and botanical artwork · 2026-10-19

`bladeArtwork.ts` owns the retained blade's authored ovate silhouette, vein hierarchy, material, petiole and bounded pose cache. It consumes the existing finite unfolding/curl pose; it has no clock. `epidermis.ts` owns one deterministic, shared-wall pavement-cell sheet across the blade, a single transparent texture cache, and intersections with the fixed sample edge. The whole visible surface reveals these walls progressively as the camera approaches. The surrounding blade is retained through the epidermis observation stop; only the subsequent explanatory side-turn isolates the sample. The upper row of the tissue section uses those same wall intersections. This replaces the earlier local texture patch, which looked like a separate image appearing on the leaf.

叶形、叶脉层级、叶面材质和叶柄共用已有的展开／卷曲姿态，不另设动画时钟。放大时，整片可见叶面逐渐显出同一张固定的表皮细胞网，叶脉继续作为位置参照；表皮停留阶段保留周围叶片，侧转时才隔离已标记的样本。组织剖面上缘的细胞边界来自同一张表皮网。后退沿原路径返回，不生成另一块细胞图。

The sheet is a general teaching illustration of upper epidermis, distinct from the mesophyll underneath. Wall shape and density are illustrative; scale differences are compressed, and section thickness is exaggerated. The surface texture is transparent over the blade material, not a map of pigment concentrations or proof that epidermal cells contain mesophyll organelles. The permanent mesophyll cell, vacuole and chloroplast destinations, pigment trends and water/lifecycle conditions are unchanged. This distinction follows [OpenStax — Leaves](https://openstax.org/books/biology-2e/pages/30-4-leaves), especially the epidermis and mesophyll sections.

这是一幅概括性的上表皮示意，不是某树种的实测细胞图。细胞边界与密度经过简化，尺度差异被压缩，剖面厚度已夸大；透过表皮纹理看到的叶色不能读成表皮中色素的实测浓度，也不表示表皮具有叶肉细胞的全部细胞器。下方固定的叶肉细胞、液泡／叶绿体去向、色素趋势与叶龄／水运输条件保持不变。

The scale slider now enters the inside lens explicitly, keeping its title and explanations aligned with the drawing. It is unavailable before expansion or after detachment, matching the existing inspection conditions. The first approach/side-turn seeks take longer to read; manual scrubbing remains immediate and reduced-motion navigation retains its existing stops. The topic remains a draft. Local preview and a commit do not authorize push or deployment. Earlier dated sections below describe their original implementations and acceptance only.

## Botanical motion and transport refinement · 2026-10-19

`leafMotion.ts` authors finite Reader Anime.js poses for asymmetric unfolding and a slight curl after detachment. The petiole seam is fixed; unfolding is complete before microscopy is available, so the original sample, section, cell and pigment-compartment anchors remain unchanged. Veins and surface grain deform with the blade. The lifecycle model retains the bounded drifting path and all water-availability conditions; curling and drift are illustrations, not calibrated tissue mechanics, drying rates or a wind solver.

叶片从不对称折叠的姿态展开，叶柄连接位置保持不变；显微观察开放前，形态已完全展开。侧脉、细脉与表面纹理跟随同一片叶，固定采样点、组织、细胞和色素区室的坐标不变。脱落后的轻微卷曲与漂移是形态示意，不计算真实组织力学、干燥速率或风场。

The tissue drawing now separates tightly arranged palisade cells from an irregular spongy layer and its visible intercellular spaces. Unconstrained air-space tracers were removed. Pigment curves, vacuole clipping and yellow/red compartment destinations are unchanged. The retained blade now reaches the same fixed sample while its marked water cohort is still liquid; phase change continues from wet mesophyll into air space before the selected lower pore. The whole-blade departure is a depth-projection cue, while the separately magnified water section shows the chosen underside explicitly. The water camera seeks a finite Anime.js track; model time and particle trajectories remain topic-owned. Hidden documents and dynamic reduced-motion changes cancel finite camera/selection transitions at the reached pose, without restarting them. Reduced motion also stops active finite journeys.

紧密的栅栏组织与疏松、形状不规则的海绵组织保留区别；空隙由细胞间的几何关系显示，不再让未受区室约束的小点穿过组织。色素趋势、液泡裁切和黄／红路线的最终区室保持不变。整叶中的水标记仍为液态时到达同一个固定采样点，之后才在湿润叶肉与叶内空隙之间改变相态，再经本例下侧气孔离开。整叶上的离开方向表示深度投影；另一幅放大剖面明确显示选定的下侧出口。镜头运动只改变观察框，模型仍拥有水的进度与路径。页面隐藏或减少动态偏好生效时，有限的镜头／选择过渡停在已到达的位置，不自动续播；减少动态也会停止正在播放的有限探索。

Anatomy and mechanism references rechecked for this pass: [OpenStax — Leaves](https://openstax.org/books/biology-2e/pages/30-4-leaves), [OpenStax — Transport of Water and Solutes in Plants](https://openstax.org/books/biology-2e/pages/30-5-transport-of-water-and-solutes-in-plants), and [Wisconsin Horticulture — Leaf Color Change in Autumn](https://hort.extension.wisc.edu/articles/leaf-color-change-autumn/). These support the qualitative anatomy and causal order, not the drawn shapes, timing or distances. Both integrated routes remain drafts pending editorial and browser acceptance.

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

## 2026-10-01 水运输状态一致 / Consistent water-transport state

叶龄模型的同一个 `waterAvailable` 决定播放、滑条、根到叶路线和主画布标记是否可用。成熟阶段保留的水进度仍可回访，但在幼叶尚未展开或离层已中断连接时，两幅图都不再显示活动运输。回到成熟阶段会在原进度继续观察。这里限制的是成熟叶教学示例，不能推断真实幼叶从不吸水。

One lifecycle-owned `waterAvailable` gates playback, scrubbing, the root-to-leaf route and markers on the main canvas. Water progress is retained for inspection, while both views hide active transport before leaf expansion or after the abscission connection closes. Returning to maturity revisits that progress. This is the observation range of the mature-leaf example; it does not imply that real young leaves never take up water.

整株路线和放大剖面现使用同一叶内蒸发状态，在选定的下侧气孔穿出；主画布的实心/空心提示也采用同一相态。短提示分别解释叶内蒸发、尚未离开的水汽、通过气孔后的水汽。尺寸、时间与批次仍是示意，未添加输水张力或气孔反馈求解。`tests/lifecycle.test.ts` 与 `../plant-water/scene.test.ts` 回归实际状态门控和 SVG 属性；完整浏览器与构建验收属于整合任务。

Whole-plant and enlarged routes now share the evaporation state and leave through a selected lower pore; the main canvas uses the same filled/hollow phase cue. Short prompts distinguish evaporation inside the leaf, vapour still inside, and vapour passing the pore. Dimensions, timing and cohorts remain illustrative; no tension or pore-feedback solver was added. Lifecycle and SVG projection regressions cover the actual state gates. The integrating task owns complete build and browser acceptance.

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

## 2026-09-28 取景复查 / Framing review

宽屏有限高度的主图扩大同一叶片，让叶脉、取样点与叶柄容易辨认；向显微尺度推进时，镜头中心连续移回组织与细胞。手机主图仍由宽度限制，叶片与枝条同屏；显微剖面之后隐藏底部重复提示，避免盖住组织或细胞标注，解说继续在画面后的控制区。取景与提示变化不改叶龄、色素模型、取样位置或生物尺度。枝条延伸到画框外，厚度与放大倍率均为教学示意。

The wider desktop framing makes veins, the sampling point and petiole readable while the camera follows the same tissue into the close-up. Mobile keeps the blade and branch together; from the tissue cutaway onward, a repeated bottom caption is omitted so it cannot cover anatomy labels. These framing changes do not alter leaf age, pigment state, sample identity or biological scale. Branch length, thickness and magnification remain illustrative.

## Strict visual pass · 2026-10-18

叶脉采用粗细层级；组织与所选叶肉细胞增加壁/膜边缘、周边细胞核、细胞质和液泡的细微明暗。液泡填色、膜轮廓与色素裁切仍共用同一条稳定路径，没有新增中心扩散的红色揭幕。标注按屏幕使用13/14px字号，自动留出边缘与提示区；窄屏近景给完整细胞留出外缘；取样标记保留圆形外观和44px触摸范围。

Vein weights, tissue boundaries and compartment shading are presentation details. Nuclei, organelles and pigment marks remain illustrative in shape, count and placement; the pigment model, leaf age, selected specimen, water model and nested coordinates are unchanged. The topic remains a draft: this pass improves selected structures, not every lifecycle, water and microscopy branch. The current acceptance gaps are recorded in `wiki.json.review`.
