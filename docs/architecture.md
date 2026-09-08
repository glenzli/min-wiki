# 百科框架与新增专题

## 当前选择

使用多页结构：`/` 是百科目录，`/topics/<id>/` 是专题。目录和专题之间采用真实链接导航。这样每个专题可独立选择 WebGL、Canvas、SVG 或普通文图，专属代码不会进入首页包；离开页面由浏览器销毁文档，专题仍负责在 `pagehide` 中停止音频、动画和后台任务。若页面进入往返缓存，应保留其状态并处理隐藏/恢复，不在同一页面中重复挂载引擎。

没有引入通用动画播放器、巨型全局状态或专题组件注册中心。黑洞的轨道切换、采样缓存与时间压缩仍属于黑洞专题。后续出现第二种真实需求时再提取共同能力。

## 内容登记

`content/catalog.json` 分为 `categories` 与 `topics`。

| 字段 | 用途 |
| --- | --- |
| `id` | 稳定的小写字母、数字和连字符标识；决定 `/topics/<id>/`，发布后尽量不改 |
| `title`、`summary` | 目录名称与问题简介 |
| `category`、`tags` | 一个主分类与多个检索标签；标签可跨学科 |
| `duration`、`modes` | 描述真实播放时长与已支持的讲解方式 |
| `theme` | 页面默认明暗，`light` 或 `dark` |
| `sceneTheme` | 画布设计约定，由专题实现；不随全站阅读主题强制变化 |
| `status` | `draft` 或 `published`；只有后者进入目录与正式构建 |
| `updated` | 内容最后修订日期 |

封面可放在 `topics/<id>/cover.svg`，目录自动收集 URL；没有封面时使用分类符号。封面不导入模拟器，不在目录运行动画。

构建验证登记数据和公开入口。草稿没有构建入口，仍需避免从公开文件导入草稿内容；草稿字段不是保密边界。未完成的选题放到计划文档，不把空页面伪装成已有知识。

## 添加一个专题

1. 创建 `topics/<id>/index.html`、`main.ts`、专题样式、知识说明、参考资料与所需资源。测试放在专题的 `tests/` 目录。
2. 在目录登记真实元数据。先用 `draft`，内容可用并完成检查后再改为 `published`。
3. HTML 根节点设置 `data-content-theme` 与 `data-theme` 为专题默认明暗。头部加载 `/src/platform/theme.ts`；页面预留 `<div id="encyclopedia-nav"></div>`。
4. 专题入口调用 `mountTopicNavigation('<id>')`（来自 `../../src/platform/topicNavigation.ts`）。用公共语义变量 `--page`、`--surface`、`--ink`、`--secondary`、`--border`、`--accent` 实现阅读界面；为画布单独设置适合知识内容的颜色。
5. 为动画实现停止、隐藏、恢复和资源释放。禁止加载后自动播放配乐。提供键盘和触摸可操作的控制，以及画面不可用时仍可理解的讲解。
6. 运行 `npm test` 与 `npm run build`。从 `dist` 预览验证直接访问、刷新、返回目录、主题切换、移动布局、主要交互与错误提示；新增专题无需改 Vite 的入口清单。

未来的明亮专题可把整个画布也设为浅色；独立于页面偏好并不意味着每个画布都必须是深色。不要对 WebGL 画布套反色滤镜。

## 知识内容约定

每个专题至少说明：它回答什么问题、读者能改变什么条件、应观察什么、解释依据与参考资料、哪些是教学简化。儿童版和深入版可以共享同一演示；若不提供某种模式，目录不能宣称已提供。数学或科学模型的测试只能证明实现满足给定假设，不能代替科学审校。

## 渐进扩展

当前元数据全部载入，搜索按标题、简介、分类与标签匹配，显示按 24 条分批；动画始终按页面隔离。内容增多后可先增加静态索引或更好的搜索，再视实际需求拆分类索引、增加关联阅读与本机学习进度。账户、后台、多人编辑、全文服务和离线包没有在本轮实现。

仓库目录暂保留 `black-hole`，项目展示名称为「小小百科」，不影响专题 URL 和未来更名。

## TypeScript 与双语

运行时代码、模拟器、Worker 和构建配置使用严格 TypeScript。`npm run typecheck` 只检查类型，Vite 负责转译和打包；`npm run build` 先执行类型及翻译检查，输出静态多页站点。原有 Node 测试通过 `tsx` 加载 TypeScript，`npm run check` 是提交前完整检查入口。依赖使用 npm 安装并提交 `package-lock.json`，不从 CDN 动态载入代码。

`src/platform/i18n.ts` 负责语言选择、链接参数和 i18next 初始化。优先级为 URL 的 `lang`、本机选择、浏览器语言、中文默认值。语言切换采用完整页面导航，保留当前路径、筛选和锚点，重新初始化专题；不承诺保留模拟进度。存储不可用时，URL 仍能确定语言。

中文原文作为消息键与默认文案，英文放在 `locales/en.json`。公共文案与目录元数据的翻译属于 `src/platform/locales/en.json`；专题讲解、模型说明、动态读数和画布标签的翻译属于 `topics/<id>/locales/en.json`，通过该专题的 `i18n.ts` 注册。所有资源随页面打包，无需翻译服务。物理公式的数值、标识和状态键不随语言改变。

静态 HTML 由入口在启动控制器前调用 `translateDocument(t)`；动态文案显式调用 `t('中文消息')`，变量使用 i18next 插值。DOM 结构保留在源码，翻译仅负责文案。文本写入 `textContent`，HTML 模板只接收专题自有的可信数据，不拼入用户输入。新增条目需要同时补齐目录和专题英文，并运行 `npm run check:i18n` 检查遗漏、插值和模板结构。科学内容的范围与限制必须在两种语言中一致。

## Adding a topic and translations

### 子路径托管 / Subpath hosting

可使用 `npm run build -- --base=/encyclopedia/` 指定 Vite 资源前缀；运行时的目录、专题和语言切换链接也使用同一 `BASE_URL`，默认独立托管仍为 `/`。宿主注入的站外导航可标记 `data-host-link`，不参与百科内部的路径与语言转换。无 JavaScript 的链接应由托管同步工具添加同一前缀。

Build with `npm run build -- --base=/encyclopedia/` to mount under a host site. Runtime catalog, topic and language links share Vite's base; standalone hosting still defaults to `/`. Host navigation may use `data-host-link` to opt out of app-link translation. The host sync tool must also prefix static fallback links for use without JavaScript.

1. Add `topics/<id>/index.html`, a TypeScript entry, styles, content, references and tests. Register the topic in `content/catalog.json`; only published topics enter the production build.
2. Create a topic-local `i18n.ts` that calls the platform's `translator('<id>', english)` with its `locales/en.json`. Chinese source messages are the fallback keys. Add English catalog metadata to the shared dictionary.
3. Call `translateDocument(t)` before starting dynamic controllers, then mount shared navigation. Use `t()` for dynamic text, including canvas labels and accessible descriptions; keep markup in the source and interpolate only trusted local content into HTML templates.
4. Preserve model identifiers and numeric data across languages. Keep all scientific qualifications and model limits in both versions.
5. Run `npm run check`. Preview `dist/` and test both languages, direct links, language switching, narrow layouts and the topic's main interactions. Build entries and translation checks both discover published topics from the registry.
