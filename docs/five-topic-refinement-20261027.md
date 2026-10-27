# 五个完成稿专题的机制与引导精修

日期：2026-10-27。范围：大气、恒星与多星系统、黑洞、星系与宇宙尺度、火山。用户批准上一轮只读审查后的本地实施；没有提交、推送或部署，没有改变完成稿名单。

## 完成的行为

| 专题 | 本轮变化 | 保留的边界 |
| --- | --- | --- |
| 大气 | 湿气块和机制云共享位置；臭氧进入/吸收传能/输送及热层日光加热/稀疏粒子运动/极光输入有独立步骤；关闭解释层可移除线索，收起解说保留完成态；修正分段高度公式 | 背景天气继续使用原现场时间；能量短带与放大粒子是可关闭解释符号，不是实测物体或温度计算；其他世界保持各自特点 |
| 恒星 | 整球 A 圈和局部黑子来自同一活动区；辐射传递、暖升/冷返与光球颗粒对应；耀斑有前态、连接改变、释放、衰减和后态，可暂停/拖动/重看且结束不循环；修正文图不一致承诺 | 新事件复用原表面回调；不推进恒星演化、预设轨道或三体科学时间；磁连接和压缩观察时间是机制示意 |
| 黑洞 | 选择部位对应几何参考，固定 A 示意位置；弯光提供独立视角、非比例的二维侧图；`part` 可直达且验证参数 | 主光学图保留原射线表示；侧图不是跟随镜头的测量光路，不增加引力或流体求解 |
| 宇宙尺度 | 从同一半径数据计算直径比，先估计再显示共同标尺；“新旅程”和“继续上次”成为明确不同动作 | 帧内线性尺度不变；普通切章继续保存实验，结构地址与物理距离分别解释 |
| 火山 | 新进入造山题从 0% 开始，普通播放经过地下过程；未贯通终态直接说明本次没有喷发，区分原有山体与本次物质 | 显式进度、返回本题和旧链接保留原观察状态；早期未贯通不提前宣布最终失败 |

## 实施与视觉复核

三个 Sol 6.1 max 子 Agent 分别负责大气、恒星、宇宙尺度/黑洞；主任务负责火山、源码复核、统一构建和浏览器验收。各自通过 Dev Mesh Claim 接受继承基线；上一轮 17 项未提交工作保留。新科学状态和绘图仍由专题拥有，未修改共享 Reader 或原子黑洞/恒星风模型。

实际浏览器发现两处“状态正确但画面不清楚”的问题并返修：大气解释线被空气体积洗淡，改为在空气后绘制的有限短带；太阳金黄选区与表面混在一起，改成有深色衬线的圈和表面外 A 徽标。修后重新构建并目视复核。

## 验证记录

- 火山路由、补给/贯通和新结果反馈：19/19，通过。
- 恒星与 Sun 兼容入口：91/91，通过；最终仅选区/层标签对比度变化后的太阳机制/绘图组 8/8，通过，未改变此前已验证的时钟、URL 和模型。
- 宇宙尺度：20/20，通过；黑洞：16/16，通过。
- 大气初轮受影响集合 48/48，通过；机制状态调整后受影响组 34/34，通过；最终解释层可见性改变后的机制/现象组 22/22，通过。未改变云/成分底层，因此不为其重复运行同一组。
- `npm run build` 通过：类型、7540 条来源消息/83 个英文命名空间、161 份图片、正文投影、稿件状态和 82 入口构建。
- 最终绘图变化后 `npm run typecheck`、`git diff --check` 通过。
- 生产消费构建使用 `WIKI_READER_ROOT=/Users/g4i/lab/wiki-reader npm run reader:build`，与当前 55314 预览采用同一 Reader 工作区 `48bd98efce93fcae75d196d3ef6a02474e8d2edb`。这次检查发现安装目录中的旧 Reader 字节与当前本地工作区不同，默认构建的旧外壳不作为当前界面的视觉证据；没有改依赖锁或 Reader 源码。最终 `dist/wiki-build.json` 的 `sourceDigest` 为 `08ebb71ebfb34f0bfe586f49f7b0e320deb4718b222f4f7c8c7210e72b7c3b63`。
- 验收后逐项核对产物记录的 1775 个输入文件，当前字节与构建摘要全部一致；[机器回执](/private/tmp/five-wiki-refinement-20261027/receipt.json)记录构建身份、操作结果与截图清单。临时验收页和静态服务均已关闭，原 55314 用户页保持可用。

