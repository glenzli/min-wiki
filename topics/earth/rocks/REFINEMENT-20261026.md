# 局部精修记录 · 2026-10-26

保留[2026-10-25体积分块与旅程修订](REFINEMENT-20261025.md)。本轮补足已有砂岩与压实胶结的观察差别。

## 改动与观察

`rockMaterial.ts`在固定空间场中分别呈现代表性砂粒、粒间胶结和少量孔隙对比；教学颗粒比旧的密集色噪声更容易辨认，没有实物长度标尺。`process3d.ts`使单独加入的胶结基质采用较均匀的颗粒质感，避免它在压实胶结开始时继承花岗岩斑纹；选定固态变质例仍可与整体共享矿物带。没有改写`model.ts`、24个来源批次或历史。

实际检查原始旅程花岗岩、胶结65%中间态、英文桌面砂岩和390px中英砂岩。来源块与加入基质可区分；手标本中砂粒和粒间材料可辨，保留一个WebGL canvas，未观察横向溢出。截图：`rocks-lithify65-desktop-zh.png`、`rocks-sandstone-desktop-en.png`、`rocks-sandstone-mobile-{zh,en}.png`。当前检查未捕获相关console error。

科学范围继续采用[sources.md](sources.md)的沉积、压实、胶结与变质边界。本轮无新化学预算、粒径预测、真实胶结物成分或孔隙率主张；程序材质也不能识别真实标本。未重新宣称来源网页为本日核读。

## 验证与交付边界

- `node --import tsx --test topics/earth-minerals/tests/*.test.mjs topics/earth-ores/tests/*.test.mjs topics/earth/rocks/tests/*.test.mjs`：39/39通过；保留的模型/几何/状态契约由这些测试覆盖，材质质量另由实际画面确认。
- 最终 `npm run typecheck`、`npm run check:i18n`（7,522条消息、83个英文命名空间）和三主题限定 `git diff --check` 通过。无全站重复构建。
- 实际Reader地址为 `http://127.0.0.1:55291/encyclopedia/`，桌面1280×720与390×844，中英均实际观察。临时viewport已恢复，临时tab已关闭。
- 截图在 `/tmp/earth-ui-materials-20261026/`。它们证明当前场景的真实显示。此服务仍使用原先锁定Reader，部分截图早于最后的公共间距精简；新Reader `workbench.css` 的整体排版、完整路由与生产产物验收由父任务重新构建后完成，不能把本记录当作其通过凭据。
- 三馆新增可选Reader区域声明，进度采用`span / input / output`规范；保留所有科学状态键、回调、相机、有限播放及释放逻辑。只移除由Reader区域样式完整接管的公共间距，保留各主题专有布局。未提交、推送或部署。

本主题运行/测试输入指纹：`61e06141197f700958ebf8ed04fa13f6236cf2e23a6899bac66f7d54d2072863`，覆盖本目录按路径排序的15个`.ts/.css/.json/.mjs`文件及各文件SHA-256行，末尾有换行。共享Reader与共享Earth依赖由整合任务另记。
