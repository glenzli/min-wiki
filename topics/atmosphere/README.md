# 大气：包围星球的空气 / Atmospheres

Two views: a continuous Earth-to-space journey and Earth beside one of five other worlds. The separate parcel experiment has been removed. The scene begins still; users can play, pause, scrub or directly select a stop. No sound starts automatically.

## Learning design

- Question: how does the atmosphere surround the globe, and which phenomena belong to different heights?
- Variable: camera journey / reference observation height, then comparison world. Same Earth and surface anchor persist.
- Observation: the whole globe grows into a curved local horizon; cloud/weather, ozone, meteor and aurora examples occupy fixed radial coordinates, and the observation point moves outward while the ground marker remains below.
- Mechanisms: lower air movement and conditional rain, UV absorption, meteor emission, and charged-particle excitation followed by auroral light; not one causal sequence in which one phenomenon turns into the next.
- Misconceptions: atmospheric layers are not rigid shells; observer motion is not a spacecraft trajectory; illustrated phenomena need not occur simultaneously; near vacuum is not literally zero particles.
- Bounds: spherical reference Earth, standard lower-air readings and teaching geometry. Sources remain in `learning.json`.

## Owners and routes

- `model.ts`: standard lower-air profile, fixed 6371 km Earth reference radius, continuous overview/approach/ascent camera mapping, radial feature positions, route sanitation and representative planetary data.
- `scene.ts`: one retained Canvas globe, Earth-map far view, illustrative local coast, ground anchor and feature population; deterministic rendering and resize disposal. This orthographic external observation is not a first-person descent. The local shore is not surveyed terrain.
- `layerMechanism.ts`: one topic-owned, pausable three-step narration clock per selected Earth layer. It sends the current step and progress to the retained scene and owns only the subtitle, controls, hidden-page pause and disposal.
- `profileView.ts`: paired SVG/DOM planetary columns, selected-row explanations, and rare-cloud/aurora context. Earth is always the left reference and cannot be selected on the right.
- `main.ts`: view/journey/reading-mode state, user-started finite camera playback, hidden-page suspension and bfcache restoration. Selecting a stop moves the camera immediately, including under reduced-motion preferences; the three-step narration advances inside the same camera view.
- `content.json`, `learning.json`, `locales/en.json`: bilingual observations, explanations, scientific bounds and sources.

Canonical parameters: `view=layers|worlds`, `journey=0..1`, `world=venus|mars|titan|moon|mercury`. Legacy `view=motion` becomes the unified journey at the prescribed old low-altitude location; legacy `height` enters the matching journey position. Old `world=earth` becomes Venus while keeping Earth as the left reference. Canonical URLs remove obsolete parcel parameters. Language and base paths follow platform contracts.

## Scientific and visual boundaries

The opening approach changes the camera scale while retaining the same sphere and marked coastal region; the outward segment keeps the site and observation marker on the same radius. The distant Earth uses an orthographic projection of the Solar System Scope / INOVE 2k day and cloud maps (CC BY 4.0; see `../solar-system/assets/ATTRIBUTION.md`). The near-site coast dissolves into authored terrain as texture resolution runs out. This preserves the anchor and ocean/land orientation, but the local shoreline is not a survey of Norway. The source maps combine NASA-based imagery, edited colors and plausible fills; their cloud field is static, not live weather. Feature centers and layer boundaries use reference kilometer coordinates. Their drawn clouds, arrows, particles and glow are enlarged teaching marks. A small locator preserves the globe context under close zoom.

Layer reference boundaries are 11/50/85/600 km. The lower profile integrates dry hydrostatic lapse layers through 84.852 geopotential km; UI heights are rounded reference heights, not a site sounding. Above this range temperature and pressure are not extrapolated. The 1000 km journey endpoint is not the atmosphere's physical end. Height progression is logarithmic; boundaries vary in nature.

Earth, Venus, Mars and Titan retain representative surface numbers. Moon and Mercury have extremely tenuous exospheres; quantitative pressure and air-temperature fields are null and the UI gives qualified text instead of zero pressure or fabricated means. Paired columns are qualitative surface-to-space comparisons, not matched-height profiles. Titan and the Moon are satellites. Cross-links to water, wind and the Solar System preserve independent ownership.