选用受影响专题测试和一次共享门禁，随后只因明确的视觉修复重跑受影响检查/消费构建。未声称本轮重跑了全站全部测试，也未将局部精修视为对所有场景、硬件性能或 GPU 故障恢复的完整验收。

## 实际操作覆盖

中文与英文、桌面与 390px 窄屏都进行了代表性检查，受影响页面未出现横向溢出。检查使用真实页面控件；源码模型取样与屏幕目视分别记录。

- 大气：暂停现场后手动三步，收起解说仍保留步骤；湿气块处成云、晴空反例；解释层关闭无提示残留；热层第 1/2 步与极光第 3 步明显不同，关闭极区粒子输入有明确负结果。
- 恒星：A 圈实际覆盖整球黑子对并对应局部；辐射与对流图例；手机上下两幅完整保留；耀斑释放与后态截图；拖动至 12 后恢复表面动态仍不重演，换章返回仍为同一结束状态。
- 黑洞：中文桌面与英文手机光路；从吸积盘切回弯光保留 100% 进度；俯视/关闭参考线保留该进度。
- 宇宙尺度：地球/木星核验显示约 11 倍并使用同一长度单位；中文窄屏；英文银河叙事动作从 0.86 恢复旧尺度，新旅程回到太阳起点 0.10376。
- 火山：新造山入口为 0%，普通播放进入 5.4% 时仍在地下前序；未喷发终态回退为深部补给、再推进得到相同负结果；英文手机结果提示。

## 复查入口与证据

用户预览继续保留在 `http://127.0.0.1:55314/encyclopedia/`。验收用的临时静态服务仅检查本机构建产物，收尾时关闭，避免留下第二个旧预览。

- [A 活动区最终成图](/private/tmp/five-wiki-refinement-20261027/stars-active-region-final.png)
- [太阳传能](/private/tmp/five-wiki-refinement-20261027/stars-energy-final.png)、[英文手机](/private/tmp/five-wiki-refinement-20261027/stars-energy-en-mobile.png)
- [耀斑释放](/private/tmp/five-wiki-refinement-20261027/stars-flare-release.png)、[后态](/private/tmp/five-wiki-refinement-20261027/stars-flare-after.png)
- [臭氧吸收/传能](/private/tmp/five-wiki-refinement-20261027/atmosphere-ozone-visible.png)、[成云对应](/private/tmp/five-wiki-refinement-20261027/atmosphere-cloud-correspondence.png)
- [热层日光](/private/tmp/five-wiki-refinement-20261027/atmosphere-thermal-1.png)、[粒子运动](/private/tmp/five-wiki-refinement-20261027/atmosphere-thermal-2.png)、[极光另一路径](/private/tmp/five-wiki-refinement-20261027/atmosphere-thermal-3.png)
- [黑洞光路](/private/tmp/five-wiki-refinement-20261027/black-hole-lensing.png)、[英文手机](/private/tmp/five-wiki-refinement-20261027/black-hole-lensing-en-mobile.png)
- [直径核验](/private/tmp/five-wiki-refinement-20261027/cosmic-ruler.png)
- [造山起点播放](/private/tmp/five-wiki-refinement-20261027/volcano-building-play.png)、[未喷发结果](/private/tmp/five-wiki-refinement-20261027/volcano-stalled-final.png)

最初评审、子任务实施说明、测试日志及截图位于 `/private/tmp/five-wiki-quality-review-20261027/` 和 `/private/tmp/five-wiki-refinement-20261027/`。这些是本机过程证据，不是长期发布地址。

## 统一提交前复核 · 2026-10-28

用户授权全部收尾后统一提交并推送。本轮五题、目录分级、宇宙尺度立体结构与太阳外观统一的 75 项文件一并纳入复核；其他专题保留草稿状态。

全仓库 `npm test` 的 1741 项测试全部通过，`reader:coverage -- --require-all` 确认 82/82 路由使用 Reader，`git diff --check` 通过。最终构建沿用太阳统一后的完整产物：摘要 `bddab0e41c149a2fbef23cea24f12dee465d5f0d82a5d385443823db20da6d5e`，1782 项输入与当前源码逐项匹配。只有本节验收说明新增，未重复构建相同的运行时字节。

本地构建采用锁定版本 `48bd98efce93fcae75d196d3ef6a02474e8d2edb` 的 Reader 源码；推送顺序先使该依赖在其 `origin/main` 可达，再推送内容仓库的 `origin/main`。本轮不执行部署。专题交互和中英桌面 / 手机画面沿用上述记录，以及[宇宙尺度空间统一](cosmic-spatial-style-20261027.md)、[太阳统一](cosmic-solar-unification-20261027.md)的实际浏览器验收。
