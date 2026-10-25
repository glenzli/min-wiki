# 矿物馆验证记录

日期：2026-10-25。内容分支与提交由父整合任务维护，本馆没有自行commit/push/merge/部署。

## 已完成的范围

双语四厅（碳连接/晶簇形态、成晶环境、多性质证据、矿石预算）均有实际可操作内容、机制解释、独立边界与来源；3D与2D视图消费同一状态，独立入口与父馆消费同一模块。完整静态正文与六矿物档案在中英Markdown；`learning.json`维持三学术/四口播合同，生成投影由父任务统一prepare。

## 自动检查

- `node --import tsx --test topics/earth-minerals/tests/*.test.mjs`：11/11通过；动画版新增固定晶体身份/根部与预算驱动的可逆形态检查。原10项仍保留。覆盖路线初值/相机安全边界、晶粒与玻璃不同去向、两类溶液条件、材料预算、快照回退、多证据排除、品位/回收/价格独立效果、两种碳网络真实邻接、暴露对照固定A与尺寸、以及晶洞晶体向内生长。
- `npm run typecheck`：通过（全仓当前文件）。
- `npm run check:i18n`：通过，81个英文namespace；包括独立reader与study内w双语对。
- 全量测试/build/Reader生产路由由父整合任务运行；不把本馆harness检查写成已完成全站生产验收。

## 实际浏览器环境

Linux本地Chromium headless，`/usr/bin/chromium`，Three.js r170，Playwright驱动，`--enable-unsafe-swiftshader`软件WebGL，本地HTTP。模块以esbuild分块打包进独立测试harness，桌面1280×1000 / deviceScaleFactor1；窄屏390×844，触摸与`is_mobile`模拟，deviceScaleFactor2和3；`prefers-reduced-motion:reduce`。这不是手机真机、GPU加速手机FPS或远程网络性能测试。

下表为动画改造前的赋存版记录（`/tmp/earth-minerals-browser/report.json`）；新动画检查见后节：

| 项目 | 实测 |
| --- | --- |
| 冷打开至第一个ready碳结构帧 | 1597 ms（最新17键/赋存版）；此前相同本机环境不同轮次845–1230 ms，后台并行任务会影响结果 |
| 证据厅→3D厅，6次返回至ready | 2010 / 2476 / 2044 / 1955 / 1797 / 1576 ms（含点击、布局与上下文重建） |
| 桌面碳结构单帧 | 52,284 triangles；3 geometries；1 texture；DPR1 |
| 390px、模拟DPR3宏观晶簇 | canvas432×432；实际DPR1.35；5,374 triangles；30 geometries；6 textures |
| 静止700ms | 帧计数不增长，无持续render loop |
| 六次结构→证据→结构 | 非3D厅0 canvas，每次返回恰1 canvas |
| 相机旋转/缩放→销毁重挂载 | camera JSON保持一致；已修正初次宏观挂载重复缩小的问题 |
| 人为WEBGL_lose_context | 显示2D对照与重试；保留URL reload后恢复1canvas |
| 阻断3D scene块首次下载 | 解除阻断→点击重试→整页reload成功，exposure57/finishcut保留 |
| 390px围岩部分显示（57%暴露） | 16,894 triangles；30 geometries；6 textures；DPR1.35 |
| 桌面围岩50%显示 | 35,326 triangles；30 geometries；6 textures |
| 禁用全部WebGL getContext | 0canvas、2D对照打开；石墨滑块仍可操作 |
| dispose连续两次 | 模块与canvas归零，无异常 |
| pageerror | 0 |

指标来自渲染器当前帧与当前内存计数，不等于完整GPU内存占用；隐藏的同一scene资源仍在该scene生命周期内，离开结构/生长两厅后统一释放。纹理计数包含程序环境/透光缓冲相关资源。没有声称JS堆/GPU使用在长时间运行中绝对不增长。

## 人工实际图像检查

已打开并观察桌面碳网络、精修宏观石英、自然赋存/露出对照、岩体剖面与390px中英界面截图。碳结构与宏观形态明显区分；晶体可看见平整晶面、柱体尖端、从乳浊根部到较清透尖端的变化、透光叠影与有限横纹；母岩有颗粒/脉纹/铁染和不规则断面，根部细晶芽连接晶柱与母岩。自然位置以明确标注的前剖开/半透明围岩表示，A仍在同一根部，0→100→50%来回不会搬移或缩放原晶簇。形态是创作示意，没有称为照片或扫描。旋转、键盘方向/缩放/Home及触摸点击可用；无自动转动。手机所有四厅中英无横向溢出；长英文选择与解释会换行，主要控件≥44px。

截图证据位于工作环境临时目录，父任务可据此复核：

- `/tmp/earth-minerals-browser/carbon-final-desktop.png`
- `/tmp/earth-minerals-browser/quartz-final-desktop.png`
- `/tmp/earth-minerals-browser/quartz-final-mobile-zh.png`
- `/tmp/earth-minerals-browser/carbon-mobile-en.png`
- `/tmp/earth-minerals-browser/quartz-mobile-en.png`
- `/tmp/earth-minerals-browser/growth-mobile-en.png`
- `/tmp/earth-minerals-browser/evidence-mobile-zh.png`
- `/tmp/earth-minerals-browser/resources-mobile-en.png`
- `/tmp/earth-minerals-browser/fallback-mobile-zh.png`
- `/tmp/earth-minerals-browser/occurrence-natural-desktop.png`
- `/tmp/earth-minerals-browser/occurrence-display-desktop.png`
- `/tmp/earth-minerals-browser/occurrence-half-desktop.png`
- `/tmp/earth-minerals-browser/occurrence-section-desktop.png`
- `/tmp/earth-minerals-browser/occurrence-cut-desktop.png`
- `/tmp/earth-minerals-browser/occurrence-natural-mobile-en.png`
- `/tmp/earth-minerals-browser/occurrence-grain-mobile-zh.png`

