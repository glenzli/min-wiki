# Atmosphere visual refinement — 2026-09-21

Scope: topic-local illustrated layer column, paired planetary columns, bilingual explanatory text and retained parcel experiment. Existing dirty topic files were reviewed and accepted through Dev Mesh; unrelated work was not included.

- `node --import tsx --test topics/atmosphere/tests/model.test.mjs`: 4 passed. Standard profile, mapping, wet/dry and advection contrasts, route sanitation.
- `npm run build -- --outDir /tmp/mini-wiki-atmosphere-20260921`: passed typecheck, localization, image delivery and Vite packaging. Existing unrelated mixed-import / large-chunk warnings remain. This was a focused topic refinement; the full repository test suite was not run.
- Actual in-app browser: Chinese desktop layer art and Earth/Venus comparison, Chinese and English 390 px Earth/Titan comparison, Mars selection. Narrow document and viewport both measured 390 px. Paired rows remain aligned with wrapped English captions.
- Actual interactions: direct layer selection updates height; labels and reading mode preserve 25 km; parcel at 3 km stays cloudless with 10% initial humidity and produces cloud droplets with 90%; moving progress backward to 50%, switching chapters and returning preserves that 50% state.
- Production output served at `http://127.0.0.1:4174/`: paired Chinese Earth/Venus entry, direct troposphere selection, rare-cloud illustrations and readings visually inspected. Captured browser error logs were empty.
- Artwork is a static explanatory column; start/pause controls move the observation height or retained parcel experiment, not simulated global winds. Layer thickness and cross-world row heights are not quantitative comparisons. No weather forecast or rainfall microphysics was added.

Local edits only. No commit, push or deployment. The older 4173 preview remains separate; 4174 serves this validated artifact, while 5173 is the working-source development server.

## Follow-up: meteors, auroral energy and nearly airless worlds

- Replaced constant-width meteor strokes with a tapered, fading wake and small emission head. Fine translucent auroral rays replace rounded tubes; a three-panel sequence distinguishes incident charged particles, atmospheric excitation and emitted light.
- Added Moon and Mercury routes and comparison columns. Both use null quantitative pressure/temperature fields with explicit near-vacuum and day/shade descriptions, not zero pressure or fabricated single air temperatures. Their columns do not apply Earth's layer scheme or draw weather clouds.
- Typecheck, localization and the five topic model tests passed, including new route and null-reading contracts for the nearly airless choices.
- Production build regenerated at the same private output directory; all build gates passed. No full repository test suite was needed for these topic-local changes.
- Actual browser visual checks: Chinese desktop meteor/aurora and Earth/Moon; English 390 px meteor, energy sequence and Earth/Mercury. Narrow width/scrollWidth both 390; matched column rows retained alignment and footer client/scroll heights both 94 px. No captured browser errors.
- Updated production preview on 4174 recognizes the six world choices and opens the Moon comparison. No commit, push or deployment.

## Follow-up: one continuous Earth-to-space journey

- Replaced the separate layer/parcel chapters with a shared globe, fixed surface anchor and continuous external camera approach/ascent. The standalone humidity/lift experiment is removed; weather, ozone, meteors and auroral illustrations occupy fixed reference heights. These remain enlarged teaching illustrations, not simultaneous weather or a spacecraft simulation.
- Removed Earth from the right-hand comparison choices. Legacy `view=motion`, `height`, and `world=earth` links migrate to a valid journey and another comparison world. Updated bilingual narration, learning material, catalog summary and source ownership documentation.
- Five model tests plus affected journey/catalog/learning contracts: 82 tests passed. Coverage includes 1,001 camera positions, coordinate continuity, height mapping, route migration and near-vacuum null readings.
- Latest production build passed TypeScript, localization, image delivery and Vite packaging (2.32 s); existing unrelated chunk warnings remain. Full repository tests were not rerun.
- Actual production browser checks on 4174: whole globe, intermediate approach, surface, 25 km stratosphere and 850 km exosphere. Corrected crowded high-altitude labels. Chinese and English 390 px controls and tropospheric cloud/rain scene visually inspected; English Earth/Moon comparison inspected. Document width and scrollWidth both 390 px.
- Playback advances, pause and reverse scrubbing work; 50% progress survives switching to comparison and back. Reading mode and label toggles preserve the selected journey. English switching retains the selected 3 km stop. Legacy parcel link opens the unified journey. Comparison selector contains five non-Earth worlds. Captured browser error log is empty.
- Local edits and refreshed private preview only. No commit, push or deployment.

## Follow-up: readable ascent and guided stops

- Added a fixed five-band orientation rail with a moving marker, explicit non-metric spacing qualification, gold surface-to-observer line and bilingual relative-height clues. Camera framing moves the retained ground farther downward during ascent. Surface and layer stops hold for three seconds during playback; manual seeking remains immediate.
- Six focused model tests passed, including monotonic rail positions, continuous camera containment, and no skipped/repeated automatic stops. Production build passed all existing gates (latest Vite 2.38 s).
- Actual 4174 browser: desktop middle atmosphere and mobile Chinese/English stratosphere inspected. Playback caught 25 km, displayed the hold message, then continued beyond 50 km. English narrow rail widened to avoid split layer names; verified after rebuild. Width/scrollWidth both 390 px; no captured console errors. Comparison chapter hides the rail. Restored desktop Chinese preview at 25 km.
- Local edits only; no commit, push or deployment.

## Follow-up: globe terrain and cloud artwork

- Refined deterministic globe coastlines, shelf/ocean colors, clipped terrain variations, ridge chains and islands. Global cloud fronts and diffuse spiral banks replace repeated local cloud sprites. The small globe locator shares the same cached artwork. Surface anchor and radial geometry are unchanged.
- Build passed TypeScript, localization, image delivery and Vite packaging. Existing model evidence reused: no model, route or playback changes. No new tests mirroring drawing instructions.
- Actual 5173 browser: desktop globe and intermediate approach, 390 px full globe and near-ground locator visually checked. No captured browser errors. Viewport restored. Cached detail remains illustrative and fades at close range; no measured cloud/geographic data implied.
- Local edits only. No commit, push or deployment.
