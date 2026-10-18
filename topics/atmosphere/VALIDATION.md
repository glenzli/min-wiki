# Atmosphere visual refinement — 2026-09-21

## Height guide refinement · 2026-10-19

Scope: CSS presentation only. A faint right-side spine, short layer ticks, heavier current-layer label and outlined moving dot replace full-width row rules, row fills and the solid triangle. Rail width, height mapping, expanded-band qualification, labels, camera and scientific mechanisms are unchanged. CSS SHA-256: `d2256e6d20d078c6a4f308f6e3b12aef5b26dfcba0b84d2aa4d45ffbb12f6360`.

- Actual Reader preview `127.0.0.1:64494`: Chinese 1280 × 720 at the 3 km troposphere stop; English 390 × 844 at 300 km in light and dark appearances. Spine/ticks/dot stay neutral, layer names fit, and mobile width/scrollWidth both measured 390 px. All five band labels had matching client/scroll widths of 92 px. The 3 km view and Chinese/desktop settings were restored; screenshots are in `/private/tmp/wiki-storm-art-20261019/`.
- Final shared Reader build passed TypeScript, 6,903 source messages / 72 namespaces, 150 image copies, authored-entry projections, editorial review and 71 routes. Source digest `a51958fa6451aebb3a756853933484963ef9c59517b99ef299d89434f483a2d7`. Existing model/projection evidence below is reused because those inputs did not change; no new numerical or drawing-mirror tests were needed for this CSS change.
- Contribution `atmosphere-height-guide-css-20261019` was reviewed and integrated into the root task. No editorial promotion, push or deployment.

Scope: topic-local illustrated layer column, paired planetary columns, bilingual explanatory text and retained parcel experiment. Existing dirty topic files were reviewed and accepted through Dev Mesh; unrelated work was not included.

## Neutral display palette — 2026-10-19

- Base: `fbfd8feb0fc981a88229cbc62231a21f7d176a39`. Only topic CSS and presentation/validation documentation changed. Final `style.css` SHA-256: `1cbea9d3e62fab23c98fa9cc12def828318db6d591412279daa0f09ea8f04917`. Scientific geometry, shaders, models, clocks, routes and content are unchanged; the preceding 12 focused model/projection tests are reused for those unchanged inputs.
- Height navigation, captions and enrichment-card text now inherit Reader's neutral theme. Current height remains identifiable by an inset rule, heavier text and pointer; separate blue/green/purple layer fills are removed. Scene subtitles use local charcoal control tokens. Paired-world selections use a neutral outline and titles while their scientific artwork retains its colors.
- Final `WIKI_READER_ROOT=/Users/g4i/lab/wiki-reader npm run build` passed typecheck, localization, images, entry projections, review status and 71-route packaging; digest `78abab64f6adf5ebe89d168eefe32bf4edc4996b74432f77aa2db45bc5189745`. `git diff --check` passed.
- Actual local Reader browser: light overview/coast, all five current-height bands, dark 300 km and Earth/Venus comparison inspected at the user's normal 1152 × 1106 viewport. The selected band follows each stop; comparison and return retain the selected journey. Actual shared subtitle controls resolve to neutral dark fills rather than white cards, including selected state.
- Actual 390 × 844 Chinese light and English dark views inspected, including the English subtitle's numbered steps, play button and journey transport. Both document widths/scroll widths are 390 px. Navigation/selected-text color pairs measured from resolved CSS give contrast ratios 4.74/16.01 in light appearance and 6.97/12.93 in dark appearance; subtitle button text is 13.21 (selected 9.45). The top caption was strengthened to Reader's main text color. These are sampled UI pairs, not a complete accessibility audit of every diagram pixel.
- Browser warnings/errors were empty. Viewport, Chinese language, light theme and the original whole-Earth/Venus route were restored. Screenshots: `/private/tmp/wiki-atmo-palette-20261019/`. Local preview only; no push or deployment, no Reader source change, no repeat of unrelated repository tests.

## Surface depth and volume clouds — 2026-10-19

Scope: the Earth journey's topic-owned Three.js globe/coast, bounded relief, density clouds and Canvas composition/fallback. Globe and coast share the same licensed map and geographic basis. The renderer adds a continuous 0–1.2° view pitch; scientific reference heights, journey mapping, comparison data, routes and narration clocks are unchanged. Relief, cloud density and lighting are authored teaching materials rather than measured terrain or weather.

