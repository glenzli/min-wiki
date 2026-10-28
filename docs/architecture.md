# 内容、演示与 Wiki Reader

Mini Wiki 只维护条目、科学模型、双语解释、素材与内容检查。导航、黑白灰明暗外观、预览服务和静态交付由独立的 [Wiki Reader](https://github.com/glenzli/wiki-reader) 负责。本仓库没有独立首页、Vite 多页站点配置或第二种展示模式。

## 唯一登记表

`wiki.json` 同时登记条目标识、双语标题与摘要、目录元数据、Markdown 正文和演示入口。`categories` 的 `name` 提供中英文名称，条目通过稳定的 `category` ID 归类；`tags` 服务于搜索。`src/catalog/data.mjs` 只把清单投影为内容检查需要的形状，不维护另一份登记数据。

Reader 首页提供缩略图和列表总览，分类与关键词可以组合筛选。默认目录显示完成主题，草稿集中在独立草稿箱；当前主题、兼容入口与逐项评估由[编辑评估](editorial-review.md)生成，不在架构文档重复维护数量。地球入口是轻导览；八个地球问题专题各自发现、保存观察状态和验收，不继承导览的稿件状态。

`id` 决定 `/encyclopedia/topics/<id>/`。语言使用 `?lang=zh|en`，不改变条目身份。`parentTopic` 表示已整合子条目的归属，`listed:false` 只影响目录收录；两者都不删除直达路由。兼容入口继续调用各专题原有的路由模型，把有效参数和锚点交给对应章节。

## 演示生命周期

全部 82 条发布路由以 `document` 声明 `reader.html` 演示片段和专题控制器。它们是 Reader 页面中的原生 DOM，没有 iframe，也没有另一套站点外壳。Reader 打包控制器、样式、Worker 与资源；样式限制在演示范围，不能改变 Reader 导航。专题可以保留自己的多章节、对象身份、独立时钟与有限缓存，不强行改成一种播放器。

原生文档演示每次打开条目拥有一个完整文档生命周期。离开、语言切换或进入只读说明时，旧文档和它的模块、Worker、GPU 资源随页面结束；专题原有的 `pagehide`、隐藏与往返缓存处理继续生效。专注观察保留同一文档和实验实例。只读说明不加载专题脚本；它保留 URL 参数，重新进入演示时恢复程度由该题的路由模型决定，不能宣称所有题都支持任意瞬间存档。

`reader.html` 是 Reader 的外层演示片段。已有的 `study.html`、`panel.html` 与 SVG 是专题内部组件，仍由对应控制器消费，不能用外层入口覆盖它们。

## 内容与双语

专题拥有模型、场景、参数、进度、限定条件、来源与测试。共享演示排版、阅读深度和说明区的实现由 Reader 提供；`src/platform/` 只保留薄导出和内容本身的翻译、学习数据投影。

中文消息与英文命名空间继续由 `i18next` 本地提供。Reader 在导入控制器前确定语言，`translateDocument` 只处理本题演示区域；公式中的参数与状态标识不翻译。中英科学条件必须等价。

`learning.json` 保存原有的三节学术笔记、误解、模型边界、来源和四段解说。`npm run prepare:entries` 把它们投影到 Markdown 的标记区间和纯口播/分镜文本；标记区间之外允许手写补充。`check:entries` 验证投影没有过期。静态阅读与语音导出因此使用同一份原文，纯口播不混入画面提示。

动态章节的学习面板仍按题目和语言懒加载，Reader 的通用 JSON 字段选择只打包该语言与来源。学科数据不进入 Reader 仓库。

## 工作流与验收

- `npm ci` 安装锁定依赖；Reader 的版本与内容依赖分开管理。
- `npm run dev` / `npm run preview` 都调用 Wiki Reader。
- `npm run build` 执行类型、双语、图片与正文投影检查，再用 Reader 输出 `dist/`。
- `npm run check` 再加全量测试和要求完整覆盖的路由检查。

提交前应验证最终 Reader 产物：直接访问、旧参数/锚点、中英手机布局、重点交互、隐藏/暂停和资源失败。测试通过不等于科学结论已审校，也不等于已经推送或部署。

## 稿件成熟度

`wiki.json.review.status` 使用 `complete`／`draft`，`reviewedOn` 与主题拥有的绘图、内容、交互、下一步理由共同形成编辑评估。兼容入口仅记录 `inherits` 和继承状态。它不修改可访问性或原有科学结论；目录隐藏不等于草稿。`scripts/editorial-review.mjs` 是报告和选择清单的唯一投影。完整预览由 Reader 显示两种状态；完成稿同步产物由 Reader 的 `--complete-only` 生成，草稿旧路由只输出整理中提示。宿主同步仍需单独接入，不重建内容仓库的网站模式。

默认展示以当前演示为主。专题可在已有章节/视角组上标记 `data-reader-menu="chapters"`，次要选项标记 `data-reader-menu="options"`；Reader 负责原位折叠、当前项摘要、焦点和关闭行为。不要把播放、进度或必要读数放进这些组。专用示意和参数归属仍在专题内，不能由 Reader 猜测。Reader 内的根状态样式使用 `:root[data-wiki-document]`，编译后对应作用域根。窄屏 SVG 保持原有比例，不用拉高空白来伪造更大画面。

演示外的章节组可同时指定 `data-reader-toolbar="演示区域的ID"`，把章节菜单与讲解方式放进同一工具栏。Reader 只在当前文档中查找已挂载的演示区域，目标不存在时保留原位菜单；黑洞专题使用这一声明消除重复的两层切换栏。

阅读文字、模型限定、资料折叠区和章节／延伸导航通过 `data-reader-prose` 标记。Reader 统一提供左右留白与模块间距；标记不放在主画布、SVG 或实验工作区上。嵌套阅读块避免重复留白，进入侧边讲解面板的文字采用面板自己的内边距。学习说明组件使用同一留白基准，不再依赖已移除的整站外层 padding。

常规控件由 Reader 统一为自适应尺寸：宽于 760px、支持悬停的精确指针环境默认 36px 高、13px 控件字号；窄屏或触控环境保留 44px 目标和 14px 字号。统一使用 6px 圆角、轻边框与选中底色；多行文字和图片选项允许自然增高。正文与科学标注不随控件缩小。画面、短图注、播放栏和阅读区共用桌面最多 20px、手机 16px 的留白基准。自有绘图容器可标记 `data-reader-stage` 去除重复的外框与圆角，播放栏和短图注分别用 `data-reader-transport`、`data-reader-caption` 声明；科学图形的边界和 `data-scene-hit-target` 点击几何保持专题所有。Reader 的界面色使用自身前缀变量，避免与专题的同名深色场景变量冲突。

模型限定按当前画面安排：直接影响读图的一句话仍在图旁；当前章节的详细限制放入解说中的默认折叠区，并保留资料入口；跨章节通用边界放入完整正文。黑洞的 `#limits` 仍由原控制器更新，只调整位置，不复制或改写科学条件。手机双菜单工具栏在同一区域内换行，避免用难辨认的省略文字代替菜单名称。

## 可选 2D 动画引擎 · 2026-10-19

已比较 Anime.js、GSAP、PixiJS、Rive 与 Lottie，结合现有 SVG 图稿、可逆取样、单一专题时钟、按条目加载和分发需求，采用 Reader 的 Anime.js 4.5.0 + SVG 引擎。完整需求矩阵、官方资料与同口径小样见 [Reader 选型记录](https://github.com/glenzli/wiki-reader/blob/main/docs/animation2d.md)。GSAP 的既有建议经更细比较后调整为备选，非能力不足；复杂纹理/粒子场景再评估 PixiJS，角色资产制作再评估 Rive。

`@glenzli/wiki-reader/animation2d` 提供有限的 `create2DMotion` 与 SVG 工具。Reader 拥有依赖、时间线取样和释放机制；内容调用 `seek(milliseconds)`，保留自身模型、科学条件、时钟、插画轨迹与器官连接。创建不自动播放，拖动不触发科学回调，周期动作也读取同一专题时间。条目卸载调用 `dispose()`；减少动态的选择仍由条目按过程语义处理。

植物首批消费：`beeMotion.ts` 将振翅改为非对称上下行和投影变化；`petalMotion.ts` 将卷曲定义为连续轮廓关键帧；`leafMotion.ts` 保留叶柄/叶脉锚点，展开叶片轮廓，避免主要依靠纵向缩放。它们消费既有生长进度，未将条件变化或果实生成交给动画库。首页与静态阅读不导入引擎；其他条目继续使用原有渲染器，后续按需求迁移。

Earth native entry fragments inherit their common display variables from `.earth-single-gallery` as well as the guide `.earth-project`. Scientific models remain topic-owned. The interior plate and ray-path clocks are finite presentation phases with old-link defaults and independent plate/planet cameras; material, terrain and state ownership are recorded in the topic README.

Reader 的可选 `workbench.css` 区域让专题组合观察栏、通栏画面、播放/进度、图注、图例、读数与说明。采用 `data-reader-workbench` 后，这些区域共享默认留白与可换行控件；专题可用变量、自己的选择器或局部 `data-reader-ui="custom"` 调整，不强制侧栏、字段或科学回调。原 `data-reader-toolbar` 的目标 ID 含义不变。本地联调使用 `WIKI_READER_ROOT` 指向独立 Reader 源码；这不表示已发布依赖或安装插件。

紧凑观察栏使用 Reader 的 `data-reader-density="compact"` 与 `data-reader-control-row`：同一行组合本地选择、短提示和讲解入口，仅由外层提供一份内距，空间不足时按实际宽度换行，按钮沿用公共的桌面 36px／触控 44px 自适应目标。纯操作子组标 `data-reader-controls`，提示标 `data-reader-caption`，不把混合信息组整体收起。可见提示位于画面上方时，根区声明 `data-reader-toggle-anchor="stage"`，由 Reader 跟随当前可见的自有画面定位操作入口并释放观察器；专题不再复制高度补偿。普通原生下拉框的箭头通道由 Reader 默认提供（边缘 14px、文字末端 36px），多选列表和已有自定义退出规则保留。专题仍可覆盖工作台变量或在特殊控件上使用自定义样式退出；本地声明不表示已发布 Reader 依赖。

响应式组合通过 `data-reader-layout="stage|compare|flow"` 选择；`data-reader-main` 聚合场景与必要操作，`data-reader-support` 只放可选说明。`data-reader-essential` 保留实验条件、关键读数和必要限定；它们不能仅因外观像侧栏就进入默认折叠区。Canvas 可用 `data-reader-fit="available"` 选择空间预算，SVG 默认保留作者比例；断点依据实际容器宽度并兼顾低高度横屏。长说明正常滚动，不把主画面压成细条。专题仍可自定义布局。设计与验收见 [Reader 可组合布局](reader-responsive-layout-20261026.md)。

Earth studies 在所属模板上声明 `data-earth-presentation`、`data-earth-visual`、`data-earth-transport` 和 `data-earth-choices`。`singleGallery.ts` 调用 `galleryPresentation.ts`，后者仅挂载并释放公共展示句柄，观察懒加载区域的加入与移除；不按章节名称分派科学行为，不复制渲染器或实验状态。隐藏状态应标在完整的所属区域上，避免把隐藏分支的子控件抽到主画面。

地球历史的 `journeyModel.ts` 把原有年代/事件投影为十二个代表观察段，`journeyStudy.ts` 管理有限播放和三种观察尺度，`journeyScene3d.ts` 在一个渲染器内组合保留的地球、附着局部与懒加载证据模型。原线性年代尺、28 条线索与独立氧实验继续消费原状态。局部动作的观察停留和加速跨时代段不具有地质速率含义；来源与限定保留在双语内容和静态正文中。
