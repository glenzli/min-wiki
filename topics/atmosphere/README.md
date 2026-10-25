# 大气：包围星球的空气 / Atmospheres

Two views: an expanded 3D Earth atmosphere (with the original continuous Earth-to-space journey as a second observation lens), and Earth beside one of five independently structured worlds. The separate parcel experiment has been removed. Natural scene activity is separate from the user-started height journey and can be paused; reduced-motion preference starts it paused. Users can scrub or directly enlarge a layer. No sound starts automatically.

## Learning design

- Question: how does the atmosphere surround the globe, and which phenomena belong to different heights?
- Variable: camera journey / reference observation height, then comparison world. Same Earth and surface anchor persist.
- Observation: the whole globe grows into a curved local horizon; cloud/weather, ozone, meteor and aurora examples occupy fixed radial coordinates, and the observation point moves outward while the ground marker remains below.
- Mechanisms: lower air movement and conditional rain, UV absorption, meteor emission, and charged-particle excitation followed by auroral light; not one causal sequence in which one phenomenon turns into the next.
- Misconceptions: atmospheric layers are not rigid shells; observer motion is not a spacecraft trajectory; illustrated phenomena need not occur simultaneously; near vacuum is not literally zero particles.
- Bounds: spherical reference Earth, standard lower-air readings and teaching geometry. Sources remain in `learning.json`.

## Owners and routes

- `model.ts`: standard lower-air profile, fixed 6371 km Earth reference radius, continuous overview/approach/ascent camera mapping, radial feature positions, route sanitation and representative planetary data.
- `scene.ts`: composes the retained Canvas annotations, ground anchor and layer phenomena over the GPU surface; owns the complete Canvas artwork fallback, map loading and combined disposal.
- `surfaceModel.ts`: geographic basis and shared map projection, bounded authored relief and continuous display pitch. The scientific journey model remains in `model.ts`.
- `surfaceScene.ts`: one retained Three.js globe and curved coastal mesh, map/material resources, orthographic camera and redraw cache. It owns no clock. `cloudVolume.ts` prepares deterministic 3D density fields and integrates illustrative sunlight through them.
- `layerMechanism.ts`: one topic-owned, pausable three-step narration clock per selected Earth layer. It sends the current step and progress to the retained scene and owns only the subtitle, controls, hidden-page pause and disposal.
- `structureModel.ts`: independent feature locations, world-specific observation limits, reversible expanded display heights and closed illustrative ground geometry. Earth alone has the five reference thermal layers.
- `structureGround3d.ts`: retained terrain materials, finite surface-contacting rocks and low Earth vegetation, water glints, instance buffers and their disposal. Visible ground/water contact comes from `structureGround`.
- `compositionModel.ts`: independently normalised qualitative Earth water-vapour/ozone location cues, not a measured concentration profile.
- `phenomenaModel.ts`: deterministic supplied-time samples for cloud/rain contact, wind, entry light, auroral folds and feature-specific camera framing; no weather or orbit solver.
- `phenomena3d.ts`: retained wind guides, conditional rain and contact marks, one meteor head and fading wake, auroral light, absorption cues and sparse-particle explanation resources; no independent clock or renderer.
- `structureScene.ts`: composes the retained ground and phenomena owners, continuous gas, density-evolving clouds and sparse exospheric marks; resource lifetime follows the selected world.
- `structureView.ts`: one scissored 3D renderer for Earth and at most one comparison; independent selection/orbit/close views, pausable natural activity, clear/cloud/rain and particle-input alternatives, explanation visibility, failure/retry and bounded lifetime.
- `profileView.ts`: supplementary rare-cloud illustrations and emission explanations, without a second planetary-comparison renderer.
- `main.ts`: view/journey/reading-mode state, user-started finite camera playback, hidden-page suspension and bfcache restoration. Selecting a stop moves the camera immediately, including under reduced-motion preferences; the three-step narration advances inside the same camera view.
- `content.json`, `learning.json`, `locales/en.json`: bilingual observations, explanations, scientific bounds and sources.

Canonical parameters: `view=layers|worlds`, `display=structure|journey`, `journey=0..1`, `world=venus|mars|titan|moon|mercury`. Structure is the default; legacy `height`/parcel links retain the journey lens unless a display is explicit. Legacy `view=motion` becomes the unified journey at the prescribed old low-altitude location; legacy `height` enters the matching journey position. Old `world=earth` becomes Venus while keeping Earth as the left reference. Canonical URLs remove obsolete parcel parameters. Language and base paths follow platform contracts.

