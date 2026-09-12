# 细胞是什么？ / What is a cell?

双语儿童互动页面，比较典型动物细胞、叶肉植物细胞和细菌细胞。切换细胞后，四个结构按钮会更新说明；点击 SVG 中的结构也可观察。不存在的结构仍可选中，明确解释“没有这种结构”。

Children compare an animal cell, a leaf mesophyll cell and a bacterium. Native buttons select the specimen and inspect its membrane, DNA, nucleus and chloroplasts. Clicking illustrated structures provides the same inspection. Absent structures remain selectable so their absence can be explained.

## 内容边界 / Scope

- 细菌也是细胞，含 DNA，但没有膜包围的细胞核。植物例子只代表叶肉细胞，并非所有植物细胞都有叶绿体。
- 动植物主要 DNA 位于核内，线粒体和叶绿体的 DNA 在说明中交代；不宣称核内包含全部 DNA。
- 病毒不是细胞，必须借助适宜宿主细胞复制。这里不判定微生物有害与否，不提供治疗建议。
- Original SVG diagrams are not micrographs and do not share a size scale. Colors, shapes and structure counts are simplified. Most bacterial and plant cell walls are mentioned; the pale leaf-cell center is the vacuole. Mature mammalian red cells are noted as a special case. The page does not attempt a complete organelle inventory.
- No autoplay, timers, audio, network fetches or external imagery. The static explanations remain understandable without the diagram. Native controls support touch and keyboard; the live inspection panel announces changes.

## 来源 / Sources

Checked 2026-09-12:

- [NIH / NHGRI: Cell](https://www.genome.gov/genetics-glossary/Cell) — cellular building blocks and prokaryotic/eukaryotic comparison.
- [NIH / NHGRI: Bacteria](https://www.genome.gov/genetics-glossary/Bacteria) — bacteria as single-celled organisms without a nucleus.
- [NIH / NHGRI: DNA fact sheet](https://www.genome.gov/about-genomics/fact-sheets/Deoxyribonucleic-Acid-Fact-Sheet) — genetic information and nuclear/mitochondrial DNA.
- [NCBI Bookshelf: Chloroplasts and Photosynthesis](https://www.ncbi.nlm.nih.gov/books/NBK26819/) — photosynthesis, plastid diversity, leaf-cell organization and chloroplast DNA. This is a 2002 textbook chapter; the page uses foundational structural facts, not current research claims.
- [NIH / NIGMS: Glossary, Virus](https://www.nigms.nih.gov/education/glossary) — virus as a noncellular entity requiring a host cell.

## 验证 / Verification

The topic owns only `topics/cells/`. Catalog metadata and shared translations are delivered as `catalog-entry.json` and `catalog-en.json` for coordinated integration. Focused validation checks strict TypeScript and exact bilingual message coverage; the integrating task runs the repository gates and built-page browser checks.
