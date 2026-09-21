# Leaf illustration validation — 2026-09-21

## Follow-up: cell illustration aesthetics

- Refined only `scene.ts` and topic documentation: tissue/cytoplasm/liquid palette separation, lighter contour lines, deterministic peripheral organelle variation, clipped nuclear detail and flat chloroplast membrane stacks. Miniature plastids reuse a cached version of the enlarged cutaway. Model, controller, camera anchors, lifecycle and pigment curves remain unchanged.
- `node --import tsx --test topics/leaf-colors/tests/model.test.mjs topics/leaf-colors/tests/lifecycle.test.ts`: 14 passed. These cover existing state/geometry contracts, not aesthetic quality. `npm run build` passed strict TypeScript, 66 English namespaces, 131 image copies and bundling; entry asset `dist/assets/leaf-colors-7URTASrd.js`. Existing unrelated mixed-import/large-chunk advisories remain. No broad unrelated suite rerun.
- Browser inspection covered the development green cell and tissue, then packaged port 4175 red vacuole and green chloroplast endpoint. At 390 × 844, inspected Chinese tissue-to-cell intermediate and full cell, plus the English red-vacuole endpoint; document/scroll widths were 390/390. Red solution remained inside the visible membrane. Repeating scale 1.5 → 3 → 1.5 restored camera `81.046450,-8.171511,16.172847`. Captured console errors were empty. Temporary tab closed and viewport reset.
- Scoped whitespace check passed. Local preview rebuilt; no commit, push or deployment. No quantitative performance claim is made for the miniature cache.

## Unified epidermis and cell cutaways

- Removed the active WebGL/Canvas overlay boundary; `scene.ts` now draws the selected mesophyll cell once within its tissue, including its persistent vacuole and selected chloroplast. Liquid fill, pigment clipping and membrane stroke consume the same cached path. No expanding red ellipse remains. The inherited `microScene.ts` file is preserved but no longer imported by the entry.
- Added the irregular upper-epidermis stop at scale 0.5. Camera arrival finishes at 0.44; the side-turn starts only after 0.60. Guided playback pauses at 0.5; manual and reduced-motion navigation include this stop. Lifecycle/pigment/water curves are unchanged.
- `node --import tsx --test topics/leaf-colors/tests/model.test.mjs topics/leaf-colors/tests/lifecycle.test.ts`: 14 passed. New tests cover the epidermis observation interval and shared bounded vacuole coordinates; existing tests cover projection seams, reversibility, pigment locations and lifecycle. These tests establish illustrative geometry/state contracts, not measured biology or aesthetic quality.
- `npm run build` passed strict TypeScript, 66 English namespaces, 131 image copies and production bundling. A second build followed the concrete mobile-framing fix; final entry asset is `dist/assets/leaf-colors-AFoy6QzZ.js`. Existing unrelated mixed-import/large-chunk advisories remain. No broad repository suite rerun for this topic-local change.
- Packaged port 4175: verified guided playback actually stops at scale `0.5000`, angle `0.000000`, camera `78.000000,-31.800000,5.555556`, with Continue journey enabled. Inspected the sheet, side-turn, tissue-to-cell intermediate and yellow chloroplast endpoint. Repeating 1.5 → 3 → 1.5 restored camera `81.046450,-8.171511,16.172847` and age `0.8514`.
- Actual 390 × 844 Chinese and English layouts reported document/scroll widths 390/390. Inspected red vacuole and English side-turn; adjusted red close-up magnification so the cell wall fits. Final English red view and lighter pigmentation at age 0.7000 retained the same membrane boundary and scale 3. Captured console errors were empty. Temporary test tab closed and viewport override reset.
- Scoped whitespace check passed. Local preview updated; no commit, push or deployment. Earlier dated records below concern superseded implementations.

## Earlier validation — 2026-09-20

## Follow-up: one surface/section viewpoint

- Replaced the first opening-mask transition with a shared orthographic pitch/yaw turn. Sampled top surface, depth face and front tissue section remain joined; surrounding blade fades in place. The original surface is retained at a smaller sample beside the midrib, and the enlarged epidermal mosaic is local rather than tiled over the whole blade.
- `leafSectionAt` now provides projection matrices, angle and bounded visual weights. Updated tests establish identity at the leaf stop, monotonic pitch, exact coincidence of surface/section seam at left/centre/right for 320 positions, bounded state, continuity and reversibility. All 12 leaf model/lifecycle tests passed. They do not establish biological thickness or photorealism.
- One final `npm run build` passed TypeScript, translation completeness (66 namespaces), image copies (131) and bundling; existing mixed-import and large-chunk advisories remain. No full repository test rerun for this topic-local projection change.
- Packaged port 4175: inspected leaf stop, scale 0.65, tissue stop and cell navigation at age 0.8514. Returning 0.65 → 1 → 2 → 0.65 reproduced camera `56.023500,-8.619000,3.426893`, angle `0.818115`, age `0.8514`. Chinese yellow and English red pathways were visually checked at 390 × 844, both document/scroll widths 390/390; captured console errors were empty.
- Scoped `git diff --check` passed. Preview updated locally; no commit, push or deployment. Earlier evidence below refers to superseded cutaway designs.

## Follow-up: flatter material and anchored section

