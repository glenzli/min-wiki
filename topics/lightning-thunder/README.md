# 闪电和雷声是怎样形成的 / How lightning and thunder form

云里怎样积累电荷？闪电为什么会分叉，为什么总是先看见闪电再听见雷声？把一次放电放慢，看清光与声音各自的旅程。

How does a cloud separate charge? Why does lightning branch, and why does thunder arrive later? Slow down one discharge and follow the journeys of light and sound.

## Continuous cloud-to-thunder study · 2026-10-22

本轮把原有外景之前的机制补成同一条观察路径：云内相遇 → 接触交换与电荷分离 → 微弱分步先导及向上连接 → 沿已接通原通道发展的回击 → 光声到达。云内是可有限转动的真实三维局部，冰晶枝形、结凇的霰与过冷水滴保留同一身份；没有围住空气的容器、云壳或地板。阶段、镜头、讲解深度和定性起电情境共用进度，不因切换重置。默认随过程先看云内，再回到原来的精细云、塔、地景和室内房屋；也可固定一个视角前后对照。

The original exterior now follows a continuous causal journey: cloud encounters → contact charging and separation → faint stepped leader and upward connection → a return stroke along the attached path → light and sound arrival. The bounded 3D interior preserves the same branching ice, rimed graupel and supercooled-droplet identities in open air, without a vessel, shell or floor. Stages, lenses, reading depth and the qualitative charging case share one progress. The default view follows the cloud interior into the retained detailed cloud, tower, terrain and indoor house; a fixed lens supports comparison without a reset.

- **Core question / 核心问题:** What does each prerequisite add, and why does sound arrive after the same flash? 每一步增加什么必要环节，为什么同一次放电的声音到得更晚？
- **Change and observe / 改变与观察:** At the same progress, compare sustained and weaker differential transport after the same contacts; the selected weaker case produces no modeled ground flash, return stroke or associated sound. Keep temperature fixed to compare distance, then keep distance fixed to compare temperature. 相同接触后比较持续分离与较弱分离；较弱案例不产生本次地闪、回击或声音。再分别控制距离和传播空气温度比较光声延迟。
- **Misconceptions / 容易误解:** Contact alone is not a flash. Selected particle polarities are not a universal temperature/water-content rule. The upward bright front is not the motion of every charge. No flash in one teaching case does not establish real-storm safety. 接触不等于闪电，选定极性不适用于所有温度与含水量，回击前沿方向不等于全部电荷的运动方向，未演示地闪更不是安全结论。
- **Evidence and limits / 依据与边界:** NWS supports the causal sequence; the linked laboratory study supports the polarity qualifications. Positions, symbols, motion and region washes are qualitative, without microphysical, electric-field, breakdown or hazard prediction. Only sound delay is calculated from distance and the dry-air temperature approximation. 依据 NWS 因果说明与所列碰撞起电实验；只计算近似光声延迟，不把云内几何或符号当测量。

`cloudModel.ts` owns stable particles, encounter/contact samples, the contact-support constants, the shared crystal segment specification and qualitative separation. `cloudParticleGeometry.ts` owns the actual merged particle buffers and rendered orientation. Its real shaft cap and rimed pole meet at the model anchor; before transfer, surface bounds stay disjoint and both bodies hold their orientation. Production-triangle tests verify all pairs in both charging cases, rather than inferring contact from center distances. `model.ts` gates the chosen flash and owns attachment/stage/sound/route contracts. `cloudScene.ts` owns one renderer, shared fixed geometry, bounded orbit and GPU cleanup; `cloudView.ts` owns its lazy import, generation guard, same-state SVG fallback and fresh-canvas retry. `scene.ts` still projects the original channel and retained `stormArtwork.ts` exterior; it now rejects hidden/zero-size draws. `study.ts`, `content.ts` and `learning.json` own equivalent Chinese/English explanations and qualifications. `main.ts` composes one Reader toolbar, current explanation, pause/seek, previous/next stages and the supplied clock.

The cloud renderer is created at most once until retry; retry disposes its predecessor and replaces a lost canvas. Fixed ice and rime geometry is merged once and shared, with 71 mesh objects and at most 24 visible charge sprites, two 64 × 64 sign textures, and a pixel ratio capped at 1.6. There is no independent render loop or per-frame geometry construction. The SVG fallback consumes the same particle frame and contact extents. Existing storm image/buffer bounds below are retained. These are source bounds, not measured frame-rate or device-memory claims.

User-started playback only; changing reduced-motion preference pauses playback, reduced motion keeps the cloud camera fixed, and hidden documents suspend the supplied clock without catch-up. Final exit rejects late imports and releases the 3D, exterior, pointer, resize and texture resources. The explanation and native stage controls remain available on render failure. Sound never autoplays, and the exterior keeps one smooth attachment-gated flash.