- Base: `6f5efe342a508daa2a14582fe4064370d7901949`. Runtime SHA-256: `scene.ts` `56f71879b3fdcb72548299fdc6c15e0d82058b0012bc05249508f8208d13a956`; `surfaceModel.ts` `cdf6ce039b7156d8edcae3e683dfc5b839e32ec5743e6b2fbd3f9439e2e065ae`; `surfaceScene.ts` `1310309d187e28d2cecaae72c2d18c50a0241b43c28f6f20aaaaa43d5b6b9b5a`; `cloudVolume.ts` `d159514316d9595ad1a112ddce4fd1bffb25ce915c6b1f181c6be106b6c0ab00`.
- Typecheck and the three topic test files passed: 12 tests covering the existing atmosphere/routes/particle contracts plus agreement between the actual Three camera and Canvas marker projection across 201 journey positions and three viewports, continuous bounded pitch, one map reference and bounded deterministic relief. These establish geometry and implementation contracts, not terrain or weather calibration.
- `WIKI_READER_ROOT=/Users/g4i/lab/wiki-reader npm run build` passed typecheck, 6,900 localized messages / 72 English namespaces, 147 image copies, entry projections, editorial status and packaging. Built 71 entry routes, source digest `906cd6964cba4c2aca39b7e470c2398f5cf973010ad7d04099daef294720b967`. Reader source/dependency pins were not changed.
- Actual managed Reader preview on `127.0.0.1:64494`: whole Earth, journey .09/.16/.22, coast and all five representative layer stops visually inspected at 1440 × 1000. Sea/land identity persists; the near surface reveals shaded relief and sea glints, and cloud billows have lit edges and cooler interiors. Reverse seeking to .16 and returning to the coast were also inspected at the normal 1280 × 720 viewport. Camera playback advanced from .09 through the coastal approach, then paused successfully.
- Actual 390 × 844 Chinese and English coastal views inspected, with WebGL active and document/client widths both 390 px. Language switching retained the 3 km journey. Temporary viewport overrides were reset. Captured browser warning/error logs were empty. Screenshots: `/private/tmp/wiki-atmo-depth-20261019/`.
- Resource limits: coastal mesh 257 × 321 vertices, three 72 × 52 × 40 single-channel density textures, at most 56 primary integration samples, GPU DPR capped at 1.5. Renderer cache follows journey/viewport/cloud-opacity changes and adds no timer. Cleanup and Canvas/context fallback were inspected in source; actual context-loss recovery and physical-device GPU performance were not exercised.
- Local preview and local source work only; no push or deployment. The full repository test suite and unrelated comparison artwork checks were not repeated for this topic-owned surface change.

## Artwork refinement — 2026-10-19

Scope: retained Canvas cloud/coast/sky materials, ozone-energy marks, meteor wake and auroral curtains; static comparison artwork and its image hit regions. The reference atmosphere, radial coordinates, camera mapping, routes, narration clocks and world data are unchanged. The authored coast has smaller smooth bays around the same ground anchor; it remains illustrative terrain.

- Base: `deca4f57541051f6672daa9af3165fa8bd50a26c`. Final runtime source SHA-256: `scene.ts` `f9dd96703090499eaba70c4ace869ad5d5430444be1846e5f18005cd6ee2bc80`; `profileView.ts` `42176074a489de11c8266fed670f876f78124e98b4a2ed639fcca67f93615ce3`; `style.css` `36eb8da03dfaf2ed1a3f4a36089685812a74b7e8b69d741bace936bfa91073e6`.
- `node --import tsx --test topics/atmosphere/tests/model.test.mjs topics/atmosphere/tests/exosphere.test.mjs`: 8 passed, including camera/site continuity, legacy routes and the projected retained-particle endpoint. These protect existing scientific/interaction contracts; they do not establish visual quality.
- `WIKI_READER_ROOT=/Users/g4i/lab/wiki-reader npm run build`: typecheck, 6,900 source messages / 72 English namespaces, 147 image copies, entry projections, editorial status and Reader packaging passed. Output: `dist/`, 71 entry routes, source digest prefix `406974cc55e5`. Local Reader `c4c5a17` was used; no unpublished dependency pin or Reader source change was made.
- Actual Reader preview `http://127.0.0.1:64494/encyclopedia/`: Chinese desktop whole Earth, approach intermediates (journey .10 and .13), surface and all five layer stops inspected, with selected condensation, absorption, meteor-emission, auroral-emission and retained/escape states. Intermediate zoom exposed a rectangular coast-material patch; it was corrected with world-space periodic material and re-inspected. Map-ready approach no longer overlays the coarse fallback coastline.
- Chinese 1440 × 1000: fine auroral ends, one bright meteor head, ozone absorption marks and near-cloud materials inspected. All five comparison targets selected; each kept 8 paired rows, unique paint IDs, no overflowing title region and document/scroll widths of 1440 px. Clicking a Mercury surface row updated both selected outlines and the paired explanation in the opened inspector.
- Actual 390 × 844 Chinese thermosphere and English cloud/transport views inspected; English Venus/Moon comparison and lunar surface inspected. Width and scrollWidth were 390 px. Comparison rows initially inherited white control backgrounds; adding `data-scene-hit-target` restored transparent/selected row fills, 0 px padding/radius and readable scene colors. The 24 authored SVG variants were also rendered in a focused contact-sheet check.
- Language and world/layer view changes retained the camera journey. Journey playback advanced and paused; reverse seeking and return to the same stop worked. The dark appearance retained readable scene/control contrast. No captured browser warnings/errors. Evidence screenshots: `/private/tmp/wiki-atmosphere-polish-20261019/`.
- Local preview only. No push, deployment, new weather model or measured terrain data. The full repository test suite, physical devices and all OS/browser combinations were not rerun for this topic-local drawing change.

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
