# Page delivery and size checks

The source illustrations and topic models remain editorial inputs. Delivery optimization changes which image bytes or language projection a page loads; it does not replace the scientific scenes or reduce their controls.

## Images

- Published photographic covers use `cover-480.webp` and `cover-960.webp`, generated from the selected `cover-v3.jpg` or otherwise `cover-v2.jpg`. Originals remain in the repository and are not imported by the catalog.
- The catalog supplies width descriptors, sizes matching its one/two/three-column and single-result layouts, explicit dimensions, lazy loading, and asynchronous decoding. The browser chooses one candidate according to layout and pixel density. SVG covers remain SVG.
- The rainbow environment uses a 1672 × 941 WebP copy of the original PNG. This is an authored illustration, not an observational photograph; the optical model is unchanged.
- `npm run optimize:images` regenerates copies using the pinned Sharp version. `scripts/image-delivery.json` records source/output hashes and pixel sizes. `npm run check:images` rejects stale sources, stale copies, or a newly selected cover without regeneration; this check runs before every production build.

## Measuring a release

Learning documents remain bilingual at their authored paths. `src/platform/learning/buildProjection.ts` projects explicitly queried JSON into one complete language payload at build time; ordinary JSON imports and the export script keep the original document. The browser invokes only the loader for its current topic and language. Notes, references, narration, visual cues and downloads retain their existing interface.

Use the Reader build (`npm run build`) and inspect `dist/wiki-build.json` for the exact source identity. Generated assets have content fingerprints; ordinary image/font/worker files stay separate from scripts. For a task-private output use the Reader command with `--out /private/tmp/wiki-payload-check`.

Measure actual first-load requests and the selected entry in the browser. Total output size includes lazy studies and compatibility routes and is not a first-load measurement. Compressed byte estimates are not server transfer evidence. The old Vite-specific payload-report command was removed with that build mode.

## 2026-09-17 release evidence

Baseline source: `24856a3`. Baseline build: `/tmp/wiki-perf-before-20260917`, with manifest report `/tmp/wiki-perf-before.json`.

The 49 selected original covers total 16,899,227 bytes. Their 480-pixel copies total 1,770,130 bytes (89.5% less), and 960-pixel copies total 5,350,860 bytes (68.3% less). These are sums over all 49 covers, not a claim that all are fetched on one visit. Both sets together use 7,120,990 bytes of deployment storage.

The rainbow background changes from 2,466,613 to 345,064 bytes (86.0% less), retaining the original pixel dimensions. All 99 derived images decode at the recorded dimensions. Desktop and 390-pixel browser checks confirm WebP selection and readable cover details, including the wider single-result layout.

Final build: `/tmp/wiki-perf-after-20260917`; report: `/tmp/wiki-perf-after.json`. All emitted delivery files total **31,225,421 → 19,205,703 bytes**, a **38.5%** reduction. This counts both responsive image variants and both language projections stored for deployment; it is not one page's transfer size.

Across 59 topics, the mean learning chunk changes from 4,287 gzip bytes to 2,476 (Chinese) / 1,937 (English). Its shared language loader grows by 761 gzip bytes, leaving mean first-visit savings of 1,050 / 1,589 bytes. The homepage's responsive URL index adds about 1 KB gzip. These small code increases are included in the complete build comparison rather than hidden by reporting only reduced files.

Release gate: **297/297 tests**, strict TypeScript, 5,862 source messages across 60 English namespaces, image integrity, and the final production build passed. All 118 locale chunks were checked against authored content and references; all 236 narration/storyboard exports match byte-for-byte. Actual production browser checks include English `#narration` direct navigation, Chinese language switching with the anchor retained, localized download targets, and academic-mode disclosure. The checked artifact is also served by the existing local instance on port 4180.
