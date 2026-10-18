# 开花植物连续成长精修 · 2026-10-19

本轮响应「开花植物做成连续动画，细化生长中生硬的过渡」。范围为同一条目中的菜豆萌发与樱桃花到果实；同时让传播案例已有的播放栏直接可见。三个案例继续明确区分物种，不拼接成一株植物的生命录像。不更改条目审稿状态，不推送或部署。

## 已实现

- 菜豆可主动播放约 24 秒的压缩观察，也可暂停、重播、拖动回看或按阶段前进。胚根从固定位置伸长；胚轴拱起并抬起同一对子叶；种皮分离落下，子叶保留；第一对真叶分别拉长、舒展宽度，叶脉跟随同一叶形。
- 樱桃保留同一花梗连接与子房。五片花瓣各自弯曲、褪色并错时脱落；幼果膨大、转色。剖面固定胚珠/种子位置，外围子房壁增厚、内果皮逐渐硬化；没有把整朵花或整个剖面交叉淡出后替换。
- 两个 SVG 主场景只挂载一次，逐帧更新器官属性。绘图、形态投影与播放职责分别由专题文件拥有；Reader 继续提供共用展示外壳。
- 三个案例统一使用作者提供的 `.study-transport`：播放、重置、进度与当前观察放在画面下方，条件保留在默认收起的设置中。传播模型和原有时钟未改写。
- 暂停和案例切换保留实际展示到的分数进度。条件失败不会清除已生长的结构，重新开始会清除上一轮历史；恢复条件不自动开始。减少动态效果时逐阶段前进，不运行生长帧循环。
- 修正直立茎渐变因零宽包围盒漏画的问题；手机场景使用全部可用宽度，放大剖面随镜头比例连续调整。英文剖面文字换行，手机按钮等宽等高。界面继续使用黑白灰、支持暗色。

## 科学与绘图边界

菜豆为子叶出土型萌发的定性插图。器官轨迹、种皮两片化、张开节奏均为教学编排，不计算顶土力、膨压、组织生长率或真实天数。樱桃只保留一个示意胚珠，省略其他胚珠可能败育、组织分化、风力与激素等复杂过程。硬核与种子保持区分，硬化节奏不按实际天数标定。幼苗到开花成年仍明确省略。

An authored, qualitative common-bean emergence and cherry-development illustration: timing, tissue geometry, coat tearing, petal trajectories and hardening are not calibrated physiology. The cherry cutaway simplifies the ovules and omits their possible abortion and detailed differentiation. Stone and seed remain distinct. Different species stay separate; seedling-to-flowering maturity is not animated.

形态核对依据：[University of Minnesota · Introduction to seed germination](https://open.lib.umn.edu/horticulture/chapter/2-2-introduction-to-seed-germination/)（菜豆子叶出土、胚轴与子叶节关系）；[Fruit morphology](https://open.lib.umn.edu/horticulture/chapter/8-1-fruit-morphology/)（胚珠、种子、子房壁与核果内果皮）。授粉相容/受阻继续沿用专题已列出的 Cornell 依据。

## 验证记录

- 专项测试：`node --import tsx --test topics/seed-sprouting/tests/*.test.mjs topics/flower-fruit/model.test.ts topics/seed-travel/model.test.ts`，21/21 通过。覆盖阶段边界连续性、根与叶连接、花梗插入点、固定胚珠位置、不相容无果实、时钟取消、分数进度、条件限制、重置历史、减少动态效果、真实控制器和 SVG 节点保留。
- `WIKI_READER_ROOT=/Users/g4i/lab/wiki-reader npm run build` 通过：类型、6876 条来源文案、72 个英文命名空间、147 份图像投影、条目及审稿投影、71 条路由；构建 `b1a38253e33d`。
- 实际浏览器：中英文桌面与 390px；真实连续播放自然结束；暂停、回看、重播；案例来回切换；缺水重置后不得越过新历史；不相容分支在进度末端仍无膨大/转色/硬化，切回相容案例恢复原进度；剖面镜头来回切换；明暗模式。手机文档宽度 390px、画面宽度 368px，无水平溢出；主按钮 14px、至少 44px，英文两行时同高 62px。
- 本轮没有重跑未受影响条目的全部模型测试；前一轮全仓 847/847 的证据不代替本轮专项和浏览器验证。此次针对本轮变更运行上述检查。
- 截图证据位于本机 `/private/tmp/wiki-plants-continuity-20261019-01a14c9e/`。临时截图不作为仓库内容发布。

代码已在本地预览验证；Git 提交、远端推送和部署为独立状态。本轮仅本地提交，不推送，不部署；Wiki Reader 仓库没有新增代码变更。
