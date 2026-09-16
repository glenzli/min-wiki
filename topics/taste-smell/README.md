# 为什么会尝到味道？ / Why do we taste flavors?

A bilingual, topic-owned SVG exploration with child and academic modes, source notes, three academic sections and four independently exportable narration segments in each language. Narration text excludes visual cues.

## Interaction and ownership

The side section distinguishes an airborne retronasal aroma route from neural routes. The paired papilla section contains an enlarged taste bud, a saliva layer, an apical pore, elongated cells and basal nerve fibers. The camera enlarges the bud continuously. Strawberry/tomato selection starts a new screen example; taste-only versus taste-plus-smell comparison preserves the taste pathway and current progress, while smell contribution fades.

The model preserves dissolved-solute → cell → nerve ordering without assigning measured latencies or flavor percentages. It covers five established taste qualities without an exclusive tongue map. Chili burn is distinguished from basic taste, and smell loss is not equated to complete taste loss. It does not recommend tasting unknown substances, eating chili or blocking the nose.

`main.ts` owns playback, scrubbing, finite stage transitions, camera state and accessible controls. `scene.ts` owns the anatomical teaching drawing. `model.ts` owns bounded explanatory progress, with focused tests for causal and comparison invariants. No disease scoring, diagnosis, sound playback, external media or background loops are used. Native controls support touch and keyboard; captions announce phase changes instead of every frame. Reduced-motion preferences resolve transitions immediately. Hidden pages pause progress; `pagehide` cancels animations.

## Scientific scope

这是不同尺度的概念切面，不是显微照片、真实气流或感觉强度模型。细胞数量与种类、神经中继和脑区网络都被简化。比较按钮只改变图上计入的嗅觉贡献，不模拟堵鼻、疾病或个体喜好。

These are conceptual sections at different scales, not micrographs, realistic airflow or a model of sensory intensity. Cell counts and types, nerve relays and brain networks are simplified. The comparison changes the displayed contribution of smell, without simulating nose-blocking, disease or individual preferences.

## Sources reviewed 2026-09-16

- [NIH / NIDCD · Taste Disorders](https://www.nidcd.nih.gov/health/taste-disorders)
- [NIH / NIDCD · Smell Disorders](https://www.nidcd.nih.gov/health/smell-disorders)
- [UTHealth · Neuroscience Online: Chemical Senses](https://nba.uth.tmc.edu/neuroscience/m/s2/chapter09.html)
- [Silver et al. · TRPV1 receptors and nasal trigeminal chemesthesis (2006)](https://pubmed.ncbi.nlm.nih.gov/16908491/)

Sources are paraphrased for a preschool explanation and do not supply images. The animation is pedagogical rather than a research simulation.

## Integration and validation

`catalog-entry.json` and `catalog-en.json` are delivered for the coordinating task to register. This topic does not edit the shared catalog or platform. Focused model tests, TypeScript and exact local translation coverage are checked before handoff; root owns the full production build and browser acceptance. No commit, push or deployment is performed here.
