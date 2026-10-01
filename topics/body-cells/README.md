# 身体里的细胞为什么长得不一样？

## Integrated entry · 2026-09-20

The public URL now redirects into `/topics/cells/?chapter=work&case=barrier`; valid `case`/`kind` selects muscle or neuron, with language, base prefix and hash retained. This directory still owns its complete biological models, SVG renderer, bilingual descriptions, academic notes and tests. The cells workspace supplies shared controls and a retained progress/zoom slot for each example; it reads the original scientific content rather than embedding the old page. `main.ts` is compatibility routing only. Earlier standalone UI descriptions below describe the retained interaction semantics, not a second independently mounted application.

皮肤细胞连成保护层，肌肉纤维能收缩，神经元把信息传向远处。同样叫细胞，本领却不一样。

三个独立观察场景，各自提供有限过程播放、暂停、阶段选择和拖动。`model.ts` 保存教学状态与几何约束，`scene.ts` 负责局部科学插画；`content.ts` 与 `learning.json` 分别维护操作说明和双语深入笔记／儿童口播。

这是三类代表结构的比较，不是人体全部细胞清单。大小、颜色、速度和图中层数均为示意；没有显微照片的染色含义。骨骼肌页用重复纤维与一个肌节示意滑动，不把单条细丝缩短；放松回长由可见外簧牵拉。神经页选择有髓轴突和化学突触，不代表所有神经元。

## Muscle apparatus refinement · 2026-10-01

肌肉现在通过不可伸长的示意肌腱接到固定端与外部弹簧。允许缩短时，激活改变有效肌肉元件的参考长度，平衡位置随外簧刚度改变；固定长度时，夹具保持肌肉端点，激活仍会增加总张力。右肌腱连接点上的玫瑰色箭头向左表示肌肉总拉力，绿色向右表示外簧力，灰蓝色向右表示夹具补足的反力。三者采用相同箭头比例，作用对象都是同一个连接点。肌节端点与实际纤维长度同步；重复条带数量与粗、细丝长度保持不变。

The muscle connects continuously to a fixed left anchor and an external spring through schematic inextensible tendons. Allow shortening compares a moving equilibrium at different spring stiffnesses. Fix length holds the muscle endpoints while activation raises total tension. The rose muscle-force arrow points left on the right tendon junction; the green spring force and blue-grey clamp reaction point right on that same junction. Their lengths use one force scale. Sarcomere endpoint spacing follows fiber length; filament lengths and the number of fiber repeat units are retained.

The dimensionless activation `a = sin²(πp)` changes an effective reference length `L* = 540 − 110a`. Total tensile force is `T = .008(L − L*)`; external force is `F = k(s − 48)`, with `k = .002 + .012u`. For the free endpoint, solve `T = F` with `L = x − 185`, `s = 910 − (x + 26)`. For the locked endpoint, keep the selected spring's initial equilibrium `x₀` and supply the clamp reaction `R = T − F`. This is a quasi-static elastic teaching analogy in screen lengths and relative force units. The chosen constants are not physiological measurements or fitted parameters. There is initial spring preload, so the displayed total tension is not just active force. The model does not decompose physiological active/passive force, calculate force–velocity or activation kinetics, or simulate inertia, fatigue or history dependence. Stiffness is not a hanging weight or a constant-force load; even the highest setting still allows shortening. Changing stiffness also changes initial length, so shortening is measured relative to each setting's own initial state.

回长需要外部作用；图中减小激活后由外簧牵拉到初始平衡，肌肉没有主动向外推。固定长度只固定这个模型的肌肉端点；真实肌肉－肌腱系统总长固定时，柔顺组织仍可让内部肌节改变长度。主动延长没有在本装置中建模。全景、代表肌节和连接受力放大是同一 SVG 的三种相机，使用同一进度与约束状态，不是三幅独立动画。

Relaxation returns to the initial equilibrium through the visible external spring; the muscle does not actively push outward. The clamp fixes the modeled muscle endpoints, whereas a real fixed-length muscle–tendon system can have internal length changes through tissue compliance. Active lengthening is outside this apparatus. Overview, representative sarcomere and connection/force inspection are cameras over the same SVG and retained experiment state.

Focused verification uses model equilibrium and force direction invariants, parses the production SVG to check continuous tendon/spring attachment and filament spacing, and runs the production cells controller with DOM sinks. The connection camera regression contains the actual force endpoints, junction, tendon and fixed spring anchor across both modes, all three tested stiffnesses and five progress positions. These are source/geometry checks; the coordinator owns real desktop/mobile, bilingual, theme and keyboard browser acceptance.

## Sources

- [OpenStax · Types of Tissues](https://openstax.org/books/anatomy-and-physiology-2e/pages/4-1-types-of-tissues)
- [OpenStax · Muscle Fiber Contraction and Relaxation](https://openstax.org/books/anatomy-and-physiology-2e/pages/10-3-muscle-fiber-contraction-and-relaxation)
- [OpenStax · Skeletal Muscle](https://openstax.org/books/anatomy-and-physiology-2e/pages/10-2-skeletal-muscle)
- [OpenStax · Nervous System Control of Muscle Tension](https://openstax.org/books/anatomy-and-physiology-2e/pages/10-4-nervous-system-control-of-muscle-tension)
- [Gordon, Huxley & Julian, 1966 · Tension at fixed sarcomere lengths](https://physoc.onlinelibrary.wiley.com/doi/10.1113/jphysiol.1966.sp007909) — original fixed-length tension experiments; not the source of the teaching spring constants.
- [Edman, Elzinga & Noble, 1982 · Active fibers lengthened by an external apparatus](https://pubmed.ncbi.nlm.nih.gov/6983564/) — evidence that active muscle can be lengthened and has behavior beyond this static analogy.
- [NIH / NIGMS · What Are Stem Cells?](https://www.nigms.nih.gov/biobeat/2024/11/what-are-stem-cells)
- [OpenStax · Nervous Tissue](https://openstax.org/books/anatomy-and-physiology-2e/pages/12-2-nervous-tissue)
