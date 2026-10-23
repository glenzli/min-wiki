# 海底火山怎样长成岛？ / Underwater volcanoes and islands

Independent bilingual topic with three qualitative scenarios: slow pillow-lava extrusion in deep water, a shallow magma–water interaction, and long-term accumulation with two supply histories followed by illustrative erosion. These are selected environments and timescales, not inevitable stages of every volcano.

- `model.ts` owns bounded process state, finite lobe cooling and particle deposition. No numerical depth threshold or prediction of island formation is encoded.
- `islandGrowth.ts` owns positive per-deposit summit weights, continuous outlet migration and authored preferred flow bearings. `geometry3d.ts` applies them to closed deposits, matching cut faces, grounded pillows/fragments and finite particulate volumes. It samples the authored deposit contributions once and combines their existing growths in a bounded frame-local lattice. The exposed axis retains `islandSurfaceY`; off-axis relief is illustrative.
- `coastalFlow.ts` owns finite retained flow paths, birth-terrain headings, parent-connected side breakouts, actual sea-plane contact, quenching, coastal fragments and medium-separated condensation; `coastalFlow3d.ts` owns their fixed buffers and disposal. Emplacement surfaces freeze when their deposit ends, so later rock may bury old flows; erosion removes their visible skins with the supporting terrain.
- `coastline.ts` / `coastline3d.ts` own the actual outer sea-level contour, a shared exposed-water fraction and one retained faint surf ribbon.
- `ventMechanics.ts` owns thick, open rind geometry, bounded extrusion-lip flex and finite attached-to-ejected crust poses. `vent3d.ts` owns their retained meshes, per-piece cooling and disposal. The selected mechanism consumes this topic's existing lobe/episode/deposit state; water depth alone is not an eruption rule.
- `scene3d.ts` / `materials3d.ts` own the Three.js scene, opaque basalt and tuff, cooling seams, water-path attenuation, local deep-water illumination, camera gestures and depth-occluded particle volumes. The front rock and water are removed in the explicitly labelled cutaway. Orbit, keyboard and reset move the camera without resetting geological time. There is no independent process timer; the shared volcano `magmaMotion.ts` admits a bounded detail phase for exposed melt or the late island's passing wildlife.
- `islandEpilogue.ts` owns the extra six presentation seconds at the sustained-island ending and the fixed paths of one seabird and three offshore fish. `islandEpilogue3d.ts` owns their retained geometry, wing/tail articulation, cutaway admission and disposal; it consumes the same detail phase, without advancing geology or implying ecological colonization.
- `scene.ts` retains the original SVG projection as a labelled fallback. GPU loss and retry keep the last supplied frame. `main.ts` / `reader.html` now redirect legacy links to the integrated volcano project; that controller owns conditions, finite geological playback, paused restoration and disposal. No iframe or second player is mounted.
- `learning.json` contains three academic notes and four child narration segments per language, with separate visual cues. References were read on 2026-09-18.
- `catalog-entry.json` and `catalog-translations.json` are integration inputs; the root task owns shared registration.

## Scientific boundaries

Pillow morphology is selected for low effusion, not required at every depth. Ambient water pressure influences gas expansion but does not prohibit submarine explosions: direct NOAA observations at NW Rota-1 at about 550–560 m document predominantly magmatic-gas-driven activity. Shallow interaction is also conditional. Sea level is fixed; accumulation, geometry, trajectories, cooling and erosion are teaching choices. The final island retains most of its depicted vertical height underwater. Limited supply never emerges. The model does not solve fluid dynamics, thermodynamics, landslides, tsunamis or subsidence.

Primary sources are the NOAA ocean-floor overview, NOAA PMEL pillow-lava notes and NW Rota-1 observations, plus USGS lava–seawater interaction and Hawaiian volcano evolution. Exact links and claim-specific explanations are in the page and learning file.

## Summit and outlet form, 2026-10-21

Rounded individual pillows and mound-like accumulations are legitimate forms; a smooth, sealed round summit is not a universal submarine-volcano shape. The selected deep scene now has unequal extrusion shoulders and a small open cleft, with lower lobes following their supporting slopes rather than raised ball-like tiers. The selected shallow fragment case has a solid local floor, an incomplete irregular lip and angular near-vent debris. Its few inherited pillows stay on the lower flanks. These are two conditional reconstructions, not shapes determined solely by depth.

The island retains the original 24/13 supply history and its authored x section. Small off-axis outlet and downslope-exit details respond to the existing fragment/cap contributions through a shared, ordered contact mapping. Early pillows stay attached to the early seven-deposit base and become buried by later deposits, rather than rising onto the emergent cap. No common large circular crater is added. The same 32 × 80 deposit topology now concentrates radial vertices near the outlet; cut faces use those exact radii. There are no additional meshes, particles or process clocks, and the accepted camera/light settings are unchanged.

