# 病毒是什么？为什么需要细胞？ / What are viruses, and why do they need cells?

双语儿童科普：`/topics/viruses/?lang=zh`、`?lang=en`。原创轻量 SVG，用一种 T4 类有尾噬菌体的结构讲解裂解性复制；封面保持原样。

## 观察与交互 / Observation

- 可用连续播放、暂停、拖动进度及前后步进观察过程。操作区就在画面下方，宿主选择和阶段说明独立放在说明栏。
- “整段过程”“看附着处”“看细胞里面”共享同一进度、DNA 和子代位置，只改变镜头。
- 三种示例宿主分别支持复制、阻止附着、在 DNA 进入后阻断复制。切换宿主会重置过程，保留观察视角；后两者不会制造或释放子代。
- 各阶段说明提供静态文字；屏幕阅读器只在阶段或宿主阻断改变时获得更新。原生按钮、滑块支持键盘；减少动态效果时，有限过渡直接到达目标。

Playback, scrubbing and step controls sit directly beneath the specimen. Whole-process, attachment and intracellular views share one model state. Host changes reset progress while keeping the chosen view. Surface mismatch and internal defense are different barriers, and neither produces offspring. There is no perpetual background loop; finite transitions settle when hidden, are cancelled on page exit, and restore consistently with the selected target.

## 结构、连续性与边界 / Structure and limits

`model.ts` owns the deterministic phase model, one entering DNA strand, offspring identities and camera targets. `scene.ts` owns the SVG materials and geometry; `main.ts` owns controls and finite transition lifecycle. Tests exercise those actual modules.

头部有分面与蛋白质颗粒纹理；尾鞘与中央尾管分开绘制，收缩时中央管不跟着缩短。细菌以透明剖面呈现外膜、薄细胞壁、细胞膜、DNA 与核糖体。原始颗粒与成熟子代使用相同图形尺度，子代并不是需要继续长大的“小病毒”。

The original phage and its genome persist through entry. New heads and separate tails form, DNA passes through a head portal, and tails attach. The same bacterial envelope develops an opening. Offspring first approach it within the cell, pass fully through it, then spread outside. There is no whole-scene crossfade or replacement of an intact host with an unrelated broken-cell picture.

病毒不是细胞，自身无法独立制造新病毒，需利用合适活细胞的条件。表面匹配不保证复制成功。尾纤维不是脚，图中运动不是主动行走。不是所有噬菌体都有收缩尾，也不是所有病毒都采用裂解周期、都杀死细胞或都感染人。

This is an illustrative route, not a molecular or infection simulation. Colors, transparency, envelope-layer spacing, particle counts and timing are teaching choices. The model omits molecular motors, membrane-channel chemistry, host chromosome degradation, realistic diffusion, lysogeny, envelopes, RNA viruses and many defense mechanisms. Defense markers are an abstraction. Moving the slider backward revisits the drawing; it does not make real infection reversible. There are no culturing instructions or medical recommendations.

## Sources reviewed on 2026-09-17

- [NHGRI — Virus](https://www.genome.gov/genetics-glossary/Virus): viral composition, host dependence and host diversity.
- [RCSB PDB-101 — Bacteriophage T4 Infection](https://pdb101.rcsb.org/sci-art/goodsell-gallery/bacteriophage-t4-infection): bacterial envelope, host machinery and lytic release; structural reference, not copied artwork.
- [Aksyuk et al. — T4 tail sheath structure](https://pmc.ncbi.nlm.nih.gov/articles/PMC2670864/): the contractile sheath is distinct from the non-contractile central tube.
- [Original portal and packaging study](https://pubmed.ncbi.nlm.nih.gov/24126213/): DNA packaging into heads and subsequent neck/tail assembly. The indexed abstract and figure description were checked.
- [Maffei et al. — BASEL phage collection](https://journals.plos.org/plosbiology/article?id=10.1371/journal.pbio.3001424): receptor compatibility, internal defenses and distinct replication outcomes.

## Focused validation on 2026-09-17

- `node --import tsx --test topics/viruses/tests/*.test.mjs`: 7 tests cover host barriers, continuous DNA and phase geometry, intact-cell containment, opening before release, renderer attributes, unchanged progress under camera changes, stale transition cancellation and page restoration.
- The topic's actual TypeScript entry passed strict type checking. Topic-only i18n extraction checked 82 Chinese message occurrences with no missing translations, unwrapped strings or invalid English values.
- Six actual renderer states were rasterized from SVG and inspected: initial, entry close-up, assembly close-up, release, final state and defended host. These are source-render checks, not browser layout or pointer proof.
- Root integration owns the final production build and 390 px bilingual browser checks. No commit, push, sync or deployment is authorized in this round.
