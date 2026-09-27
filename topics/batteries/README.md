# 电池：把能量带在身边 / Batteries: energy to take with you

## 主画面精修 · 2026-09-28

儿童版在回路和电芯剖面之间选择一个放大的镜头；进入“走进电池”章会自动看电芯，回到其他实验章会回到外回路。学术版同时显示两张图，保留完整的条件控件与能量账本。切换镜头只改变视角，不重建实验电芯；浏览器中验证了合上开关、切章、回看放电终点和能量去向仍连续。桌面演示台增高，使单图中的开关、电极和两条载流路径可辨；390 px 中英文儿童／学术布局无横向溢出。剖面材料、速度与能量比例仍为教学模型；家族和电池包章节需继续逐场景细节验收。

六个递进问题：灯与电机 → 电芯内部 → 可用能量耗尽 → 外部供能充电 → 电池家族 → 电芯与汽车电池包。保持原 `/topics/batteries/` 入口，新增 `?chapter=loads|inside|empty|charge|family|pack`；非法值回到 loads，保留语言与部署前缀。章节导航支持浏览器前进/后退。重载和语言切换恢复章节，不承诺恢复实验历史。

## 设计与所有权

- 核心问题：能量怎样储存、释放、重新储存；相似外形是否意味着相同材料或充电规则？
- 可变条件：开关、三种负载、外部充电器条件、家族样品与剖面程度、理想串并联数量、观察尺度和职责层。
- 可见结果：灯光/转动、电极占位、分离的电子与离子路径、能量账本、不同结构和 V/Ah/Wh。
- 因果链：完整回路使化学能经负载转化；适配外部电源做功使储能增加，同时产生热。没有电源或不匹配不会充电。
- 防止误解：电池不是电子罐；回放不是实际充电；AA/纽扣、化学体系和汽车用途不是同一组互斥类别；标称电压不是充电设置。
- 边界：所有微观几何、速度、材料占位、时间和能量分配为定性教学；剖面不是拆装指南。

`journeyModel.ts` 的 BatteryExperiment 保管同一电池的储能、累计光/机械/热、外部输入与运动历史。切换负载或供电条件从当前历史开始新的一段；视角与普通章节不修改材料状态。当前段滑条 0–100% 从保留的段初状态投影，可确定地回退；不是逐帧累加。充电使外部输入增加，不减少既有输出，也不倒转电机。归一化账本满足 initial 1 + external input = stored + light + work + heat。

`model.ts` 保留原放电 API；`scene.ts` 使用同一 lab state 投影原回路、电芯与新增灯具/充电器。`journeyContent.json` 负责双语章节、家族数据；`familyScene.ts` 拥有独立缩放的原创 SVG 标本、结构层和电池包投影。`main.ts` 组合 UI、URL 和有限动画，不把电池规则放进平台。封面沿用既有资产，本轮未重新生成。

## 行为

初始满电、开路，不自动播放。闭合是离散状态切换，暂停冻结观察时间；切负载、充电条件、章节、隐藏和 pagehide 都取消播放。观察一段最多 16 秒，有限结束；减少动态偏好由共享 animateValue 处理。内部镜头有限插值，家族/串并联只随输入重绘。当前简化图不模拟断电后的机械惯性。

充电章只处理这块可充电锂离子电池。一次电池仅作为明确禁止充电的家族对照，不给一次电池提供可运行充电按钮。满电提示先使用，不凭空创建可充空间。家族选择不替换正在运行的实验电池。

## Scientific boundaries

One illustrative rechargeable lithium-ion cell is retained across load, cell and charging views. External electrons and internal ions have separate routes. Family entries include a primary lithium coin cell, alkaline AA, NiMH AA, lithium-ion phone pouch, lead-acid starter battery and a traction pack; these are selected examples, not exhaustive classifications. Family cutaways simplify arrangements and are independently fitted, not quantitative size comparisons.

The ledger uses teaching allocations: motor 65% work, filament bulb 10% light, LED unit 40% light, and the balance as heat; charging stores 80% of external input. These are NOT measured efficiencies or product predictions. Back EMF, voltage curves, thermal dynamics, transient electromagnetic fields, self-discharge and ageing are omitted. A 16-second display segment is not a biological or engineering duration.

The pack is an ideal 1–4 series by 1–4 parallel illustration with identical nominal 3.6 V, 2 Ah cells. Numbers demonstrate V, Ah and Wh only—not a vehicle specification, charging setting, wiring instruction or failure simulation. Cooling and protection are structural responsibility views, not a simulated BMS. Some real packs omit traditional modules. Starter/auxiliary batteries and traction packs have different roles.

All wiring and cutaways remain on screen. Adults handle real batteries. Never open, heat, short or put batteries in the mouth or nose; suspected button-battery ingestion needs immediate emergency care. Fast-charge control, ageing and recycling processes are deferred.

## Sources

- [DOE · Batteries](https://www.energy.gov/science/doe-explainsbatteries): separate carrier paths and externally powered recharge.
- [DOE · LED basics](https://www.energy.gov/cmei/ssl/led-basics): semiconductor light production and thermal/optical considerations.
- [Energizer · Comparison](https://energizer.com/batteries/battery-comparison-chart/), [alkaline handbook](https://data.energizer.com/pdfs/alkaline_appman.pdf), [NiMH handbook](https://data.energizer.com/pdfs/nickelmetalhydride_appman.pdf): chemistry versus form and simplified construction.
- [DOE AFDC · Vehicle components](https://afdc.energy.gov/vehicles/how-do-all-electric-cars-work), [vehicle batteries](https://afdc.energy.gov/vehicles/electric-batteries): auxiliary/traction roles, power electronics and thermal management.
- [CPSC · Button and coin batteries](https://www.cpsc.gov/Safety-Education/Safety-Education-Centers/Button-Cell-Coin-Battery-Information-Center): handling and ingestion urgency.
- Original motor fundamentals remain cited in learning.json.

Verification evidence and untested boundaries are in [VALIDATION.md](VALIDATION.md). Local work does not imply commit, push or deployment.

## Presentation layout

The topic opts its existing scene and controls into shared viewport fitting and reversible immersion. Explanation/settings remain available in the adjacent disclosure panel. Multi-chapter studies retain their own state and clocks. Introductory diagrams can be expanded separately, and narrow screens retain document flow.