## Scientific and visual boundaries

The opening approach retains the same sphere and marked coastal region; the outward segment keeps the site and observation marker on the same radius. The globe and curved coastal patch sample the same Solar System Scope / INOVE 2k day map in one geographic basis (CC BY 4.0; see `../solar-system/assets/ATTRIBUTION.md`). The anchor is an approximate coastal pixel at 60.2° N, 5.35° E. As resolution runs out, lit green/rock/water materials gradually replace map color without replacing its sea/land distribution. Authored relief is limited to 1.65 km, tapers to zero at the site and patch edges, and is not measured elevation, a surveyed coast or a detailed representation of that location. The source map combines NASA-based imagery, edited colors and plausible fills; its separate cloud map is static, not live weather. A locator retains globe context.

The display remains an external orthographic observation, not a first-person flight. A continuous 0–1.2° display pitch reveals nearby relief; the Canvas markers and GPU camera share that projection. This changes the view angle, not the scientific reference radius, altitude readings or journey mapping. Clouds use deterministic density volumes with approximate light absorption and scattering. Their sizes and the arrows, particles and glow are enlarged teaching marks; cloud shapes, optical density, shadows, sea glints and apparent weather are not measurements. They need not occur simultaneously. Volume depth testing uses the box entry face, not a terrain depth texture; this is not a full atmosphere, cloud microphysics or weather simulation.

全景与近岸共用同一地理投影和海陆底图，放大后逐渐显露示意起伏与材质，不另换海岸轮廓。起伏上限 1.65 km，在地面锚点和网格边缘归零，不是该地点的实测地形。画面采用连续的小幅俯角表现厚度，标记使用同一投影；参考地球半径、高度读数和旅程映射不变。云体为确定性的三维密度和近似光传输示意，云形、大小、阴影与海面反光不能读成实测天气；体积遮挡按包围盒入口判断，未实现地形深度纹理裁切或云微物理。

Layer reference boundaries are 11/50/85/600 km. The lower profile integrates dry hydrostatic lapse layers through 84.852 geopotential km; UI heights are rounded reference heights, not a site sounding. Above this range temperature and pressure are not extrapolated. The 1000 km journey endpoint is not the atmosphere's physical end. Height progression is logarithmic; boundaries vary in nature.

Earth, Venus, Mars and Titan retain representative surface numbers. Moon and Mercury have extremely tenuous exospheres; quantitative pressure and air-temperature fields are null and the UI gives qualified text instead of zero pressure or fabricated means. Independent 3D windows are qualitative surface-to-space comparisons, not matched-height or equal-size profiles. Titan and the Moon are satellites. Cross-links to water, wind and the Solar System preserve independent ownership.

## Cover provenance

`cover-v2.jpg` is an AI-generated editorial illustration, not an observed photograph. Generated with the built-in imagegen tool on 2026-09-20; source artifact `exec-29d8b272-a66e-446a-aa96-d8852be4ef97.png`. Converted to JPEG for the existing delivery pipeline; directory cards use responsive 480/960 WebP copies.

Final prompt:
> Use case: scientific-educational. Asset type: premium editorial cover for a bilingual interactive children's encyclopedia topic about atmospheres. Generate a 3:2 landscape illustration with no text. A scientifically inspired view near the Earth's limb: lower third beautiful curved blue ocean and faint land, delicate volumetric white cloud decks lit by warm side sunlight, an extremely thin luminous blue atmospheric rim fading continuously into deep navy-black space. The atmosphere must feel thin and delicate, not five thick neon rings or a glass dome. Fine natural cloud textures and subtle depth, calm polished photographic realism, restrained cyan and soft gold, clean confident composition readable at a small card size. No labels, diagrams, spaceships, astronauts, stars in front of Earth, borders, logos, watermarks. This is an editorial illustration, not a measured or observed image.

## Validation

See `VALIDATION.md` for dated checks. Current model tests cover reference pressure/temperature, camera continuity at the approach/ascent join, permanent surface identity and radial distances, visibility of both markers through the path, route migration and non-Earth comparison choices. These establish implementation contracts, not scientific calibration.

The journey includes a fixed five-band orientation rail (equal expanded bands, not a metric height scale), a surface-to-observer line, and bilingual relative-height clues. Playback holds for three seconds at the surface and nine seconds at each representative layer stop, allowing its three-step narration to finish; seeking remains immediate. The reference coast remains visible while moving downward during ascent.

