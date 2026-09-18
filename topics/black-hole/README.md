# 恒星路过黑洞

面向亲子共看的本地 3D 科普动画。比较四种情景：

| 路线 | 演示内容 | 播放时长 |
| --- | --- | --- |
| 没有黑洞 | 与安全飞掠共用初始位置、速度、时间与视角，匀速直行 | 48 秒 |
| 安全绕过 | 完整恒星飞掠 | 48 秒 |
| 瓦解后回流 | 瓦解、远行、偏心回返与局部受热 | 120 秒 |
| 更深掠过 | 更小近心距，部分气体首次经过时内落，其余继续运动 | 120 秒 |

- **儿童版**：大画面、分阶段短句、一个观察问题。
- **学术版**：同一画面与进度，增加物理关系、符号解释、模型比值、讲述示例和易误解之处。切换版本不会重播。
- **播放**：手动开始，暂停、回放、0.5 / 1 / 2 倍速。拖动时间轴或选择步骤会暂停在所选时刻；结束后可重播。切换路线会回到起点并暂停。
- **讲解时间**：瓦解路线的前 54 秒保持原有节奏，接着用 12 秒平滑降至五分之一的推进速度；最后一步留有约 68 秒。气体继续运动，暂停及播放结束后保留画面。
- **路线准备**：气体轨迹在 Web Worker 中计算，首次选择显示准备状态；可继续切换路线和阅读版本。最多缓存两个固定瓦解模型，位置与受热亮度数组合计约 234 MB，其中每条路线的 `Uint8` 受热数组约 9 MB；已缓存路线无需重新计算。
- **观察**：立体、俯视、黑洞近景、自由转动（拖动旋转、滚轮缩放）。默认立体视角；俯视便于跟踪偏心路径，近景便于观察局部受热亮处，自由转动时不自动调整。淡线记录少量物质点最近走过的路径，不是实体环；可关闭辅助线。配乐默认关闭，只随播放开启。
- **手机**：画面和控制优先，当前讲解排在播放器下方。

## 运行

```sh
npm install
npm run dev -- --host 127.0.0.1 --port 5173 --strictPort
npm test
npm run build
```

打开 http://localhost:5173/topics/black-hole/。所有画面资源与字体均在本地生成或使用系统资源；无需请求外部图片、字体或音频。延伸阅读链接由用户主动打开。

## 模型与边界

这是教学示意，不是科研级流体或广义相对论模拟：

- 恒星中心采用黑洞为焦点的牛顿抛物线轨道，用 Barker 方程按时间参数化。速率在近心点最大，轨迹连续；能量与角动量关系可用测试验证。
- 近距离版本从第一帧起就由同一批 12,000 个气体采样点组成。外层支撑先减弱，中心较晚瓦解；显式中点积分持续推进位置和速度，不通过整体缩放球体实现碎裂。两条瓦解路线仅改变近心距（示意单位 9 → 5.2），没有指定吞入粒子的比例。采样固定种子，轨迹预计算；气体跨越示意核心边界后不再显示。
- 检测到束缚碎屑向外运动后转向内行，才启用温和的径向与较弱垂向耗散；没有额外切向拖曳，回返气流可保留偏心轨道，不按固定时刻强迫内移，也不将位置插值到预设圆环。回返标记不等于碰撞检测。它不求解真实气体压力、碰撞激波、磁场、相对论进动或角动量输运，不能用来推断吸积率、温度、光度或成盘时间。回流阶段的物理时间先压缩，最后的播放时钟再平滑放慢；这不代表长期稳态。
- 橙色虚线是人为设定的参考潮汐尺度。恒星大小、黑洞核心大小、颜色、时间经过视觉调整；它们不对应一个按物理比例标定的太阳—黑洞系统。
- 气体不按最终去向区分颜色；跨过吸收边界后永久停止显示。橙色亮处示意回返后的耗散受热，亮度随近似轨道能量损失变化并会衰减，因此变暗不等于吞入。近黑洞光学由独立薄盘近似呈现，物质捕获与光学暗影不是同一尺度。虚线仅是潮汐参考范围。
- 内边界半径固定为 3.6 个示意单位。越界采样点永久移除，并显示发生内落的提示；学术版给出采样点比例。这个数值不是真实事件的质量吞入率。近处采用牛顿引力加吸收边界，未求解相对论捕获阈值或远方观测者看到的渐暗过程。
- 局部亮弧采用无自旋球对称光线积分与示意发光分布，不保证形成完整圆盘；发光气体位于视界外，不展示喷流或完整 Kerr/GRMHD 演化。
- 所有天体、粒子和材质运动只取决于统一进度。暂停与拖动回看可重现同一状态；背景标签页不推进时间。

