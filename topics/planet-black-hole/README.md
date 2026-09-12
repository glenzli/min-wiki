# 行星遇到黑洞 / A planet meets a black hole

比较类地球、类木星两种密度模型，在远掠、中等距离与深遭遇三条相同路线下的差别。默认暂停；32 秒进度可拖动或倒退。切换行星保留进度便于对照，换路线或重置回到起点。支持中英文、儿童版/学术版和潮汐尺度开关。

## 模型边界

- 平均密度 5.514 与 1.326 g/cm³；固定黑洞质量下潮汐尺度与密度的 −1/3 次方成正比。归一化类地球尺度为 1，类木星为约 1.61。这里不对应某个真实黑洞质量。
- 中心按 GM=1 的牛顿抛物线、Barker 方程运动；最近距离 2.5、1.25、0.52。模拟时间 −12 到 20 映射为屏幕 32 秒。
- 同一组 2400 个确定性物质点贯穿演示，初始半径有意放大到 .34/.50。按层释放阈值 rt×(.72+.28r)，释放前共同平移，释放后按中心引力积分。该分层规则不是求解自引力、流体或岩石破裂。
- 641 帧，帧内四个 velocity-Verlet 步；距离 .8 以内附加阻尼 exp(−.055dt)，仅示意耗散；内侧吸收半径 .095 是放大的显示边界，不能解释为某个真实黑洞的视界或真实质量吞入率。颜色只示意内侧受热。
- 不求解流体压力、物质状态、自旋、磁场、辐射或相对论。不能用这份教学模型推断真实地球、木星的瓦解阈值。
- `model.ts` 保存模型与连续帧；`scene.ts` 保存投影和最多两份帧缓存，换页释放；`emission.ts` 保存局部发光贴图及其生命周期；`main.ts` 保存控件状态；`content.ts` 保存讲解。

This physics-inspired comparison uses mean density to set a tidal scale, a parabolic center trajectory, and one deterministic particle population. Inflated planet radii, layer-release rules, inner damping and an enlarged absorption boundary are teaching assumptions. The model cannot predict actual planetary disruption or accreted fractions. At most two encounter buffers are cached; all animation starts paused.

Sources: [NASA JPL planetary parameters](https://ssd.jpl.nasa.gov/planets/phys_par.html), [NASA disruption simulations](https://svs.gsfc.nasa.gov/14000/), [ESA NGC 4845](https://www.esa.int/Science_Exploration/Space_Science/Black_hole_wakes_up_and_has_a_light_snack). The ESA candidate is a massive planet or brown dwarf, not a confirmed Earth-like planet.

Validation: `node --import tsx --test topics/planet-black-hole/tests/model.test.mjs`; repository integration gate: `npm run check`.

## 三维呈现 / 3D rendering

`scene.ts` 现使用 Three.js，可选立体全景、俯视、黑洞近景与自由转动。同一物质点缓冲按相机深度排序，软粒子的细亮核与外缘共同表现物质流；未改变上述动力学。黑洞附近的晚期亮带使用 `src/visuals/blackHoleOptics.ts` 的独立无自旋薄盘光学近似，由同一批仍存活、轨道能量为负且经历向外后再回返的碎屑提供局部发光分布，不再按进度生成完整亮盘。局部密度、绕行程度与离平面距离只作教学亮度映射，不是真实辐射场；完整行星和已吸收物质不贡献亮度。光学暗区、粒子吸收半径分别是教学尺度，不能比较为真实视界尺度。

The scene now uses Three.js and depth-sorted soft particles, preserving the same dynamics. The non-spinning optical approximation samples a local emission map from surviving, bound debris that has turned back. It never fades in a prescribed complete disk. Brightness is a teaching proxy, not a temperature or a solved radiation field. Its display shadow scale is independent from the particle absorption boundary.