Morphology references checked on 2026-10-21: [NOAA PMEL lava morphology](https://pmel.noaa.gov/eoi/nemo/explorer/concepts/lavamorph.html) describes both pillow mounds/ridges and flatter flow forms. [Chadwick et al. (2019), West Mata AUV/ROV observations](https://www.frontiersin.org/journals/marine-science/articles/10.3389/fmars.2019.00495/full) documents different pillow-ridge, talus and local collapse features. [Embley and Chadwick (1994), northern Cleft](https://www.pmel.noaa.gov/pubs/outstand/embl1429/northern.shtml) distinguishes fissured older mounds from young mounds without those fissures. The [USGS submarine overview](https://pubs.usgs.gov/gip/volc/submarine.html) supports only the shallow debris-around-vent and settling explanation here; its historical statement about lack of direct deep-eruption observations is superseded by the NOAA observations already cited above. The displayed outlet positions, widths, depths and clast placement remain uncalibrated teaching geometry, not measured bathymetry or a universal crater rule.

## Validation

`node --import tsx --test topics/submarine-volcanoes/tests/model.test.ts` covers finite deterministic inputs, supply-dependent emergence, erosion timing, crust-before-core cooling, stable particle deposits and view-independent process state. Source checks do not establish scientific prediction or integrated browser behavior. The root task owns the final registered build and bilingual mobile/browser review.

## Surface and water detail refinement

The SVG now uses deterministic irregular strata, fractures, scree, cooled pillow skins, advancing hot seams and a few explicit cutaways. Deep water uses compressed attenuation and local ROV illumination; sunlight shafts are limited to shallow scenes. Fine suspended particulate plumes are clipped below the surface, while condensed mist is clipped above it. Island coasts show a wet edge and illustrative surf. All details derive from bounded progress, so pause and the final frame are stable.

New scientific references: NOAA Ocean Exploration, *Light and Color in the Deep Sea*; NOAA PMEL, *What is a Hydrothermal Plume?*; NOAA NWS, *Cloud Development*. Exact URLs are in the page and learning file. These establish the light/particle/droplet distinctions, not the chosen terrain, particle trajectories, plume duration, brightness or shoreline geometry. Hydrothermal activity is not identical to a lava eruption, and ending the displayed plume does not predict when real hydrothermal discharge ends.

Focused scene tests additionally check deterministic endpoints, no sunlight shafts in the deep scene, finite submerged particle packets and separate underwater/above-water clipping. The process model is unchanged.

## Local 3D reconstruction, 2026-10-21

The active integrated chapter now renders actual solid deposits, rough opaque pillow lobes, angular debris, three-dimensional storage lenses and a finite feeder. Pillow glow is limited to new fractures and fades with the existing crust clock. The deep-water scene has no solar light; its white local searchlight is an observation aid. Shallow water and the emergent island use a fixed mean sea surface with illustrative ripple shading, filtered daylight and distance attenuation. Waterborne particles and above-water condensation are separate density supports. They are finite teaching packets, not a hydrothermal or eruption-fluid solver. The volume ray stops at the scene depth, so hidden particles cannot paint over foreground rocks.

The island keeps the existing 24 deposit episodes and 13-unit limited-supply comparison, rather than scaling one finished cone. Layers have closed topology and retain shared ordered contacts during erosion. The radial extension, lobe sizes, section thicknesses, lighting and attenuation coefficients are uncalibrated. A cutaway removes front water as well as rock to expose the interior; that lighting is not an underwater photograph. Magma geometry is solid and partly crystalline in appearance, without a hollow chamber or invented circulation.

Geometry uses bounded buffers (32 radial rings and 80 sectors per deposit, at most 25 solids including basement); cached profile samples have one fixed size. A scene owns a 32³ noise texture, four fixed pillow prototypes (48 × 28 sphere subdivisions), at most 220 retained pillow instances and 420 rubble instances. Four shared rind sleeves and 24 thick lip patches cover 14 retained deep extrusion assemblies and one island-flow outlet; their cores borrow the four pillow prototypes. The explosive throat has one annular rim and one molten pocket. Seven crust-patch buffers each retain at most seven instances (49 pieces in total). No buffers are added during playback. The 19 retained surface-flow buffers each have 24 sides and 96 longitudinal segments, with five closed coastal-facies buffers of 234 vertices each, one fixed batch of 50 coastal fragments and one 322-vertex/320-triangle surf ribbon. The surf owner reuses 160 angular slots and searches the outermost actual sea-level crossing. The completed-flow route cache is bounded by the existing 19/13 flow episodes and two supply branches. Plume integration uses 16 representative parcels, at most 40 steps on desktop / 28 on narrow screens and a target whose longest side is at most 640 px. Process and camera changes render on demand. Hot material detail updates at most 24 times per second, respecting hidden documents, reduced motion, cooling and disposal. Leaving the chapter releases geometry, textures, materials, render targets, shadow maps, instance buffers, controls, observers and the GPU context. These are resource bounds, not measured frame-rate or real-device performance claims.

Visual references checked for this pass: [NOAA PMEL pillow lava](https://pmel.noaa.gov/eoi/nemo/explorer/concepts/pillows.html), [lava morphology](https://pmel.noaa.gov/eoi/nemo/explorer/concepts/lavamorph.html), and [NOAA light and color factsheet](https://oceanexplorer.noaa.gov/fact-sheet/light-and-color-fact-sheet/). No external imagery is bundled. See [local validation](VALIDATION.md) for current source, tests and browser evidence.

## Documentary material refinement, 2026-10-21

The four quenched pillow reconstructions have feeding necks, broken extrusion lips, local contraction joints and different low asymmetric silhouettes. Retained deep pillows overlap and enter the same underlying rock surface, with the active lobes growing from that pile. These forms are qualitative; apparent overlap does not assert a measured channel network. The active lobes still grow and cool only through `pillowState`.

The basalt rind is predominantly matte with small glassy patches, broader mineral variation, fine pits and interrupted contraction fractures. Continuous parallel surface striations were removed after actual preview inspection showed a fabric-like reflection. Fine rock and water detail fade with the pixel footprint to reduce distant aliasing. Broad, irregularly phased surface slopes replace a repeated ripple lattice, while the mean sea level stays fixed. The 32³ material volume is deterministic periodic noise, prepared once; no image or video texture is fetched.

Underwater suspended material and above-water condensation keep separate density supports. Eight underwater supports now overlap along a narrow source and a bending, expanding column; they share the finite emission envelope of the existing representative packets. In deep water their source follows a smooth, illustrative anchor on the same active pillow pile, so it is not hidden underneath the retained rock. The supports are optical reconstruction volumes, not eight separately tracked material bodies. Nested detail tears the rising edges and coarse internal light attenuation plus the same local ROV direction separate nearer wisps from denser cores. The source depth still terminates the volume ray at opaque rocks. The 16 supports, noise advection, illumination and sea detail all sample the supplied geological frame or camera; pause has no extra process clock. This is illustrative optical layering, not a fluid or radiative-transfer solution, and it does not establish a measured vent position or plume composition.

Additional reference pages checked on 2026-10-21: [NOAA PMEL West Mata imagery and image captions](https://www.pmel.noaa.gov/eoi/laubasin/laubasin-multimedia.html) and [NOAA Ocean Exploration, Vailuluʻu pillow lava](https://oceanexplorer.noaa.gov/multimedia/video-shorts-ex1702-pillowlava/). PMEL documents tubular extrusion, scrape marks, stacking and exposed narrow incandescent bands; the selected teaching scene does not reproduce a specific expedition, depth or measured material. The West Mata explosive images are shape/lighting references and do not make every deep pillow flow explosive. No external media were downloaded or bundled for this refinement.

## 熔体动态与喷口细节 / Molten detail and outlet, 2026-10-22

地下储存体保留固定晶体骨架与不规则熔体域；明暗和细小起伏在熔体内缓慢迁移，晶体不随之循环。供给岩脉采用向上的流动纹理，成岛情境的地表熔岩流保留冷壳斑块和受边界限制的薄层褶皱。流动表皮从同一个喷口开始，偏移的沉积中心不再成为断开的发射点。本轮最初的小型封闭喷口已由下述开壳挤出和破裂结构替代。亮区与几何尺度用于辨认高温物质，不是实测温度、黏度、形变或流速。

The underground storage retains a material-attached crystal framework and irregular melt domains. Brightness and small relief migrate within the melt while crystals stay fixed. The feeder has upward-moving material detail; the island scenario retains dark crust rafts and small folds inside its existing flow. Its current surface skin begins at the shared outlet; a deposit's offset center does not become a detached emitter. This pass's initial small closed outlet has been replaced by the open extrusion and rupture geometry described below. Brightness and geometry are illustrative identification cues, not measured temperature, viscosity, deformation or velocity.

这些细节复用已有火山材质时钟，过程暂停、拖动和换镜头不重置这段缓慢运动；沉积、枕状熔岩生长、冷却和羽流仍只读取原有地质进度。冷却后的外景停止细节渲染，剖面中仍显示残余熔体时继续；隐藏页面、减少动态与释放场景会停止工作，恢复时不补算隐藏期间的时间。相位在 2π 边界闭合，不增加地质过程时钟。局部暖光跟随已有热源，剖面补光只帮助读出移去前景后的岩石体积，不表示实测水下照明。ROV 影子在镜头和岩石不变时复用。

The existing volcano material clock provides this slow detail through process pause, seeking and camera changes. Deposits, pillow growth/cooling and finite plume packets still consume only geological progress. Cooled exteriors stop detail work; an exposed section with residual melt can continue. Hidden documents, reduced motion and disposal stop work without catch-up. The phase closes at 2π and adds no geological process clock. Local warmth follows the existing hot source; cutaway fill helps reveal exposed rock volumes and is not measured underwater illumination. ROV shadows are reused while camera and rock remain unchanged.

矿物差异和四种破口的位置以各自的材质参数保留，同类表面共用着色程序；冷岩石跳过熔体细节计算。不同外形不会因共用程序而变成同一个热区，切剖面也无需为每块枕状熔岩单独准备一套程序。

Mineral variation and the four broken-lip positions remain separate material parameters while each surface family shares its compiled program. Cold rock skips the molten-detail branch. Sharing a program does not merge heat or lip identity, and entering a cutaway does not require a different compiled pillow program for every lobe.

Appearance constraints were rechecked against [NOAA PMEL's West Mata observations](https://www.pmel.noaa.gov/eoi/laubasin/laubasin-multimedia.html), which show narrow incandescent bands exposed during extrusion as well as distinct explosive events. The selected reconstruction does not combine those observations into a universal eruption mechanism or reproduce a real site. No outside image, video or new texture is bundled.

## 冷壳撑裂与爆炸破裂 / Rind opening and explosive rupture, 2026-10-22

缓慢溢流使用有内外表面和断口厚度的开口冷壳，六片不等形唇缘由同一枕状熔岩的生长状态撑开，新熔岩体从开口伸出，暴露的熔体逐渐变暗、结壳。后方供给颈保持附着，连续熔岩舌按原有生长状态沿实际坡面伸展；只有唇缘以原位连接处作有限外翻。四种壳口外形、十四个有限生长位置和原有先壳后芯的冷却顺序保留。轻微熔体起伏和热唇缘屈曲读取已有材质相位，不推进地质进度，也不反复生成新的冷壳或喷发。

Slow effusion uses an open rind with inner/outer surfaces and finite fracture thickness. Six unequal lips open with the same lobe's growth while a separate molten body protrudes and the exposure subsequently cools. The feeding neck stays attached as a continuous tongue follows the actual flank with the original growth; only the lips flex out about their attachment points. The four collar shapes, fourteen finite lobe sites and rind-before-core cooling order remain. Small molten relief and hot-lip flex consume the existing detail phase without advancing geology or repeatedly generating crust or eruptions.

爆炸情境使用有真实喉口的岩缘和下方熔体。每次有限喷发前形成的七片薄壳，就是随后脱离、翻转、冷却并沉降的同一批网格；它们不会在起飞时被另一批悬空石块替换。浅水情境保留原有七次、共四十九个碎块身份；成岛情境只在原有五个碎屑沉积事件中破裂，有限补给分支不会得到这些事件。落地碎片固定在沉降处，后续堆积可以掩埋它们。喷出距离、错开破裂时间、薄壳再生、阻滞轨迹及冷却是定性教学重建，并未求解岩浆脱气、水汽化、断裂力学、流变或碎块质量守恒。两种情境不是“深水必溢流、浅水必爆炸”的通则。

The explosive reconstruction has an annular rock rim, open throat and underlying melt. Seven young rind patches per finite episode are the very same meshes that detach, rotate, cool and settle; no unrelated airborne stones replace them at launch. The shallow case retains seven episodes and 49 piece identities. The island case ruptures only during its existing five fragment-deposit episodes; limited supply never receives them. Settled pieces stay at their emplacement heights and may be buried by later accumulation. Distances, staggered rupture, rind regrowth, retarded trajectories and cooling are qualitative teaching choices, not solutions of degassing, vaporization, fracture mechanics, rheology or fragment mass conservation. These two selections do not assert that deep water always produces effusion or shallow water always produces explosions.

Sources rechecked on 2026-10-22: [NOAA PMEL pillow-lava morphology](https://www.pmel.noaa.gov/eoi/nemo/explorer/concepts/pillows.html) and [West Mata extrusion/explosion image and video captions](https://www.pmel.noaa.gov/eoi/laubasin/laubasin-multimedia.html). They support crusted extrusion and distinct fragmentation, including observed deep explosions; they do not calibrate this geometry or timing. No remote imagery is embedded or downloaded.

## 顶区成长与熔岩入海 / Summit growth and ocean entry, 2026-10-22

每次堆积分别加厚不同的肩部、碎屑岩缘、低缺口和后期填充区，喷口随连续的堆积权重缓慢偏移。地表流、供给岩脉、喷口薄壳和羽流使用同一位置；相邻供给事件重叠时，新事件刚出现的冷壳不会封住仍在流动的热熔岩。原有 24／13 次补给、剖面接触关系、早期水下枕状熔岩和有限播放过程保留。顶区并非统一缩放，也不把大型破火山口塌陷设为必经步骤。

Each deposit thickens different shoulders, fragment rims, low gaps and later infill. Continuous deposition weights move the common outlet used by the feeder, rind, surface flows and plume. Overlapping episodes keep the dominant hot outlet open. The 24/13 supply histories, shared section contacts and early submerged pillows remain; neither uniform inflation nor compulsory caldera collapse is imposed.

熔岩前缘沿当前岩面推进；只有出水的热流实际越过海平面，接触处才出现凝结水雾和水下细碎物。水下部分迅速变暗、减少表皮起伏，海侧保留冷却碎屑。完成的流痕固定在当时岩面，后期沉积可覆盖它们；停止补给后不会循环喷出。近景在出水后稍向海岸取景，方便同时观察源头与接触处。白色凝结羽流和火山灰不同，真实入海羽流还可含酸性气体与玻璃细屑。接触不自动触发一次大爆炸。

The advancing flow follows rock and must actually cross sea level before coastal condensation and underwater fines appear. Wet portions darken and lose surface mobility; chilled fragments and completed flow skins remain at their emplacement heights and can be buried. Close framing includes the coast after emergence. Condensation differs from ash; real ocean-entry plumes can also contain acidic gas and glass particles. Contact does not automatically trigger a large explosion.

The source constraint is [USGS, Lava entering ocean](https://www.usgs.gov/observatories/hvo/science/lava-entering-ocean), rechecked on 2026-10-22. Terrain, lateral routing, brightness, quenching, fragment sizes and optical supports remain uncalibrated teaching choices; no thermal, fluid, delta-stability or mass-conservation solver is claimed. 无新增热流、流体、三角洲稳定性或质量守恒求解；地形、流路、明暗、冷却、碎屑和羽流尺度仍为教学重建。


## 可辨海岸、贴地冷壳与流动表皮 / Readable coast and grounded lava skin, 2026-10-22

海岸按真实绘制地形的外侧海平面交线取样，不用圆环半径或剖面上的单一山顶标志代替。局部岩缘先出水时也能显示零散浪沫；海水随出水轮廓的比例平滑变得不透明，湿岩边缘帮助区分水上山体和水下坡面。剖面仍可移去前侧海水观察内部。凝结羽流从同一熔岩触水点开始，向海侧偏移，水下细碎物不会透过已变不透明的海面画到空气中。均为选定条件下的教学外观，不是测量的水色、风场、海浪或岸线演变。

The outer coast is sampled from actual terrain–sea intersections, including off-axis shoulders that emerge before the authored section summit. Faint, broken surf and a wet rock edge make that boundary visible. Sea opacity blends with the fraction of exposed coast; the cutaway still removes foreground water. Condensation begins at the same lava contact and bends seaward. Underwater fines lose above-water visibility through the more opaque sea. These are qualitative optical choices, not measured waves, water optics, wind or coastal evolution.

用户截图中的细长悬空物是旧流痕没有随侵蚀裁低造成的显示错误，现按同一地形支撑关系移除。后续正向堆积仍只掩埋旧流痕，不把它们抬到新地表。冷却表皮保留低矮粗糙起伏，不留下圆管状脊线；真正的岩石体积仍由原有沉积模型计算。热流中不规则冷壳与熔融裂隙沿坡缓慢移动，边缘及端点受约束，起伏的空间尺度随实际流长保持一致。入海处的粗糙封闭薄层与有限碎屑显示已有冷却堆积，不另增三角洲的质量或稳定性模型。

The unsupported strand in the reported screenshot was an old flow skin left above eroded terrain; it now erodes with its support. Later deposition can bury an old skin without lifting it. Cold skins keep low relief rather than raised cylindrical ridges; the existing deposit model still owns rock volume. Unequal cold rafts and molten seams travel inside the hot channel with fixed banks/endpoints and a flow-length-aware spatial scale. A rough, closed coastal facies and finite fragments depict chilled deposits without adding a delta-mass or stability solver.

Rechecked references: [USGS lava entering ocean](https://www.usgs.gov/observatories/hvo/science/lava-entering-ocean) for contact condensation and fragmented seaward deposition; [USGS pāhoehoe and ‘a‘ā morphology](https://www.usgs.gov/news/volcano-watch-pahoehoe-and-aa-lava-flows) for the distinction between crusted lobes and rough channel-fed lava. This historical article is used for morphology, not current eruption status. The scene does not claim that all lava has one surface style, or infer a calibrated viscosity, cooling rate or velocity from its visual phase. 本场景不把所有熔岩归为同一种表面，也不由显示相位推定黏度、冷却率或流速。

## 喷口改形与出水表面 / Reworked outlet and emerged facies, 2026-10-22

喷口岩缘使用同一地形上的有厚度开口网格。原有堆积历史改变不等高肩部、缺口及喉口轮廓，各次选定破裂削低不同扇区；熔融表面也随堆积改变不规则边界。出水和进入溢流阶段不再隐藏整组岩缘，也不再换成单个圆鼓的枕状模型。相邻供给有重叠时，喷口热度读取仍在供给的事件，避免新事件刚开始就把旧流突然熄灭。并非每次真实喷发都会显著扩大火山口，此处也不推定统一的喷口演化路线。

The thick, open rock rim stays rooted in the same terrain. Existing deposition weights change unequal shoulders, gaps and the throat outline; selected ruptures lower different sectors, while the irregular molten boundary evolves with accumulation. Emergence and lava overflow retain that rim instead of hiding it or replacing it with one swollen pillow model. Heat follows overlapping supplies, so a newly starting episode cannot extinguish an older hot stream. Real eruptions need not all enlarge a crater visibly; no universal outlet sequence is implied.

新壳保留完整足迹与有厚度的闭合网格，从熔体下方连续露出并降温。上一层离开喷口后下一层才开始，仍使用原有七／五次有限破裂与相同碎块身份。各次外形比例不同，碎块从各自实际脱离位置连续飞出，落地后保留；后续堆积可覆盖，侵蚀可降低其支撑。轻微液态运动继续使用原有受限显示相位，不生成额外喷发。

A new rind retains its full footprint and closed mesh thickness, emerging continuously from below the melt while quenching. The next rind starts after the previous one has left the outlet. The original seven/five finite rupture episodes and piece identities remain, with unequal episode proportions and continuous per-piece launch positions. Landed pieces remain, can be buried, and lose support with erosion. Small liquid motion still uses the existing bounded display phase without spawning extra eruptions.

`surfaceClasts.ts` 将出水表面限制为零散、低矮的棱角碎屑，各自归属一层碎屑或熔岩盖层；只随自身层的形成露出，之后可以被埋住，不会被不断抬到最新山坡。早期水下枕状熔岩仍在原有底部，后期流痕和冷却入海堆积仍由原有归属模块处理。此处的薄壳、岩缘重塑和碎石纹理都是未标定的教学重建，不求解完整破裂、侵蚀、碎块质量或自由液面。

`surfaceClasts.ts` owns sparse, low angular facies belonging to individual fragment or lava-cap deposits. They emerge with their own layer and can subsequently be buried instead of riding every newer slope. Early submerged pillows remain in their original base; retained flow skins and cooled coastal deposits keep their existing owners. Film formation, rim remodelling and clast facies are uncalibrated teaching geometry, not complete fracture, erosion, fragment-mass or free-surface solvers.

Morphology constraints: [NOAA PMEL pillow lava](https://www.pmel.noaa.gov/eoi/nemo/explorer/concepts/pillows.html) distinguishes slow, thickly crusted lobes from coalesced sheets; [NOAA PMEL flow emplacement](https://www.pmel.noaa.gov/eoi/nemo/explorer/concepts/emplacement.html) describes sheet thickening, crust collapse and renewed quenching; [USGS Surtsey structure](https://www.usgs.gov/publications/observations-structure-surtsey) documents pyroclastic tuff and a later hot lava shield. These support differentiated facies rather than carrying a uniform pillow texture onto the emerged island; they do not calibrate this scene's episode timing, dimensions or brightness. 上述依据支持区分沉积外观，不标定本场景的时间、尺度或亮度。

海水先冷却接触的外皮，不代表整团熔岩立即凝固。显示层分别读取已有的 `crust` 和 `coreHeat`：不透明外壳可以变暗，而露出的前端和窄裂隙仍显示内部余热与受限液态运动，之后才随核心状态逐渐消退。已完成生长的固体壳不再仅因内部温热而摆动。入水流段的主要表皮保持暗色，仍在供给时只通过窄裂隙显示热熔体，新推进的头部保留较强暴露。没有改动原有十四次枕状生长或核心降温时间，也没有由亮度推算实际温度、完整凝固时间或冷却速率。

Seawater quenches the contacting skin before the whole lobe solidifies. Rendering reads the existing `crust` and `coreHeat` separately: the opaque rind can darken while an exposed nose and narrow tears still reveal residual interior heat and bounded liquid motion, fading with the supplied core state. A completed solid shell does not keep rocking just because its interior remains warm. Wet channel skins stay mostly dark, admitting narrow hot tears during supply and stronger exposure at an advancing head. The fourteen pillow-growth histories and core-cooling schedule are unchanged; brightness does not measure temperature, complete solidification time or cooling rate.


## 连续挤出、贴坡推进与结壳 / Connected extrusion and progressive rind, 2026-10-22

`pillowFlow.ts` 用十四个固定源头和原有供给状态构建连续熔岩舌。前缘从同一壳口向外推进，路径总体下坡，允许小于流层厚度的岩面粗糙起伏，不绕回原地鼓成圆块。闭合截面有厚度，底部嵌入同一岩面；成长完成后保留原位，不把旧流体不断抬到最新山坡。它替换了热核心的固定圆鼓网格，没有新增补给事件或循环喷出。

`pillowFlow.ts` projects the original fourteen supplies into continuous tongues from fixed source sites. A front advances from the same collar along a predominantly downhill route, accommodating small rock roughness within the flow thickness rather than looping back to inflate a round core. Closed cross-sections retain thickness and ground contact. Completed bodies keep their emplacement instead of riding each new slope. These replace the rigid swollen hot-core meshes without adding supply events or recycling eruptions.

每段表皮按前缘实际到达的先后计算暴露次序：较早流出的后段先出现暗色冷壳，新挤出的头部保留较多热熔体，随后也逐渐结壳。核心余热仍独立读取原模型，不把薄壳变暗当作整团凝固。运动中的不规则壳片、熔融缝和褶皱使用同一个受限材质相位，沿路径传递；头尾与边部受约束，完整冷壳不再随相位迁移。该相位不推进前缘、不新增岩石，也不重新播放形成历史。

Surface exposure is ordered by the arrival of the advancing front. Earlier upstream portions develop dark rind first; the newly extruded head exposes more melt and subsequently quenches too. Interior heat still follows the original independent core state. Unequal rafts, molten tears and folds travel with the same bounded detail phase inside fixed source/front/side constraints; fully quenched skin stays attached. The detail phase neither advances the front nor supplies new rock or replays formation.

`pillowFlow3d.ts` 拥有十四个固定流体缓冲及壳口资源，借用场景的噪声与相位，统一裁切和释放。背景旧岩块仅是示意地貌的装饰细节，在完整的固定流路周围预留间隙，避免它们穿过新表示的流体；这些间隙与进度无关，岩块不会在熔岩接近时突然消失。真正的山体堆积仍由原有模型负责。

`pillowFlow3d.ts` owns fourteen retained flow buffers and their collars, borrowing scene noise/phase and sharing the clipping/disposal lifecycle. Old background rocks are illustrative dressing; static clearance around the complete finite routes keeps those props from cutting through the new flow bodies. Clearance does not depend on progress, so an approaching front cannot make rocks suddenly vanish. The original model continues to own edifice accumulation.

这些是选定的缓慢水下挤出条件，不代表所有海底喷发都会形成这种流态。到达次序、表皮覆盖、光泽、前缘宽厚和褶皱均为未标定的教学外观，不是流变、热传导或精确质量守恒求解。[NOAA PMEL 的枕状熔岩说明](https://www.pmel.noaa.gov/eoi/nemo/explorer/concepts/pillows.html)与[West Mata 现场影像说明](https://www.pmel.noaa.gov/eoi/laubasin/laubasin-multimedia.html)约束了“壳内供给、有限挤出、局部暴露热熔体”的方向，不标定本场景的速度、温度或时间。

This selects slow underwater extrusion, not a universal submarine eruption style. Arrival ordering, rind coverage, sheen, front dimensions and folds remain uncalibrated teaching appearances rather than rheological, heat-transfer or exact mass-conservation solutions. [NOAA PMEL's pillow-lava account](https://www.pmel.noaa.gov/eoi/nemo/explorer/concepts/pillows.html) and [West Mata field-image captions](https://www.pmel.noaa.gov/eoi/laubasin/laubasin-multimedia.html) constrain crusted supply, finite extrusion and local incandescent exposure, not this scene's speed, temperature or timing.

## 喷口可读性与冷却后的生命 / Outlet legibility and later life

喷口近景在有供给时跟随同一熔岩舌的壳口与前缘，连续供给结束后才让整个后段封壳。已经接触海水的外皮仍先冷却；供给中的内部可以把薄皮再次撑开，因此活动熔岩不再只剩几个分离的亮头。流体保持低矮、贴坡的厚度和不等形冷壳片，已有独立细节相位只移动仍活动的表皮。冷壳和周围岩石由更清楚的局部探照灯、补光照明，不增加深水阳光或全景自发光。

While supplied, the close view follows the same tongue's collar and front. The full wake seals after that finite supply ends. Water-contacting skin still quenches first, but its supplied interior can reopen thin skin, preserving a connected visible active body rather than isolated bright heads. Low terrain-contacting thickness and unequal rind rafts remain; the existing bounded detail phase only moves active skin. Stronger local observation lighting reveals cold rock without adding deep sunlight or making the whole scene emissive.

后续环境默认保留裸岩。选择“适合生物定居”后，深水例子另外选择局部弥散热液条件，冷岩面上先有稀疏灰白或棕褐微生物膜，再有少量贴岩帽贝；不增加管虫、珊瑚或深海草坪。成岛例子只在冷却、停止增加岩石、露出海面且选定能留土留水的岩缝中出现零散土斑与低矮幼苗。较早停止供给仍在水下，没有陆生植物。按钮“看冷却后的生命”明确跳到后期近景；换环境和章节仍保存本题条件。后半段压缩了另外的长期演替，不是年数、温度、土壤生成、化学能量或种群求解，也不是每座火山的必然终点。

Later conditions default to bare rock. Selecting suitable colonisation adds a local diffuse-vent case in deep water: sparse cream/brown microbial films followed by a few rock-hugging limpets, without tubeworms, corals or a deep-sea lawn. The island case admits small soil patches and low seedlings only after cooling and deposition, at exposed selected cracks retaining soil and moisture. Limited supply remains submerged and has no terrestrial plants. “Life after cooling” explicitly seeks to the later close view; environment and question memories retain the selected conditions. The later segment compresses a separate long colonisation sequence, not years, temperature, soil formation, chemical energy or population dynamics, and is not every volcano's inevitable endpoint.

生态外观依据 [NOAA PMEL 定居观察](https://www.pmel.noaa.gov/eoi/nemo/explorer/concepts/colonization.html)、[1998 年 Axial 航次报告](https://www.pmel.noaa.gov/eoi/nemo1998/report98.html)与 [USGS 初生演替说明](https://www.usgs.gov/news/volcano-watch-lava-flow-forest-primary-succession)。这些资料支持群落与留土环境有差别，不标定本站地点、数量、外观或时间。没有下载或打包外部影像。

Appearance is constrained by [NOAA PMEL colonisation observations](https://www.pmel.noaa.gov/eoi/nemo/explorer/concepts/colonization.html), the [1998 Axial cruise report](https://www.pmel.noaa.gov/eoi/nemo1998/report98.html) and [USGS primary succession](https://www.usgs.gov/news/volcano-watch-lava-flow-forest-primary-succession). They support differing communities and soil-retaining conditions, not this scene's sites, counts, appearance or timing. No external imagery is downloaded or bundled.

生态近景由 `oceanEcology.ts` / `oceanEcology3d.ts` 拥有，固定十六个海底、二十个陆地候选地点，复用四个绘制对象、几何和材质（144,540 字节几何/实例数据，不含共享噪声和驱动开销）。微生物膜贴实际冷岩与熔岩三角面，薄而破碎，少量帽贝偏在膜缘的岩面上；陆地候选避开真实沉降碎片。装饰岩块在完整静态占地上预留空隙，切换生态条件不会让岩石消失。SVG 回退保留所选条件供重试，仍画原有地质过程并收起三维生态入口；它不是新增生态近景的等效渲染。

`oceanEcology.ts` / `oceanEcology3d.ts` own sixteen marine and twenty land candidate sites, reusing four draw objects, geometries and materials (144,540 bytes of geometry/instance data, excluding shared noise and driver overhead). Thin, broken films conform to actual cooled rock/flow triangles, with a few limpets offset onto adjacent rock; land candidates avoid real deposited clasts. Dressing rocks allow the complete static footprints, so changing ecological conditions never makes rocks disappear. The SVG fallback retains the choice for retry while drawing the existing geological process and hiding the 3D ecology entry; it is not an equivalent rendering of the new close view.

## 海底冷岩观察 / Cooled seafloor observation, 2026-10-23

海底生态近景靠近同一固定岩面，显示更易辨认的断续淡褐、灰白薄毯和附着帽贝。薄毯边缘沿条带缓慢弯折，内部有深色裂隙与空白；玄武岩仍可透过薄层与空隙辨认。帽贝保留原来的小足迹，以不对称低锥壳、细肋、生长纹和贴岩软足区分于石块。观察镜头斜俯同一地点，现有探照灯移到侧上方，柔和补光保留暗部，表现壳体明暗两侧与接触阴影；不增加深海阳光、自发光或另一个生态动画时钟。

The marine close view approaches the same fixed rock surface, revealing broken tan/cream mats and attached limpets. Gently bent strip margins contain darker tears and gaps, with basalt visible through the thin coverage. Limpets keep their original small footprints, distinguished from pebbles by low asymmetric conical shells, ribs, growth bands and rock-contacting feet. The camera looks obliquely down at the same site. The existing searchlight moves to an upper-side position while soft fill preserves the darker flank and contact shadow. Animal footprints, deep-water sunlight, emission and the number of process clocks do not change.

统一控制器以 `suitable`、原进度 `1` 和 `vent` 视角进入这一观察，海底固定观察点为 `focusSite=4`；成岛近景保留原来的土斑和幼苗地点，从实际山体的上方外侧接近。局部弥散热液仍是主动选择的环境条件，不能从残余喷发羽流或暗色岩石推断出来。膜先于少量帽贝出现，水下位置和原有局部冷却状态仍是必要条件；裸岩、浅水碎屑与未出水的陆生对照不变。三角面接触、回退再前进、裁切和一次释放由专题测试覆盖，实际浏览器可读性由最终集成验收确认。

The integrated owner enters this observation with `suitable`, the existing progress `1` and the `vent` view; its fixed marine focus is `focusSite=4`. The island retains its soil/seedling sites and approaches them from above the actual mountain's outer flank. Local diffuse venting remains an explicitly selected condition, never inferred from an eruption plume or dark rock. Films precede a few limpets, with underwater position and the original local cooling state still required. Bare, shallow-fragment and submerged terrestrial controls remain unchanged. Topic tests cover triangle contact, seeking, clipping and one-time disposal; final integrated browser inspection establishes actual readability.

[NOAA PMEL 定居观察](https://www.pmel.noaa.gov/eoi/nemo/explorer/concepts/colonization.html)与 [1998 Axial 航次报告](https://www.pmel.noaa.gov/eoi/nemo1998/report98.html)于 2026-10-23 复核：冷却熔岩裂隙附近可有弥散排流、微生物毯和小型腹足类，不同喷口的早期群落可以不同。本例只选其中的薄毯与少量帽贝，不重建完整群落。地点、数量、色彩、壳形、观察放大率及后段时间均未标定，不表示所有海底火山最后都会长出相同生态。

[NOAA PMEL colonisation observations](https://www.pmel.noaa.gov/eoi/nemo/explorer/concepts/colonization.html) and the [1998 Axial cruise report](https://www.pmel.noaa.gov/eoi/nemo1998/report98.html), rechecked on 2026-10-23, support diffuse flow near cooled-lava cracks, microbial mats and small gastropods, with differing early communities at neighbouring vents. This case selects mats and a few limpets rather than reconstructing a complete community. Sites, counts, colour, shell form, observation magnification and the later time interval are uncalibrated; they do not imply one ecosystem endpoint for every submarine volcano.

## 成岛生态镜头 / Island ecology camera, 2026-10-23

成岛后的生命观察固定看第 5 个原有土斑，从上方外侧接近，给山体和小苗保留可见的间距。它只改变观察镜头，不抬高岩石、移动土斑或放大植物。近景的轨道距离与俯视范围单独限制；退回喷发后恢复普通观察范围。十二个有界地形高度采样保留镜头至观察点的间距，完整实际沉积三角面的射线检查负责回归验证。

Island life observation keeps original soil site 5, approaching from above its outer flank with clearance from the mountain and small seedlings. This changes the observation camera only, without raising rock, moving soil or enlarging plants. The close view has its own minimum orbit distance and downward viewing range; returning to eruption restores the ordinary observation bounds. Twelve bounded terrain-height probes preserve approach clearance, while regression tests raycast the complete actual deposit triangles.

`OceanCameraMotion` 是 `scene3d.ts` 内实际生产 `setView` / `draw` 共用的有限镜头过渡。成岛生态有明确的观察锚点，进入或返回时取消旧插值并使其回调失效，避免早期喷口镜头在后期山体完成后落进岩石。测试按生产调用次序启动早期镜头、送入后期生态、强制交付旧回调，再检查真实相机位置、完整土斑与小苗的可见性；还覆盖快速返回。海底已验收的材质、灯光与镜头参数保持原样，生态状态和地质时间都不由这个过渡推进。

`OceanCameraMotion` is the finite camera transition used by production `setView` / `draw` within `scene3d.ts`. An explicit island-life observation anchor cancels and invalidates earlier interpolation on entry or return, preventing a completed early-vent camera from ending inside later rock. Tests follow the production call order, start the early transition, supply later ecology, force obsolete callbacks and then check the real camera position and complete soil/seedling visibility, including rapid return. Accepted marine materials, lighting and camera parameters remain unchanged. This transition advances neither ecological state nor geological time.

## 喷口与断壳的连续形态 / Continuous outlet and broken rind, 2026-10-23

浅水与成岛喷口的熔融面采用贴同一地形的闭合薄体，边缘埋入已有厚岩缘。顶面与底面有独立的材质标记，周边保持暗冷，内部不等形壳筏、熔融破口和低幅褶皱读取原有热度与细节相位。冷却后保留贴岩的低矮痕迹；几何不靠整体压扁、旋转或缩放表现流动。材质使用连续平面坐标，避免角度接缝形成放射状条纹。

The shallow and island outlet uses a closed thin body conforming to the same terrain, with its perimeter embedded in the existing thick rim. Explicit top/bottom material attributes keep the banks quenched while unequal inner rafts, molten openings and small folds consume the existing heat and detail phase. Cooling leaves a low attached scar. Flow is not represented by squashing, rotating or scaling the whole body. Continuous Cartesian material coordinates avoid a radial stripe at the angular seam.

碎壳仍属于原有有限破裂事件，完整足迹与实体厚度从形成、脱离到沉积一直保留。各块有不同的曲率、厚度、角状断面与翻滚，接触后逐渐落稳；后期堆积可以把它们埋住。暗色外壳与新鲜断面上的不等热斑区分开，不用整圈发光描边表示岩石。热斑冷却仍由原事件进度负责，独立细节相位不会产生新的爆破或改变碎块轨迹。

Fragments retain their original finite rupture events, full footprints and solid thickness through formation, detachment and deposition. Unequal curvature, thickness, angular tears and tumbling lead into damped contact and rest; later deposition can bury them. Dark outer rind differs from uneven hot pockets on fresh fracture faces, without outlining every rock in orange. Event progress still owns cooling; the separate detail phase creates neither explosions nor projectile motion.

[NOAA 的 West Mata 现场影像说明](https://www.pmel.noaa.gov/eoi/laubasin/laubasin-multimedia.html)描述了冷壳碎块被抛入水中、随后沉降，同时熔岩继续沿坡流出。这约束本次表现方向，不标定本模型的碎块尺寸、轨迹、速度、碰撞或温度，也不把临近海面当作真实火山必然爆炸的规则。未引入外部影像资产。

[NOAA's West Mata field-video descriptions](https://www.pmel.noaa.gov/eoi/laubasin/laubasin-multimedia.html) describe quenched clasts ejected into water and settling while lava continues downslope. This constrains the presentation, not fragment dimensions, trajectories, speed, collisions or temperature, and does not make proximity to the surface a universal explosion rule. No external imagery is bundled.

## 成岛早期水下出流 / Initial underwater island effusion, 2026-10-23

成岛情境的早期出流采用有封闭厚度的叶状、管状熔岩体，供给颈与同一喷口连接，前缘按原有沉积进度沿坡伸展。整个底面按实际绘制的岩层三角面落地，横向边缘不再悬空；完成后的底面留在原位，后续岩层可以覆盖它，侵蚀可以移除其暴露部分。沿程到达时间让后方表皮先结壳，新到达的前缘保留较多裸露熔体；仍有供给时，局部上表面可露出细窄热缝。水先使外壳骤冷，并不意味着整个熔岩体瞬间凝固。

Initial island effusion uses closed, thick lobate/tubular bodies attached to the shared outlet. The original deposit progress extends each front downslope. The entire lower width follows the actual rendered deposit triangles, so banks do not hang over curved terrain. Completed emplacement stays fixed; later deposits may bury it and erosion may remove its exposed portion. Arrival along the route orders older upstream rind before newly exposed fronts; ongoing supply can retain a narrow upper molten seam. Water quenches the outer skin first, which does not imply immediate solidification of the whole body.

初始喷口改为低矮鼓起的暗壳，只在朝向出流的一侧保留不规则热破口；这项外观调整在原有碎裂阶段前连续退出，不另造喷发时钟。背景的 120 个旧熔岩体按长短不一、局部错落且部分埋藏的片段相互叠压，保留生态观察点和出流路线的空间。暖光缩到真实出流口附近，深水与浅水对比的光照条件保持各自设定。

The initial outlet has a low swollen dark rind with an asymmetric hot opening toward the outflow. This appearance blends away before the existing fragment stage without creating another eruption clock. The same 120 older background bodies form unequal, interrupted and partly buried overlapping patches, preserving ecology sites and active-flow clearances. Reduced local warmth follows the actual outlet; the distinct deep/shallow observation lighting remains intact.

这一版保留 24/13 次沉积、19/13 个有限出流身份及已有浅水破裂和入海接触机制。每个完成出流只缓存 2,561 个地表高度，表面褶皱与热缝读取已有有界材质相位；它们不推进沉积、不反复长出新石块，也不改变接地底面。外形、表皮冷却时序、光照和堆叠位置均为教学重建，不是实测地形、岩浆流变、传热、热辐射或精确质量守恒计算；低溢流率的枕状/管状外形也不是所有海底熔岩的统一形态。

This pass retains the 24/13 deposits, 19/13 finite outflow identities and existing shallow rupture/sea-entry mechanisms. Each completed route caches only 2,561 terrain heights. Wrinkles and molten tears use the existing bounded material phase without advancing deposits, spawning more rocks or displacing the terrain-facing surface. Shapes, skin-cooling timing, lighting and placement are teaching reconstructions, not surveyed terrain, rheology, heat transport, radiometry or exact mass conservation. Low-effusion pillow/tubular forms are not a universal form of submarine lava.

Appearance constraints follow [NOAA PMEL pillow-lava morphology](https://www.pmel.noaa.gov/eoi/nemo/explorer/concepts/pillows.html) and the descriptions and captions of [West Mata observations](https://www.pmel.noaa.gov/eoi/laubasin/laubasin-multimedia.html), checked on 2026-10-23. These support connected extrusion, outer rinds, exposed incandescent bands and overlapping bodies; they do not calibrate this selected site or its timescale. No external video, image or texture is bundled.

## 主流、侧向挤出与改道 / Main flows, side breakouts and changing routes, 2026-10-23

成岛早期仍保留一条主要出流。原有四次水下供给改为较短、较窄的侧向熔岩体，从上一条主流已经到达的位置挤出；它们不另增喷发次数，也不在材质相位中反复生成。侧支的供给颈留在母流内部，沿一小段埋藏连接爬出壳边，再在本次供给时的坡面铺展。完成后的岩体保留落位高度，后来的岩层可以埋住供给颈和旧流痕，不会把旧岩体抬到新的山坡上。母流与侧支的原有供给时段重叠，供给结束后保持各自身份并逐渐冷却。

Early island growth retains a principal outflow. Four existing underwater supplies now form shorter, narrower lateral lobes from already reached positions along the preceding primary flow. They add no eruption episodes and do not repeat through the material phase. A branch retains its neck inside the parent and climbs through a short buried connector to spread across its own emplacement surface. Completed rock retains that emplacement; later deposits may bury its neck and old flow without lifting it onto a new flank. The original parent/child supply intervals overlap, and each retains its own identity and cooling endpoint.

后续主流在出生时，读取当时已有的岩层地形，在邻近方向中权衡较低路径与转弯幅度。方向一旦确定，该条熔岩便保持方向身份，不会在前进时扫来扫去。坡面上的小范围转向仍读取实际地形；主喷口的开口跟随主流，侧支不会把山顶喷口拖到自己的方向。接近海面后的碎裂和入海机制、24/13 次沉积与19/13 个出流身份保持原有设定。背景岩石事先为两种供给历史的完整路线留出空间，播放时不临时移除石块。

A later primary supply selects its heading once at birth from the deposited terrain, balancing lower neighbouring paths against a turn preference. That heading remains fixed as the front advances, while small steering follows the local surface. The summit opening follows the feeding primary; a flank branch cannot redirect it toward the secondary lobe. Near-surface fragmentation, sea entry, the original 24/13 deposits and 19/13 flow identities retain their existing settings. Static background rocks reserve complete path envelopes for both supply histories before playback rather than disappearing when lava approaches.

这些是有地形约束的定性出流选择，侧支位置、长短与时序经过教学选择，不是裂隙扩展、流量分配或熔岩黏度求解。地形场仍来自原有沉积模型，不宣称严格体积或质量守恒；冻结的方向也不表示自然熔岩无法改道。[USGS 熔岩流地形约束说明](https://pubs.usgs.gov/sim/3387/sim3387_pamphlet.pdf)支持先前堆积影响后续路径及侧向次级流体，[NOAA 枕状熔岩说明](https://www.pmel.noaa.gov/eoi/nemo/explorer/concepts/pillows.html)支持相互连通、外壳包裹的熔岩体；这里没有复刻某次实测喷发。

These are qualitative, terrain-constrained route choices. The selected branch sites, dimensions and timing do not solve fracture propagation, discharge partition or lava rheology. Terrain still comes from the existing deposit model, with no claim of strict volume or mass conservation; freezing a displayed heading does not imply that natural lava cannot reroute. The [USGS account of topographic controls](https://pubs.usgs.gov/sim/3387/sim3387_pamphlet.pdf) supports earlier deposits influencing later paths and lateral secondary lobes, while [NOAA's pillow-lava account](https://www.pmel.noaa.gov/eoi/nemo/explorer/concepts/pillows.html) supports connected, rind-enclosed bodies. This does not reconstruct a measured eruption.

## 出水后的短收尾 / A short emerged-island ending, 2026-10-23

持续补给的成岛情境在最后 20% 的播放中平滑增加约 6 秒观察时间，前段、拖动进度和其他供给／水深情境保持原有意义。出水且停止堆积后，1 只海鸟从空中掠过，3 条小鱼在离岸水下经过；它们只作为来访背景，不表示刚冷却的火山立即长出生态群落，也不指定实际物种、数量、体型比例或到达日期。原有微生物／笠贝和土层／幼苗观察仍由独立的适宜条件选项控制。

The sustained island case smoothly adds about six presentation seconds over the last 20% of playback. Earlier playback, direct seeking and the other depth/supply cases retain their existing meaning. After emergence and the end of accumulation, one seabird passes overhead and three fish move offshore below the water. They are visiting background animals, not immediate colonization of fresh lava or a claim about species, abundance, scale or arrival dates. The existing microbial/limpet and soil/seedling observations still require their separate suitable-conditions selection.

这些固定动物在过程终点仍可移动，身体不会随相位缩放或反复生成。它们读取既有有界细节相位，鱼始终在海水中且完整网格避开实际岩体；不改海水透明度，不把鱼画到水面之上。冷却后的熔岩不会因此重新发亮或生长。剖面观察隐藏这段背景，页面隐藏、减少动态或场景释放时沿用既有停止与清理规则；没有增加定时器、灯光、贴图或新的地质时钟。SVG 降级保留原有地形说明，不绘制这段三维背景。

The same retained animals keep moving at the process endpoint without scaling or respawning. They consume the existing bounded detail phase; complete fish meshes remain underwater and clear the actual rock. Water opacity is unchanged and fish are not composited above it. Cooled lava does not relight or grow. Cutaway observation hides this background; hidden pages, reduced motion and scene disposal retain the existing stop/cleanup rules. No timer, light, texture or geological clock is added. The SVG fallback retains its existing terrain explanation without this 3D background.

### 海鸟入场 / Seabird arrival, 2026-10-23

海鸟第一次出现时，从当前镜头左缘以外飞入，在约 3 秒的弯曲进场后接上原有绕岛路线；位置、切向和朝向连续，身体不会在圈内放大或淡入。入场只发生一次，相位绕回不重播；拖回尚无动物的阶段后，再进入末段会重新入场。暂停地质过程与切换镜头不会重启它。减少动态时直接保留轨道上的静止海鸟，避免它永远停在画面外。入场仍读取同一细节相位，没有新增时钟或动物身份。

On first admission the bird enters from beyond the current camera's left edge, then follows a roughly three-second curved approach into its existing island orbit. Position, tangent and forward heading meet continuously, without enlarging or fading a bird into the circle. Entry happens once and does not repeat when the phase wraps; seeking back before the animals' interval allows a new entrance. Pausing geology or changing views does not restart it. Reduced motion instead leaves a static bird on the orbit so it does not remain offscreen. Entry consumes the same detail phase, with no additional clock or animal identity.