Deep links support `p=0..1`, `lens=follow|cloud|storm`, `charging=sustained|limited`, `distance=0.5..8` and `temperature=0..35`, alongside Reader language/reading parameters. Invalid values are bounded or replaced by defaults. Reading/lens/condition changes preserve the current progress; previous/next and native progress controls support reverse comparison. These parameters restore a teaching state, not a real weather observation.

## Teaching boundaries

通道、云体、电荷符号和声波圆弧均为教学示意，尺度不一。这里只展示一次负地闪，没有覆盖云内闪电、正地闪等类型。不会自动播放声音，也不制造全屏频闪。

Clouds, channels, charge signs and sound-wave arcs are illustrative and use different scales. One negative cloud-to-ground flash is shown, excluding intracloud and positive flashes. No sound autoplays and there is no full-screen strobe.

## Sound-front and clock pass · 2026-09-28

前三幕的进度现在只称为慢放进度；末幕从闪光重新起表，显示模型中的声音传播秒数，播放本身仍压缩时间。声波圆弧和地面传播线使用同一示意投影，到达判定仍由声速和所选距离计算。近处的 0.5 km 被视觉放大，使室内观察点不贴上放电尖端；因此画面位置不能当线性距离标尺。儿童版看到当前声波是否到达，学术版同场景的侧栏可阅读关系式、变量和限制。美国国家气象局的雷声和负地闪说明支持通道形成、回击与声波的因果顺序；这里只演一条负地闪路径，并没有预测危险范围。

The first three stages now report slow-motion progress rather than invented elapsed seconds. The last stage restarts a clock at the flash and labels physical sound-travel seconds from the teaching model, even though playback is compressed. The wave arc and ground travel line use the same illustrative projection and meet the indoor observer when the model says sound arrives. The first 0.5 km is visually magnified so the house remains separate from the grounded mast; screen position is therefore not a linear distance scale. Academic notes stay readable in the scene's scrollable side panel. The linked National Weather Service explanations support the sequence of channel formation, return stroke and thunder; this single negative cloud-to-ground scene does not predict a safety radius.

## Ownership and interaction

Current ownership is described above. The dated sections below retain the original exterior-artwork rationale and historical checks; they are not a substitute for this upgrade’s current validation record.

## Storm artwork refinement · 2026-10-19

砧状上部、堆积云塔、暗云底、远近树林和湿草地采用三张独立生成插画；房屋细化屋瓦、窗框、墙面、排水管与室内灯光，通过接触阴影落在同一地景上。它们是非定量素材，不是气象照片或实测地形；原始 PNG、交付 WebP 和完整提示词见 [素材来源](assets/PROVENANCE.md)。电荷符号从混合区连续移向分离区，通道出现后逐渐退居次要位置；这是对原有分离进度的绘图，不是实测粒子轨迹。分叉沿原通道固定位置逐步显露，回拖时不重抽形状。只有接通后的回击前沿能触发环境整体提亮，云底、地面和房屋还保留通道附近更强的局部照明；回击后的光沿原进度逐渐消退，不增加独立时钟或反复频闪。

Three separately generated illustration layers describe the anvil, billowing cloud tower, darker base, wooded hills, wet meadow and detailed indoor house. Tiles, recessed windows, wall materials, gutters and contact shadows replace the coarse building silhouette. These are nonmetric assets, not weather photographs or measured terrain; original PNGs, delivery WebPs and full prompts are recorded in [asset provenance](assets/PROVENANCE.md). Persistent charge symbols separate continuously and yield visual emphasis to the channel. Branches grow from fixed points on that same channel. Only the connected return stroke brightens the whole environment, with stronger local lighting on the cloud, ground and alpha-masked house near the channel. The afterglow fades with the existing progress, without another clock or repeated strobing.

声波保留一个清楚的领先边界、淡薄尾弧和地面到达指示，沿用同一距离投影与声速判定；图中明确标为“声波传播示意”。圆弧与尾带不表示真实可见光圈、实测波长或响度，地面圆心仍是简化参照，雷声的物理来源是整条放电通道周围的空气。近处观察点仍经过非线性放大，房屋与桅杆保持分离。

One leading sound boundary, faint trailing arcs and an arrival track share the original distance projection and physical sound-speed result. The drawing is explicitly labelled a sound-front illustration. Its arcs do not encode measured wavelength or loudness; the ground-centered arc is a simplified reference, while thunder originates around the full lightning channel. The nearby observer remains visually magnified and separated from the mast.

