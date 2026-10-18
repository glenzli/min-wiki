# 大气：包围星球的空气 / Atmospheres

Two views: a continuous Earth-to-space journey and Earth beside one of five other worlds. The separate parcel experiment has been removed. The scene begins still; users can play, pause, scrub or directly select a stop. No sound starts automatically.

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
- `profileView.ts`: paired SVG/DOM planetary columns, selected-row explanations, and rare-cloud/aurora context. Earth is always the left reference and cannot be selected on the right.
- `main.ts`: view/journey/reading-mode state, user-started finite camera playback, hidden-page suspension and bfcache restoration. Selecting a stop moves the camera immediately, including under reduced-motion preferences; the three-step narration advances inside the same camera view.
- `content.json`, `learning.json`, `locales/en.json`: bilingual observations, explanations, scientific bounds and sources.

Canonical parameters: `view=layers|worlds`, `journey=0..1`, `world=venus|mars|titan|moon|mercury`. Legacy `view=motion` becomes the unified journey at the prescribed old low-altitude location; legacy `height` enters the matching journey position. Old `world=earth` becomes Venus while keeping Earth as the left reference. Canonical URLs remove obsolete parcel parameters. Language and base paths follow platform contracts.

## Scientific and visual boundaries

The opening approach retains the same sphere and marked coastal region; the outward segment keeps the site and observation marker on the same radius. The globe and curved coastal patch sample the same Solar System Scope / INOVE 2k day map in one geographic basis (CC BY 4.0; see `../solar-system/assets/ATTRIBUTION.md`). The anchor is an approximate coastal pixel at 60.2° N, 5.35° E. As resolution runs out, lit green/rock/water materials gradually replace map color without replacing its sea/land distribution. Authored relief is limited to 1.65 km, tapers to zero at the site and patch edges, and is not measured elevation, a surveyed coast or a detailed representation of that location. The source map combines NASA-based imagery, edited colors and plausible fills; its separate cloud map is static, not live weather. A locator retains globe context.

The display remains an external orthographic observation, not a first-person flight. A continuous 0–1.2° display pitch reveals nearby relief; the Canvas markers and GPU camera share that projection. This changes the view angle, not the scientific reference radius, altitude readings or journey mapping. Clouds use deterministic density volumes with approximate light absorption and scattering. Their sizes and the arrows, particles and glow are enlarged teaching marks; cloud shapes, optical density, shadows, sea glints and apparent weather are not measurements. They need not occur simultaneously. Volume depth testing uses the box entry face, not a terrain depth texture; this is not a full atmosphere, cloud microphysics or weather simulation.

全景与近岸共用同一地理投影和海陆底图，放大后逐渐显露示意起伏与材质，不另换海岸轮廓。起伏上限 1.65 km，在地面锚点和网格边缘归零，不是该地点的实测地形。画面采用连续的小幅俯角表现厚度，标记使用同一投影；参考地球半径、高度读数和旅程映射不变。云体为确定性的三维密度和近似光传输示意，云形、大小、阴影与海面反光不能读成实测天气；体积遮挡按包围盒入口判断，未实现地形深度纹理裁切或云微物理。

Layer reference boundaries are 11/50/85/600 km. The lower profile integrates dry hydrostatic lapse layers through 84.852 geopotential km; UI heights are rounded reference heights, not a site sounding. Above this range temperature and pressure are not extrapolated. The 1000 km journey endpoint is not the atmosphere's physical end. Height progression is logarithmic; boundaries vary in nature.

Earth, Venus, Mars and Titan retain representative surface numbers. Moon and Mercury have extremely tenuous exospheres; quantitative pressure and air-temperature fields are null and the UI gives qualified text instead of zero pressure or fabricated means. Paired columns are qualitative surface-to-space comparisons, not matched-height profiles. Titan and the Moon are satellites. Cross-links to water, wind and the Solar System preserve independent ownership.

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

Planetary comparison rows are selectable in either column and expose both worlds' full paired explanation in the inspector. The aligned rows continue to describe representative phenomena, not equal altitudes or layer thicknesses.

The GPU surface uses a 256 × 192 sphere, a 257 × 321 curved coastal grid and three bounded 72 × 52 × 40 density textures; device pixel ratio is capped at 1.5. Cloud light integration uses at most 56 primary samples per fragment and sparse secondary sunlight samples. GPU frames are reused until journey, viewport or cloud-opacity inputs change. No additional animation loop is introduced. Shader/context failure falls back to the retained Canvas globe/coast artwork; context restoration invalidates the render cache. The existing bounded Canvas map, relief and cloud caches serve that fallback and the locator. Geometry, textures, materials, caches and context listeners are released with the scene.

## Presentation / 展示

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
