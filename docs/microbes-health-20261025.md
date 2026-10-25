# 微生物与健康专题修订

## 学习路线与表示选择

六站各回答一个问题：身边有哪些微小居民、细菌怎样工作、病毒怎样利用细胞、怎样造成疾病、身体怎样抵抗、清洁和药物各作用在哪里。不是把六个旧动画堆进菜单。

- 三维用于观察参考细胞的层次与内部空间、病毒的包膜／衣壳／基因组及外形差别。纹理和颜色为原创教学插画，不冒充电镜照片。
- 二维用于追踪膜两侧、细胞核与细胞质、局部组织、免疫效应物与药物靶点。拉近只改变镜头，坐标与进度保持一致。
- 噬菌体保留为独立对照；默认先看流感，另有无包膜的诺如。未改写原有 T4 模型。
- 问题、条件与讲解分开；播放、进度与实际视图操作留在画面旁。仅显示当前例子支持的条件。

## 核心科学主张与依据

| 主张 | 直接依据 | 实现中的边界 |
| --- | --- | --- |
| 细菌有细胞结构、核糖体并需复制和分配遗传信息 | [OpenStax 3.3](https://openstax.org/books/microbiology/pages/3-3-unique-characteristics-of-prokaryotic-cells)、[9.1](https://openstax.org/books/microbiology/pages/9-1-how-microbes-grow) | 参考杆菌、外形对照和致病例子明确不同；不按外形判定安全 |
| 病毒依赖合适的活细胞，形态不只有噬菌体 | [NHGRI Virus](https://www.genome.gov/genetics-glossary/Virus)、[PDB-101 流感结构](https://pdb101.rcsb.org/sci-art/goodsell-gallery/influenza-virus)、[CDC 诺如分类](https://www.cdc.gov/norovirus/php/laboratories/index.html) | 放大、颜色及构件数示意；无自己的核糖体 |
| 流感在细胞核中复制基因组并在表面出芽；诺如复制在细胞质相关结构中 | [OpenStax 呼吸道病毒](https://openstax.org/books/microbiology/pages/22-3-viral-infections-of-the-respiratory-tract)、[CDC 诺如生物学资料](https://www.cdc.gov/norovirus/downloads/global-burden-report.pdf) | 未重建内吞与膜融合的全部分子步骤、全部感染靶细胞或诺如全部释放方式；内部流感部件不会提前变成完整带膜病毒 |
| 接触、感染与发病不等价；局部损伤与炎症都可参与症状 | [OpenStax 致病过程](https://openstax.org/books/microbiology/pages/15-2-how-pathogens-cause-disease)、[致病因子](https://openstax.org/books/microbiology/pages/15-3-virulence-factors-of-bacterial-and-viral-pathogens)、[NIDDK 胃肠炎](https://www.niddk.nih.gov/health-information/digestive-diseases/viral-gastroenteritis/symptoms-causes)、[NHS 葡萄球菌](https://www.nhs.uk/conditions/staphylococcal-infections/) | 三个身体位置是例子，不是疾病诊断表；受阻分支没有繁殖／损伤 |
| 抗体主要在细胞外结合；T细胞等机制能清除感染细胞 | [OpenStax 适应性免疫](https://openstax.org/books/microbiology/pages/18-1-overview-of-specific-adaptive-immunity)、[T细胞](https://openstax.org/books/microbiology/pages/18-3-t-lymphocytes-and-cellular-immunity) | 先天与适应性实际重叠，不以动画秒数代表生物时长；正常邻近细胞保留 |
| 洗走与灭活不同；手消毒液不能照搬到所有对象 | [CDC 手消毒与洗手](https://www.cdc.gov/clean-hands/about/hand-sanitizer.html)、[诺如预防](https://www.cdc.gov/norovirus/prevention/index.html) | 有残留，不画成无菌；不提供消毒配方或用动画数量承诺灭活率 |
| 抗生素靶点、抗病毒靶点、症状缓解不同 | [OpenStax 抗菌靶点](https://openstax.org/books/microbiology/pages/14-3-mechanisms-of-antibacterial-drugs)、[PDB-101 神经氨酸酶](https://pdb101.rcsb.org/motm/113)、[CDC 抗生素](https://www.cdc.gov/antibiotic-use/about/)、[CDC 流感药](https://www.cdc.gov/flu/treatment/antiviral-drugs.html) | 细菌靶点和耐药有对照；抑制释放不让已释放颗粒倒退；未提供选药、剂量或个体疗效 |
| 疫苗能提前准备针对性的免疫记忆 | [WHO 疫苗机制](https://www.who.int/europe/news-room/fact-sheets/item/how-vaccines-work) | 使用流感例子，不宣称即时治疗、不宣称所有病原体有同类疫苗、不承诺完全阻止感染 |

原环境与菌群插画的既有参考仍保留在学习资料中。核心新主张按本轮查阅的原始机构资料、结构资料和教材核对；现有参考不是自动证明所有几何都是真实重建。

## 状态、资源与验证

专题拥有科学规则和双语内容，Reader 只负责公共呈现。一个有界进度记录集、一个有限播放时钟、一个可取消场景租约；任一时刻只有一个结构 GPU 视口或一个 SVG 过程。失败提供说明、重试和二维结构替代，隐藏停止推进，返回历史恢复对应例子。

验收覆盖生产模型中的受阻、无靶点、耐药和记忆分支，旧膜交换／分裂／T4连续性，以及真实浏览器的选题、面板互斥、拖动、播放、回退、视图切换、双语手机布局和失败恢复。最终构建身份与截图保存在任务验证目录；通过自动检查不等于临床验证。上一轮其他三个演示的本地修改属于既有基线，本轮不提交或部署。
