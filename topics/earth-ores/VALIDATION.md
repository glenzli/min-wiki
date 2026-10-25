# 矿石馆验证

查核：2026-10-25。本馆未自行commit/push/merge/部署；只在授权目录制作模型、交互、3D、证据和文档。根导航、独立入口、封面、清单与全量生产门禁由父任务维护；learning/正文/解说由另一个已分配的Sol代理维护。

## 实际覆盖

三条实做形成路径：裂隙热液石英—硫化物、含铝母岩风化残积、石英/锡石流水分选。每条含形成/标本视图、可逆独立进度、相反前提结果、结构/性质/分析证据与加工用途/代价。没有穷尽矿床分类，也无现场判矿、资源/储量或矿山预测。

3D仅热液手标本，程序闭合围岩实体内有固定空间的主脉、支脉、硫化物斑块与粗糙度。新切面读取同一材质场，非实物扫描、已知产地、面指数或真实化验。未充填区域用深色编码，非孔隙几何求解。相机、切面与成矿进度各自独立。

## 自动模型与内容检查

`node --import tsx --test topics/earth-ores/tests/*.test.mjs`：10/10通过，覆盖：

- 完整十进制/枚举/相机初值解析与18键往返，各路径进度独立。
- 36个热液来源ID及金属/硅质类别保留；封闭通道不运输；贫金属仍可成石英脉而8个金属来源留在来源。
- 30个风化来源保留：12含铝、6其他较保留、12较可迁移；有效淋失提高剩余中相对份额而不制造铝，弱反应/受限排出不复制富集结果。
- 24颗固定砂矿粒：6锡石/18石英；先解离，弱/选择性/强水流产生不同留存/输出；出窗口仍记账。
- 前进→回退→同进度得到相同位置/来源；经济预算与教学标记独立；固定裂隙场确定、有界和连续。
- 连续沉淀逐来源批有界、单调，未开始为0、整批完成为1；保持36个来源ID与类别；封闭/贫金属条件在全部采样进度均保持相反结果；连续中间份额与账本整批数分开。

`npm run typecheck`、`npm run check:i18n`通过；最近全仓双语检查81 namespace，7136条消息。最终投影与生产构建由父任务统一完成，不把harness通过写成全站生产验收。

## 浏览器环境与实测

Linux Chromium headless（`/usr/bin/chromium`），Three.js r170，Playwright，SwiftShader软件WebGL，`--enable-unsafe-swiftshader`，本地HTTP + esbuild分块harness。桌面1280×1000、deviceScaleFactor1；手机模拟390×844、deviceScaleFactor3、触控、`is_mobile`、减少动态。不是手机真机或硬件GPU FPS。

临时harness在构建时注入renderer观察出口以读取实际`renderer.info`；源代码没有window调试出口。记录位于`/tmp/earth-ores-browser/report.json`。

下表是首次手动场景验收的测量；随后有限播放的复测与新证据见下方，不把原冷启动数据冒充新测量。

| 指标 | 实测 |
| --- | --- |
| 默认3D冷打开至ready | 1029 ms；前一轮990 ms |
| 5次形成视图→3D重入ready | 943 / 952 / 948 / 983 / 968 ms，含点击、挂载与新context初始化 |
| 桌面3D | 9,280 triangles，3 draw calls，3 geometries，1 texture，DPR1 |
| 390px / 模拟DPR3 | 4,352 triangles，3 draw calls，3 geometries，1 texture；实际DPR1.35，canvas432×432 |
| 静止700ms | frame计数不变，无持续动画/自动转动 |
| 5次切换 | 离开3D0canvas，每次返回恰1canvas |
| 旋转/缩放后dispose重挂载 | camera JSON保留 |
| 3D首次网络下载abort | 2D回退可用；解除阻断、点击重试后整页reload，cut57等URL状态恢复 |
| 真实触摸事件模拟 | CDP一指横拖改变相机；双指拉开改变相机距离 |
| 禁用全部WebGL getContext | 显示回退剖面；进度按钮可用且36个tag仍在 |
| 贫金属/通道封闭 | 3D分别读出sulfide0、quartz0，与模型/2D相符 |
| 连续dispose两次 | DOM/canvas归零，无异常 |
| pageerror / console error | 0 / 0；已去除测试harness缺favicon造成的404噪声 |

材质与几何预算显著低于移动25k/桌面60k目标；这里只报告当前帧和当前renderer对象计数，不据此承诺所有设备帧率或完整GPU内存。3D依赖按需chunk加载，非热液/非标本视图没有WebGL context。

## 已实际看过的画面

已打开检查默认矿脉、外表/新切面、贫金属对照、风化和砂矿390px中英文的过程/标本截图。主脉与支脉穿切较暗围岩，金属状颗粒有独立反射；空间纹理随旋转/切面保持。手标本是代表性创作，不能据此把颜色或反光当化验结果。

手机长英文条件/按钮会换行，无横向溢出；主要按钮≥44px、原生选择框/滑块/勾选框可键盘与触控。图内较小文字都有画面外的状态、身份、账本和边界解释。过程与标本转换明确区分地质原位和参考观察排列：砂矿阵列不保证已解离，未明显富集的风化分支不提前画成必然铝土矿。

证据文件（临时工作环境目录）：

