# 细胞：结构与分工 / Cells: structure and teamwork

## Integrated observation workspace · 2026-09-20

The same detailed cell geometry now supports three linked questions: `?chapter=structure` locates shared structures and exceptions; `?chapter=energy` follows materials and usable energy in the same selected cell; `?chapter=work` compares specialised jobs. `?cell=plant` enters the plant example directly. Chapter changes pause active work and retain the original specimen and process progress. Shared SVG definitions remain mounted outside hideable viewports so structure, close-up and process views continue to reference one anatomy.

`exploration.ts` owns validated chapter/case routes and six independent progress/zoom slots. `specialization.ts` composes the existing complete body-cell and blood-cell renderers, models and translated scientific notes. `case=barrier|muscle|neuron|oxygen|defence|repair` selects an example. The old body-cells and blood-cells URLs redirect to the correct group/default example; valid `case` or legacy `kind`, language, base prefix and hash are preserved. No iframe or old full-page UI is mounted.

The generic animal specimen is deliberately not retyped as a mature red cell: its nucleus/mitochondrion presence contract stays unchanged. Specialised specimens remain separate examples. Oxygen transport, defence and clotting are not sequential stages; platelets are fragments, and fibrin is not a cell. The energy-comparison action selects a typical tissue-cell example rather than pretending that the red cell contains its mitochondria. Species/structure limitations, deeper notes and references from the original examples remain readable beside the relevant workspace. Labels may be hidden without removing outside explanations. Different magnifications are explicitly not equal scales.

The structure stage now keeps the selected whole specimen and the corresponding local camera side by side on desktop, and in whole-to-detail reading order on narrow screens. Both views use the same mounted geometry and selection; overflow outside the active SVG viewBox is clipped so adjacent reference specimens cannot leak into a selected camera. For absent organelles the local camera returns to a whole-cell comparison and names the absence. Child mode gives one short structural explanation and a question; academic mode shows the fuller qualification and a source for the selected part. The energy and specialised-cell stages keep their separate material paths and specimen identities.

The question path and knowledge panel connect cells to the leaf lifecycle; bacterial ecology and viruses remain independent linked topics. No cell division, complete immune model or universal molecular simulation has been added. Existing covers and detailed scientific illustrations are retained.

Focused tests cover route migration, per-example state isolation and the unchanged biological model invariants. Parent integration owns final full gates and real bilingual desktop/mobile browser acceptance. No commit, push or deployment is included. Earlier descriptions below document the retained structural/energy engine.

## Muscle comparison · 2026-10-01

The work chapter now composes the body-cells muscle apparatus rather than inventing a second model. `specialization.ts` owns retained spring stiffness and shortening/fixed-length selection; `body-cells/model.ts` owns equilibrium, tension and constraints, and its renderer owns the anchors, tendon junction, spring, clamp and force arrows. Phase-specific child captions and academic readouts explain the selected state. Playback, scrubbing, labels and example changes retain the same experiment; changing stiffness or constraint pauses playback. Under reduced motion, the play control visits peak activation before relaxation so a finite contraction does not disappear into the equal start/end geometry.

肌肉提供全景、原有肌节近图和“看连接与拉力”三个同一 SVG 视野；放大不复制装置或重置参数。连接镜头由当前连接点与力箭头实际端点派生，包含右肌腱、外簧固定锚点与等长夹具，手机也能靠近查看拉力。相机切换、其他细胞样例切换保留肌肉进度、刚度和约束状态。固定长度不等于没有张力；外簧刚度不等于恒定重量；回长依赖可见外部牵拉。模型范围与原始来源见 [body-cells README](../body-cells/README.md)。

The muscle-only `#muscle-forces` button inspects connection forces and returns to the overview; the existing `#work-zoom` still inspects the representative sarcomere. Both are native controls with `aria-pressed` and a minimum 44 px height. The connection camera is derived from the current production geometry, including the fixed spring anchor and all three junction-force endpoints. Focused controller regressions exercise real event handlers and production SVG output with finite DOM sinks; they do not certify browser layout, focus appearance or accessibility-tree behavior.

