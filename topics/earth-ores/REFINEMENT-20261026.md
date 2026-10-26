# 局部精修记录 · 2026-10-26

保留2026-10-25三条成因、来源ID、条件对照、SVG标本和缓存修复。本轮补足热液标本的接触与材料可辨性。

## 改动与观察

`scene.ts`在原主脉、支脉中心周围增加小幅固定空间起伏，弱化围岩大色斑，使石英颗粒、围岩和金属状斑块更易区分。表面法线使用同一固定场的屏幕导数构造；旋转、进度和剖切不会重随机。主/支脉关系、切面坐标、来源批次和析晶份额均保持，未增加纹理、几何或渲染循环。

实际对照修订前后的65切面标本；主/支脉接触连续，金属状斑块仍局限于原矿脉场。390px中文/英文保留一个WebGL canvas，进度100、切面65独立，未观察横向溢出。截图：`ores-vein-cut65-desktop-zh.png`、`ores-vein-cut65-mobile-{zh,en}.png`。当前检查未捕获相关console error。

[sources.md](sources.md)的原矿脉与多证据边界保持；本轮没有新化验、产地、晶体尺度、矿化年代或真实粗糙度主张，也未重新宣称来源网页为本日核读。程序接触起伏只使既有代表图形更清楚。

## 验证与交付边界

- `node --import tsx --test topics/earth-minerals/tests/*.test.mjs topics/earth-ores/tests/*.test.mjs topics/earth/rocks/tests/*.test.mjs`：39/39通过；保留的模型/几何/状态契约由这些测试覆盖，材质质量另由实际画面确认。
- 最终 `npm run typecheck`、`npm run check:i18n`（7,522条消息、83个英文命名空间）和三主题限定 `git diff --check` 通过。无全站重复构建。
- 实际Reader地址为 `http://127.0.0.1:55291/encyclopedia/`，桌面1280×720与390×844，中英均实际观察。临时viewport已恢复，临时tab已关闭。
- 截图在 `/tmp/earth-ui-materials-20261026/`。它们证明当前场景的真实显示。此服务仍使用原先锁定Reader，部分截图早于最后的公共间距精简；新Reader `workbench.css` 的整体排版、完整路由与生产产物验收由父任务重新构建后完成，不能把本记录当作其通过凭据。
- 三馆新增可选Reader区域声明，进度采用`span / input / output`规范；保留所有科学状态键、回调、相机、有限播放及释放逻辑。只移除由Reader区域样式完整接管的公共间距，保留各主题专有布局。未提交、推送或部署。

本主题运行/测试输入指纹：`3ac5922c4f5a478565d8509a4e3705f69d50e60adae054d839906aa80ed0f11c`，覆盖本目录按路径排序的9个`.ts/.css/.json/.mjs`文件及各文件SHA-256行，末尾有换行。共享Reader与共享Earth依赖由整合任务另记。