Selecting an Earth layer begins a captioned process in the same Canvas as the continuous outside-camera journey. Animated marks stay at representative radial locations and crossfade between three steps while the same globe, coast and surface anchor remain fixed. The steps show a qualifying condition or alternate outcome where needed: moist versus drier rising air, radiation absorption, a meteor's possible fates, distinct thermospheric heating and auroral input, and retained versus escaping exospheric particles. Marker sizes, paths and the 2.8-second explanation intervals are teaching geometry and timing, not atmospheric particle or weather simulations. A user can pause or select a step directly; the model limits and source remain available in the subtitle. Reduced-motion preference leaves the first step still until the user acts. Narration disappears in the whole-Earth and planetary-comparison views without replacing the globe or surface anchor.

The retained exospheric particle follows the same quadratic curve drawn in projected Canvas coordinates; its final point is retained in the following escape-comparison step. This is an illustrative path, not a computed orbit. The focused drawing regression checks intermediate positions and the endpoint across camera scales.

外逸层中被引力留住的粒子沿投影后实际画出的同一条二次曲线移动，终点在下一步逃逸对照中保留；这是示意轨迹，不是计算得到的轨道。定向绘图回归覆盖不同相机尺度下的中间位置与终点。

Each world’s phenomena are selectable independently. Earth has five thermal-layer entries, Venus/Mars/Titan each have four distinct phenomena, and Moon/Mercury each have two. Selecting a feature in one world does not select a row or region in the other. Full local explanations remain available in the inspector; a short observation accompanies each view.

The GPU surface uses a 256 × 192 sphere, a 257 × 321 curved coastal grid and three bounded 72 × 52 × 40 density textures; device pixel ratio is capped at 1.5. Cloud light integration uses at most 56 primary samples per fragment and sparse secondary sunlight samples. GPU frames are reused until journey, viewport or cloud-opacity inputs change. No additional animation loop is introduced. Shader/context failure falls back to the retained Canvas globe/coast artwork; context restoration invalidates the render cache. The existing bounded Canvas map, relief and cloud caches serve that fallback and the locator. Geometry, textures, materials, caches and context listeners are released with the scene.

## Presentation / 展示

Height navigation, captions and reading cards use Reader's neutral theme tokens in both light and dark appearances. Expanded height bands share a faint vertical spine with short boundary ticks; the current segment is stronger, with heavier text and a small outlined moving dot. This replaces full-width row rules, large selected fills and the triangular pointer. The navigation remains nonmetric. The dark scene subtitle uses local neutral control tokens so its controls remain legible without bright white tiles. Warm gold is reserved for the in-scene surface/height reference; natural atmosphere and phenomenon colors remain topic-owned.

高度导航、图注和阅读卡沿用 Reader 黑白灰明暗主题。高度导览使用一条淡竖轴和短边界刻度，当前段加深、层名加重，小圆点标记当前位置，减少整行分隔线、大片底色和三角指针的表格感。导览继续是展开示意，不表示真实层色或等厚。画内解说采用中性深灰，并给共享控件局部配色；暖金保留给地面与高度参照，天空和现象保留自身自然色。

The two views share a viewport-fitted observation workspace with a collapsible explanation panel and reversible immersion. The paired-world illustrations occupy the stage; the Earth-layer process and its live caption stay with the main scene. The inspector retains reference readings and detailed qualifications. World selection, journey coordinates and playback are retained when changing layout. On narrow screens the caption follows the scene at full width and the comparison returns to natural document flow.

16:9 桌面优先显示完整观察区；可收起解说或进入沉浸演示，Esc 返回。布局切换不重置世界、旅程或模型；详情与定量边界仍在解说中。

儿童版在当前全景、地球层或对照世界旁只给短解释。`study.ts` 为各站提供对应的学术版机制、关系式（适用时）、证据入口和模型边界，阅读卡排在观察区下方；全题 `learning.json` 留作可选的综合笔记。切换阅读版不改变旅程、比较世界或图中机制阶段。
## Atmosphere artwork refinement · 2026-10-19

近景积云改为有内部遮光的密度体，亮边、云底与前后云团由同一光照方向衔接；高云保留细丝示意，雨线仍只接示例雨云。球面地表加入有界的地形法线、远处薄雾和克制的海面反光，全景与近景始终复用同一海陆底图。Canvas 回退保留两张 768 × 384 云缓存和周期陆地材质。海岸、材质和大气蓝色边缘仍是示意，不能按像素读成实测宽度或密度。

