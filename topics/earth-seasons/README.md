# 为什么会有白天黑夜与四季更迭

四种探索情景：昼夜交替、四季公转、直射与斜射、假如地轴不倾斜。每种有五步儿童讲解与对应学术说明。进入页面时暂停；选择节气、步骤或拖动时间轴后停在所选位置。

渲染和城市卡片共用 `physics/solarGeometry.ts` 的太阳方向。固定地轴、圆轨道和自转决定地球固连坐标系中的日侧；相机转动不改变受光状态。春分起算的轨道相位 λ 给出赤纬 δ = asin(sin ε · sin λ)。

城市卡片实时显示此刻太阳高度、昼夜状态、理想白昼时长与直射日照的几何投影。正午高度另用于学术说明。极点在春秋分或零倾角时单独显示地平线提示；不把退化情形填成十二小时。

公转图放大地球，球体大小与轨道距离不同尺度。公转一周仅展示八次自转，便于观察；不是实际日期、民用时刻或真实转速比例。零倾角对照保留公转。光照角度场景用两条平行线说明入射角，面积公式采用局部切平面近似。

模型不含轨道偏心率、大气折射、太阳视半径、地形、天气或温度计算。地表、城市灯光与云层贴图为静态视觉资料。温度变化不能仅从一个瞬时日照角度推出。

在仓库根目录运行 `npm test`、`npm run build`；开发入口为 `/topics/earth-seasons/`。测试覆盖地球坐标变换与光照一致性、四个节气、完整自转周期中的极昼极夜，以及零倾角边界。

参考：[NASA Earth](https://science.nasa.gov/earth/facts/)；[NOAA 季节成因](https://www.weather.gov/lmk/seasons)。贴图来源沿用本专题原有资源说明。

页面首先提供“倾角与白昼长短”对照实验：同一地点、同一节气，比较 0° 与可调的 0–23.44° 倾角。黄色纬度圈路程与白昼时长、正午太阳高度一起变化，红点用十二秒走完一天；极点明确区分纬度圈退化为点与时间环示意。封面 cover-v2.jpg 为本项目生成的说明性插图。

实验现在可用“放到三维地球上看”把当前参考地点、节气、倾角及从当地正午走过的当日进度交给下方球体。赤道与北极圈在两处共用同一个参考坐标；进入后显示太阳视线近景、位置标记与同条件的城市读数，切回标准看为轨道全景。近景保留太阳照明，但不渲染可能挡住球体的太阳模型。手动换场景、地点或时间后，交接提示收起。儿童版只在对照图旁解释可见变化；完整成因、昼长关系式、当前变量、边界与资料链接在学术版展开。

The comparison can pass its reference location, orbital phase, tilt and progress from local noon to the 3D globe. Both views use the same equator and Arctic Circle reference coordinates. The Earth close-up keeps sunlight and the selected marker; its foreground Sun prop is hidden so it cannot cover the globe. Changing the scene, place or time clears the handoff cue. Children see a short visual explanation; the academic version expands the daylight relation, current variables, boundary cases and source link.

## Presentation layout

The topic opts its existing scene and controls into shared viewport fitting and reversible immersion. Explanation/settings remain available in the adjacent disclosure panel. Multi-chapter studies retain their own state and clocks. Introductory diagrams can be expanded separately, and narrow screens retain document flow.

The retained day, night and cloud source maps also have quality-90 WebP delivery copies at their original pixel dimensions. `scripts/optimize-images.mjs` records source/output hashes; only encoding changes, not lighting, rotation, texture coordinates or source attribution.
