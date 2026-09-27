# 微生物：细胞、环境与病毒 / Microbes: cells, habitats and viruses

This is the unified observation workspace for microbial habitats, bacterial structure/division and host-dependent viral replication. It consumes the existing detailed bacterial and viral renderers directly, not their old UI or an iframe. The real catalog is `content/catalog.json`; local catalog fragments mirror its title/summary and legacy parent relationships.

## Six design questions / 六项设计

1. **Question:** why do arrival, cell growth and viral replication require different conditions?
2. **Conditions:** choose soil/water/skin/air; compare resource-supporting/limited cases for reference bacterium B; select its structural part or one division; compare matching, mismatched and defended virus hosts H.
3. **Observations:** persistent environment reference, selective membrane routes, DNA copying/partitioning, bounded division, continuous viral DNA/assembly/release and stopped-host branches.
4. **Causality:** a habitat supplies constraints; cells have boundaries and machinery but need conditions; viruses still require suitable living host machinery and can fail after entry.
5. **Misconceptions:** presence is not growth; not all microbes are bacteria; viruses are not cells; a thick-walled reference is not silently converted into an E. coli-like T4 host; appearance does not establish health risk.
6. **Evidence/boundary:** all drawings and timing are illustrative. Resource limitation is a qualitative teaching comparison, not a universal species growth rate or field sample. Primary references are linked below and in bilingual learning material.

E 是环境插画。B 是较厚细胞壁、无外膜的一类参考细菌，不是从 E 鉴定出来的物种。病毒章明确切换到 H：有外膜与薄壁的 T4 类噬菌体宿主对照，参考大肠杆菌样包被。不同宿主选择是机制条件，不由外形或壁厚直接推断。共同工作区保留环境和条件作参照，但 B 的资源开关不驱动 H 的感染结局。

## Ownership / 所有权

- `workspaceModel.ts`: validated routes, bounded per-resource bacterial/per-host viral states and the single user-started process clock.
- `workspace.ts`: complete workspace UI/lifecycle, observation reference, controls, failure/cancel/retry, URL history and disposal.
- `workspaceRenderer.ts`: one live lazy scientific renderer; environment zoom and viral camera interpolation, bacterial structure focus and direct consumption of the existing detailed SVG engines. No old topic controller is imported.
- `sceneLifecycle.ts`: asynchronous admission and generation-based stale completion rejection.
- `scene.ts`: original four detailed habitat illustrations; shared between context reference and main observation with separate SVG namespaces.
- `workspaceContent.json` and `learning.json`: paired mechanism, comparison, assumptions and narration. The current step has separate short child text and fuller academic text, with a mechanism source beside it; the longer academic sections and four narration segments cover the whole journey.
- `../bacteria/model.ts`, `scene.ts`, `habitats.ts`: retained models, detailed wall/membrane/DNA/ribosome/division and the readable yogurt/soil/gut role illustrations. These remain runtime-consumed; the latter are explicitly different communities, not B moving through habitats.
- `../viruses/model.ts`, `scene.ts`: retained continuous T4-like process, offspring identities, envelope breach and host failure branches.
- The old bacteria/viruses `main.ts` and `index.html` are now minimal compatibility entries. Their obsolete page CSS is removed, not their scientific engines or covers.

Only one main scientific SVG renderer exists at a time; the fixed habitat reference and three static role illustrations are bounded. No idle process timer runs. Changing chapters/conditions, seeking, hiding or leaving pauses current time. Returning does not auto-play. Separate condition/host progress survives in memory; only the currently selected case is encoded in the URL. Language changes reload the page and restore encoded state, not every remembered case. Late imports cannot mount after cancellation, supersession or disposal; preparation can be retried. Reduced-motion preferences remove camera/focus interpolation while retaining the explicit finite scientific sequence.

The desktop structure view keeps the whole reference cell and its selected detail side by side inside the observation stage. The current explanation appears first in the sidebar, so a change of part, division stage or host barrier updates the explanation without losing the picture. The child mode gives one short causal point for that state. Academic mode keeps the full state description, an additional model or mechanism note and its source link; the scientific SVG and experiment state are shared. On narrow screens the structure and detail stack in reading order, and the playback controls remain compact.

## Routes / 路由

`/topics/microbes-everywhere/?chapter=environment|bacteria|viruses`

- Context: `habitat=soil|water|skin|air`, `resources=ready|limited`, `close=0|1`.
- B: `part=wall|membrane|dna|ribosomes`, `process=structure|division`, `bp=0..1`, `exchange=0..1`. Limited division is capped at 0.18 before copying, solely as the teaching contrast.
- H: `host=compatible|mismatch|defended`, `view=whole|attachment|inside`, `p=0..5`, capped by the chosen host.
- `microbialHref(chapter, search='', base='/', hash='')` in `workspaceModel.ts` preserves query parameters, language, deployment prefix and hash while forcing the legacy route's chapter. `readWorkspace(search)` validates applicable values.
- Browser back/forward reselects the encoded chapter and current case without background playback. Unknown input falls back safely.

## Science sources / 科学依据

Reviewed 2026-09-20. These support mechanisms, not the arbitrary resource cutoff, geometric scale, counts or timings.

- [USDA NRCS — Soil Biology Primer](https://www.nrcs.usda.gov/resources/education-and-teaching-materials/soil-biology-primer): diverse soil organisms, decomposition and roles.
- [Grice et al. — Human skin microbiome](https://pmc.ncbi.nlm.nih.gov/articles/PMC2805064/): distinct skin microenvironments and communities.
- [OpenStax — Prokaryotic cell structures](https://openstax.org/books/microbiology/pages/3-3-unique-characteristics-of-prokaryotic-cells): envelopes, nucleoid and ribosomes.
- [OpenStax — How microbes grow](https://openstax.org/books/microbiology/pages/9-1-how-microbes-grow): fission and condition-dependent growth.
- [NHGRI — Virus](https://www.genome.gov/genetics-glossary/Virus): noncellular composition and host dependence.
- [RCSB PDB-101 — T4 infection](https://pdb101.rcsb.org/sci-art/goodsell-gallery/bacteriophage-t4-infection): T4 and E. coli, entry, host machinery and lytic release.
- [Maffei et al. — BASEL phage collection](https://journals.plos.org/plosbiology/article?id=10.1371/journal.pbio.3001424): host compatibility and defense.
- Existing viral structure/packaging studies remain in `../viruses/README.md`; yogurt references remain in the learning sources.

## Focused validation / 范围验证

`node --import tsx --test topics/microbes-everywhere/tests/*.test.mjs topics/bacteria/model.test.ts topics/viruses/tests/*.test.mjs`

Covers actual models, routes, state retention, resource/host branches, conservative camera state, single-clock lifecycle, stale loading/cancel/retry and bilingual content. Old virus-controller tests now cover the compatibility boundary; their active UI lifecycle contracts moved to the unified workspace tests. Parent integration owns full gates and real packaged desktop/390px bilingual browser checks. Automated passing tests do not establish visual acceptance, actual biological prediction or deployment.

No commit, push or deployment is implied.

## Presentation layout

The topic opts its existing scene and controls into shared viewport fitting and reversible immersion. Explanation/settings remain available in the adjacent disclosure panel. Multi-chapter studies retain their own state and clocks. Introductory diagrams can be expanded separately, and narrow screens retain document flow.
