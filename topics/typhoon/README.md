# 台风是怎样形成的 / How typhoons form

可旋转的三维教学云系：先看成熟结构，再观察持续活动的云和空气，或从暖海面重新看形成过程。儿童版用部位与变化解释，学术版补充热力、旋转、梯度风平衡及适用条件。双语解说稿独立保存在 `learning.json`。

A rotatable teaching cloud volume starts at a mature structure. Observe continuing transport, replay formation, or compare a clear eye, convection without a developed clear eye, and eyewall replacement. Child narration and academic notes are bilingual.

## Interaction

- Default: fully organized, paused, favorable conditions. Drag to rotate; overhead, oblique and side presets move smoothly. All explanatory labels stay outside the eye.
- Formation uses one advected cloud field with local convective renewal and evaporation. Early clouds move and stretch while new clouds form; no whole initial/mature image cross-fade is used. Only adjacent integration frames are interpolated for smooth scrubbing.
- Formation and circulation have separate clocks. Formation reaches its endpoint and remains there while cloud texture and illustrative air tracers continue moving. Pause/resume preserves both clocks; observation never automatically resets.
- Volume clouds, airflow tracers and a cutaway use the same cloud body. The cutaway exposes inflow, convective ascent, upper outflow and eye subsidence. The latter fades before the sea surface to represent a low-level inversion rather than a full-depth pipe.
- Replacement: the outer ring forms around the original eye, a relatively cloud-poor moat appears, the inner wall weakens, and the outer wall contracts. Both tracer routes and section guides follow the changing wall radii and strengths. Pause/resume also preserves replacement progress.
- The no-clear-eye scene keeps central convection and distributed ascent. It does not secretly retain a finished eye. An existing eye obscured by high cloud is explained separately.
- Temperature, shear and hemisphere affect a qualitative organization factor. Unfavorable settings suppress the organized eye; this is a comparison of conditions, not a prediction of how an existing real cyclone will immediately respond.

## Scope and scientific limits

Height, cloud spacing, transport speed and the 34-second replacement sequence are exaggerated for legibility. The volume is procedurally generated, not a satellite observation, weather reconstruction or numerical forecast. Model time is not elapsed meteorological time. It assumes an initial disturbance and sufficient moisture, and omits ocean depth, land, environmental evolution and explicit momentum or moisture budgets. No wind speed, intensity or development probability is computed.

A quasi-steady shape does not mean still air or an indefinitely unchanging storm. Not all mature tropical cyclones have a clear eye; not all strong storms undergo replacement. Replacement mechanisms vary, and intensity does not necessarily follow a fixed weakening-then-strengthening cycle. Top-level subsidence and an eye's relatively weak surface winds do not imply a vacuum or an entirely cloudless column.

Aircraft observations and cloud-resolving experiments support evolving convection interacting with a larger rotating circulation. They do not support treating the original clouds as permanent objects, nor a universal two-stage timetable. This illustration transports and renews cloud density continuously, but its winds, source regions and local eye clearing are prescribed; continuity is not evidence of a validated weather simulation.

## Ownership and lifecycle

- `model.ts`: condition relationships, formation/circulation clocks, continuous illustrative parcel routes.
- `cloudField.ts`: deterministic cloud relief and inner/outer wall geometry; local to this topic.
- `evolution.ts`: bounded, seeded advection/source/sink integration and a per-scene temporal cache (112² cells × 121 RGBA8 frames, about 5.8 MiB). Prescribed convergence regions and circulation illustrate organization; they do not solve meteorological feedbacks.
- `scene.ts`: Three.js volume ray marching, ocean context, cloud/structure transitions, camera, tracers and section guides. Field/grain textures are generated in memory. No image or remote renderer dependency.
- `main.ts`: controls, explanatory state, playback, reduced-motion and page lifecycle.
- `content.ts`, `science.ts`, `learning.json`, `locales/en.json`: child explanations, qualified academic content, spoken scripts and translations.

Formation history is cached deterministically for reversible scrubbing; cache and GPU texture lifetimes belong to the scene. Nothing plays automatically. Hidden pages stop the observation clock; finite transitions finish or cancel through the shared transition helper. Reduced motion disables automatic animation from presets/actions; deliberate play remains available. Disposal releases camera controls, observers, geometry, materials and textures.

## Primary sources

- [NASA · Hurricane structure and development](https://science.nasa.gov/earth/natural-disasters/hurricanes-typhoons/hurricanes-the-greatest-storms-on-earth/)
- [NOAA NESDIS · Cloud imagery and hidden eyes](https://www.nesdis.noaa.gov/news/guide-understanding-satellite-images-of-hurricanes)
- [NOAA AOML · Eye, eyewall and spiral bands](https://www.aoml.noaa.gov/hrd/tcfaq/A11old.html?print=yes)
- [NOAA AOML · Inner-core circulation, including steady-state storms](https://www.aoml.noaa.gov/hrd/projects/30/)
- [NOAA AOML · How eyewall replacement cycles start](https://www.aoml.noaa.gov/hurricane_blog/paper-on-how-eyewall-replacement-cycles-start-published-in-the-journal-of-the-atmospheric-sciences/)
- [NOAA AOML · Variation in replacement cycles](https://www.aoml.noaa.gov/hurricane_blog/paper-on-the-unusual-eyewall-replacement-cycles-in-hurricane-irma-released-online-in-monthly-weather-review/)

- [Bell & Montgomery · Aircraft observations of Karl genesis](https://repository.library.noaa.gov/view/noaa/48350)
- [Kilroy · Convective evolution during genesis](https://rmets.onlinelibrary.wiley.com/doi/10.1002/qj.4011)

## Validation

`node --import tsx --test topics/typhoon/tests/model.test.mjs` covers continuous transport, hemisphere orientation, conditions, mature hold, pause, double-wall geometry, eye/moat distinction seeded cloud fields, actual cloud-patch transport, repeatable backward scrubbing and continuity between integration frames. Tests validate teaching contracts, not empirical calibration. Run the type and bilingual checks, then inspect the actual WebGL page: all three structures and views, sustained maturity, pause/resume, adverse conditions, both languages and narrow screens. Ray-marched appearance requires browser inspection; passing numeric tests alone is not visual proof.
