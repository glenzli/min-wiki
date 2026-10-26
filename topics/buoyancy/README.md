# 水为什么能托住小船？

当前入口以四段连续故事解释浮力：岸边观察 → 水托住水 → 水怎样推 → 同一份金属变成船。孩子可以暂停、拖回和切换视角；完整物体与原位替换先建立直觉，再连接整体受力和 A/B 接触处的微观示意。旧水箱版代码保留作历史与复用来源，当前 `main.ts` 只进入 `journey.ts`。

## 当前学习路径

1. 完整圆木、石头、硬币与小船分别入水。下沉也有浮力，只有真实触底后才加入底部支持。
2. 先在静水中想象圈出一份水。周围水恰好托住它；保持水位、接触边界和姿态，再原位换成物体，最后放开。上浮时排水量可减小，完全浸没后继续下沉不会无限增大浮力。
3. 同一姿态切整体压力与 A/B 微观窗口。上、下表面的平均水压方向相反；液体分子保持相近的密度和典型运动，不用更深处分子更快/更密解释压力。干船舱内没有凭空加入的水压。
4. 780 g、100 mL 金属先下沉，取出、压薄、抬起船沿，再入水浮住。连续闭合网格保持材料体积，干船壳最大排水容量 1400 mL；0–8 块货物各 100 g、40 mL。船沿进水后排除已进水空腔，只计算被材料和货物占据的水下空间。

替换未完成时进入整体压力观察保留当前替换进度，先完成替换才能放大物体接触处。直接打开压力章会从已换入物体的固定姿态开始。微观播放只改变观察相位。各章在同一次页面访问内保留进度，视角和解释面板不重建实验；语言切换或刷新重新开始。用户主动播放才推进过程；页面隐藏、切章、离页与减少动态偏好会停下播放。减少动态时仍可逐步查看和拖动进度。

## 源码责任

- `journey.ts`：入口 DOM、章节、当前条件和生命周期；`journeyPlayback.ts`：唯一有限过程时钟；`journeyContent.ts`：当前步骤的中英说明。
- `journeyModel.ts`：确定性轨迹取样、当前浸入量、排水和受力。`metalGeometry.ts`：同一闭合金属网格、干船外包络及其排水积分。
- `shoreScene.ts`：同一帧的 3D 物体、水、相机与投影；`shoreEnvironment.ts`：安静的自然岸边。保留材质、网格、纹理和实例，离页释放 GPU 与监听。
- `journeyExplanation.ts`：消费同一模型帧的合力、局部压力、A/B 分子窗口和 SVG 回退。使用根控制器传入的观察相位，不另建时钟。
- `specimenGeometry.ts`、`specimenMaterials.ts`、`waterContact.ts`：复用自然物体材质/几何及网格与水面接触采样。
- `learning.json`：中英各 3 节学术说明、4 段口播；`entry.*.md`、`narration.*` 为规范投影。Wiki Reader 拥有导航、阅读、主题及预览。

## 科学与视觉边界

静水近似均匀、不可压缩，密度取淡水 1.000、海水 1.025 g/mL；浮力按当前排水体积计算。动画的时间与位置是可逆教学安排，不从完整动力方程求解。金属形变不求解塑性、应力或真实加工过程；货物只在完整船壳出现，回看成形时暂不计入未装上的货物。进水条件切换不模拟流入速度、黏性、波浪或倾覆。触底假定水仍能接触下方。

各对象分别取景，硬币被放大，不能从画面比较真实体积。金属网格有内部一致的体积映射，不等于所有场景采用共同实物比例。水面法线、透视、水底光纹与有限涟漪是光学插画，不是流体或光线追踪求解。微观图为近邻运动和作用的定性表达，不是分子动力学数据。蓝色局部箭头表示省略共同大气压的表压，不能直接对未标定图形做面积积分。

## 验证与依据

模型/网格、解释和有限时钟检查位于 `tests/`；实际中英桌面与 390px 浏览器记录、成品身份及边界见 [VALIDATION.md](VALIDATION.md)。设计与验收清单见 [本次设计稿](../../docs/buoyancy-journey-20261023.md)。历史水箱检查不替代当前入口验收。

- [OpenStax 14.4：阿基米德原理与浮力](https://openstax.org/books/university-physics-volume-1/pages/14-4-archimedes-principle-and-buoyancy)
- [OpenStax 14.1：密度与压强](https://openstax.org/books/university-physics-volume-1/pages/14-1-fluids-density-and-pressure)
- [Feynman I.1：分子的运动与相互作用](https://www.feynmanlectures.caltech.edu/I_01.html)

Reader selects the retained shore stage directly. Playback, scrub, condition choices and cargo actions are genuine controls that share Reader’s collapse behavior; compact buttons wrap at their content width. The scientific caption, current mass comparison, cargo count/unit and pause qualification remain outside those control groups, including the original conditional cargo owner. The scrub receives a full row in a narrow control column. Camera choices remain available in the explanation/settings panel. Layout changes do not rebuild the shore scene or its finite clock.
