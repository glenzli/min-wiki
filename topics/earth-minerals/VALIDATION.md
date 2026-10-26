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

## 本轮原生预览全场景精修 · 2026-10-25

本节为本轮证据，不复用上方Linux harness数量冒充重测。基线`705f68bb`，局部未提交修改。实际使用macOS上的Codex原生IAB，`cua_repl`操作共享Reader预览`http://127.0.0.1:55291/encyclopedia/`，临时tab2，测得1280×720、DPR1.5。没有修改共享视口；390px矩阵、最终完整构建和全仓门禁由父任务负责，尚不能据本节宣称移动端或发布验收。保持草稿，未提交、推送或部署。

### 改动及逐场景观察

- `structure / carbon`：检查3D钻石/石墨、层滑移0/100、二维连接对照。仅提高深色石墨球棒的可见度，邻接关系与层位移模型不变。
- `structure / quartz`：检查露出展品和自然位置，根部A为同一`-0.17,-1.12,0`；围壁改为接到基底的厚实体和开放观察口，固定晶体及母岩不移位。显示遮罩进入不透明阶段，避免后绘制的后壁盖住前方晶面。最终英文截图已实际检查可见晶体前面、基底接触和围壁。
- 赋存四情景`vein/geode/pocket/grain`：逐一检查裂隙A连接、洞壁向内生长、晶囊接触及嵌晶粒；均为独立代表剖面，不是把同一晶簇变成另一环境。天然面/切磨面两种说明也逐一观察。
- `growth`：改为展品先出现，播放/拖动仍靠近画面，对象、环境、阶段跳转和次要条件默认折叠。检查热液0/65/100，以及65→100→0→65：A–E、五组根部和析晶份额`0.30406243910751324`恢复一致，保留1canvas；离开结构/生长厅后0canvas。没有增加科学状态键。
- 检查低供给热液终点无净析晶、同一母岩仍可见；慢冷熔体终点100份晶体/0玻璃/0熔体，急冷4份晶体/96玻璃/0熔体；蒸发仍为20%水量。修正蒸发图水柱以前与读数不一致的映射，最终高度43.6相对初始218为20%；符号晶粒布局限制在当前溶液显示区，并近图声明其位置、大小为示意。
- `evidence`：六种虚拟标本全部实际观察，自制晶面明暗、横纹、板片或颗粒集合体加强区别；图形没有加入过滤证据。石英只开密度保留2/6相容；五证据全开时赤铁矿1/6，记录保持典型硬度5–6、红褐条痕和比较带限定。切到证据厅0canvas。
- `resources`：保留二维材料账；默认8kg、-26代币。品位5%时40kg、230代币；只把价值改为2后仍40kg而余额-10。英文切换保留前述实验、证据、相机和预算选择，桌面没有横向溢出。

热液主动播放已实际开始、进度推进；共享浏览器切到其他场景时停在中间态，符合隐藏即停。最终英文再次明确点播放到66.5%，再点暂停保留66.8%，`aria-pressed=false`，1canvas和A–E/根部A保持；当前tab捕获console error为0。此轮不冒充又完整计时了一次18秒终点，也没有重做旧harness的故障注入、真实后台或真机性能。既有有限播放/释放代码保持，最终资源及组合路由复核由父任务完成。

### 本轮自动检查与范围

`node --import tsx --test topics/earth-minerals/tests/*.test.mjs topics/earth-ores/tests/*.test.mjs`：21/21，其中本馆11/11；测试覆盖保留的模型、几何和状态契约，并非扫描鉴定或自然生长证明。最后一轮`npm run typecheck`、`npm run check:i18n`（83 namespace、7522 source messages）及限定两馆的`git diff --check`通过。未自行运行全站构建。

最终自然位置帧：16,558 triangles、33 uploaded geometries、6 textures、DPR1.5；碳网络观察帧52,284 triangles。只是该帧Renderer计数，不据此声称完整GPU内存或固定FPS。源码身份：`scene.ts` SHA256 `c3dd00b3550dad8554c721586b0708dcdeac20df483b8bb872d4e50f12c192bb`，`study.ts` `6c51441b4a093c6ab12c0cdeda36fda40b1edaba63b7feb2685990f1f879b4d0`。

### 给父任务的390px中英矩阵

独立路线`/encyclopedia/topics/earth-minerals/`，每行加`lang=zh`与`lang=en`各查一次。下表只列区别参数；完整有效默认值由模块补齐，参数前缀均为`earth.minerals.`。

| 观察 | 查询条件 |
| --- | --- |
| 碳结构/层滑移 | `view=structure&representation=carbon&shear=100` |
| 自然/露出晶簇 | `view=structure&representation=quartz&exposure=0`，再比较`exposure=100` |
| 四赋存/表面来源 | 同上，`occurrence=vein/geode/pocket/grain`逐个选择；`finish=natural/cut` |
| 热液中间态 | `view=growth&environment=hydrothermal&progress=65&rate=30&supply=70` |
| 无净析晶 | `view=growth&environment=hydrothermal&progress=100&supply=0` |
| 慢冷/急冷 | `view=growth&environment=melt&progress=100&rate=0`及`rate=100` |
| 蒸发终点 | `view=growth&environment=evaporation&progress=100&supply=70&rate=30` |
| 证据六标本 | `view=evidence&specimen=quartz/calcite/gypsum/halite/pyrite/hematite`逐个选择，比较无证据与全部五证据 |
| 预算与长英文 | `view=resources&grade=5&recovery=80&price=2&cost=90` |

### 当前画面证据与限制

本轮共用截图目录`/tmp/earth-minerals-ores-refine-20261025/`。本馆关键文件：`minerals-carbon-final-en.jpg`、`minerals-carbon-2d-final-en.jpg`、`minerals-quartz-natural-final-en.jpg`、`minerals-quartz-display.jpg`、`minerals-occurrence-{vein,geode,pocket,grain}.jpg`、`minerals-finish-{natural,cut}.jpg`、`minerals-growth-{0,65,100,no-crystals,melt-slow,melt-glass}.jpg`、`minerals-growth-65-final-en.jpg`、`minerals-evaporation-final-en.jpg`、`minerals-evidence-{quartz,calcite,gypsum,halite,pyrite,hematite,all-clues}.jpg`和`minerals-resource-en.jpg`。带`final`的文件包含最后一轮围岩/水柱修正；早期同名阶段图不替代它们。

不需要新增生成图片。程序材质、面形和标本比例仍为代表性创作；哈希围岩遮罩有可见细颗粒显示纹理，不是实物孔隙或风化颗粒。没有增加真实晶面角、光学路径、晶体尺寸、矿物鉴定或实地采集保证。新手机证据布局尚待父任务实际核对，故不据桌面结果升级稿件成熟度。