臭氧吸收后的能量增加用局部、无定向的短线表示，不再用上升箭头暗示强对流。流星亮头和渐淡尾迹沿同一路径推进；极光保持原有径向高度，以不均匀的细光束和柔和褶皱表现，不随 300 km 观察站移动。所有变化仍读取原有旅程或分步进度，没有增加隐藏时钟。新增缓存及材质引用随场景释放。

Near clouds now integrate light through deterministic volumes, distinguishing luminous billows from cooler, shaded interiors. Fine upper-cloud wisps and conditional rain remain separate marks. A lit curved surface, distant haze and restrained sea reflections reveal depth while preserving the globe's sea/land map. Canvas fallback retains its bounded cloud caches and periodic land material. The blue atmospheric rim and all material detail remain illustrative, not measurements of terrain, shoreline width or air density.

Ozone absorption uses short, non-directed energy marks instead of upward convection arrows. The meteor has one advancing head with a tapered wake. Fine auroral folds retain their original radial region rather than following the 300 km observation stop. Existing journey/mechanism progress remains the only animation input; caches and the Canvas pattern are released with the scene.

The qualitative comparison artwork uses coherent upper-left lighting, distinct cloud/haze materials, irregular Titan lake shores, and shaded lunar/Mercury crater bowls. Its row buttons are scientific image hit regions (`data-scene-hit-target`), retaining the authored sky backgrounds and square row boundaries under Reader's common control styling. The rows stay qualitative; their height, colors and material detail are not cross-world measurements.

行星对照图细化光照、云雾、湖岸和陨坑明暗；图中各行声明为科学图形的点击区域，保留天空底色与方正行界，不套用普通白色按钮卡片。对齐行仍不是等高度、等厚度或等色彩的定量比较。


## Expanded 3D structures — 2026-10-22

The default Earth lens deliberately unfolds height to make clouds, ozone absorption marks, a meteor path, an auroral curtain and sparse exospheric particles distinguishable in depth. Drag, keyboard orbit/zoom and an explicit close view change the observation camera, not atmospheric state. The older reference-radius globe/coast journey remains available under **Continuous approach**. Switching lenses preserves the journey coordinate; this is an explicit change of representation, not an unannounced flight to a different coastline. The expanded ground is illustrative, not the old journey's mapped Norwegian coast.

Earth reference heights 0/11/50/85/600/1000 km map continuously to display heights 0/1.8/3.9/5.4/7.35/8.6, using logarithmic interpolation inside each interval. This deliberately opens room for the previously crowded middle and upper examples; it is not a proportional thickness scale. The same inverse mapping drives gas density and auroral emission colours. Other worlds retain `4.65 × log(1 + h) / log(1 + H)` in their own independent windows (`H`: Titan/Moon/Mercury 1000 km; Venus 250 km; Mars 200 km). These are finite observation limits, not measured atmospheric ends. Horizontal relief and phenomena are separately enlarged. Screen depth, colour, particle count and opacity do not measure atmospheric mass, molecular populations, optical depth or temperature. The standard lower-air reference and upper non-extrapolation remain unchanged. Boundaries are reference thermal transitions, not solid shells; optional violet rays fade downward to illustrate UV absorption; no glowing particles or expanding absorption flashes are drawn. Neither UV nor ozone is visibly violet to an observer.

Venus shows hot ground, dense lower gas, an extensive sulfuric-acid cloud deck (representative 45–70 km) and thinning upper air. Mars shows a selected dust case, one low-latitude water-ice cloud case (10–30 km), one high CO₂-ice twilight-cloud case (60–80 km), and thin upper air. These cloud types need not coexist and heights vary. Titan shows a selected polar hydrocarbon lake, occasional methane clouds, organic photochemical haze and thinning upper gas; its cloud/haze positions are qualitative exemplars, not a retrieved vertical profile. Moon and Mercury have no continuous cloud/gas volume in this renderer: enlarged sparse marks indicate their tenuous exospheres. Their ordinary air-pressure/temperature readings remain absent.

中文版同样明确：展开视图中的地面是重建参照，不冒充原旅程的实测海岸；各世界使用独立的高度映射，地球在参考区域内对数展开；高度窗口上缘不是大气终点。横向、地貌、颗粒和现象另行放大，屏幕厚度与颜色不比较大气量、温度或真实光学厚度。地球五层按参考温度结构区分；金星展示硫酸云幕与浓密空气，火星区分不同条件的水冰云和二氧化碳冰云，土卫六分开霾、甲烷云与极区液态烃湖。月球、水星保留稀薄外逸层，不补齐地球层数。各种现象不表示同地同时发生，土卫六的云霾位置也不是探测器反演剖面。