Three current WebP assets total 547,956 bytes: cloud v2 1600 × 533, house 512 × 445, terrain 1600 × 538. The original cloud v1 remains as the edit reference and is not loaded. Eight retained Canvas buffers (cloud/base light/diagram, house/base light, terrain/base light, and one reusable blend buffer) hold about 22.4 MB of RGBA pixels, with at most three source-image decodes and temporary preparation arrays in addition; browser overhead is not included. Material variants are prepared once after loading; the blend buffer is reused across materials without per-frame resizing or pixel reads. Loading/failure captions leave the channel controls usable, and final exit clears image callbacks, references and all eight Canvas buffers; late callbacks cannot redraw a disposed scene. Terrain edges fade into matching ground, without a rectangular horizon or bottom seam. Scientific channels, wave fronts, distance and progress remain independent of the artwork. This is a resource bound, not a measured frame-rate or physical-device performance claim.

### Cloud silhouette and steady channel · 2026-10-19

云顶的两端收短为不对称、较平的柔和砧顶，保留原云塔和云底锚点。闪电去掉沿通道游走的亮点，增强固定白色核心、细分叉余辉和局部照明；分叉只在模型回击前沿到达其根部后变亮，不新增接地点或独立频闪。接通前仍是微弱先导，接通后明亮前沿仍沿同一通道向上推进。形状不随帧重新生成，暂停和回拖保持同一通道。

The anvil ends are shorter, flatter, softer and asymmetric, retaining the original tower and base anchors. A stronger white core and fine branch afterglow replace the travelling bright bead. A branch brightens only after the existing return front reaches its root; this adds neither another ground contact nor a strobe. The pre-attachment leader stays faint, and the post-attachment luminosity front still progresses upward along the same fixed channel. Pausing and reverse seeking retain its geometry.

## Charge-region and tower readability · 2026-10-19

