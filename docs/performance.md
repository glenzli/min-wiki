# Page delivery and size checks

The source illustrations and topic models remain editorial inputs. Delivery optimization changes which image bytes or language projection a page loads; it does not replace the scientific scenes or reduce their controls.

## Images

- Published photographic covers use `cover-480.webp` and `cover-960.webp`, generated from the selected `cover-v3.jpg` or otherwise `cover-v2.jpg`. Originals remain in the repository and are not imported by the catalog.
- The catalog supplies width descriptors, sizes matching its one/two/three-column and single-result layouts, explicit dimensions, lazy loading, and asynchronous decoding. The browser chooses one candidate according to layout and pixel density. SVG covers remain SVG.
- The rainbow environment uses a 1672 × 941 WebP copy of the original PNG. This is an authored illustration, not an observational photograph; the optical model is unchanged.
- `npm run optimize:images` regenerates copies using the pinned Sharp version. `scripts/image-delivery.json` records source/output hashes and pixel sizes. `npm run check:images` rejects stale sources, stale copies, or a newly selected cover without regeneration; this check runs before every production build.

## Measuring a release

Learning documents remain bilingual at their authored paths. `src/platform/learning/buildProjection.ts` projects explicitly queried JSON into one complete language payload at build time; ordinary JSON imports and the export script keep the original document. The browser invokes only the loader for its current topic and language. Notes, references, narration, visual cues and downloads retain their existing interface.

Build into a fresh directory with `npm run build -- --manifest --outDir /tmp/wiki-payload-check`, then run `npm run report:payload -- /tmp/wiki-payload-check`. The report follows Vite's static entry imports and CSS, excludes dynamic content/worker/image loads from its initial-code totals, and reports all emitted files separately. Gzip values are calculated estimates, not server transfer measurements.

Do not use an old output directory for total-size comparisons: Vite can retain orphaned files when an external output directory is reused. A useful comparison must also distinguish all deployed images from images selected on one page. A high-density phone may correctly select the 960-pixel image.

This environment does not expose Chrome DevTools trace tooling. This release therefore claims verified byte savings and browser behavior, not measured LCP, INP, CLS, or a Lighthouse score. The existing Three.js bundle is used by interactive 3D topics and remains shared and cached; moving its bytes among files solely to silence a size warning would not demonstrate a loading improvement.

## 2026-09-17 release evidence

Baseline source: `24856a3`. Baseline build: `/tmp/wiki-perf-before-20260917`, with manifest report `/tmp/wiki-perf-before.json`.

The 49 selected original covers total 16,899,227 bytes. Their 480-pixel copies total 1,770,130 bytes (89.5% less), and 960-pixel copies total 5,350,860 bytes (68.3% less). These are sums over all 49 covers, not a claim that all are fetched on one visit. Both sets together use 7,120,990 bytes of deployment storage.

The rainbow background changes from 2,466,613 to 345,064 bytes (86.0% less), retaining the original pixel dimensions. All 99 derived images decode at the recorded dimensions. Desktop and 390-pixel browser checks confirm WebP selection and readable cover details, including the wider single-result layout.

Final build: `/tmp/wiki-perf-after-20260917`; report: `/tmp/wiki-perf-after.json`. All emitted delivery files total **31,225,421 → 19,205,703 bytes**, a **38.5%** reduction. This counts both responsive image variants and both language projections stored for deployment; it is not one page's transfer size.

Across 59 topics, the mean learning chunk changes from 4,287 gzip bytes to 2,476 (Chinese) / 1,937 (English). Its shared language loader grows by 761 gzip bytes, leaving mean first-visit savings of 1,050 / 1,589 bytes. The homepage's responsive URL index adds about 1 KB gzip. These small code increases are included in the complete build comparison rather than hidden by reporting only reduced files.

Release gate: **297/297 tests**, strict TypeScript, 5,862 source messages across 60 English namespaces, image integrity, and the final production build passed. All 118 locale chunks were checked against authored content and references; all 236 narration/storyboard exports match byte-for-byte. Actual production browser checks include English `#narration` direct navigation, Chinese language switching with the anchor retained, localized download targets, and academic-mode disclosure. The checked artifact is also served by the existing local instance on port 4180.