Natural activity reuses retained geometry/density fields and supplied elapsed seconds. Cloud density deforms gently within retained coordinates; fixed rain identities fall from the same drifting cloud to the visible terrain/water contact. Clear, cloud-only and rain cases are authored alternatives, not humidity or rainfall predictions. A repeated meteoroid example has one moving head, local fading emission and an optional fragment outcome; folded polar light depends on a separate charged-particle-input choice. High-energy sunlight heating remains a distinct explanation. The finite narration controls its causal samples and does not generate foreign-world thermal layers. Hidden/inactive views stop updates and resume without elapsed-time catch-up; reduced-motion starts natural activity paused. WebGL failure keeps the independent feature guide available and offers a fresh-canvas retry. The older journey retains its Canvas artwork fallback.

Resources are bounded to one structure renderer and Earth plus one foreign world. Old comparison worlds are disposed on selection; geometry and density textures are reused during activity. Each selected world has one 96 × 48 closed terrain grid, at most three 72 × 52 × 40 density textures and one 40-sample continuous-gas volume; cloud volumes reuse the existing 56-sample illustrative light integration. DPR is capped at 1.5; activity updates are admitted at most 24 times/s. The legacy globe renderer is created only if its journey lens is visited. These are implementation bounds, not measured FPS or device-memory claims.

Primary sources checked on 2026-10-22:

- [NASA · Earth’s atmosphere](https://science.nasa.gov/earth/earth-atmosphere/earths-atmosphere-a-multi-layered-cake/): thermal layers, variable boundaries and representative phenomena.
- [NASA · Venus facts](https://science.nasa.gov/venus/venus-facts/) and [ESA · Venusian clouds](https://www.esa.int/Science_Exploration/Space_Science/Venus_Express/New_details_on_venusian_clouds_revealed): dense CO₂ air and the 45–70 km sulfuric-acid cloud case.
- [NASA · Mars facts](https://science.nasa.gov/mars/facts/), [JPL · Water-ice clouds](https://www.jpl.nasa.gov/news/mars-water-ice-clouds-are-key-to-odd-thermal-rhythm/) and [NASA · Curiosity’s twilight clouds](https://www.nasa.gov/missions/mars-science-laboratory/nasas-curiosity-rover-captures-colorful-clouds-drifting-over-mars/): thin air, dust and distinct conditional ice-cloud examples.
- [NASA · Titan facts](https://science.nasa.gov/saturn/moons/titan/facts/): nitrogen/methane chemistry, organic haze, occasional methane rain and hydrocarbon lakes.
- [NASA · Moon facts](https://science.nasa.gov/moon/facts/) and [Mercury facts](https://science.nasa.gov/mercury/facts/): tenuous exospheres and surface-supplied atoms.

Scientific qualifications are repeated in both languages beside the affected view. No external media or new dependency was downloaded for this refinement.

### Close observations and compact controls · 2026-10-22

Selecting a feature automatically enlarges the same retained objects, using feature-specific framing: cloud-to-ground weather, ozone absorption, a brief entry path, folded polar aurora or sparse bound/escape guides. A full-view control returns to context without replacing the world or its resource identities. Scene activity and height/narration progress have distinct controls. Earth weather cases, Titan's optional methane-rain example and the auroral-input alternative retain their own world conditions. Mars ice-cloud examples are selected separately rather than asserted to coexist.

The inline observation controls expose chapter, display lens and comparison world directly, beside reading depth and labels. The stage prioritizes the interactive scene and one short observation; full visible/invisible explanations, causal steps, reference readings and scientific qualifications live in the existing Explanation panel. Enlarged arrows, fading UV rays, magnetic paths and gas markers can be hidden together while clouds, rain, meteors and auroras remain. A separate, initially off composition switch adds qualitative Earth water-vapour/ozone location cues without changing natural weather or process-cue state. Air does not become five colored solid slabs.

地球各层可直接放大为同一三维现场的局部观察：云到地面的风雨、臭氧吸收、短暂流星、极区光幕、稀疏粒子的去向。看不见的风、紫外线和粒子使用明确的放大解释线索，可以关闭；自然现象保留。晴空、成云但不下雨、云滴长大后下雨是条件对照，不是天气预报。极光的粒子输入与高能日光加热分开。甲烷雨仅为土卫六偶发天气示例；火星两种冰云分别观察。地面山脊、河口、岩岸与贴地植被是教学重建，水面仅改变光学细波，不改变雨滴接触面。

New primary-source mechanism checks: [NOAA/NWS cloud development](https://www.weather.gov/source/zhu/ZHU_Training_Page/clouds/cloud_development/clouds.htm), [NOAA aurora tutorial](https://www.spaceweather.gov/content/aurora-tutorial), [ESA meteors and atmospheric compression](https://www.esa.int/Education/Teachers_Corner/Tell-tale_signs_of_a_shooting_star_Comets_meteors_and_craters_in_the_Solar_System_Teach_with_space_PR04), and [NASA meteors and meteorites](https://science.nasa.gov/solar-system/meteors-meteorites/). Main auroral electrons are accelerated within Earth's magnetosphere; the display does not claim that every auroral electron travels directly from the solar wind to the air. Natural timing, optical density, terrain and particle paths remain illustrative rather than measured or calibrated.

Familiar references are deliberately enlarged: one cruising airliner near 12 km and a generic low-orbit satellite near 824 km. Cruise altitude and tropopause height vary; the aircraft is not a rule that all planes fly in the stratosphere. The satellite's local teaching path is not an orbital integration, and gravity still acts on it. These are reference objects, not equal-scale size comparisons or naked-eye renderings of their full shapes. Sources: [NASA Langley contrail review](https://www-pm.larc.nasa.gov/site/doc-library/208-Minnis.CONTRAILS.Ed2.pdf) for flights above/below the variable tropopause, and [NOAA JPSS program lexicon](https://www.nesdis.noaa.gov/s3/2023-09/470-00041_JPSS_Program_Lexicon_RevD__May_16_2019.pdf) for an approximately 824 km low-orbit reference. No persistent contrail is invented in dry lower-stratospheric air.

熟悉参照物的外形均单独放大：客机示例约12 km，低轨卫星示例约824 km。巡航高度与对流层顶位置会变化，不表示所有飞机都在平流层；卫星仍受引力，局部示例路径不是轨道计算，也不表示肉眼能看清卫星外形。较干的低平流层不默认绘制持续凝结尾迹。

`familiarReferences3d.ts` owns the retained reference models and their supplied-time motion. The airliner's cockpit, rounded nose, swept wings, small wingtip fences, twin open nacelles and tail share one forward axis; its orientation follows the full analytic path tangent and banks through continuous turns. Proportions are guided by the manufacturer's [A320 dimensions and three-view figures](https://www.aircraft.airbus.com/sites/g/files/jlcbta126/files/2025-07/AC_A320_20250715.pdf): the wingtip-fence configuration uses a 34.10 m span and 37.57 m length, distinct from the larger sharklet span. This is a procedural generic reference rather than an exact aircraft replica; the drawings themselves are not bundled. The generic satellite has insulated bus panels, a radiator, framed blue solar cells, supports, antenna and nadir instrument. Their heights follow the same display curvature as the surface, including depth. Shape, speed, bank and the local satellite arc remain illustrative rather than flight or orbit predictions.

Auroral emission uses unequal bundles, changing bright patches and overlapping travelling folds with a thin lower arc and fading upper rays. Selecting aurora presents a polar-night example; other observations restore the daytime sky. The warm upper tint is restricted to the representative high-altitude portion, rather than applying a red cap to every ray. This is optical teaching geometry, not wind-blown cloth, measured emission spectra or a magnetospheric simulation. No additional auroral texture, timer or per-frame geometry allocation is introduced.

客机沿连续航线转弯，机头始终顺着运动方向；现代卫星由舱体、散热面、太阳能电池板、支架和天线组成，均为通用教学参照。极光以不等宽光束、局部明暗和重叠卷曲光幕表现，并在极区夜空示例中观察；光幕的动态不表示风吹布料，也不提供实测强度、光谱或轨道结果。

Close observations isolate the chosen question while retaining the same objects: weather shows cloud-to-ground precipitation, the lower-stratospheric reference shows the 12 km aircraft below the ozone absorption marks, entry shows the meteoroid example, the polar-night view shows aurora, and the upper view shows the 824 km satellite and optional sparse-particle cues. Returning to overview restores their context without rebuilding the objects. This is a choice of framing, not a claim that meteors or auroras are restricted to one temperature layer. Downward fading UV rays replace point flashes and expanding glow discs. Faint broken height marks in Earth's overview are variable thermal references, not solid shelves, and are not imposed on other worlds. The camera, gas volume and emission colours share the continuously expanded height map.

Portrait aurora close-ups frame a section of the long arc so that the rays remain readable; returning to overview restores the full arc. Small screens use the same feature selection in one native select rather than several rows of English buttons.

各层近景分别突出当前问题，避免客机、流星、极光和卫星挤在同一个局部画面。客机仍是约12 km的参照，臭氧吸收提示在其上方，不做成机尾冒出的光球；全景恢复这些对象的上下关系。淡虚线标示可变的温度结构参考界限，不表示大气之间有隔板，也不要求其他世界照搬地球分层。窄屏使用一栏现象选择，保留相同顺序与选择状态，把空间留给三维现场。

## Expanded layer spacing and cockpit follow-up · 2026-10-22

The six cockpit panes form one continuous belt around the nose shoulder, separated by narrow structural pillars. Glazing is clipped to the actual fuselage triangles with a small outward offset, so the glass stays visible without intersecting the skin as the aircraft turns. The remaining airframe, satellite and supplied-time paths are unchanged. This is a generic enlarged airliner, not a precise aircraft replica.

驾驶舱六扇窗沿机头肩部相连，只保留细窄窗柱；玻璃贴合实际机身三角面并留出微小外偏移，避免转动时被机身吞掉。飞机仍为放大的通用参照，不声称精确复刻某一机型。

Earth’s display column now has continuous, individually expanded thermal regions, rather than compressing the mesosphere and upper examples into thin slices. Close framing and the gas box share the same mapped heights. Airliner cruise remains near 12 km, UV absorption cues remain higher at 22–48 km, meteor emission stays at representative 64–98 km, and the satellite example remains near 824 km. These remain separately enlarged examples, not a common site or simultaneous event. Foreign height maps are unchanged. Optional UV cues use retained, downward fading line buffers with gentle supplied-time motion; they do not pulse into spherical flashes.

地球展示柱把各参考区域连续展开，中间层和高处示例不再挤成很薄的一片；相机、空气体积和现象消费同一高度映射。客机仍在约12 km，紫外线吸收示意在更高处；这些不是同时同地、等比例的观测。其他世界保留各自原有映射。紫外线用向下逐渐淡去的线条表示吸收，去掉容易看成烟花的圆点和膨胀亮斑。

## Natural cumulus and optional composition overlay · 2026-10-22

Explicit cumulus now uses unequal three-dimensional lobes and smaller billows rather than long horizontal density ribbons. A coherent high sun, denser internal self-shadow and a shaded lower body distinguish the front and rear cloud volumes; supplied-time deformation stays inside the retained field. The close weather view reduces the intervening gas wash so that nearby cloud shading remains visible. The rain entrance remains within that same cloud volume. Each cloud retains the existing 72 × 52 × 40 density field and 56 primary / 4 sunlight sample budget; no new timer, resolution or postprocessing was added. The older static API and the separately authored layered/ice fields retain their previous behaviour.

积云改为大小不一、前后交叠的三维云瓣，保留缓慢变化的轮廓、受光云顶和灰暗云底；近看时减轻空气叠色，让云体厚度更清楚。雨滴仍从同一片雨云下方落下。云形、光照和时间速度是教学重建，不是实测天气或云微物理模拟。

The composition switch is independent of process cues and defaults off. Its state round-trips as `composition=1` alongside weather, selection, camera journey and language. It adds cyan lower-air water-vapour and violet stratospheric ozone location cues to Earth's existing continuous gas volume. The two smoothly varying envelopes are separately normalised and enhanced: colours are not real visible colours, species fractions, humidity readings, measurements or optical-depth estimates. Water vapour is transparent; visible white clouds contain droplets/ice. The cloud/rain case is not driven by this qualitative distribution. Other planets retain their own unmodified atmospheres and do not receive Earth constituent profiles.

`compositionModel.ts` owns the qualitative envelopes. `structureScene.ts` samples them using the same expanded-height inverse into a single retained 256 × 1 RGBA lookup (1024 B), releases it once, and integrates its colours in the existing gas pass. Switching only changes a uniform; it does not replace geometry, textures, cloud identity or the scene clock. The legend stays visible with the overlay, even when other labels/cues are hidden; complete bilingual limitations remain in Explanation.

成分示意默认关闭，可独立显示地球低层水汽与平流层臭氧的大致分布。两种示意色分别增强，不能比较占比；不表示实测浓度，也不代表当前天气湿度。水汽本身透明，白云是小水滴或冰晶；臭氧也不是紫色云壳。开关不重置天气、时钟、对象或原有观察高度，其他世界不套用地球成分分布。

Primary references rechecked for this change: [NASA’s atmosphere overview](https://science.nasa.gov/earth/earth-atmosphere/earths-atmosphere-a-multi-layered-cake/) for lower-atmosphere water vapour; [NOAA’s ozone questions](https://www.csl.noaa.gov/assessments/ozone/2018/twentyquestions/) for the broad ozone-rich stratospheric region; [NWS cloud development](https://www.weather.gov/source/zhu/ZHU_Training_Page/clouds/cloud_development/clouds.htm) for invisible vapour versus cloud droplets/ice. The smooth functions and colour strengths are authored teaching choices rather than fitted observations.

## Wind, cloud interiors and direct observation controls · 2026-10-22

The cumulus field separates unequal, tilted lobes in height and depth, with locally different erosion and edge softness. Supplied-time local vortices deform the same retained field with smoothly changing coefficients. Four sunlight samples cover the actual remaining path through each part of the cloud; thin wisps receive less diffuse fill than dense cloud interiors. No extra light samples, texture resolution, bloom pass or animation clock is introduced. These are illustrative cloud optics, not cloud microphysics or reconstructed measured density.

`phenomenaModel.ts` supplies cloud advection and birth-time rain transport. Lower-weather wind guides share their prevailing direction, with separately illustrative speeds. Each retained drop uses the source at its birth time, emerges inside the same cloud, then falls with wind drift to the existing terrain/water contact. Already falling drops do not follow the cloud's new centre. Finite crossings fade near the observation boundary; they are repeated weather examples, not a periodic prediction. The close weather camera follows the visible rain source within bounded framing, while the same ground and atmosphere state persist. Camera motion does not alter cloud or rain history.

云体不再按几个相近高度整齐叠起：云瓣前后错开、局部边缘消散，内部翻卷与遮光连续变化。风推动云，雨滴从其出生时的云中显现，再独立下落和风偏；不会让已落下的雨整片追着云移动。云形、光学、流速、雨滴大小和时间均作教学调整，不提供真实浓度、风速或降雨预报。

Venus keeps broad sulfuric-acid cloud decks and dense lower gas; Mars separates selected water-ice and high CO₂-ice cloud conditions, with a twilight case for the latter; Titan keeps extended organic haze distinct from local methane clouds and optional methane rain. Moon and Mercury remain without weather clouds or rain. Each world's shapes, opacity, heights and transport are qualitative examples, not matching Earth thermal layers or atmospheric optical inversions. Primary checks: [ESA Venus cloud structure](https://www.esa.int/Science_Exploration/Space_Science/Venus_Express/New_details_on_venusian_clouds_revealed), [NASA Mars twilight clouds](https://www.nasa.gov/missions/mars-science-laboratory/nasas-curiosity-rover-captures-colorful-clouds-drifting-over-mars/), [NASA Titan facts](https://science.nasa.gov/saturn/moons/titan/facts/), and [NWS cloud formation and mixing](https://www.weather.gov/source/zhu/ZHU_Training_Page/clouds/stratus_form_dissipate/Marine_Layer.html).

The two chapter buttons, active lens or five comparison-world buttons, reading depth and labels remain inline. The same authored controls are mounted once using Reader's observation and reading APIs; no nested choice disclosure or duplicate expanded-view height rail is created. The older journey still exposes its own globe/surface/height navigation. Journey, weather, invisible-cue state and the retained Earth survive navigation; replacing a comparison world disposes that world's resources. Reading depth opens the existing Explanation panel. Both languages keep native keyboard/touch button semantics, with the compact native phenomenon selector retained on phones.

常用操作直接铺开：地球／其他天空、观察方式或比较世界，以及儿童版／学术版与标注。三维结构不重复显示旧旅程的第二套层按钮；连续接近视图仍保留自己的地球全景、地面与高度导览。条件与地球对象保留，更换比较世界时释放旧世界资源；详细解释仍在原解说面板中。

## Observation controls

`main.ts` composes the original Earth/world tabs, one native lens or world selector, labels and explanation in one toolbar. Reading depth stays inside the explanation. The selected world, reference height and retained renderers survive panel and lens changes. On narrow screens the requested explanation opens immediately above the scene in a bounded scroll region; closing it restores the full scene. Each world's feature and weather controls remain owned by `structureView.ts`, rather than imposing Earth layer correspondence.
