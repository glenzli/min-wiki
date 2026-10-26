# 局部精修记录 · 2026-10-26

继承并保留2026-10-25的晶簇、围岩、预算图与标本改动，本轮只补足晶体/母岩接触和Reader区域声明。

## 改动与观察

`scene.ts`使22个小晶芽根部读取与母岩网格相同的固定起伏函数，并稍嵌入表面；五个主晶体原根部坐标与生长模型保持。母岩上的接触阴影随现有半径缩放，空生长起点不生成固定黑圈；这是一种视觉遮蔽表达，不是新生长方程。未新增纹理或外部资产。

实际检查碳结构与露出晶簇、热液65%中间态。英文桌面和390px中英图可辨母岩、主晶体根部与晶芽，保留一个WebGL canvas。长形态/光学说明与完整键盘操作移入默认折叠的画面说明；近图保留直接影响读图的一句限定，播放/进度仍靠近展品。截图：`minerals-growth65-desktop-en.png`、`minerals-growth65-mobile-{zh,en}.png`。当前检查未捕获相关console error。

科学范围继续采用[sources.md](sources.md)已核读的M1、G2/G3及O2/O3；本轮没有增加外部科学主张或重新宣称其网页为本日核读。根部/阴影/比例均为自制代表形态，不是标本扫描、晶面速率或真实质量测量。

## 验证与交付边界

- `node --import tsx --test topics/earth-minerals/tests/*.test.mjs topics/earth-ores/tests/*.test.mjs topics/earth/rocks/tests/*.test.mjs`：39/39通过；保留的模型/几何/状态契约由这些测试覆盖，材质质量另由实际画面确认。
- 最终 `npm run typecheck`、`npm run check:i18n`（7,522条消息、83个英文命名空间）和三主题限定 `git diff --check` 通过。无全站重复构建。
- 实际Reader地址为 `http://127.0.0.1:55291/encyclopedia/`，桌面1280×720与390×844，中英均实际观察。临时viewport已恢复，临时tab已关闭。
- 截图在 `/tmp/earth-ui-materials-20261026/`。它们证明当前场景的真实显示。此服务仍使用原先锁定Reader，部分截图早于最后的公共间距精简；新Reader `workbench.css` 的整体排版、完整路由与生产产物验收由父任务重新构建后完成，不能把本记录当作其通过凭据。
- 三馆新增可选Reader区域声明，进度采用`span / input / output`规范；保留所有科学状态键、回调、相机、有限播放及释放逻辑。只移除由Reader区域样式完整接管的公共间距，保留各主题专有布局。未提交、推送或部署。

本主题运行/测试输入指纹：`2deeb7d0770c73c0ebcc129f8427c5567c07769de5d30890e2325db069ca802f`，覆盖本目录按路径排序的11个`.ts/.css/.json/.mjs`文件及各文件SHA-256行，末尾有换行。共享Reader与共享Earth依赖由整合任务另记。
