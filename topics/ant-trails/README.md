# 蚂蚁与蚁群 / Ants and their colony

沿用 `/topics/ant-trails/`，不增加顶层入口。固定工蚁 W1、同一巢址与食物位置连接四站：身体、觅食、条件比较、巢内生活。原有路线比较扩为可回放的连续过程，没有隐藏个体再重排的转场。

## 模块边界

- `model.ts`：固定身份、分段连续轨迹、按实际经过时刻沉积的有限踪迹、衰减、事件、独立 L1 发育记录与路由编解码。无 DOM。
- `controller.ts`：唯一有限觅食时钟；用户启动、暂停、拖动、条件独立进度、可见性与取消代际。生产控制器允许注入调度器做真实行为测试。
- `art.ts`：原生 SVG，身体与两处 W1 放大窗共用同一结构；三对有分节的足、一对触角、大颚、腹柄。各独立 SVG 使用自己的外壳渐变标识，避免正文放大图丢失材质。场景是原创示意，不是生成的科学证据图。
- `renderer.ts`：固定工蚁/踪迹 DOM 节点、镜头、形态高亮、有限照料动作。暂停时镜头收敛到已选站，不改旅程进度；旧回调无效。
- `workspace.ts`：双语工作台、控件、解释、页面/可见性清理与 URL。没有外部模型、iframe、后台循环或网络依赖。
- `content.json`：完整中英正文；`learning.json` 的3条 academic 与4条 narration 是共享伴读摘要，不是正文上限。
- `catalog-entry.json`/`catalog-en.json` 是本专题登记片段；`content/catalog.json` 才是 canonical 注册。原封面保留，来源见 `COVER.md`。

## 连贯观察路径

1. 蓝色标记 W1 的放大窗：区分触角、六足、大颚、腰部、外骨骼；切到地面仍是 W1。地面左上角的放大窗与窄屏独立近景都消费 W1 的同一行走、触角和携带状态，位置连线指向实际坐标；放大尺寸不是地图比例。
2. W1 探索找到食物，返回时逐段标记，回巢后 W2–W4 才加入这次示意招募。金点只是食物携带状态。
3. 前54%共用相同事件；完整路线、线索较快衰减、物理障碍三组独立保存进度。障碍情境先真实搜索/绕行，回程才形成新踪迹；其他工蚁不瞬移、不穿石头。衰减情境让有经验的 W1 与新来者作不同反应。
4. W1 实际回到巢口、进入通道；N1 是另一个照料者。L1 是单独的发育记录，不是 W1 逆生长。卵→幼虫→蛹→成虫的记录明确使用数周至数月尺度，不由一次觅食推进。照料动作需另行启动，仅持续1.6秒。

## 路由与生命周期

`readState(searchParams: string): State` 与 `writeState(state, original?): string` 从 `model.ts` 导出。

- `chapter=body|forage|trails|nest`，默认 body。
- `condition=intact|faded|blocked`；`t=0..1` 归一化觅食进度，内部0..100。
- `part=antennae|legs|mandibles|waist|shell`；`brood=0..1`；`labels=0|1`；`scent=0|1`。
- 保留原 pathname/base、lang、未知 query 与 hash；旧无参数 URL 仍有效。原版没有已公开的章节参数。
- 切站保留状态并暂停；切条件恢复该条件进度。隐藏页/离页/控件离开视口时停止，无自动恢复；页面恢复需再次启动。HMR卸载清理事件、Observer、时钟和SVG。无无穷动画。

## 科学范围 / Scientific scope

This is a deterministic, authored teaching sequence, not an ant-colony optimiser or a forecast. Worker paths, successful recruitment, memory recovery, scent decay rates and detour success are chosen examples. There is no diffusion, wind, measured concentration, random search, energetic model or guarantee of shortest paths. Hiding overlays changes no scientific state. Spatial scales and developmental time are illustrative.

踪迹与记忆部分参考黑毛蚁 Lasius niger 的研究，但 W1 不是实验标记数据的重放。2016 年迷宫实验中，当前有踪迹时的选择可以更准，却未发现它在随后无踪迹测试中促进路线学习；本页学术侧栏明确区分两者。本页紫点的指数衰减使用事件进度，不是该实验测得的秒数、扩散方程或觅食成功概率。树栖龟蚁与切叶蚁只作明确分开的比较；不把林冠修复路线的机制套到所有物种。蚁后不是发号施令者，工蚁任务并非普遍终身固定，巢室结构与繁殖体系具有物种差异。不把简化的食物状态点当成食物搬运器官示意。

Bodies share a six-legged ant plan but are not a diagnostic taxonomic plate. The mesosoma is not labelled simply as the thorax. L1 never becomes W1; N1 is not a larval body part. Brood growth and a foraging trip have independent clocks. A successful individual life history is not a claim that every egg survives.

## Sources

- [ASU — Ant anatomy](https://askabiologist.asu.edu/explore/ant-anatomy)：身体结构、足与触角、中躯/腹柄，非物种鉴定依据。
- [ASU — Individual life cycle](https://askabiologist.asu.edu/individual-life-cycle)：四阶段、幼虫依赖照料、蛹、成虫；不沿用其对所有工蚁繁殖能力/阶级决定机制的绝对简化。
- [ASU — Secrets of a superorganism](https://askabiologist.asu.edu/explore/secrets-superorganism)：群体、巢与分工多样性。
- [Czaczkes et al., 2016, PLOS ONE 11:e0149720](https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0149720)：Lasius niger 的记忆与踪迹实验；不推导“信息素越多记忆越好”。
- [Deborah Gordon — Collective Wisdom of Ants](https://web.stanford.edu/~dmgordon/articles/other/Gordon%20Scientific%20American.pdf)：研究者署名文章、无中央指挥、生态条件与局部互动。
- [Stanford — Turtle-ant trail networks](https://news.stanford.edu/stories/2017/10/algorithm-ants-create-trail-networks)：Cephalotes goniodontus 的独立物种对照。
- [ASU — Leafcutter ant colony](https://askabiologist.asu.edu/leafcutter-ant-colony)：真菌栽培的独立食物系统对照。

现实观察不要掀巢、投食、擦除蚁路或徒手接触陌生蚂蚁。Observe without disturbing nests or trails.

## Focused validation

`node --import tsx --test topics/ant-trails/tests/*.test.mjs`

覆盖生产模型的连续性/边界/因果沉积、条件差异与路由；真实生产控制器的有限播放/取消/保态；真实 SVG renderer 的固定节点/中间镜头/暂停收敛/照料取消/清理。完整站点门禁与390px生产浏览器由根集成任务统一执行，不把模块测试称为浏览器验收。

## Presentation layout

The topic opts its existing scene and controls into shared viewport fitting and reversible immersion. Desktop playback controls occupy one short row while timing and pause notes stay in the adjacent explanation panel, so the SVG fits within its stage. Children see one short current-event sentence; academic mode keeps the fuller event explanation and, for trail comparison, the model rule and research lead in that same scrollable panel. Switching modes does not reset W1. The narrow view places a larger synchronized W1 specimen before the route map while retaining ordinary document flow. Multi-chapter studies retain their own state and clocks.
