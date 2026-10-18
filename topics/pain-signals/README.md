# 为什么会感觉疼？ / Why do we feel pain?

A bilingual, topic-owned SVG exploration with child and academic modes, source notes, three academic sections and four independently exportable narration segments in each language. Narration text excludes visual cues.

## Interaction and ownership

The scene follows a cutaneous afferent into a spinal schematic. A green branch contacts a motor/muscle representation while a purple ascending route continues toward several brain nodes. Branch emphasis dims the other route without disabling it. The hand withdraws only after the displayed reflex branch arrives. Skin zoom changes the camera continuously without resetting progress.

The model is deliberately dimensionless: it preserves causal ordering and overlapping branches, not measured nerve speeds. Nociception is distinguished from subjective pain; a reflex does not establish prior conscious pain, and pain is not a tissue-damage meter. Spinal interneurons, synapses, crossed pathways and descending regulation are described in notes. The page is a screen-only exploration and contains no instruction to induce real pain.

`main.ts` owns playback, scrubbing, finite stage transitions, camera state and accessible controls. `scene.ts` owns the anatomical teaching drawing. `model.ts` owns bounded explanatory progress, with focused tests for causal and comparison invariants. No disease scoring, diagnosis, sound playback, external media or background loops are used. Native controls support touch and keyboard; captions announce phase changes instead of every frame. Reduced-motion preferences resolve transitions immediately. Hidden pages pause progress; `pagehide` cancels animations.

## Scientific scope

不同部位被并排放大，线路、细胞和突触高度简化，省略神经交叉与下行调节。进度只服务于观察，不是真实潜伏期、诊断、疼痛评分或伤害实验。回拖进度是回看画面。

Enlarged tissues from different locations are placed together. Routes, cells and synapses are greatly simplified; crossing pathways and descending modulation are omitted. Progress is for observation, not measured latency, diagnosis, a pain score or an injury experiment. Scrubbing backward reviews the illustration.

## Sources reviewed 2026-09-16

- [IASP · Terminology: pain and nociception](https://www.iasp-pain.org/resources/terminology/)
- [UTHealth · Neuroscience Online: Pain Principles](https://nba.uth.tmc.edu/neuroscience/m/s2/chapter06.html)
- [NCBI Bookshelf · Physiology, Withdrawal Response](https://www.ncbi.nlm.nih.gov/books/NBK544292/)
- [NIH / NCCIH · Pain](https://www.nccih.nih.gov/health/pain)

Sources are paraphrased for a preschool explanation and do not supply images. The animation is pedagogical rather than a research simulation.

## Integration and validation

`catalog-entry.json` and `catalog-en.json` are delivered for the coordinating task to register. This topic does not edit the shared catalog or platform. Focused model tests, TypeScript and exact local translation coverage are checked before handoff; root owns the full production build and browser acceptance. No commit, push or deployment is performed here.

## Presentation layout

The topic selects its existing scene and controls for the shared viewport-fitted presentation frame. At desktop widths the scene and primary playback stay together, with independently scrollable explanation/settings; immersion can hide and reopen that panel without remounting the experiment. Narrow screens retain normal document flow. Scientific state and geometry remain topic-owned.

## Refinement 2026-09-28

The portrait diagram has been composed as a wide, continuous route: the same skin ending, spinal circuit, muscle/hand and brain remain in place as the activity fronts advance. The skin zoom keeps that ending as its anchor and reveals epidermis, free ending and afferent fiber labels. The muscle-to-hand connector now reaches the withdrawing hand throughout the movement. Tissues remain enlarged side by side; routes are functional summaries, not a single literal neuron fork.

The SVG clips to its current observation window. Magnified tissue outside that window cannot cover the native return button; zooming back retains progress and the same linkage geometry.

The child mode places a one-sentence explanation at the top of the controls, while the academic mode adds phase-specific mechanism and model limits in the same sidebar. Both modes retain the existing playback and stage selection; mode and camera changes do not reset progress. On a 390 px screen the compact introduction leaves the illustration and playback entrance in the first viewport. The IASP distinction between nociception and pain and the UTHealth description of free nerve endings, spinal relays and differing fibers were rechecked; no physiological speed, damage or pain score is calculated.

## Bounded withdrawal repair 2026-10-01

The previous drawing had no bones or joints. It shortened the belly by 20 SVG units but moved the hand 27 units away from the fixed near attachment; the far tendon consequently grew from 39 to 76 units. That contradicted the illustrated shortening-and-pull relationship. The coupled model now fixes the near attachment and both idealized tendon lengths (36 and 37 units): a 112-to-92-unit belly draws the same far attachment and hand symbol 20 units closer. The fibers follow the belly’s center and length. These are teaching coordinates, not measured physiological shortening.

下方只示肌肉缩短牵拉连接端，不复现手臂解剖：骨、关节与多肌群动作未绘，肌腱长度在示意中固定，不模拟弹性。并排放大的组织及移动方向不标定刺激的位置。

The lower inset shows only shortening pulling an attachment closer. Bones, joints and coordinated muscle groups are omitted; fixed drawn tendon lengths do not simulate tendon elasticity. Side-by-side enlargements and movement direction do not locate the stimulus. The scene caption, phase boundary and deeper notes state equivalent qualifications in both languages.

The existing NCBI withdrawal reference and [OpenStax’s muscle attachment and lever explanation](https://openstax.org/books/anatomy-and-physiology-2e/pages/11-1-interactions-of-skeletal-muscles-their-fascicle-arrangement-and-their-lever-systems) were checked on 2026-10-01. They support withdrawal involving flexors and coordinated joints, and transmission of muscle pull through tendons to bones; the inset is not attributed to a particular named muscle. Focused regressions exercise the actual SVG attributes across withdrawal, branch emphasis and replay, in addition to sequence ordering.
