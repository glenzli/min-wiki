# 恒星路过黑洞

面向亲子共看的本地 3D 科普动画。比较四种情景：

| 路线 | 演示内容 | 播放时长 |
| --- | --- | --- |
| 没有黑洞 | 与安全飞掠共用初始位置、速度、时间与视角，匀速直行 | 48 秒 |
| 安全绕过 | 完整恒星飞掠 | 48 秒 |
| 瓦解后回流 | 瓦解、远行、回绕与后段逐步内落 | 120 秒 |
| 更深掠过 | 更小近心距，部分气体首次经过时内落，其余继续运动 | 120 秒 |

- **儿童版**：大画面、分阶段短句、一个观察问题。
- **学术版**：同一画面与进度，增加物理关系、符号解释、模型比值、讲述示例和易误解之处。切换版本不会重播。
- **播放**：手动开始，暂停、回放、0.5 / 1 / 2 倍速。拖动时间轴或选择步骤会暂停在所选时刻；结束后可重播。切换路线会回到起点并暂停。
- **讲解时间**：瓦解路线的前 54 秒保持原有节奏，接着用 12 秒平滑降至五分之一的推进速度；最后一步留有约 68 秒。气体继续运动，暂停及播放结束后保留画面。
- **路线准备**：气体轨迹在 Web Worker 中计算，首次选择显示准备状态；可继续切换路线和阅读版本。最多缓存两个固定瓦解模型，轨迹数组合计约 216 MB，已缓存路线无需重新计算。
- **观察**：立体、俯视、自由转动（拖动旋转、滚轮缩放）。使用对角视野约 24° 的弱透视长焦构图，并后移相机保留观察范围，减少画面边缘的投影拉伸；真实潮汐形变保持不变。默认采用俯视图，减少前后遮挡被误解为吞入再逃出的情况；在瓦解靠近时平滑拉近，方便观察；自由转动时不自动调整。可关闭辅助线。配乐默认关闭，只随播放开启。
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
- 后段用连续径向、垂向阻尼近似束缚气体的耗散，末段持续的速度阻尼示意角动量损失与向内运动，系数随局部轨道频率和粒子差异变化，让气体逐步内落；没有将位置插值到预设圆环。它不求解真实气体压力、碰撞激波、磁场、相对论进动或角动量输运，不能用来推断吸积率、温度、光度或形成时间。回流阶段的物理时间先压缩，最后的播放时钟再平滑放慢；这不代表长期稳态。
- 橙色虚线是人为设定的参考潮汐尺度。恒星大小、黑洞核心大小、颜色、时间经过视觉调整；它们不对应一个按物理比例标定的太阳—黑洞系统。
- 气体不按最终去向区分颜色；通过持续内旋、数量减少及越界后永久消失表现吞入。近黑洞光学由独立薄盘近似呈现，物质捕获与光学暗影不是同一尺度。虚线仅是潮汐参考范围。
- 内边界半径固定为 3.6 个示意单位。越界采样点永久移除，并显示发生内落的提示；学术版给出采样点比例。这个数值不是真实事件的质量吞入率。近处采用牛顿引力加吸收边界，未求解相对论捕获阈值或远方观测者看到的渐暗过程。
- 晚期亮带采用无自旋球对称光线积分与示意盘面亮度；发光气体位于视界外，不展示喷流或完整 Kerr/GRMHD 演化。
- 所有天体、粒子和材质运动只取决于统一进度。暂停与拖动回看可重现同一状态；背景标签页不推进时间。

## 源码

- `topics/black-hole/main.ts`：控件、版本切换、播放生命周期、文字和投影标签。
- `topics/black-hole/story.ts`：儿童讲解、成人教学笔记和共同阶段边界。
- `topics/black-hole/physics/encounter.ts`：轨道与播放状态。
- `topics/black-hole/physics/stellarDisruption.ts`：内部支撑、逐层瓦解、连续气体轨迹与回看采样。
- `topics/black-hole/physics/disruptionLibrary.ts` 与 `disruptionWorker.ts`：后台准备、轨迹转移、固定路线缓存与释放。
- `topics/black-hole/rendering/stellarGas.ts`：贯穿完整恒星、气流与聚盘阶段的气体体积显示。
- `topics/black-hole/physics/tdeSimulation.ts`：Three.js 场景、几何、气流显示和相机。
- `topics/black-hole/shaders/blackHoleShader.ts`：恒星表面与光晕、黑洞示意材料。
- `topics/black-hole/audio/spaceSynth.ts`：可选程序配乐，非真实太空声音。

## 资料

- [NASA：靠近黑洞时会发生什么](https://science.nasa.gov/universe/what-happens-when-something-gets-too-close-to-a-black-hole/)
- [NASA：黑洞结构](https://science.nasa.gov/universe/black-holes/anatomy/)

## 粒子与光学呈现 / Particle rendering and optics

瓦解后的物质点缩小、降低运动拉伸，保留细亮核与柔软外缘，并按位置加入定性的冷暖层次；物质运动、12000 点身份和 Worker 数据不变。回流途中镜头临时包含仍受束缚的可见气体，避免整个物质流离开画面，随后回到内区。

黑洞使用 `src/visuals/blackHoleOptics.ts` 的独立无自旋薄盘光线近似，从同一批存活、已释放的束缚气体采样局部发光分布；靠近轨道平面且运动逐渐以绕行为主的气体形成亮弧，光线积分读取这张分布图，弯曲光像与局部气流同步显现，不再按时间淡入完整亮盘。默认立体视角，仍支持俯视和自由转动。吸收边界、光学暗区是分别调整的教学尺度。气体动力学仍不是相对论流体模型，局部亮度由平滑粒子密度和轨道状态作教学映射，不代表真实温度、碰撞加热或光谱计算。

Post-disruption parcels are finer, less stretched and softly layered; motion and worker buffers are unchanged. The camera includes returning bound gas during its outward excursion. A separate finite-volume, non-spinning thin-disk optical approximation creates view-dependent late bright bands. The display shadow and particle absorption boundary are independent teaching scales.
