# 病毒是什么？为什么需要细胞？ / What are viruses, and why do they need cells?

中文与英文儿童科普页，使用原创 SVG 逐步显示一个有尾噬菌体的裂解性复制周期。浏览路径为 `/topics/viruses/?lang=zh` 或 `?lang=en`。

## 互动

选择能支持复制、表面不匹配或有内部防御的细菌细胞，再用前后按钮观察相遇、附着、DNA 进入、制造部件、组装和释放。切换宿主会回到初始状态；不匹配宿主在附着前停止，内部防御宿主在进入阶段停止。界面提供屏幕阅读器播报、原生键盘控件、静态文字全过程和窄屏排版。

There are three illustrative hosts: one supporting replication, one with a mismatched surface, and one with an internal defense. Attachment is necessary in this example but not sufficient for productive infection. The page uses user-driven SVG states, without a background loop, audio, workers or timers; no lifecycle resources need disposal.

## 科学范围 / Scope

细菌本身是细胞。病毒不是细胞，没有独立完成代谢和复制的完整系统。结构与周期以有头尾结构的噬菌体为代表，不混用所有病毒的外形与感染方式，不声称所有病毒都会杀死细胞或都能感染人。盾牌是内部防御的抽象图示；展示数量、时间与比例均非测量。主图的尾部、DNA、宿主边界与子代位置由确定性的 SVG 状态控制，没有微生物培养或实验步骤。

The model is qualitative. It does not predict infection, simulate molecular chemistry, or cover lysogeny, envelopes, RNA viruses, or non-lytic release. Text explains these boundaries in both languages. No medical advice or experimental procedures are included.

## Sources (checked 2026-09-12)

- [NHGRI: Virus](https://www.genome.gov/genetics-glossary/Virus) — viral structure, dependence on host cells, diversity of hosts.
- [RCSB PDB-101: Bacteriophage T4 Infection](https://pdb101.rcsb.org/sci-art/goodsell-gallery/bacteriophage-t4-infection) — structural basis and teaching representation of a tailed phage infection cycle.
- [Maffei et al., PLOS Biology 19(11):e3001424 (2021)](https://pubmed.ncbi.nlm.nih.gov/34784345/) — original research on phage receptors and susceptibility to bacterial defense systems.

`catalog-entry.json` and `catalog-en.json` are integration handoff files for the shared catalog owner. `cover.svg` is original vector artwork matching the page model.

## Validation (2026-09-12)

- Topic entry and its imports passed strict TypeScript checking with the repository's compiler options.
- A topic-local extraction check found 69 Chinese source-message occurrences, with all 65 distinct English translations present and no untranslated strings.
- In-app browser verified all six English states, disabled Next at completion, attachment blocked for the mismatched host, and replication blocked without offspring for the defended host.
- Chinese direct navigation and progression were verified. Both languages had `clientWidth === scrollWidth === 390` at a 390 × 844 viewport; desktop and narrow-screen screenshots were visually checked.
- These are local development-page checks. The shared catalog owner runs the integrated production build and repository gates.
