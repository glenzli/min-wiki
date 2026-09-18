# 细胞是什么？ / What is a cell?

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
- [NCBI Bookshelf: How Cells Obtain Energy from Food](https://www.ncbi.nlm.nih.gov/books/NBK26882/) — nutrient oxidation, cytoplasmic and mitochondrial stages, usable chemical energy and heat; plant respiration as well as animal respiration.
- [NCBI Bookshelf: Chloroplasts and Photosynthesis](https://www.ncbi.nlm.nih.gov/books/NBK26819/) — leaf-cell organisation, chloroplast membranes, light-driven sugar production and origins of sugar carbon and released oxygen.
- [NCBI Bookshelf: From RNA to Protein](https://www.ncbi.nlm.nih.gov/books/NBK26829/) — amino acids, protein-chain synthesis, ATP-dependent activation and GTP-dependent elongation.
- Existing page references to [NHGRI Bacteria](https://www.genome.gov/genetics-glossary/Bacteria), [NHGRI DNA](https://www.genome.gov/about-genomics/fact-sheets/Deoxyribonucleic-Acid-Fact-Sheet) and [NIGMS Glossary](https://www.nigms.nih.gov/education/glossary) remain available for the original structural comparison.

The NCBI chapters are from a 2002 foundational textbook. They support established principles used here, not new research claims or a complete quantitative model.

## Ownership and focused verification

`model.ts` owns structural presence, supported process choices, finite sequence phases, camera interpolation and matching hit regions. `scene.ts` owns the mounted anatomy and material markers; `main.ts` owns retained progress, control composition and lifecycle. Bilingual learning content remains in `learning.json`, with three academic sections and four spoken segments per language, and cues stored separately from narration.

Focused model tests cover presence/absence, plant process choices, unsupported bacterial pathways, absent-structure view fallback, continuous cameras and trajectories, bounded sequence phases, continuous sugar transfer, co-located arrival before consumption, energy delivery before assembly, and diagram hit regions. Scoped TypeScript and exact topic/common translation checks are used. Native SVG raster inspection is a geometry check, not browser interaction proof. The coordinator owns final build, phone/desktop browser checks, and reading-mode acceptance. No automatic commit, push, external-site sync or deployment is part of this task.