- `/tmp/earth-ores-browser/vein-final-desktop.png`
- `/tmp/earth-ores-browser/vein-exterior-desktop.png`
- `/tmp/earth-ores-browser/vein-cut-desktop.png`
- `/tmp/earth-ores-browser/vein-poor-desktop.png`
- `/tmp/earth-ores-browser/vein-final-mobile-en.png`
- `/tmp/earth-ores-browser/bauxite-process-mobile-en.png`
- `/tmp/earth-ores-browser/bauxite-specimen-mobile-zh.png`
- `/tmp/earth-ores-browser/placer-process-mobile-zh.png`
- `/tmp/earth-ores-browser/placer-specimen-mobile-en.png`
- `/tmp/earth-ores-browser/fallback-mobile-zh.png`

## 保留的边界

热液/风化份额为任意来源标记，砂矿为固定同代表粒径样本；没有温压史、相平衡、真实淋失流量或起动流速。3D纹理与轮廓并非自然矿体的几何复原；切面与空隙编码不构成取样/加工教程。典型密度/硬度仅对应参考矿物，不是混合矿石整体的单值。经济面板使用虚构代币与理想分离，不确定开采许可或环境可接受性。相邻馆及最终Reader生产往返/所有馆总资源由父整合任务复核。

## 主动有限过程播放复测

同日新增三条路径的播放/暂停、来源复位和手动回看。播放状态不进URL，仍为18个科学/观察状态键；恢复路径不会自动继续。18秒只压缩过程次序，不能换算地质时间；近图中英文同样说明。减少动态时只在10个阶段更新。切路径/观察方式/条件、实例`pause`、画面离屏、后台或`dispose`均停时钟。

热液来源批的`depositedFraction`允许批内渐次沉淀；整批计数仍是36个唯一来源。账本同时报告未开始、迁移/部分沉淀、已完成整批与两类批内平均份额，注明非实测质量/体积/品位；接近0/100但未到边界时用不等号，避免四舍五入造成账本矛盾。3D沿固定材质场显露填充，蓝灰带编码输入迁移；不是实测方向、流速、孔隙流动或晶体生长求解。相机、切面和形成进度保持独立。

实际运行 `/tmp/earth-ores-browser/playback.py` 与 `playback-mobile.py`，环境仍为Linux Chromium/SwiftShader分块harness，不是手机真机或硬件GPU帧率。结果分别保存在`playback-report.json`、`playback-mobile-report.json`：

| 检查 | 实际结果 |
| --- | --- |
| 0→100完整热液播放 | 18,175 ms，含点击；终点自动停止 |
| 起点/约31/约72/100 | 实际截图并逐一打开检查：同一脉从暗色、蓝灰迁移带到部分填充、终点石英与金属状斑块 |
| 全程资源 | desktop 9,280 triangles / 3 draw calls / 3 geometries / 1 texture；几何、材质、环境贴图对象身份全程相同 |
| 同一材料节点 | 热液v0为同一个DOM节点，36ID；风化/砂矿的b18/p0也在播放前后保留，分别30/24ID |
| 停止后700 ms | rAF回调682→682，renderer frame179→179，无空闲时钟/持续render |
| 暂停/拖动/重置 | 暂停于69.721保持；手动42.5即停；回到来源0；改条件即停；实例pause、重挂载保留90但不继续 |
| 画面离屏 | 实际滚动让图容器离开视口后停，后续进度保持；观察目标只包画面，不包长正文 |
| 风化/砂矿播放 | 从标本按钮明确返回形成剖面，至终点自动停止；均0canvas |
| 390×844触控、DPR模拟3 | 实际DPR1.35，canvas432×432，4,352 triangles / 3 calls / 3 geometries / 1 texture；无横向溢出 |
| 减少动态 | 从80起播前1秒保持80，随后只写入90阶段；继续至100，未出现中间连续位移 |
| 播放中触控 | CDP一指拖动与双指拉开均改变相机；重挂载保留相机、没有恢复播放 |
| 相反条件 | 贫金属播放终点quartz1/sulfide0；封闭终点两者0 |
| 后台事件处理 | 合成`document.hidden`和visibilitychange验证停止；不冒充真实后台设备测试 |
| 首次3D下载abort | 2D仍可播放，36标记；回退收起空白3D主机；解除阻断重试后cut57/progress90恢复且暂停 |
| 全WebGL拒绝 | 回退仍可有限播放至终点，36标记可观察 |
| 幂等dispose | root与canvas归零，之后500 ms无新rAF回调 |
| 错误 | 主流程pageerror/console error为0；降级注入流程pageerror为0，预期网络/WebGL失败单独检查 |

场景填充只更新uniform；切面没变便不更新几何，过程中没有新纹理请求或重复材质/几何创建。内容最多15Hz更新；记录的renderer frame含环境预处理，不以它推算真机FPS。已复跑全仓`typecheck`、`check:i18n`与本馆10个模型测试通过；最终Reader生产路由/根URL限频和全馆门禁仍由父任务统一验收。

新增已实际打开的画面：`playback-vein-source.png`、`playback-vein-transport.png`、`playback-vein-deposit.png`、`playback-vein-complete.png`、`playback-mobile-stepped-en.png`、`playback-fallback-mobile-zh.png`、`playback-bauxite-complete.png`、`playback-placer-complete.png`（均在`/tmp/earth-ores-browser/`）。