双语儿童互动页面，比较典型动物细胞、叶肉植物细胞和细菌。六个结构按钮与整体图中的点击区域对应；局部窗口沿连续视野移动，直接引用同一套 SVG 结构。可切换内部剖视与半透明表面，细胞膜、细胞壁、核内染色质、大液泡、线粒体内膜和叶绿体膜片有不同的材质与层次。不属于所选细胞的结构保留按钮，通过缺失说明和整体对照解释。

Children compare representative animal, leaf mesophyll and bacterial cells. Whole-cell, close-up and process windows reference one mounted SVG geometry. The cell specimens remain distinct rather than morphing into one another. Selection moves the observation cameras; a translucent surface appears over the same structures. Native buttons provide the keyboard equivalent of diagram hit testing.

## 行为引入 / First look at cell processes

- 动物示例：糖等营养物质与氧参与有氧呼吸，释放部分可利用能量，并形成二氧化碳和水。糖在细胞质位置先分解成小块，小块连续移动到氧也到达的同一线粒体观察区域，再呈现后续反应；不会在两处各自淡出。ATP 从该区域形成并移向细胞内部，支持已有的氨基酸（绿圆点）形成蛋白质链，另用棕色波纹示意热。
- 叶肉示例：光合作用利用光能，水和二氧化碳参与形成糖，并释放氧；另可观察利用糖和氧的呼吸作用。植物呼吸示例的糖从细胞内开始，避免暗示植物只能从外界取得糖。植物的糖可由本细胞制造、储存或由植物其他部分供应。
- 植物白天和夜晚都能呼吸。两种过程分开播放只是便于观察，不能解释为互斥或轮班。细菌代谢方式多样，这里不把同一段有氧呼吸或光合作用动画套给所有细菌。

Manual finite playback and a scrubber expose inputs, internal changes and products. Each animal/plant/process combination retains its own progress when switching. Selecting a structure, surface or reading mode does not reset progress. A process window sits beside the controls on desktop and directly above them on mobile, using the same geometry and state. Shape-and-colour symbols identify sugars, their breakdown products, oxygen, water and carbon dioxide. A persistent sugar marker splits in the cytoplasm and its pieces travel to the same mitochondrial observation region as oxygen. Both reach that region before conversion begins. A small gold capsule symbol for ATP then moves inside the cell to support assembly of existing amino-acid building blocks, drawn as green circles, into a protein chain. Explanatory text stays outside every SVG viewport, including the close-up, so zooming cannot enlarge labels across the reaction. The same symbol key appears beneath the whole-cell and detail views. A dedicated green-circle legend explains the protein-building example beside the process. An adjacent readable caption follows conversion, delivery and use; ATP is not depicted turning into building material. Brown waves indicate heat.

There is no autoplay, audio, external image loading or continuing background loop. Reduced-motion preference resolves finite transitions. Hiding the page stops playback; pagehide cancels play, surface and camera transitions, and pageshow restores the settled view. Live announcements update by meaningful process phase rather than every frame. All supplied cover assets remain unchanged.

## Scientific limits

The drawings are not micrographs, do not share a true scale and omit many organelles, molecular crowding and transport details. Cell-membrane thickness is exaggerated. Chloroplasts belong to the leaf mesophyll example, not all plant cells; mature mammalian red cells lack the nucleus and mitochondria of the typical animal example. Bacteria have DNA without a nuclear envelope, and have no mitochondria. Mitochondrial and chloroplast DNA are described but not individually shown.

The paths summarize multistep transformations rather than fixed pipes. Markers are not stoichiometric counts. Light supplies energy, not the carbon in sugar; photosynthetic sugar carbon comes from carbon dioxide and released oxygen comes from water. Glycolysis begins in the cytoplasm and itself makes ATP without directly consuming oxygen. Breakdown products then enter mitochondria, with oxygen used at the respiratory chain. The highlighted mitochondrial region groups multiple downstream reactions for teaching, not one glucose–oxygen collision. ATP is a chemical carrier, recycled via ADP and other products after use; carrier recycling and early glycolytic ATP are explained but not separately animated. The animation does not quantify ATP, heat, concentrations, light intensity or net gas exchange, or represent anaerobic metabolism. Its ordered timing is an observation aid, not a kinetic model. The synthesis example shows energy use rather than detailed translation: ATP supports amino acid activation, elongation also uses GTP, and ribosomes, RNA and other factors are omitted. Green circles are not literal molecular shapes or complete proteins.