- Removed broad repeated vein ridge strokes and the central shading discontinuity. Kept the contour, fine veins, pigment mottling and branch attachment.
- Replaced the first expanding oval/rim with a fixed irregular section and downward reveal. The surrounding blade remains fully visible until the tissue is exposed; it fades only on the subsequent cell approach. Deeper compartment masks and scientific models are unchanged.
- All 12 leaf model/lifecycle tests passed, including a new bounded, monotonic, continuous and reversible `leafSectionAt` test. `npm run build` passed (66 English namespaces); existing bundle-size/mixed-import advisories remain.
- Packaged port 4175: inspected scale 0, 0.55 and 1 at the user's age 0.8514. Moving 0.55 → 2 → 0.55 reproduced the exact DOM camera coordinates and kept age 0.8514. Inspected Chinese whole-leaf and English scale 0.8 at 390 × 844; both document/scroll widths were 390. Captured browser errors: none.
- Scoped `git diff --check` passed. Local preview updated; no commit, push or remote deployment. This evidence covers the changed first cutaway, not a fresh audit of every deeper cellular animation.

## Earlier blade refinement in the same day

Scoped visual refinement of `scene.ts`: finer asymmetric blade contour, curved secondary/cross-veins, tapered midrib/petiole, fixed grain and subtle surface relief. Cached geometry remains in the existing blade coordinate system; lifecycle, pigment, microscopy and water models were not changed.

- All 11 leaf model/lifecycle tests passed with `node --import tsx --test topics/leaf-colors/tests/model.test.mjs topics/leaf-colors/tests/lifecycle.test.ts`.
- `npm run build` passed strict TypeScript, translation completeness (66 English namespaces), image checks and production bundling. Existing large-chunk and microbes mixed-import advisories remain.
- Actual browser inspection: mature green blade on the development server; packaged port 4175 yellow and red-capable pathways at age 0.7; hotspot entry into tissue and cell with age still 0.7000.
- Packaged 390 × 844 checks: English mature blade and Chinese detached/brown blade retained their outline, vein detail and petiole. Both reported document width/scroll width 390/390. No browser console errors were captured during the check.
- `git diff --check` passed for the three touched topic files. No broad test suite was rerun for this renderer-only change. No commit, push or deployment.

## Earlier validation — 2026-09-12

The scale slider now moves one camera through fixed, nested cutaways: leaf, leaf tissue, one mesophyll cell, and its chloroplast (or the vacuole for the red-pigment route). Intermediate positions are retained and reversible. Scale intervals are compressed for teaching, rather than representing calibrated microscope magnification.

The leaf cell nucleus now contains its nucleolus and chromatin within the nuclear envelope; overlapping chloroplast geometry was removed. The cells topic received the corresponding nucleus illustration refinement. Reference: [NCBI Bookshelf — Internal Organization of the Nucleus](https://www.ncbi.nlm.nih.gov/books/NBK9915/).

Validation:

- Seven leaf model tests passed, including camera continuity at boundaries, increasing magnification, rotated entry geometry, and exact return to a previous position.
- Production build passed; `git diff --check` passed. Build retains the existing chunk-size advisory.
- Packaged preview on port 4173 was checked through the actual browser controls in Chinese and English.
- Slider values 999, 1000, and 1001 produced continuous camera coordinates. Returning from 2500 to 1500 reproduced the earlier camera coordinates exactly.
- English mobile preview at 390 px had document width 390 px. Cell labels and slider remained readable; the red route ended inside the vacuole with the correct pigment explanation.
- Cells preview: revised nucleus visually checked; selecting bacteria while viewing the nucleus correctly displayed that this structure is absent.

No commit, push, or remote deployment was performed.

## Progressive cutaway refinement

Removed the always-visible rectangular tissue inset. Each fixed child is now revealed by an expanding clip only as its camera interval is entered. The leaf cutaway has an organic contour without a card border; reversal closes the same mask. No cell-division animation is implied.

Production build (typecheck and all 50 English namespaces included) passed. Packaged browser screenshots checked the intact leaf at scale 0, tissue reveal at 0.653, the same mesophyll cell at 1.505, and chloroplast interior at 3. Existing camera model is unchanged. `git diff --check` passed.

## Connected illustration and learning modes — refinement batch 1

The leaf and background now use topic-owned illustration rather than photographic assets. A deterministic shared-edge cell mosaic becomes visible on the surface; a selected sample turns to expose the tissue section before entering the existing mesophyll cell. Surface geometry is illustrative rather than species-specific. Epidermal texture is cached by pigment state. Reference: OpenStax Biology 30.4, Leaves (https://openstax.org/books/biology/pages/30-4-leaves).

Children receive short scene-specific stories and one observation prompt; three or fewer labels are shown, while the same anatomy remains present. Academic view exposes pigment trends, structure labels, mechanisms, assumptions and longer reading. Changing mode preserves position, season and route. Mobile observation content is placed immediately after the scene.

Focused model validation: 15 tests passed across leaf colors, magnets and buoyancy. Production build includes strict TypeScript and complete bilingual coverage. Packaged desktop inspection covered surface, turning sample and cell; English 390 px leaf checks covered both modes with document width 390 px and preserved scale 2000. Magnets and buoyancy mode switching preserved attached-object and clay-boat state.
