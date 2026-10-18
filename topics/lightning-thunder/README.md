# 闪电和雷声是怎样形成的 / How lightning and thunder form

云里怎样积累电荷？闪电为什么会分叉，为什么总是先看见闪电再听见雷声？把一次放电放慢，看清光与声音各自的旅程。

How does a cloud separate charge? Why does lightning branch, and why does thunder arrive later? Slow down one discharge and follow the journeys of light and sound.

## Teaching boundaries

通道、云体、电荷符号和声波圆弧均为教学示意，尺度不一。这里只展示一次负地闪，没有覆盖云内闪电、正地闪等类型。不会自动播放声音，也不制造全屏频闪。

Clouds, channels, charge signs and sound-wave arcs are illustrative and use different scales. One negative cloud-to-ground flash is shown, excluding intracloud and positive flashes. No sound autoplays and there is no full-screen strobe.

## Sound-front and clock pass · 2026-09-28

前三幕的进度现在只称为慢放进度；末幕从闪光重新起表，显示模型中的声音传播秒数，播放本身仍压缩时间。声波圆弧和地面传播线使用同一示意投影，到达判定仍由声速和所选距离计算。近处的 0.5 km 被视觉放大，使室内观察点不贴上放电尖端；因此画面位置不能当线性距离标尺。儿童版看到当前声波是否到达，学术版同场景的侧栏可阅读关系式、变量和限制。美国国家气象局的雷声和负地闪说明支持通道形成、回击与声波的因果顺序；这里只演一条负地闪路径，并没有预测危险范围。

The first three stages now report slow-motion progress rather than invented elapsed seconds. The last stage restarts a clock at the flash and labels physical sound-travel seconds from the teaching model, even though playback is compressed. The wave arc and ground travel line use the same illustrative projection and meet the indoor observer when the model says sound arrives. The first 0.5 km is visually magnified so the house remains separate from the grounded mast; screen position is therefore not a linear distance scale. Academic notes stay readable in the scene's scrollable side panel. The linked National Weather Service explanations support the sequence of channel formation, return stroke and thunder; this single negative cloud-to-ground scene does not predict a safety radius.

## Ownership and interaction

`model.ts` owns numeric and stage contracts, `scene.ts` owns deterministic Canvas state projection, `stormArtwork.ts` owns retained storm-cloud and terrain illustration assets, `content.ts` owns bilingual stage explanations, and `main.ts` owns playback and accessible controls. No autoplay. Visibility and page lifecycle pause animation, restore bfcache state and release the canvas observer and illustration buffers on final exit. Kids and academic modes share an interactive scene with distinct stage-linked explanations.

## Storm artwork refinement · 2026-10-19

砧状上部、堆积云塔、暗云底、远近树林和湿草地采用三张独立生成插画；房屋细化屋瓦、窗框、墙面、排水管与室内灯光，通过接触阴影落在同一地景上。它们是非定量素材，不是气象照片或实测地形；原始 PNG、交付 WebP 和完整提示词见 [素材来源](assets/PROVENANCE.md)。电荷符号从混合区连续移向分离区，通道出现后逐渐退居次要位置；这是对原有分离进度的绘图，不是实测粒子轨迹。分叉沿原通道固定位置逐步显露，回拖时不重抽形状。只有接通后的回击前沿能触发云底、地面和房屋的局部照亮；回击后的光逐渐消退，不增加全屏闪光或独立时钟。

Three separately generated illustration layers describe the anvil, billowing cloud tower, darker base, wooded hills, wet meadow and detailed indoor house. Tiles, recessed windows, wall materials, gutters and contact shadows replace the coarse building silhouette. These are nonmetric assets, not weather photographs or measured terrain; original PNGs, delivery WebPs and full prompts are recorded in [asset provenance](assets/PROVENANCE.md). Persistent charge symbols separate continuously and yield visual emphasis to the channel. Branches grow from fixed points on that same channel. Only the connected return stroke drives local cloud, ground and alpha-masked house lighting; its afterglow fades with the existing progress, rather than adding another clock or full-screen flash.

声波保留一个清楚的领先边界、淡薄尾弧和地面到达指示，沿用同一距离投影与声速判定；图中明确标为“声波传播示意”。圆弧与尾带不表示真实可见光圈、实测波长或响度，地面圆心仍是简化参照，雷声的物理来源是整条放电通道周围的空气。近处观察点仍经过非线性放大，房屋与桅杆保持分离。

One leading sound boundary, faint trailing arcs and an arrival track share the original distance projection and physical sound-speed result. The drawing is explicitly labelled a sound-front illustration. Its arcs do not encode measured wavelength or loudness; the ground-centered arc is a simplified reference, while thunder originates around the full lightning channel. The nearby observer remains visually magnified and separated from the mast.

Three WebP assets total 627,472 bytes: cloud 1600 × 533, house 512 × 445, terrain 1600 × 538. Five retained Canvas layers (cloud/house plus their light masks, and terrain) hold about 12.1 MB of RGBA pixels, with at most three source-image decodes in addition; browser overhead is not included. Each layer is prepared once after loading. Loading/failure captions leave the channel controls usable, and final exit clears image callbacks, references and Canvas buffers; late callbacks cannot redraw a disposed scene. Terrain edges fade into matching ground, without a rectangular horizon or bottom seam. Scientific channels, wave fronts, distance and progress remain independent of the artwork. This is a resource bound, not a measured frame-rate or physical-device performance claim.

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
