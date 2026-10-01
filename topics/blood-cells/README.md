# 红细胞和白细胞在做什么？

## Integrated entry · 2026-09-20

The public URL now redirects into `/topics/cells/?chapter=work&case=oxygen`; valid `case`/`kind` selects defence or repair, with language, base prefix and hash retained. This directory still owns its complete biological models, detailed SVG renderer, bilingual content, scientific notes and tests. The cells workspace supplies shared controls and independent retained state; the three processes are never joined into one mandatory physiological timeline. `main.ts` is compatibility routing only. Deeper notes and references remain reachable inside the integrated work view. Earlier standalone UI descriptions below document retained model semantics rather than a second mounted page.

沿着一小段血管，看红细胞运送氧气、白细胞到达组织，以及血小板帮助封住破口。

三个独立观察场景，各自提供有限过程播放、暂停、阶段选择和拖动。`model.ts` 保存教学状态与几何约束，`scene.ts` 负责局部科学插画；`content.ts` 与 `learning.json` 分别维护操作说明和双语深入笔记／儿童口播。

图中数量、大小、流速和时间不按真实比例。血管是局部纵切示意；运氧、白细胞迁移、局部止血是三个独立场景，不是同一段血液必经的三个步骤。金色点只代表选定的氧分子，不是能看见的气泡。红细胞在图中比白细胞显得接近大小，是为了跟踪；现实中许多白细胞更大。

## Endothelial contact refinement · 2026-10-01

中性粒细胞轮廓现在由 `model.ts` 的 `immuneContour` 同时提供给插画和接触约束。穿壁开口保持原选定连接处，宽度按实际轮廓线段与整个下侧壁厚区间的交点决定，并给绘制的描边留空间；细胞尾部尚在壁中时，不再提前闭合。细胞完全通过后关闭。原迁移、变形、趋近和吞入时序、目标身份及另两个场景的路径保持原科学范围。

The same 64-point cell contour now drives the production illustration and its wall-contact constraint. The selected endothelial junction stays open across the actual contour's intersection with the full drawn wall thickness, including clearance for outlines, and closes after the trailing cell edge has passed. This is a geometric consistency rule, not a permeability, endothelial force, adhesion or immune-signaling simulation. Existing causal stages and bilingual scientific explanations remain the same.

Regression parses the production SVG and independently clips its polygon against the actual opening's wall band at 201 progress positions, including the former 47% tail collision. Forward/backward scrubbing restores identical output, and the wall is closed after full passage. These geometry checks do not replace the coordinator's real browser verification of crossing, camera changes and retained state.

## Sources

- [NCBI · Blood and the cells it contains](https://www.ncbi.nlm.nih.gov/books/NBK2263/)
- [OpenStax · Leukocytes and Platelets](https://openstax.org/books/anatomy-and-physiology-2e/pages/18-4-leukocytes-and-platelets)
- [OpenStax · Hemostasis](https://openstax.org/books/anatomy-and-physiology-2e/pages/18-5-hemostasis)
