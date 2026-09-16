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
