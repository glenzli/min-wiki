# 行星遇到黑洞 / A planet meets a black hole

比较类地球、类木星两种密度模型，在远掠、中等距离与深遭遇三条相同路线下的差别。默认暂停；完整飞掠播放 32 秒，发生瓦解的情景播放 120 秒（1×），进度可拖动或倒退。接近阶段仍然简洁，回返阶段平滑放慢；“稍后”章节留下约 68 秒继续观察，同一批碎屑始终向前运动，不重置循环。切换行星保留进度便于对照，换路线或重置回到起点。支持中英文、儿童版/学术版和潮汐尺度开关。

## 模型边界

- 平均密度 5.514 与 1.326 g/cm³；固定黑洞质量下潮汐尺度与密度的 −1/3 次方成正比。归一化类地球尺度为 1，类木星为约 1.61。这里不对应某个真实黑洞质量。
- 中心按 GM=1 的牛顿抛物线、Barker 方程运动；最近距离 2.5、1.25、0.52。`playback.ts` 将完整飞掠映射为屏幕 32 秒、瓦解情景映射为 120 秒，时长不是现实宇宙中的秒数。播放时钟保持前段速率，在模型进度 .45–.65 连续放慢；滑杆、计时和章节跳转使用可逆时钟。发生瓦解的路线中，进度 `p` 对应模拟时间 `t = −12 + 32p + 88 max(0, p − .5)²`，后半段覆盖较长的模拟回返过程；屏幕观察时间由独立播放时钟控制，完整飞掠保持线性。
- 同一组 2400 个确定性物质点贯穿演示，初始半径有意放大到 .34/.50。逐渐减弱的支撑近似形变与分层释放，位置和速度持续推进；该规则不是求解真实自引力、流体压力、岩石断裂或汽化。
- 检测到束缚碎屑向外运动后转向内行，才启用温和的径向与较弱垂向耗散，没有额外切向拖曳；保留偏心绕行，不按固定时刻强迫内移或形成完整圆盘。回返标记不等于真实碰撞检测。内侧吸收半径 .095 是放大的显示边界，不能解释为某个真实黑洞的视界或真实质量吞入率。
- 橙色亮处示意耗散受热，亮度由近似损失的轨道能量驱动并会衰减；不是温度测量，变暗也不等于吞入。不求解自旋、磁场、真实辐射或相对论流体，不能推断真实地球、木星的瓦解阈值与成盘时间。两类行星的实际材料状态和受热过程可能不同。
- `model.ts` 保存模型与连续帧；`scene.ts` 保存投影和最多两份帧缓存；`encounterWorker.ts` 在后台计算并转移帧缓冲，快速换路线会终止过期计算，换页释放；`emission.ts` 保存局部发光贴图及其生命周期；`main.ts` 保存控件状态；`content.ts` 保存讲解。

This physics-inspired comparison uses mean density to set a tidal scale, a parabolic center trajectory, and one deterministic material population. Gradually weakening support illustrates deformation and release; gentle dissipation starts only after bound debris turns inward following outward motion. Eccentric paths remain possible, with no fixed time forcing a disk or inward spiral. Inflated radii, support, dissipation and the enlarged absorption boundary are teaching assumptions, not solutions for rock fracture, gas pressure or vaporization. The model cannot predict actual planetary disruption, disk-formation times or accreted fractions. At most two encounter buffers are cached; all animation starts paused. Intact flybys last 32 seconds at 1×; disrupted encounters last 120 seconds, easing smoothly into slower playback while preserving the same trajectories. The Later chapter leaves about 68 seconds of moving debris to observe. Screen time is not astronomical time; seeking, changing speed and comparing planets use a reversible playback clock.

Sources: [NASA JPL planetary parameters](https://ssd.jpl.nasa.gov/planets/phys_par.html), [NASA disruption simulations](https://svs.gsfc.nasa.gov/14000/), [ESA NGC 4845](https://www.esa.int/Science_Exploration/Space_Science/Black_hole_wakes_up_and_has_a_light_snack). The ESA candidate is a massive planet or brown dwarf, not a confirmed Earth-like planet.

关于回返与圆盘化的区别，参见 [Bonnerot & Stone：吸积流的形成](https://arxiv.org/abs/2008.11731)。该综述讨论恒星气流，不能直接作为岩石行星材料演化的计算结果。For the distinction between fallback and circularization, see this review of stellar debris; it does not calculate the material evolution of a rocky planet.

Validation: `node --import tsx --test topics/planet-black-hole/tests/model.test.mjs topics/planet-black-hole/tests/playback.test.mjs`; repository integration gate: `npm run check`.

## 三维呈现 / 3D rendering

`scene.ts` 使用 Three.js，可选立体全景、俯视、黑洞近景与自由转动。同一物质点缓冲按相机深度排序，软粒子的细亮核与外缘共同表现物质流；淡线记录少量物质点最近走过的路径，不是实体环。黑洞附近的局部亮弧使用 `src/visuals/blackHoleOptics.ts` 的独立无自旋薄盘光学近似，由同一批仍存活、受到束缚且经历向外后再回返的碎屑提供局部发光分布。橙色亮度随简化耗散造成的轨道能量损失变化并会衰减，不按进度生成完整亮盘；完整行星和已吸收物质不贡献这种亮度。光学暗区、粒子吸收半径分别是教学尺度，不能比较为真实视界尺度。

The Three.js scene uses depth-sorted soft particles. Faint lines show selected samples' recent paths, not physical rings. The non-spinning optical approximation samples local emission from surviving, bound debris that has turned back. Orange brightness follows approximate orbital-energy loss and decays over time; fading does not necessarily mean capture. A complete disk is not prescribed. Brightness is a teaching proxy, not a temperature or a solved radiation field. The display shadow scale is independent from the particle absorption boundary.

回返阶段使用平滑进入后固定的观察构图，不根据每一帧最外侧碎屑重新居中或缩放；自由视角仍由用户控制。当前与历史位置都插值采样，避免粒子拖尾在离散帧边界突然改变长度。

The return phase eases into a fixed composition instead of reframing around each frame's outermost debris. Free orbit remains under user control. Both current and lagging positions are interpolated so motion streaks do not jump at stored-frame boundaries.
