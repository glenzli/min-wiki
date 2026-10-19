# Material and spatial study — 2026-10-19

Scope: the buoyancy presentation, its bilingual qualification and source ownership. The settled-state model, inputs and editorial status are unchanged. Starting revision: `c7f96eb572fda40c5029dc2a73d32503d68cf8f6`.

- Six focused buoyancy model tests passed during this work. Their inputs remain unchanged: floating/sinking balance, fixed clay mass, cargo flooding, saltwater, taut-cord immersion and the four-block narrow/wide comparison.
- `WIKI_READER_ROOT=/Users/g4i/lab/wiki-reader npm run build` passed: strict TypeScript, 6,920 localized source messages, image delivery, authored-entry projections, editorial consistency and the packaged Reader build. After the final lighting-only refinement, `npm run reader:build` passed again: 71 entries, build identity `369557517f46`.
- Browser inspection used the actual local Reader at port 64494: Chinese desktop, Chinese/English 390px layouts, a dark reading shell, sample changes and finite clay reshaping. The scene reports `data-renderer="webgl"`; narrow layouts have no horizontal document overflow. Wood/end grain, a rounded hollow rim, visible cargo, matching vessel perspective, glass base/edge detail, linear comparison graduations and restrained shadows were visually reviewed. Explanation prose has one inset and no enclosing duplicate rounded border; four sample buttons fit one mobile row.
- In-browser force values: four cargo blocks in a 900 mL hull give `5.4936 + 4.3164 = 9.81 N` (water + floor = weight); at 1800 mL, buoyancy and weight both equal `9.81 N`. A 1000 mL hull floods in fresh water and floats with the same cargo in seawater. For the suspended block in seawater, immersion 0/50/100/150% gives buoyancy 0/5.027625/10.05525/10.05525 N; tension supplies the remainder of 11.772 N. No zero-volume buoyancy arrow is drawn.
- Materials and projection do not supply physics. Rim and waterline markers use the displayed geometry; numerical results still come from `model.ts`. The comparison vessel does not remove water from the tank. The new English qualification matches the Chinese statement that dimensions are illustrative and volume is read from the displayed numbers.
- Lifecycle source review: one finite animation clock; shared bounded textures; at most 12 cargo meshes; replaced water geometry disposed; context loss selects the SVG view; resize observer, textures, geometry, environment and renderer released on exit. GPU-loss injection and performance benchmarks were not performed.
- Evidence is saved locally in `/private/tmp/wiki-buoyancy-art-20261019/`: `final-desktop-wood.png`, `final-desktop-boat.png`, `final-mobile-chinese-wood.png`, `mobile-english-wide-boat.png`, `mobile-english-depth-dark.png` and `force-evidence.json`. The final desktop captures include the last lighting changes. Earlier captures document the same geometry and model with the preceding lighting.
- Final runtime SHA-256: `scene.ts` = `df0ac514e0ff22180b19c6984682d2de766775a17df872e539e9bf522dbea366`; `tankScene.ts` = `4ecfa53d7d8a20720bad6f2f94e584bf1892542fd8a2ee08075d16ad92381730`; `style.css` = `d27054a41a35fe09e3070afd4d64a224577e72719e44918f7eb806a3b2001126`.
- Local commit requested with actual current time. No push or deployment; Wiki Reader itself has no changes in this pass.

# Preschool topics validation — 2026-09-12

23 new independent topics integrated; existing work retained. Scope source SHA-256: `a8a031f20057af127f383b1b6bd56c5c763fa116ae027b65bd3f79c78aa78373` (224 files; this report excluded).

- `npm run check`: passed. 123 tests, 0 failures; strict TypeScript; 4,113 source messages in 43 English namespaces; production build completed.
- Log: `/tmp/mini-wiki-preschool-final-check.log`.
- Browser validation: each of the 23 new topics exercised in Chinese and English. Main controls and 390px layouts checked; no horizontal document overflow. Visual review included enlarged mobile diagram labels, organism stages, magnetic poles, water states, force arrows, dry boat interiors, saltwater response and particles following the actual water path.
- Buoyancy: wood force balance; sinking objects retain buoyancy; fixed clay mass and variable hull capacity; cargo flooding; zero-immersion arrow; full immersion versus extra depth; freshwater 9.81 N and seawater 10.06 N for 1,000 mL.
- Water partition: nonnegative conserved totals across 303 rainfall/surface combinations.
- Packaged preview at `http://127.0.0.1:5192/`: catalog shows 42 total topics; load-more reveals all entries. Buoyancy direct entry and clay ball/boat transition exercised with no browser error logs.
- Local changes only. No commit, push or external deployment performed by this task.

New topics: buoyancy, shadows, water-states, magnets, sound-vibrations, friction, butterfly-life, frog-life, ant-trails, fish-gills, duck-feet, camouflage, seed-sprouting, seed-travel, plant-water, flower-fruit, cactus-water, rain-cycle, river-paths, sand-journey, ground-water, sun-star, meteors.
