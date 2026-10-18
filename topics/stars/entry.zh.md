<!-- wiki-learning:start -->

恒星从哪里来，为什么发光，最后都会变成黑洞吗？

先从分子云拖到原恒星，找出云核、吸积盘、外流和点亮的中心如何连续变化；再选择三条质量路径比较结局。依次观察太阳的聚变、传能和表面活动，最后切换三种带行星的双星或三星结构，并把这些示意轨道与数值三体实验区分开。

## 寿命与终点由条件分叉

以气体为主的冷分子云中，局部稠密云核在引力下收缩；旋转的落入物质形成吸积盘，一些年轻恒星沿轴向外流。原恒星早期可由收缩与吸积发光，核心持续氢聚变开启主序；大质量恒星的聚变与吸积可能重叠。云、盘与喷流在画面中连续过渡，却不是流体求解，也不按成熟恒星的半径尺量。约太阳质量的代表路径经红巨星、外层抛散留下白矮星；较大质量路径可能在核心坍缩后留下中子星或黑洞。质量、质量损失、成分、伴星和坍缩条件都会影响结果，页面的 1、15、30 个太阳质量只是案例而非通用门槛。阶段宽度不等于持续时间，半径为教学插值。成熟太阳型恒星轮廓与行星轨道共用尺度，吞没水星和金星后不令它们随恒星收缩重新出现；地球命运不能只由固定轨道圆判定。遗骸时保留原外包层虚线作大小对照；右侧镜头非线性放大。黑洞不必伴有吸积盘，还需要合适的供气条件。

## 长期供能与短时磁活动

太阳核心核聚变供给长期光热；辐射区主要通过辐射传能，对流区有热等离子体升降，光球是可见的非固体表面。强磁场影响局部对流，较冷区域看成黑子；活跃区域的磁重联能短时释放耀斑，而太阳风是从日冕持续流出的带电粒子。耀斑不是日常阳光的燃料，也不等于持续太阳风。同一颗太阳的剖面和光球局部放大呈现不同尺度；层厚、颗粒、磁弧和喷流分别是机制示意，未求解真实磁流体或标定活动时间。

## 行星可绕双星，也可绕其中一颗

Kepler-47 中有三颗已确认行星绕两颗恒星的共同质心；另一种宽双星结构可让行星绕其中一颗，KOI-5 则有行星绕层级三星中的 A 星。画面保留成员与绕行关系，但轨道距离压缩、恒星大小放大，不重建观测轨道，也不证明长期稳定。另设的数值实验以三个固定的等质量数学案例按牛顿引力逐步积分三个平面点质量，使用固定步长 velocity-Verlet，和前述真实系统不是同一轨道。选 L₀、M₀ 后，T₀=√(L₀³/GM₀)，数值 G=1；播放时持续计算，步长0.001 T₀，历史窗口保留最近20 T₀。八字初值来自 Montgomery 作者页面，等边对照满足 ω²=1/√3；不规则游走的初值是本项目从等边起点稍作改变并筛选出的数值例子，没有随机力。轨迹线交叉可能发生在不同时刻，放大的星盘不能证明真实接触；本积分没有恒星半径、潮汐或碰撞模型，近遇无法解析或能量误差将超过0.1%便停止。微扰的位置差不证明混沌或长期稳定。

## 容易误解的地方

太阳不会变成黑洞；恒星晚年不是统一结局。耀斑不是太阳持续发光的原因，轨迹交叉也不是两颗恒星相撞的证据。

## 模型边界

演化案例的年龄和半径为近似教学锚点，阶段插值不等于完整物理演化；行星静态轨道不预测地球命运。材质、剖面厚度、磁弧和颗粒为示意。双星/层级三星是构造，三体数值章才直接积分牛顿引力；该积分不含恒星尺寸、碰撞、潮汐、相对论或演化，近遇与误差阈值只界定算法解析能力。标记大小不表示真实半径，模型时间不直接等于秒或年。避免直视真实太阳。

## 资料来源