以较小、较密且略有不规则的正负符号群表达电荷区域，去掉大圆形底托，依靠暗色描边、暖冷色及分区引线保持辨识。符号保留同一身份，沿同一分离进度移向上部正区和中下部负区；配色与淡薄区域底色不表示实测浓度、单个粒子或电子轨迹。保留云底较小的正电区，并在负电区下方的地面标出感应正电荷。分区与限定文字在画面上直接可见，进入通道阶段逐渐淡出，不遮住回击。主要起电、上下分层和地面感应仍依据 [NWS 说明](https://www.weather.gov/safety/lightning-science-electrification)，具体极性和层次仍有简化。

Compact, moderately dense and mildly irregular sign fields separate with the existing progress. Dark outlines and warm/cool signs replace the large circular badges. The retained signs, soft region washes and labelled leaders identify net-charge regions; they do not measure concentration, represent individual particles or plot electron trajectories. The small lower positive pocket remains, with induced positive charge marked on the ground below the negative core. The on-scene qualification and labels fade as the discharge takes emphasis. [NWS electrification guidance](https://www.weather.gov/safety/lightning-science-electrification) supports the existing simplified separation and induction sequence, rather than prescribing the illustration's sign count or layout.

接地塔增加较宽的支撑脚、混凝土基座、交叉撑杆、侧面结构和明暗金属边缘，初始电荷阶段显示名称引线。塔顶、向上连接通道与地面锚点保持原模型坐标；视觉轮廓加宽没有改变连接关系，也没有提供建筑尺寸或户外安全范围。

The grounded tower has wider footings, a concrete base, crossed braces, side depth and contrasting galvanized edges, plus a label during the initial charge phase. Its tip, upward connector and ground anchors retain their exact model coordinates. The wider illustrative silhouette changes neither attachment geometry nor any physical building dimension or safety boundary.

地景只作空间参照：原山坡与树林素材保留，地形基础缓存一次性降低饱和度和局部反差，轻微柔化并叠加保留透明轮廓的雾色。主云体、塔、房屋、电荷与通道没有套用背景处理，地点与投影锚点不变。原始图片与动画时钟不变，也不据此宣称实测帧率改善。

Terrain stays a spatial reference. The same terrain base cache receives one background-only desaturation, contrast reduction, mild softening and alpha-preserving haze treatment. Cloud, tower, house, signs and channels retain their own crisp drawing; site and projection anchors remain unchanged. Original assets and animation clocks are unchanged. No measured frame-rate improvement is claimed.

### Cloud-shaped diagram layer and material illumination · 2026-10-19

电荷示意层沿原云图的透明轮廓着色，保留云塔、砧顶与云底纹理，去掉矩形背板和边框；地面感应区也改为柔和底色。小而密的暖冷符号、引线和深色半透明标注共用一套视觉样式。云的示意着色用于提高读图对比，不代表真实电荷的可见颜色、云体切面或实测浓度。标注采用屏幕字号（桌面 13 px、窄屏 12 px），保留原分离与淡出进度；最后绘制文字和引线。

The charge-diagram tint follows the source cloud's exact alpha silhouette, preserving tower, anvil and base texture without a rectangular backplate or border. The induced ground region also uses a soft wash. Small, dense warm/cool signs, leader lines and dark translucent labels share one visual vocabulary. The cloud tint improves diagram contrast; it is not the visible color of real charge, a physical cloud section or measured concentration. Labels use screen-sized type (13 px desktop, 12 px narrow screens) and retain the existing separation/fade progress. Text and leaders are drawn last.

闪光不再通过全屏浅色叠加提白。云、地表和房屋各自从原纹理生成一次受光变体：云内按通道附近的范围分配受光，地面区分近处与远景，房屋朝向通道的屋面与墙面更亮，保留背光面和接触阴影。颜色在线性空间提亮，并用柔和高光曲线保留纹理；原图与变体在可复用缓冲中插值，半透明轮廓不随闪光加厚。天空只调整自身渐变，塔架直接调整不同面的颜色。它们与明亮通道共用接通后才生效的单次包络：平顺亮起，较慢回落，回拖仍可逆；先导阶段不触发闪光。这是受光层次的教学插画，没有引入云内断层推断、表面法线测量、照度标定、光传播求解、额外闪击或自动播放。

Flash illumination no longer uses a full-screen pale overlay. Cloud, terrain and house each derive one lit variant from their original texture: cloud light is stronger near the channel, ground light distinguishes near and distant areas, and channel-facing roof/wall regions brighten more while shadowed faces and contact shadows remain. Linear-light exposure and a soft highlight shoulder preserve texture. Original and lit variants blend in a reusable buffer so translucent contours do not become thicker during a flash. The sky changes its own gradient, and tower faces change their individual colors. They share one attachment-gated envelope with the bright channel: a smooth rise and slower decay, reversible under seeking. The leader stage does not trigger flash illumination. This is illustrative material lighting, without cloud tomography, measured surface normals, calibrated illuminance, a light-transport solver, extra flash or autoplay.

## Attachment geometry · 2026-10-01

向下的微弱先导和向上连接通道在尖端上方的同一个模型点连接。连接前两端保持分离，不画回击；连接后明亮前沿沿同一通道向云发展。回拖保持通道几何。这是因果示意，不是电场解或标定的长度、时间比例；真实浏览器外观仍需独立验收。

The faint downward leader and upward connector now terminate at the same modeled attachment point above the mast. Before attachment, their tips remain separate and no return stroke is drawn. After attachment, the bright front follows that same connected channel toward the cloud; scrubbing retains its geometry. This repairs causal geometry, without adding an electric-field solution or a calibrated length/time scale. [NWS negative-flash explanation](https://www.weather.gov/safety/lightning-science-negative-charged-flash) was checked for attachment preceding the return stroke. Focused tests cover the shared endpoint, pre-attachment gap, upward front and reversible projection; browser appearance remains a separate integration check.

## Sources

- [NWS · Thunderstorm electrification](https://www.weather.gov/safety/lightning-science-electrification)
- [NWS · Negative cloud-to-ground flash](https://www.weather.gov/safety/lightning-science-negative-charged-flash)
- [NWS · Thunder](https://www.weather.gov/safety/lightning-science-thunder)
- [NWS · Lightning safety](https://www.weather.gov/safety/lightning)

## Validation

Focused tests cover the teaching-model invariants, not empirical weather accuracy. Root integration runs localization, TypeScript and a production build, followed by desktop/mobile browser checks.

`cover.svg` is a deterministic, authored vector illustration using the same visual composition; it is not a scientific observation.

## Focused evidence · 2026-09-12

Weather-owner strict TypeScript check and source/HTML/placeholder translation scan passed. `node --import tsx --test topics/typhoon/tests/model.test.mjs topics/tornado/tests/model.test.mjs topics/rain-formation/tests/model.test.mjs topics/lightning-thunder/tests/model.test.mjs`: 18 tests passed. Production integration and actual viewport checks remain the root task’s responsibility; this evidence does not claim browser verification.

## Presentation layout

The topic selects its existing scene and controls for the shared viewport-fitted presentation frame. At desktop widths the scene and primary playback stay together, with independently scrollable explanation/settings; immersion can hide and reopen that panel without remounting the experiment. Narrow screens retain normal document flow. Scientific state and geometry remain topic-owned.