## 仍然有限的范围

石英是低预算实时程序形态，没有专业标本扫描的细节密度；尖端未重建全部三方晶体学面指数，透光不求双折射或精确多晶体光路。它达到了可辨认、可操作的教学晶面表现，不能据此声称完整的自然标本复原。性质筛选只有六种典型；没有跨全部矿物数据库或真实照片鉴定。成晶不是相图求解，预算不是现实矿业预测。最终生产Reader中的跨馆往返、所有馆合并资源预算与全站门禁继续由父整合任务复核。

3D失败重试采用完整URL的整页reload。Chromium同文档可能缓存失败的动态import结果，因此不能依赖同文档重新调用import恢复首次网络失败。父馆与独立馆URL在每次状态回调后已持久化完整17键；reload后恢复，不自动播放。


## 有限晶体生长动画（本轮）

实施范围只在 `topics/earth-minerals/**`，共享 `finitePlayback.ts`由父任务提供。本轮未改生活馆、矿石馆或其他馆。热液为新默认环境；三环境原材料预算公式保留。固定同一母岩、5个主要晶体A–E、22个小晶芽与36个明确标示为示意的搬运标记。晶体、内含物、母岩、纹理及二维图节点预先构建；播放帧只改变变换、既有位置缓冲、属性与文本。

自动检查：矿物模型 **11/11**、`npm run typecheck`与i18n **81个英文namespace**通过。全局生产构建由父任务负责；本轮未执行全站build、提交或部署。

实际浏览器与前述同一Linux Chromium/Playwright/SwiftShader环境，独立分块harness `/tmp/mineral-growth-browser/`。桌面1280×1000；390×844触控、中英与模拟DPR3；减少动态启用。共 **62项**断言通过，浏览器`pageerror`为0。证据在 `report.json`（51项）、`recovery-report.json`（9项）与`controls-report.json`（2项）。

- 初始暂停，播放推进预算与3D；暂停后进度和render帧计数停止；拖动、键盘滑块、前后一步、复位、终点自动停与终点重播正常。
- 65%→其他阶段→65%恢复相同主晶体UUID、根部、母岩UUID与尺度；结构/生长厅实际保持同一canvas与scene引用；熔体/蒸发隐藏并暂停同一3D context；到证据厅后canvas归零。
- 已渲染过碳和生长晶簇后，65%→80%区间内为34 geometries/6 textures，计数不增长；直接进入热液生长时为31 geometries/6 textures。首次显示预建对象会上传其几何，不是每帧创建新几何。未由这些计数宣称完整GPU内存或真实手机帧率。
- 播放中修改供给确实接受新值并暂停，修正了暂停回调重绘曾覆盖输入值的问题。供给0、终点100%时主晶体与小晶芽不显示，母岩仍在；熔体急冷为96份玻璃/4份晶体/0份剩余熔体，剩余熔体为0时无材料点及熔体着色；蒸发仍显示20%水量与守恒溶质账。
- 画面离屏会停，返回不自动续播；测试用harness临时空白区保证画面可完全离屏。`visibilitychange`配合测试性`document.hidden=true`可停并保持进度；这项不是操作系统真实切后台测试。`StudyInstance.pause()`、dispose与双重dispose均停钟并释放场景；销毁后无后续状态回调。
- 减少动态时按12段前进，手动分步/滑块结果保持；390px中英无水平溢出，主要按钮≥44px，触摸暂停及键盘相机保存正常，canvas实际DPR1.35。
- 人为context loss时暂停并打开二维预算；重试reload保留最终阶段、恢复1canvas且保持暂停。阻断首次scene块后二维预算可拖动，解除并重试保留62.4%阶段。完全禁用WebGL时0canvas，二维预算仍可主动播放。异步scene导入返回前切到证据厅，不会晚挂载canvas。

已实际打开检查本轮桌面0%/65%/100%、手机英文65%与熔体急冷截图：根部A与母岩不动；柱面、尖端、横纹、薄雾与反射随同一个体改变；不会由碳的钻石网络变出石英。手机预算/操作会换行。熔体和蒸发的二维图仍直接解释通用模型，不把全部形成环境误称石英。

本轮截图：

- `/tmp/mineral-growth-browser/desktop-stage-0.png`
- `/tmp/mineral-growth-browser/desktop-stage-35.png`
- `/tmp/mineral-growth-browser/desktop-stage-65.png`
- `/tmp/mineral-growth-browser/desktop-stage-100.png`
- `/tmp/mineral-growth-browser/desktop-growth65-final.png`
- `/tmp/mineral-growth-browser/zh-mobile-growth65-full.png`
- `/tmp/mineral-growth-browser/en-mobile-growth65-full.png`
- `/tmp/mineral-growth-browser/desktop-melt-quench.png`
- `/tmp/mineral-growth-browser/zh-mobile-fallback.png`

科学限制仍明确：18秒为教学展示长度，不是自然晶体生长时间；半径/高度插值不预测真实晶面动力学，五个主要晶体不表示模型晶核数；通用容量不是石英溶解度，蓝点不是原子或实测流动；回退是确定快照，不是真实溶解过程。所有形态及光学继续是程序创作，不是扫描、鉴定证据或精确晶格。