## Sources

Reviewed 2026-09-17:

- [NIH / NHGRI: Cell](https://www.genome.gov/genetics-glossary/Cell) — cellular organisation and typical nuclei.
- [NIH / NHGRI: Mitochondria](https://www.genome.gov/genetics-glossary/Mitochondria) — energy conversion and mitochondrial DNA.
- [OpenStax Biology 2e: Eukaryotic Cells](https://openstax.org/books/biology-2e/pages/4-3-eukaryotic-cells) — animal/plant organelles and the central vacuole; linked from the selected structural detail.
- [OpenStax Microbiology: Prokaryotic Cells](https://openstax.org/books/microbiology/pages/3-3-unique-characteristics-of-prokaryotic-cells) — bacterial structures and absence of membrane-bound organelles.
- [NCBI Bookshelf: How Cells Obtain Energy from Food](https://www.ncbi.nlm.nih.gov/books/NBK26882/) — nutrient oxidation, cytoplasmic and mitochondrial stages, usable chemical energy and heat; plant respiration as well as animal respiration.
- [NCBI Bookshelf: Chloroplasts and Photosynthesis](https://www.ncbi.nlm.nih.gov/books/NBK26819/) — leaf-cell organisation, chloroplast membranes, light-driven sugar production and origins of sugar carbon and released oxygen.
- [NCBI Bookshelf: From RNA to Protein](https://www.ncbi.nlm.nih.gov/books/NBK26829/) — amino acids, protein-chain synthesis, ATP-dependent activation and GTP-dependent elongation.
- Existing page references to [NHGRI Bacteria](https://www.genome.gov/genetics-glossary/Bacteria), [NHGRI DNA](https://www.genome.gov/about-genomics/fact-sheets/Deoxyribonucleic-Acid-Fact-Sheet) and [NIGMS Glossary](https://www.nigms.nih.gov/education/glossary) remain available for the original structural comparison.

The NCBI chapters are from a 2002 foundational textbook. They support established principles used here, not new research claims or a complete quantitative model.

## Ownership and focused verification

`model.ts` owns structural presence, supported process choices, finite sequence phases, camera interpolation and matching hit regions. `scene.ts` owns the mounted anatomy and material markers; `main.ts` owns retained progress, control composition and lifecycle. Bilingual learning content remains in `learning.json`, with three academic sections and four spoken segments per language, and cues stored separately from narration.

Focused model tests cover presence/absence, plant process choices, unsupported bacterial pathways, absent-structure view fallback, continuous cameras and trajectories, bounded sequence phases, continuous sugar transfer, co-located arrival before consumption, energy delivery before assembly, and diagram hit regions. Scoped TypeScript and exact topic/common translation checks are used. Native SVG raster inspection is a geometry check, not browser interaction proof. The coordinator owns final build, phone/desktop browser checks, and reading-mode acceptance. No automatic commit, push, external-site sync or deployment is part of this task.

## Presentation layout

The topic opts its existing scene and controls into shared viewport fitting and reversible immersion. Explanation/settings remain available in the adjacent disclosure panel. Multi-chapter studies retain their own state and clocks. Introductory diagrams can be expanded separately, and narrow screens retain document flow.

## Strict visual pass · 2026-10-18

细胞器补充内外膜层次，细胞核增加细小核孔，内质网和高尔基体改为有层次的膜囊。细胞仍由同一个SVG样本提供整体、局部和能量视图。共享SVG定义挂入专题作用域，使所选结构高亮可以正确生效；结构页隐藏只属于能量过程的物质符号，返回能量页保留原进度。

These original drawing details follow the compartment relationships described in [OpenStax Biology 2e, Eukaryotic Cells](https://openstax.org/books/biology-2e/pages/4-3-eukaryotic-cells). Pore/ribosome counts, spacing, membrane thickness and organelle positions are illustrative, not measured anatomy. No process sequence or biological model was added. The topic stays in drafts: structure, energy and the six specialization samples require separate acceptance; a more finished structure drawing does not certify all eight process/work views.

## 细胞专题精修 · 2026-10-19

本轮保持 **draft**，仅作本地迭代。三类结构标本改为较细的膜层、膜蛋白示意、核孔和染色质纹理，补充叶绿体类囊体、线粒体内膜、高尔基体及囊泡层次；不改变结构是否存在、点击区域、观察中心或代谢路径。核内曲线、核孔、核糖体与膜蛋白的画法、数量和位置都为辨识服务，不表示染色体数、分子数、真实膜厚或显微图像。膜蛋白只是静态结构提示，没有新增运输或门控模型。

章节、样本和过程选择共用原有控件，移动到当前演示的同一工具栏；讲解方式在旁边，解说与次要设置默认收起。能量视图保留紧邻画面的物质图例、阶段说明和可拖动进度；分工视图把样本名与当前阶段留在画面旁，显示标注的设置收进解说区。整个标本与局部视图仍引用同一套已挂载几何。现在除物理视口外，三处相机还按实际 `viewBox` 裁切世界坐标，修复宽画幅留白里漏出旁边标本的问题。桌面局部图的标题与对应画面靠在一起。

The three specimens remain teaching cutaways, not micrographs or molecular reconstructions. Added membrane proteins, nuclear pores, chromatin and organelle texture are illustrative details, not measured populations or a transport model. The original structure-presence rules, hit regions, material trajectories and independent specimen/process progress remain unchanged. Each viewport clips to its live world-coordinate camera as well as its physical bounds, including camera transitions.

六种分工图继续由 [body-cells](../body-cells/README.md) 与 [blood-cells](../blood-cells/README.md) 原专题持有。表皮、肌纤维、神经元、红细胞、中性粒细胞与血小板均细化；不是让同一细胞依次变形，也没有新增生理预测能力。具体改动、验证与仍待改进处见 [本轮记录](../../docs/cells-refinement-20261019.md)。基础细胞结构复核采用上列 OpenStax Biology 2e；组织与血细胞补充来源见各所有者 README。

## Reader 取样动作与构图 · 2026-10-19

`inspectionMotion.ts` 用 Reader 的有限时间线取样观察镜头与表面遮罩。镜头以连续的缩放接近所选位置，中途略微带出周围结构；专题原有时钟仍负责启动、暂停和取消，代谢与组织模型不交给时间线。更换细胞样本时先明确切到新样本的整体，再靠近它的结构，不再横穿其他标本。膜的局部窗围绕实际膜弧与膜蛋白位置取景，给外侧留一小段空间，并显示与细胞质、植物细胞壁的关系。桌面图形按原有宽高比排版，避免高窗口把主图拉成留白很大的竖幅。

细胞器采用略有不规则的膜轮廓和贴合轮廓的内部裁切。它们仍是原标本中的同一结构，位置、点击区域、结构是否存在及物质轨迹均未改变。分工镜头切换只改观察窗口，不重建当前 SVG；播放推进后仍按原模型取样。减少动态时，六个分工样本改为逐次显示已有过程的观察节点；肌肉会先显示峰值，再显示放松，不跳过中间的受力对照。节点、缩放、膜厚与纹理都不是生理时间或尺寸测量。

`inspectionMotion.ts` samples finite Reader timelines for inspection cameras and the retained surface veil. The existing topic clock owns start, pause, cancellation and visibility handling; scientific trajectories remain model-owned. A specimen change explicitly selects the new whole specimen before inspecting its detail. Membrane crops include the actual boundary/channel landmark with deliberate exterior and cytoplasmic context, including the plant cell wall. Desktop SVGs keep their authored aspect ratios. Camera-only specialist changes retain the current SVG nodes. Reduced-motion observation advances through existing causal checkpoints in all six examples, including peak tension before muscle relaxation. Camera easing, checkpoints, textures and membrane thickness are illustrative, not physiological measurements. Cells remains a draft.

Focused verification covers exact/replayable camera endpoints, finite framing, membrane landmarks, veil bounds, retained markup during inspection, cancelled-frame rejection and all six reduced-motion checkpoint sequences, alongside the existing scientific and SVG geometry checks. Final Reader build and actual bilingual desktop/phone interaction checks belong to the integrator.
