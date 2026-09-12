# Continuous leaf scale validation — 2026-09-12

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