- [NASA Webb · Star formation in molecular clouds](https://science.nasa.gov/mission/webb/science-overview/science-explainers/webbs-star-formation-discoveries/)
- [NASA · Three confirmed planets in the Kepler-47 binary](https://science.nasa.gov/universe/exoplanets/discovery-alert-a-third-planet-in-kepler-47-system/)
- [NASA · KOI-5 planet in a triple-star system](https://science.nasa.gov/universe/exoplanets/discovery-alert-a-forgotten-planet-found-in-a-triple-star-system/)
- [Holman & Wiegert · Planetary orbit stability in binary systems](https://arxiv.org/abs/astro-ph/9809315)
- [NASA · Star life and remnants](https://science.nasa.gov/universe/stars/)
- [NASA · Solar layers and energy transport](https://science.nasa.gov/blogs/the-sun-spot/2023/09/26/layers-of-the-sun/)
- [NASA · Sun-like red giant and inner planets](https://science.nasa.gov/exoplanets/resources/life-and-death/chapter-6/)
- [NASA · Stellar close encounters and mergers](https://science.nasa.gov/asset/hubble/too-close-for-comfort/)
- [NASA · Sun facts](https://science.nasa.gov/sun/facts/)
- [NASA · Star types](https://science.nasa.gov/universe/stars/types/)
- [NASA · A hierarchical triple found by TESS](https://www.nasa.gov/universe/nasas-tess-spots-record-breaking-stellar-triplets/)
- [Richard Montgomery · N-body tour and Simó initial conditions](https://people.ucsc.edu/~rmont/Nbdy/NbdyC1.html)
- [Chenciner & Montgomery (2000) · A remarkable periodic solution](https://arxiv.org/abs/math/0011268)
- [Stone & Leigh (2019) · Chaotic non-hierarchical three-body systems](https://www.nature.com/articles/s41586-019-1833-8)
- [University of Marburg · Velocity-Verlet algorithm](https://fb15.pages.uni-marburg.de/ag-von-domaros/teaching/molecular-dynamics/core_algorithms.html)

## 讲给孩子听 {#narration}

[下载纯口播稿](narration.zh.txt?download) · [下载分镜稿](narration.zh.storyboard.txt?download)

### 同一片云，不同的命运

冷云里主要是气体，也有少量尘埃。稠密的地方缩成云核，气体绕着年轻中心落入盘，有些又从两极流出。中心先因收缩和吸积发亮；核心持续把氢聚变成氦后，才进入主序。换一种出生质量，后面的时间和结局也会不同。

*画面提示: 依次选择三条质量路径，拖动到主序、膨胀外层和遗骸；比较左侧原外包层虚线、右侧大小变化及终点读数。*

### 一颗星变成红巨星

太阳型恒星到了晚年，核心变化会使外包层向外膨胀。把水星和金星的轨道留在画面里，看它们何时进入包层。地球的结局还要看太阳失重、轨道变化和潮汐，不能只凭一张圈图下结论。

*画面提示: 在太阳型路径回拖和推进红巨星阶段，观察半径与水星、金星状态。*

### 为什么会亮，也会爆发

太阳长久的光和热主要从核心聚变而来，能量经过辐射和对流到达光球。表面磁场形成较暗的黑子，储存的磁能短时释放为耀斑；外层日冕也持续送出太阳风。这些是不同原因和时间尺度。

*画面提示: 逐一选择核心、传能、光球、黑子、耀斑和风，找出画面中对应的位置。*

### 一起绕行

行星不一定只绕一颗孤单的太阳。Kepler-47 的三颗行星绕一对双星；有的行星只绕双星中的一颗；KOI-5 的行星则绕三星中的 A 星。再看三种固定的等质量数学起点：八字、等边旋转和不规则游走。它们都逐步计算引力，却不是这些真实系统的轨道；游走也不是随机力在推动。轨迹交叉不等于恒星已经相撞。

*画面提示: 依次切换三个完整系统，指出每颗行星绕谁；再在三体数值章对比八字、等边与游走，并打开微扰叠加观察差异。*

<!-- wiki-learning:end -->
