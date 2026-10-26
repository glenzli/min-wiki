# 为什么会有白天黑夜与四季更迭

`earth/conditions/` now composes this topic's solar geometry, city data, daylight equation and existing `EarthSimulation` in a separate static-condition lens. Its 0–98° what-if range does not change this standalone page's original control ranges or scientific ownership. The consumer sets a named place, orbital reference position and matching local-noon rotation before drawing; it does not infer climate from illumination. An incoming `if=1` link offers a visible return to the retained Earth experiment after the presentation frame mounts.

`EarthSimulation.showEarthLatitudeReferences(false)` keeps the equator and axis while hiding fixed modern-Earth tropic/polar circles for that hypothetical consumer. Marker options `selectedCityOnly` and `subsolarMarkerVisible` let it show one selected place without a second, easily confused subsolar ring. The standalone page's defaults remain unchanged. The consumer uses `selectCity` to retain the correct surface highlight.

页面先从“中国晨昏”观察进入：夏至清晨的模型北京时间 04:30，同屏比较哈尔滨、北京、深圳、乌鲁木齐与成都。固定朝北的地球镜头跟着地面，看晨昏线经过城市；切换节气保留此刻的参考时钟，选择城市和观察视角不改变日照状态。“带着这座城市，比较地轴倾角”将地点、公转位置、倾角与当日进度交给原有对照实验，再可返回三维全球与公转视图。两个实验各自的播放时钟保持独立，交接会暂停并保留所选状态。城市点按屏幕尺寸保持小型标记，选中处只显示细光圈；标记不是城市范围或真实大小。

`physics/dayNightClock.ts` 将东经 120° 地方太阳时近似为 UTC+8 时钟，省略均时差。城市坐标取近似值；日出读数按五分钟取整，以点太阳中心高度 0° 为几何边界，不是当地日出预报。民用曙暮光标记采用 −6° 到 0°；更低的太阳仍可能产生其他曙暮光，地图颜色不表示测得的天空亮度。时钟、地图、晨昏线、城市状态和日出读数均消费原有 `solarGeometry.ts`，没有第二个动画时钟。

参考：[NOAA 太阳位置与时钟换算](https://www.gml.noaa.gov/grad/solcalc/solareqns.PDF)、[NWS 曙暮光定义](https://www.weather.gov/fsd/twilight)。本模型刻意省略 NOAA 公式中的均时差以及真实日出的折射/太阳视半径修正，用于比较经纬度和倾角的作用。

四种探索情景：昼夜交替、四季公转、直射与斜射、假如地轴不倾斜。每种有五步儿童讲解与对应学术说明。进入页面时暂停；选择节气、步骤或拖动时间轴后停在所选位置。

渲染和城市卡片共用 `physics/solarGeometry.ts` 的太阳方向。固定地轴、圆轨道和自转决定地球固连坐标系中的日侧；相机转动不改变受光状态。春分起算的轨道相位 λ 给出赤纬 δ = asin(sin ε · sin λ)。

城市卡片实时显示此刻太阳高度、昼夜状态、理想白昼时长与直射日照的几何投影。正午高度另用于学术说明。极点在春秋分或零倾角时单独显示地平线提示；不把退化情形填成十二小时。

公转图放大地球，球体大小与轨道距离不同尺度。公转一周仅展示八次自转，便于观察；不是实际日期或真实转速比例。昼夜场景提供有上述限定的时钟近似，其他场景显示模拟进度。零倾角对照保留公转。光照角度场景用两条平行线说明入射角，面积公式采用局部切平面近似。

模型不含轨道偏心率、大气折射、太阳视半径、地形、天气或温度计算。地表、城市灯光与云层贴图为静态视觉资料。温度变化不能仅从一个瞬时日照角度推出。

在仓库根目录运行 `npm test`、`npm run build`；开发入口为 `/topics/earth-seasons/`。测试覆盖地球坐标变换与光照一致性、四个节气、完整自转周期中的极昼极夜，以及零倾角边界。

参考：[NASA Earth](https://science.nasa.gov/earth/facts/)；[NOAA 季节成因](https://www.weather.gov/lmk/seasons)。贴图来源沿用本专题原有资源说明。

页面随后提供“倾角与白昼长短”对照实验：同一地点、同一节气，比较 0° 与可调的 0–23.44° 倾角。黄色纬度圈路程与白昼时长、正午太阳高度一起变化，红点用十二秒走完一天；极点明确区分纬度圈退化为点与时间环示意。封面 cover-v2.jpg 为本项目生成的说明性插图。

实验现在可用“放到三维地球上看”把当前参考地点、节气、倾角及从当地正午走过的当日进度交给下方球体。赤道与北极圈在两处共用同一个参考坐标；进入后显示太阳视线近景、位置标记与同条件的城市读数，切回标准看为轨道全景。近景保留太阳照明，但不渲染可能挡住球体的太阳模型。手动换场景、地点或时间后，交接提示收起。儿童版只在对照图旁解释可见变化；完整成因、昼长关系式、当前变量、边界与资料链接在学术版展开。

The comparison can pass its reference location, orbital phase, tilt and progress from local noon to the 3D globe. Both views use the same equator and Arctic Circle reference coordinates. The Earth close-up keeps sunlight and the selected marker; its foreground Sun prop is hidden so it cannot cover the globe. Changing the scene, place or time clears the handoff cue. Children see a short visual explanation; the academic version expands the daylight relation, current variables, boundary cases and source link.

## Presentation layout

The topic opts its existing scene and controls into shared viewport fitting and reversible immersion. Explanation/settings remain available in the adjacent disclosure panel. Multi-chapter studies retain their own state and clocks. Introductory diagrams can be expanded separately, and narrow screens retain document flow.

The retained day, night and cloud source maps also have quality-90 WebP delivery copies at their original pixel dimensions. `scripts/optimize-images.mjs` records source/output hashes; only encoding changes, not lighting, rotation, texture coordinates or source attribution.

## Reading-mode picture hierarchy — 2026-09-28, local edits

The paired 0° and selected-tilt experiments now draw larger Earth and unfolded
latitude-circle views for children. The existing daylight duration and noon-altitude
readouts remain below each picture. Academic desktop keeps the original three-part
Earth/circle/noon-Sun geometry; on narrow screens the same condition is shown in a
stacked second noon-Sun diagram so all three relationships remain readable. Mode and
viewport changes redraw the pictures without resetting place, season, tilt or the
current position in the day. Both reading modes continue using the same geometric
model, including polar day, polar night and the degenerate polar-horizon case.
The desktop explanation heading and reset control stack within the narrow side panel,
so English text keeps the full panel width.

The diagrams remain illustrative projections, not a common length scale for the
Earth, the city's daily path and the local horizon. No temperature or weather is
inferred from the drawn Sun height. Focused geometry tests (14), TypeScript, English
coverage and an isolated build passed; Chinese desktop and English 390 px child and
academic views were inspected in the browser, including North Pole winter and
mid-animation mode changes. This batch remains uncommitted and undeployed.