## 源码

- `topics/black-hole/main.ts`：控件、版本切换、播放生命周期、文字和投影标签。
- `topics/black-hole/story.ts`：儿童讲解、成人教学笔记和共同阶段边界。
- `topics/black-hole/physics/encounter.ts`：轨道与播放状态。
- `topics/black-hole/physics/stellarDisruption.ts`：内部支撑、逐层瓦解、连续气体轨迹与回看采样。
- `topics/black-hole/physics/disruptionLibrary.ts` 与 `disruptionWorker.ts`：后台准备、轨迹转移、固定路线缓存与释放。
- `topics/black-hole/rendering/stellarGas.ts`：贯穿完整恒星、长流与回返阶段的气体体积显示。
- `topics/black-hole/physics/tdeSimulation.ts`：Three.js 场景、几何、气流显示和相机。
- `topics/black-hole/shaders/blackHoleShader.ts`：恒星表面与光晕、黑洞示意材料。
- `topics/black-hole/audio/spaceSynth.ts`：可选程序配乐，非真实太空声音。

## 资料

- [NASA：靠近黑洞时会发生什么](https://science.nasa.gov/universe/what-happens-when-something-gets-too-close-to-a-black-hole/)
- [NASA：黑洞结构](https://science.nasa.gov/universe/black-holes/anatomy/)
- [Bonnerot & Stone：吸积流的形成](https://arxiv.org/abs/2008.11731)
- [Shiokawa 等：恒星潮汐瓦解后的吸积流模拟](https://arxiv.org/abs/1501.04365)

## 粒子与光学呈现 / Particle rendering and optics

同一批物质点贯穿完整恒星、拉伸长流和偏心回返。淡线只连接少量物质点的最近位置，帮助辨认运动方向；它们不是额外物质或实体环。俯视便于区分向外与回返的路径，黑洞近景便于查看局部亮处。

黑洞使用 `src/visuals/blackHoleOptics.ts` 的独立无自旋薄盘光线近似，从同一批存活、已释放且已经回返的束缚气体采样局部发光分布。橙色受热亮度由简化耗散造成的轨道能量损失驱动，并随时间衰减；弯曲光像随局部气流变化，不按进度补成完整亮盘。吸收边界、光学暗区是分别调整的教学尺度。气体动力学仍不是相对论流体模型，局部亮度不代表真实温度、已求解的碰撞加热或光谱。

One material population follows the star through stretching, long streams and eccentric return. Gentle dissipation starts only after bound debris turns inward following outward motion; no fixed time forces a disk or inward spiral. Faint lines show selected parcels' recent paths, not physical rings. Orange heating brightness follows approximate orbital-energy loss and decays over time, so fading does not necessarily mean capture. The top view clarifies paths, while the black hole close-up reveals local bright patches. A separate non-spinning thin-disk optical approximation bends light from the sampled emission. Brightness is not a temperature measurement or a solved shock/radiation field. The optical shadow and particle absorption boundary use independent teaching scales.

回返阶段使用平滑进入后固定的观察构图，不根据每一帧最外侧碎屑重新居中或缩放；自由视角仍由用户控制。当前与历史位置都插值采样，避免粒子拖尾在离散帧边界突然改变长度。

The return phase eases into a fixed composition instead of reframing around each frame's outermost debris. Free orbit remains under user control. Both current and lagging positions are interpolated so motion streaks do not jump at stored-frame boundaries.
