# 火山湖是怎样形成的 / How volcanic lakes form

火山喷发之后，为什么可能留下一座湖？比较火山口和破火山口，试着让雨水积起来，或从地下漏走。

湖盆外形与水位为简化示意，不对应特定火山。没有模拟真实冷却时间、热液化学或地下水流场；无输入时不会凭空生水。

Basin shape and water level are simplified and do not model a particular volcano. Cooling time, hydrothermal chemistry and groundwater flow fields are omitted; no water appears without input.

## Ownership

`model.ts` owns the scientific teaching state and numeric contracts. `geometry3d.ts` projects that state into the retained terrain, strata, faults, shore and water section. `materials3d.ts` owns procedural rock, mixed reservoir and depth/reflection shaders. `scene3d.ts` owns the GPU, bounded reflection target, gestures and finite camera transitions. `scene.ts` retains the experiment frame through 3D failure/retry, using the preserved `canvasScene.ts` cutaway as fallback. `content.ts` and `locales/en.json` own bilingual explanations. The unified volcano controller owns controls and playback; this topic's `main.ts` preserves its legacy redirect. Full-page navigation releases rendering resources. Nothing plays automatically.

## Sources

- [USGS · Mount Mazama and Crater Lake](https://pubs.usgs.gov/fs/2002/fs092-02/)
- [USGS · Post-caldera volcanism and Crater Lake](https://www.usgs.gov/volcanoes/crater-lake/science/post-caldera-volcanism-and-crater-lake)
- [USGS · Volcano types](https://pubs.usgs.gov/gip/volc/types.html)

## Validation

Run `npm run check`, then verify the production page in both languages, controls, playback and narrow layouts. Model tests validate implementation assumptions, not empirical calibration.

The local renderer contribution has focused evidence in [VALIDATION.md](VALIDATION.md). Integration, packaged-browser, language and mobile acceptance belong to the unified volcano owner and remain separate from these checks.

## 剖面呈现 / Cutaway presentation

分步表现岩浆撤出、支撑减弱与裂隙扩展、岩体下沉，随后再积水；同一进度控制地形、岩层错动和说明。新增的成因步骤可直接定位观察。储存区不显示为长期空洞。火山口选项不套用破火山口塌陷流程。岩层、断裂与残留岩浆只作地质教学示意，不是岩体力学求解。

The cutaway sequences magma withdrawal, weakening support and fractures, subsidence, and later water accumulation. One timeline controls surface shape, displaced layers and explanations. The reservoir remains a rock/magma region. The smaller-crater option has its own explanation. These are teaching stages, not a rock-mechanics solver.

## 三维湖盆 · 2026-10-21 / Three-dimensional basin

同一块稳定地形在「湖盆剖面」和「看整座湖」中保留盆缘、断裂、碎石和过程进度；全景中的虚线标出剖面位置。储存区由岩石与残留岩浆混合填充，撤出改变其中的熔融斑块，不留下永久空洞。较小火山口只截去喷口附近的原有岩层，不套用破火山口的深部下沉。

The cutaway and whole-lake views retain one terrain, rim, fault system, rubble sites and process state. A dashed surface trace marks the same section in the landscape. The reservoir remains a textured mixture of rock and residual melt as withdrawal progresses. The smaller crater removes material near its vent without borrowing the caldera's deep subsidence field.

水平湖面由模型相对水深与同一三维盆地的交线生成，岸边、浸水岩壁与剖面水体使用同一地形。低水位显示较小的湿区；没有供水或损失过大时，完整凹盆仍可保持干燥。水面反射来自当前盆地的镜像渲染；细小水纹和雨滴只取样现有进度，暂停时不继续推进。相对水深读数不是湖水体积或实测深度。

The horizontal water surface meets the same terrain used by the shore, wet walls and vertical water section. Lower levels wet a smaller part of the basin; zero supply or excessive losses leave a dry depression. Surface reflections render this basin from a mirrored camera. Small ripples and rain sample the supplied progress, so pause does not advance them. The relative-depth readout is neither water volume nor a measured depth.

形状、岩层厚度、裂隙、储存区和雨滴是稳定的程序化教学几何，不对应 Crater Lake、Kīlauea 或其他实地；没有求解岩体力学、真实冷却年限、水动力、地下水流场或真实反射率。反射与深浅色调用于辨认水体。真实喷发和塌陷可以重叠，模型为辨清因果而分步；岩浆并非必须全部排空，雨水也不是岩浆冷却而成。

Shapes, layer thicknesses, faults, reservoir and rain are stable procedural teaching geometry, not a reconstruction of Crater Lake, Kīlauea or another site. Rock mechanics, cooling durations, hydrodynamics, groundwater fields and measured optical properties are not solved. Reflections and depth tint help identify water. Real eruption and collapse can overlap; the model separates them to explain the causal relation. Withdrawal need not empty all magma, and cooling magma does not create rainwater.

Each active scene owns one WebGL renderer, one 256² procedural texture, one 512² reflection target, one 2048² shadow map, fixed terrain/water/rock buffers, 400 instanced rocks, 120 rain segments and at most 16 arrows. Seven retained roof units each contain four closed layers, with separate full/cutaway buffers; six traces retain the original positions. The crystal-bearing region shares its upper contact with each displaced unit, replacing the former single-block side collar. There is no retained voxel field. Only finite camera transitions schedule frames; process playback remains outside this renderer. Disposal cancels camera work, disconnects resize and gesture listeners, releases GPU resources and loses the old context. Failure switches to the retained 2D section; retry creates a fresh canvas and restores the frame and requested view.

Primary accounts checked for this projection: [USGS Kīlauea 2018 withdrawal and collapse, with later water lake](https://www.usgs.gov/volcanoes/kilauea/science/2018-lower-east-rift-zone-eruption-and-summit-collapse-kilauea) and [USGS Crater Lake post-caldera volcanism and filling](https://www.usgs.gov/volcanoes/crater-lake/science/post-caldera-volcanism-and-crater-lake). No third-party image is downloaded or bundled.

Source: [USGS Kīlauea 2018 withdrawal and collapse](https://www.usgs.gov/volcanoes/kilauea/science/2018-lower-east-rift-zone-eruption-and-summit-collapse).

## 围岩体积与塌陷结构 / Host-rock volume and collapse structure

围岩由十一组有厚度的闭合岩层体组成，上部接触面保留山体逐次构造的嵌套形态，下部为基底岩层；相邻层体共用同一粗糙接触面。新的剖面具有不规则凹凸与岩屑纹理，不用规则深浅色宽条代替地质结构。变形后重算法线，夹闭或新露出的薄层也保留有效方向，避免把照明错误画成地下黑洞。

Eleven closed rock units retain finite depth: nested constructional units above basement contacts. Adjacent units share the same rough contact. The exposed cut has physical relief and lithic grain rather than painted, uniformly spaced stripes. Deformation recomputes valid normals, including pinched and newly exposed layers, so a shading error cannot imply an underground cavity.

破火山口中央保留有限底界与四层接触，沿不等大的弯折断裂分成七个稳定身份的断块。各块按已有下沉进度先后错动并略有倾斜；顶面、层位、底界和材质坐标一起保留，不把深层压到底界而消失。原位虚线与下移的层位作对照，剖面镜头在下沉时保持固定。外围岩层为环带体积，中央没有另画一整块实心围岩挡在储存区后方。晶粥上界逐块接触断块底界，下方仍有残余晶体与熔体；不以地下空洞解释支撑减弱。

The finite four-layer roof is divided along unequal, bent boundaries into seven retained units. The existing subsidence state drives staggered offsets and slight affine inclinations; each unit retains its top, contacts, base and material coordinates instead of pinching away at the lower display boundary. Dashed references keep the original positions, and the section camera remains fixed during sinking. Outer host layers form annular volumes without an intact central host behind the reservoir. The crystal-bearing region meets each displaced base and retains residual crystals and melt below, rather than leaving an underground void.

六个固定壁面源区随同一过程形成凹缺口，来自这些位置的碎块沿坡滑落、转动并留在崖脚；粗细混合的坡积还改变同一盆地地形，不用空中随机碎石代替物质去向。水平湖面继续与这同一地形求交，原有相对供水与渗漏规则决定能否积水。较小火山口保留自己的局部成因，不调用破火山口的储存区、环断裂或分块下沉。真实塌壁也可能在主塌陷之后很久发生，本例把它们接在一起观察。

Six fixed wall-source regions develop scars on the same clock. Clasts from those sites slide, turn and remain at the wall foot; mixed talus also changes the retained basin terrain. Random airborne rubble does not stand in for a source or destination. The horizontal water surface intersects this terrain, and the original relative-input/leakage rules determine retention. The smaller crater keeps its local history without the caldera reservoir, ring faults or fragmented sinking roof. Real wall slides may occur long after the principal collapse; this teaching sequence compresses their chronology.

剖面移去前方岩石以展示接触关系，不表示地下向空气敞开。七个断块、六个崩落源区、先后次序与碎石量都为辨认过程而选取，不是实测划分或普遍塌陷样式。位移和轻微倾斜是教学几何变形，没有求解岩体力学。岩层、储存区深浅、晶体含量、碎块路径和颜色均非实测或力学反演；保留可追踪岩体不等于模拟了整个火山的质量守恒、真实块体尺度或崩塌速度。

The foreground cut exposes contacts, not an air-filled underground cavern. Seven units, six source regions, their order and debris quantities are selected for legibility, not surveyed subdivisions or a universal collapse pattern. Offsets and slight inclinations are illustrative geometric deformation, without a rock-mechanics solver. Layers, reservoir depths, crystal abundance, clast paths and colors are uncalibrated. Tracking the retained solids does not establish whole-volcano mass conservation, real block scales or collapse speeds.

The causal basis was checked against [USGS HVO's ring-fault/piston explanation](https://www.usgs.gov/observatories/hvo/news/volcano-watch-what-causes-collapseexplosion-events-kilaueas-summit), [USGS evidence that collapse does not require complete reservoir evacuation](https://www.usgs.gov/publications/magma-reservoir-failure-and-onset-caldera-collapse-kilauea-volcano-2018), [NPS summit-caldera structure](https://www.nps.gov/articles/000/summit-calderas.htm) and [NPS wall-slumping/talus observations](https://www.nps.gov/articles/000/volcanic-processes-landslides.htm). These constrain the teaching interpretation; the geometry combines them without reproducing a specific volcano or its event chronology.

## 崩塌更新与滑移节奏 / Collapse updates and slip timing

断块在已有下沉阶段内分次滑移，短暂停顿后继续错动，中间阶段略有倾斜，最终仍到达原先的实心盆底位置。边壁碎块保留各自源区，沿坡滑动并作有限滚动，最终留在同一地形的坡脚。三次滑移、七个断块及滚动路径均为辨认过程而选择，不是地震记录、普遍分块规律或碰撞力学解；不增加第二个过程时钟，也不以烟尘遮盖物质去向。USGS 的分次塌陷说明支持撤出减压后逐次错动的因果，NPS 的凹缺口与坡积观察支持边壁失稳和碎屑去向；本图压缩并组合这些现象，不复现其实际年代。

Blocks move in bounded slips separated by short rests within the existing subsidence stage. Modest inclination accompanies descent, and the same solids reach their former final positions beneath the basin. Source-linked wall clasts slide with limited rolling and remain on the shared terrain. Three slips, seven units and rolling paths are selected for legibility, not seismic records, universal partitions or collision solutions. There is no second process clock or dust hiding the destination. USGS observations support incremental movement after withdrawal and depressurization; NPS observations support wall scars and talus. This reconstruction compresses and combines those phenomena without reproducing their dates.

渲染按真实依赖更新：下沉或盆地类型改变才重算围岩，裂隙可独立更新；积水阶段只更新水面、雨滴及相应标记。同一进度和条件重复绘制不再重建几何或重复渲染。固定空间项、接触面和源区身份复用，粗糙剖面仍在变形时重算法线；仅纯仿射的岩块使用变换后的原始法线。两个镜头、回拖和切换条件继续消费同一状态。只读画布属性 `progress`、`geologyUpdates`、`waterUpdates`、`lastGeologyMs` 与 `lastDrawMs` 便于核对；这些值不驱动实验。

Rendering follows dependencies: subsidence or basin changes update rock, while fractures update independently. Filling updates water, rain and associated markers. Repeating an unchanged frame rebuilds no geometry and requests no duplicate render. Fixed spatial terms, contacts and source identities are reused; rough cuts retain numerical normal updates, and purely affine pieces transform their source normals. Both views, seeking and condition changes consume one state. Read-only canvas attributes expose progress, work counts and CPU durations without steering the experiment.

本机 Node CPU 复现调用真实 `Lake3DScene.draw` 和保留的 Three 几何，省略 GPU：崩塌逐帧均值约 418→12.3 ms，积水约 454→6.64 ms，重复静止帧约 28.3→0.003 ms，交替 seek 约 410→14.6 ms。V8 分配采样的十二个积水帧约 2.21 GB→19.6 MB；这是含已回收对象的估计分配量，不是常驻内存或泄漏量。测量范围、分位数、缓存边界及原始 JSON 路径见 [VALIDATION.md](VALIDATION.md)。这些 CPU 数值不代表浏览器帧率、首次着色器编译或人眼验收；当前画面与连续播放仍由集成页面单独验证。

The local Node CPU reproduction invokes the actual draw method with retained Three geometry and omits GPU work. Mean collapse frames changed from about 418 to 12.3 ms, filling from 454 to 6.64 ms, repeated stable frames from 28.3 to 0.003 ms, and alternating seeks from 410 to 14.6 ms. Twelve filling frames sampled by V8 changed from about 2.21 GB to 19.6 MB of estimated allocations, including collected objects; this is neither resident memory nor a leak estimate. [VALIDATION.md](VALIDATION.md) records scope, quantiles, cache bounds and raw JSON paths. These CPU measurements do not establish browser frame rate, first shader compilation or visual acceptance.

## Child reading milestones · 2026-10-01

集成页面的破火山口案例采用专属儿童短导读，与模型共同经历岩浆撤出、支撑减弱和裂隙发展、下沉、随后可能积水。中英两版都区分已形成的盆地与需要水量条件的湖，不在岩层下沉时提前说明湖水到来。

The integrated caldera case now uses its own short child observations for withdrawal, weakening support/fractures, subsidence, and possible later water retention. Both reading modes follow the same topic-owned milestone selector. Children no longer receive the generic lake sentence about incoming water while rock is still subsiding. Chinese and English retain the distinction between an existing basin and conditional lake formation. The [USGS Kīlauea account](https://www.usgs.gov/volcanoes/kilauea/science/2018-lower-east-rift-zone-eruption-and-summit-collapse-kilauea) was checked for withdrawal/collapse order and the later water lake. Focused tests compare the child wording to no-subsidence/no-water intermediate states and a zero-input basin; integrated browser checks remain separate.
