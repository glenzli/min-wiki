# 花为什么五颜六色？ / Why are flowers so colorful?

A four-case learning journey: cultivar pigment composition in roses; retained next-bloom hydrangea chemistry; coupled opening/vacuolar-environment changes in Ipomoea tricolor ‘Heavenly Blue’; and visible versus false-color UV absorption patterns in sunflowers. Cases explain distinct causes, not a universal soil-pH color control.

`model.ts` owns validated case state, representative pigment trends and bounded opening interpolation. `scene.ts` owns deterministic botanical illustrations, cell compartments and persistent geometry. `main.ts` owns case navigation, URL preservation and study lifetime. Hydrangea's existing model, portrait, transport and cell study stay in `../hydrangea/`; its controller is mounted without duplicate navigation. Old `/topics/hydrangea/` links default to that case; the new parent entry defaults to pigments. Catalog parentTopic preserves search and eliminates duplicate top-level cards.

Changing cases stops the hydrangea clock and preserves pending settings separately from the planted snapshot. URL state preserves case, cultivar comparison, opening, UV observation, close-up and hydrangea progress/settings/planted conditions. The other studies are directly scrubbed snapshots with no idle animation or timed convection. Geometry, pigment counts, colors and cell enlargements are illustrative, not spectral measurements or microscope images. The UV overlay is not a bee-color simulation. White rose petals may still contain pigments. No soil-treatment prescription, exact pH interpolation, or prediction for all cultivars is claimed.

Sources: rose pigment composition https://pmc.ncbi.nlm.nih.gov/articles/PMC6379320/ and https://pmc.ncbi.nlm.nih.gov/articles/PMC11644816/ ; Heavenly Blue development https://pmc.ncbi.nlm.nih.gov/articles/PMC3559195/ ; sunflower UV patterns https://elifesciences.org/articles/72072 . Hydrangea evidence remains in its README. Shared narration contains three academic sections and four spoken segments in both languages.

Cover is an original code-authored SVG montage of the four representative flowers, not an observed photograph. No new third-party image assets.

## Reading and scene refinement — 2026-09-28

The four cases now share one children/academic reading control, including the mounted hydrangea study. Children get a short observation in the active sidebar; academic mode opens longer case-specific principles, model limits and references there, with the existing hydrangea chemistry panel. The academic mode persists in the URL when changing cases and survives refresh. The retained hydrangea settings and bloom are not reset by switching reading modes. Its long background section is removed from the children's reading flow; the optional academic notes remain accessible.

The whole rose, morning glory and sunflower fill more of the available canvas. Switching between a flower and its petal-cell sample now interpolates one retained flower's position and size and brings in the cell through the linked sample marker. Refresh starts at the saved view without replaying the transition. Narrow screens use a smaller zoom to keep the sampling link and cell in frame. Sunflower UV absorption is identified as false color in both reading modes. The opening progress, pigment meters and cell symbols remain qualitative, not measured kinetics, concentrations or spectra. The added academic relation for morning glory defines vacuolar pH; the sunflower length ratio follows the cited study and is not a value computed by this page.

## Validation — 2026-09-22

- `npm run check`: 648 tests passed, plus typecheck, bilingual extraction, image delivery and production build. Subsequent final presentation/legend/metadata changes passed `npm run build`; model inputs did not change after the complete test run. `git diff --check` passed for affected tracked files.
- Source-server browser inspected rose cultivar/cell views, intermediate morning-glory opening, sunflower UV overlay, and hydrangea pending pH 6.7 while the current planted bloom retained pH 5.3 across case switches and refresh.
- Packaged consumer at temporary 127.0.0.1:4176 inspected English 390px morning-glory/cell layout (clientWidth and scrollWidth both 390), opening endpoint, native language switch preserving progress, legacy hydrangea direct entry and catalog search for 绣球 returning one new parent card. New SVG cover visually inspected at card size. No captured console errors. Temporary preview was stopped; original 5173 host retained.
- Browser automation's selectOption timed out; the native language control successfully completed the switch. No browser failure is claimed as product failure. Final metadata-only rebuild reused the inspected runtime code. No commit, push or deployment; broader pending repository publication remains separate.

## Presentation layout

The topic opts its existing scene and controls into shared viewport fitting and reversible immersion. Explanation/settings remain available in the adjacent disclosure panel. Multi-chapter studies retain their own state and clocks. Introductory diagrams can be expanded separately, and narrow screens retain document flow.