## Cover provenance

`cover-v2.jpg` is an AI-generated editorial illustration, not an observed photograph. Generated with the built-in imagegen tool on 2026-09-20; source artifact `exec-29d8b272-a66e-446a-aa96-d8852be4ef97.png`. Converted to JPEG for the existing delivery pipeline; directory cards use responsive 480/960 WebP copies.

Final prompt:
> Use case: scientific-educational. Asset type: premium editorial cover for a bilingual interactive children's encyclopedia topic about atmospheres. Generate a 3:2 landscape illustration with no text. A scientifically inspired view near the Earth's limb: lower third beautiful curved blue ocean and faint land, delicate volumetric white cloud decks lit by warm side sunlight, an extremely thin luminous blue atmospheric rim fading continuously into deep navy-black space. The atmosphere must feel thin and delicate, not five thick neon rings or a glass dome. Fine natural cloud textures and subtle depth, calm polished photographic realism, restrained cyan and soft gold, clean confident composition readable at a small card size. No labels, diagrams, spaceships, astronauts, stars in front of Earth, borders, logos, watermarks. This is an editorial illustration, not a measured or observed image.

## Validation

See `VALIDATION.md` for dated checks. Current model tests cover reference pressure/temperature, camera continuity at the approach/ascent join, permanent surface identity and radial distances, visibility of both markers through the path, route migration and non-Earth comparison choices. These establish implementation contracts, not scientific calibration.

The journey includes a fixed five-band orientation rail (equal expanded bands, not a metric height scale), a surface-to-observer line, and bilingual relative-height clues. Playback holds for three seconds at the surface and nine seconds at each representative layer stop, allowing its three-step narration to finish; seeking remains immediate. The reference coast remains visible while moving downward during ascent.

Selecting an Earth layer begins a captioned process in the same Canvas as the continuous outside-camera journey. Animated marks stay at representative radial locations and crossfade between three steps while the same globe, coast and surface anchor remain fixed. The steps show a qualifying condition or alternate outcome where needed: moist versus drier rising air, radiation absorption, a meteor's possible fates, distinct thermospheric heating and auroral input, and retained versus escaping exospheric particles. Marker sizes, paths and the 2.8-second explanation intervals are teaching geometry and timing, not atmospheric particle or weather simulations. A user can pause or select a step directly; the model limits and source remain available in the subtitle. Reduced-motion preference leaves the first step still until the user acts. Narration disappears in the whole-Earth and planetary-comparison views without replacing the globe or surface anchor.

Planetary comparison rows are selectable in either column and expose both worlds' full paired explanation in the inspector. The aligned rows continue to describe representative phenomena, not equal altitudes or layer thicknesses.

The distant globe projects the existing licensed day and cloud maps into bounded 1280 px Canvas caches; the locator reuses them. The authored 1536 px relief cache and vector shoreline take over during approach, then yield to the fixed local geometry under close zoom. The camera coordinate and surface marker do not jump. The near-coast landforms are authored illustrations, not observed detail; all caches are released with the scene.

## Presentation / 展示

The two views share a viewport-fitted observation workspace with a collapsible explanation panel and reversible immersion. The paired-world illustrations occupy the stage; the Earth-layer process and its live caption stay with the main scene. The inspector retains reference readings and detailed qualifications. World selection, journey coordinates and playback are retained when changing layout. On narrow screens the caption follows the scene at full width and the comparison returns to natural document flow.

16:9 桌面优先显示完整观察区；可收起解说或进入沉浸演示，Esc 返回。布局切换不重置世界、旅程或模型；详情与定量边界仍在解说中。

儿童版在当前全景、地球层或对照世界旁只给短解释。`study.ts` 为各站提供对应的学术版机制、关系式（适用时）、证据入口和模型边界，阅读卡排在观察区下方；全题 `learning.json` 留作可选的综合笔记。切换阅读版不改变旅程、比较世界或图中机制阶段。
