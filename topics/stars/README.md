# 恒星与多星系统 / Stars and multiple-star systems

The main journey now has six question chapters: nebular light and matter, four representative stellar life branches, temperature/size comparisons, one Sun cutaway with a linked photosphere and atmosphere close-up, companion orbits, and a live Newtonian three-body experiment. The unqualified route still starts at evolution. `chapter=types` is visible again with a hot main-sequence comparison, while the short apparent-distance demonstration retains its `chapter=sun` legacy route. The numerical chapter owns its own initial conditions and bounded recorded history. No iframe is used.

## Ownership

- `model.ts`: validated chapter/query input, observer distance, circular binary and hierarchical triple coordinates. The precise solar observation functions remain owned by `../sun-star/model.ts`.
- `evolutionModel.ts`: four rounded age/radius/fuel anchor paths (low-mass, solar, massive, very massive), continuous interpolation, a monotone nonlinear recognition-view radius, and persistent Mercury/Venus engulfment state. `formationScene.ts` keeps the same cloud parcels, disk, central source and outflow tied to one position as formation advances. `evolutionScene.ts` keeps the mature left outline on its physical ruler, varies the right-hand enlarged star with model radius, and retains a dashed former envelope at the compact-remnant stages. `evolutionContent.json` owns bilingual phase explanations and science sources.
- `anatomyScene.ts` and `anatomyContent.json`: one Sun exterior/cutaway connected to a local photosphere and outer-atmosphere view. Fine, softly contrasted granules are strongest near the visible surface. Sunspots and magnetic loops appear in the magnetic/flare steps; the wind step shows outward flow without keeping that active-region pair on screen. These are mechanism drawings, not measured tracks or sizes.
- `content.json`: bilingual labels, representative stellar properties, schematic layer profiles and qualifications.
- `scene.ts`: Sun-relative linear size comparisons and labeled magnification inset. `orbitSystems.ts` owns three curated star/planet hierarchies; `orbitScene.ts` draws their full-system paths and the separate A-star planet detail for the triple.
- `stellarSurface.ts`: topic-local emissive photosphere drawing shared by comparison, orbit and numerical scenes. Deterministic spherical granulation and limb darkening use bounded canvases keyed by palette, size and active-region state, updated at most 8 Hz; projected dark spots are enabled for the anatomy magnetic/flare steps. There is no random-per-frame texture or directional billiard-ball lighting. Enhanced colors and solar-inspired detail are illustrative, not observed maps of other star types.
- `nebulaModel.ts` / `nebulaContent.json` / `nebulaStudy.ts`: three independent nebular cases, three illumination mechanisms, optically thin shell-path reference, bilingual causes, observations, boundaries and sources. The illumination controls preserve cloud geometry; they are changed teaching conditions, not an instantaneous real nebula transformation.
- `spaceModel.ts`: deterministic, reversible cloud-to-disk-to-envelope fields and separately magnified star/shell/remnant snapshots. These are teaching recognition units, never a second physical ruler or a fluid solver.
- `spaceScene3d.ts`: one retained Three.js world, camera gestures and keyboard controls, emissive star surface, irregular cloud, transparent shells and continuous filament geometry; owns every GPU allocation and disposal. It has no animation loop.
- `spaceViewport.ts`: lazy import, newest-snapshot ownership, bounded retained renderer, Canvas handoff, context-loss fallback and explicit retry. `nebulaScene.ts` is the fixed oblique Canvas fallback using the same case and particle field.
- `main.ts`: controls, user-started animation, finite selection state and page visibility lifetime. The independent surface clock stops and its button is hidden in the nebula chapter; it cannot change the cloud or shell state.
- `learning.json`: three deeper mechanisms and four narration segments per language.
- `threeBody/model.ts`: validated planar point masses, sourced initial conditions, fixed-step velocity-Verlet, diagnostics, resolution stops, and bounded deterministic snapshots.
- `threeBody/runner.ts`: retained finite offline preparation utility, tested but no longer invoked by the page.
- `threeBody/controller.ts`: one user-started live pair, bounded stepping (at most 50 steps per animation frame), pause/review/resume, reset, fallback readings and visibility lifetime. Readouts refresh at 5 Hz, not every render.
- `threeBody/scene.ts`: equal-axis linear coordinates, expanding barycenter-centered framing, stable A/B/C identities and trails ending at the selected frame. CSS-pixel fonts remain legible on narrow screens.
- `threeBody/content.json`: paired scientific text and controls for the numerical experiment.

The old `sun-star` URL redirects to `stars/?chapter=sun`, preserving query language and hash. Solar-system’s high-detail Sun remains independently reachable through a chapter-specific link. Black-hole binary and scale content are linked rather than copied.

The unqualified stars URL begins at evolution. All previous chapter values remain valid. New direct routes use `chapter=nebulae&nebula=nursery|planetary|supernova`, with `light=emission|reflection|dark` for the nursery and `cutaway=1` for opened shells. Evolution links retain `track=low-mass|solar|massive|very-massive` and `evolution=0..1`. The default evolution camera shows 3D recognition geometry; `view=comparison` retains the previous radius/orbit ruler without resetting progress. Surface-mechanism links retain `focus`, and `chapter=types&type=0..4` selects the five representative comparisons. Camera angle is page-local, not a serialized orbit or measurement.

## Evolution and solar activity limits

The 0.2, 1, 15 and 30 M☉ paths are *representative branches*, not thresholds that uniquely decide a remnant. Ages and radii are rounded teaching anchors; movement between them is interpolation, not a stellar-structure, mass-loss or explosion solver. The timeline labels learning stops rather than elapsed physical time; screen playback deliberately gives the phases unequal observing time. Early formation starts in a cold molecular cloud dominated by gas with some dust: a dense core contracts, gas feeds a flattened accretion disk and protostar, some young sources drive bipolar outflows, and sustained core fusion eventually defines the main sequence. Accretion luminosity precedes sustained fusion; high-mass objects can start fusion while still accreting. The same numbered cloud parcels contract and flatten on screen, while disk, outflow, central glow and stellar surface overlap rather than switching at a single frame. These are continuous teaching geometries, not a hydrodynamic calculation or a cloud radius on the later planetary scale. [NASA Webb's star-formation overview](https://science.nasa.gov/mission/webb/science-overview/science-explainers/webbs-star-formation-discoveries/) and [the L1527 protostar observation](https://science.nasa.gov/missions/webb/nasas-webb-catches-fiery-hourglass-as-new-star-forms/) support the sequence and its observational qualifications.

In the comparison view, a Sun-like path reaches an illustrative 180 R☉ envelope: mature-star radius and Mercury/Venus/Earth/Mars mean orbital radii use one linear scale. Mercury and Venus stay engulfed after the envelope is shed. Earth's final fate is not inferred from a fixed orbit circle, because solar mass loss, orbital response and tides are omitted. The right recognition view is nonlinear yet monotone in stellar radius, so the expansion/contraction is clear but its pixels cannot be measured. At compact-remnant stages a dashed outline keeps the former expanded envelope at the left's linear scale; the compact object is an enlarged locator. Diffuse clouds and ejecta also use identification illustrations. NASA's [star-life overview](https://science.nasa.gov/universe/stars/), [red-giant discussion](https://science.nasa.gov/exoplanets/resources/life-and-death/chapter-6/) and [neutron-star size description](https://science.nasa.gov/science-research/nasa-researchers-probe-tangled-magnetospheres-of-merging-neutron-stars/) ground the branch, planet and remnant qualifications.

The birth of a stellar black hole does not itself establish an accretion disk. The final frame shows a dark location symbol without a glowing disk; a luminous disk requires orbiting matter. In some collapses fallback material may make a disk promptly; a companion can also supply material later, while an isolated black hole may have no disk. See NASA's [black-hole anatomy](https://science.nasa.gov/universe/black-holes/anatomy/) and [Swift collapsar explanation](https://assets.science.nasa.gov/content/dam/science/missions/swift-observatory/homepage/Swift%20Launch%20Press%20Kit%20.pdf). A red giant or supergiant stays nearly round in this illustration, with gentle surface and limb variation to suggest an extended, moving atmosphere, not a resolved simulation of a named star; [ESO's Betelgeuse observations](https://www.eso.org/public/news/eso2003/) give context.

The anatomy chapter separates core fusion, radiative/convection transport, visible photosphere, magnetic sunspots, magnetic-reconnection flares and continuing coronal solar wind. The highlighted solar limb segment anchors the separately enlarged surface patch. The cutaway and magnified surface use distinct schematic scales; colored arrows, loops, jets and particles are not a magnetohydrodynamic calculation. Flares do not supply ordinary sustained starlight and are not equated with solar wind. See NASA's [solar layers](https://science.nasa.gov/blogs/the-sun-spot/2023/09/26/layers-of-the-sun/) and [solar storms](https://science.nasa.gov/sun/solar-storms-and-flares/).

In the three-body scene, a crossed trail may show different times at one projected coordinate. Stellar disks are enlarged identity markers; physical stellar radii are absent. A genuine close approach could deflect stars, transfer mass or merge them, but this point-mass experiment stops before its resolution guard and does not calculate a collision outcome. NASA's [stellar-encounter example](https://science.nasa.gov/asset/hubble/too-close-for-comfort/) gives observational context.

## Scientific limits

Physical radius, mass, effective temperature and apparent angular size are different measures. The size chart compares 0.25×, 1×, 50×, 800× and 6× solar diameters (equivalently radii), with a 50× intermediate giant alongside the 800× model. Main disks use the same scale; a labeled, separately enlarged Sun inset is not part of that scale. Those five presets are rounded teaching models, not measurements of named stars or one inevitable evolutionary sequence. The Sun cutaway in the main journey has enlarged/schematic core and layer thicknesses. Colors and granulation are not spectral measurements or interior photographs.

The companion chapter offers three fixed structures. The Kepler-47 case shows two unequal stars and all three confirmed circumbinary planets. A generic wide binary shows a circumprimary planet; its existence and geometry are illustrative, with [Holman and Wiegert's stability analysis](https://arxiv.org/abs/astro-ph/9809315) explaining why binary and planetary orbital conditions matter. The KOI-5-inspired case shows an inner A+B pair, a more distant C, and its observed planet around A; a linked local inset makes the close-in planet visible without stretching the whole-system scale. See [NASA's Kepler-47 report](https://science.nasa.gov/universe/exoplanets/discovery-alert-a-third-planet-in-kepler-47-system/) and [NASA's KOI-5 report](https://science.nasa.gov/universe/exoplanets/discovery-alert-a-forgotten-planet-found-in-a-triple-star-system/). Star center positions use circular barycentric constructions; the triple uses nested inner/outer coordinates with inner separation 1 and outer separation 12, unequal schematic masses, and the appropriate mass-dependent period ratio. Drawn orbit distances are compressed, stellar and planetary disks are identity markers, and the KOI-5 inset uses a second scale. None of these curves fit an observed ephemeris or prove long-term stability; no collision, tidal or mass-transfer outcome is solved.

## 三体数值实验 / Numerical three-body experiment

Direct route: `/topics/stars/?chapter=three-body` (supports `lang=en`). This numerical chapter is visibly separate from the curated star/planet systems. There is no automatic playback. Children choose among three fixed equal-mass starting patterns: figure eight, equilateral rotation and a wandering case begun near the equilateral pattern. Preset changes reset the calculation. Mass, position and velocity sliders are absent from the page. The numerical module retains parameter validation for internal calculations and regression tests. Only the chapter is stored in the URL; experimental time is page-local.

Three point masses obey `a_i = Σ(j≠i) m_j (r_j-r_i)/|r_j-r_i|³`. Units are chosen with `T₀ = sqrt(L₀³/(G M₀))`, hence numerical `G=1`; times are not seconds or years. The physical system is Newtonian, planar and isolated, with no softened potential, collision model, stellar radii, tides, mass transfer, relativity or evolutionary effects.

Initial presets:

- **Figure eight:** equal masses `m=1`, positions A=(-0.97000436,0.24308753), B=-A, C=(0,0); velocities A=B=(-0.466203685,-0.43236573), C=(0.93240737,0.86473146). Values follow [Montgomery’s author page, credited to Simó](https://people.ucsc.edu/~rmont/Nbdy/NbdyC1.html). The [original paper](https://arxiv.org/abs/math/0011268) establishes a special periodic solution, not a universal triple-star path.
- **Equilateral comparison:** equal masses on radius-one vertices at angles 0, 2π/3, 4π/3, tangential speeds `ω=sqrt(1/sqrt(3))`. Summing the two inverse-square accelerations gives radial acceleration `1/sqrt(3)`. This is a Lagrange relative-equilibrium comparison, not a stable-family promise; its subsequent positions are still numerically integrated.
- **Wandering comparison:** the same equal-mass equilateral construction, with C's initial `x` shifted by `+0.03426792833954096 L₀` and its initial `vx` by `−0.0018351049721240997 L₀/T₀`, followed by recentering. These are *project-selected numerical initial conditions*, not published coordinates or an observed stellar system. They were screened for visible nonrepeating motion and an extended resolved interval with this integrator; the selected base and `δx_C=10^-4 L₀` comparison both reach 70 T₀ at `dt=0.001 T₀`, as do independently reintegrated runs at half that step. At 40 T₀ the base/perturbed RMS position difference is about 3.19 L₀, while the base step-halving difference is about 0.0048 L₀. Later coordinates can diverge across step sizes, so this is a finite demonstration, not a long-term stability claim or a rigorous chaos diagnosis. General non-hierarchical triple sensitivity and possible breakup are discussed by [Stone and Leigh (2019)](https://www.nature.com/articles/s41586-019-1833-8); that paper is context, not the source of this particular seed.

The visible presets use fixed equal masses and their published, constructed or screened initial positions and velocities. The second run adds `δx_C=10^-4 L₀` before its own recentering, keeping other conditions identical. The wandering preset turns this overlay on by default; it can still be switched off. Both actual sets of initial conditions are available in the page. Every subsequent sample is integrated, not an offset copied onto another path. The translucent A′/B′/C′ markers identify the same three bodies in that alternative calculation, not stellar shells or six simultaneous stars. These mathematical equal-mass examples are deliberately distinct from the unequal-star KOI-5 teaching scene.

Integration uses [velocity-Verlet](https://fb15.pages.uni-marburg.de/ag-von-domaros/teaching/molecular-dynamics/core_algorithms.html), with `dt=0.001 T₀`, continuous during playback, stored every0.02 T₀ (finite offline preparation still defaults to20 T₀). Before accepting a step, each pair must have `r≥0.04 L₀` and `dt≤0.03 sqrt(r³/(m_i+m_j))`; the minimum separation along the full linear half-kick drift is also checked. A proposed relative energy error above0.001 stops before that step. These conservative guards limit this implementation’s resolution; they do not prove a physical collision or certify every coordinate. There is no adaptive step or silent softening.

Each trajectory has exactly one fixed-capacity `Float64Array` of1001×19 scalars (152,152bytes), plus bounded metadata. A pair uses304,304bytes of snapshot storage. The live pair uses circular snapshot buffers, retaining the latest20 T₀ without resetting bodies, time or original conservation references. Each animation callback admits at most50 fixed steps per run; slow frames slow the demonstration instead of increasing the numerical step or accumulating unbounded work. Preset switches synchronously replace the pair and pause. Leaving the chapter or hiding the page pauses both integration and replay; return preserves state without automatic restart. Disposal releases the pair. No worker, external dependency or long-lived preset cache is introduced.

Only the two runs’ shared saved interval is playable if either stops early. Replay and backtracking read the same immutable snapshots, not backward integration. The frame expands about the fixed barycenter to contain current bodies; equal axes are preserved. Trails retain the latest8 T₀ for the wandering case and3.6 T₀ for the other cases, use continuous dashed paths and fade by age. Optional perturbation bodies are smaller, translucent stellar disks, labelled A′/B′/C′ once visibly separated from the main bodies. All disks are enlarged identification markers, explicitly not physical radii. Readings show model time, both runs’ current/maximum-in-reviewed-window relative energy errors, absolute momentum changes, center-of-mass drift, minimum pair distance, and RMS position difference. Energy normalization is `max(|E₀|,10^-8(K₀+|U₀|))`; momentum has units M₀L₀/T₀. Small conserved-quantity errors are not a proof of orbit accuracy, and finite-time perturbation separation is not a chaos diagnosis.

中文边界：前三章的层级三星仍是示意构造；第四章才直接求解三体牛顿引力。新增游走案例的初值由本项目筛选，不是论文公布的轨道或观测结果；运动没有随机力。采用持续积分、固定步长、无软化的点质量模型；近遇无法解析或能量误差超限时停止，不模拟碰撞。实心与半透明恒星盘对应两次不同初值计算，不是六颗同时存在的恒星，也不是预设轨迹；两者都用渐淡虚线。游走两轮在当前步长和减半步长下均运行到70 T₀，但不能据此声称长期稳定或严格证明混沌。最近20 T₀内回拖同一帧会得到完全相同的数据。数值稳定性与真实三星长期稳定性是不同问题。

The Sun distance experiment retains geometric angular diameter, vacuum d/c light travel and unabsorbed inverse-square irradiance. Crosshairs mark subpixel disks without inflating their physical size. No direct solar observing is encouraged.

## Evidence and verification

Sources: [NASA Sun](https://science.nasa.gov/sun/facts/), [NASA star types](https://science.nasa.gov/universe/stars/types/), [NASA TESS hierarchical triple](https://www.nasa.gov/universe/nasas-tess-spots-record-breaking-stellar-triplets/).

Focused command: `node --import tsx --test topics/stars/tests/*.test.* topics/sun-star/tests/*.test.*`.
Model tests cover symmetric configurations, momentum/center/energy/angular invariants, second-order step convergence, deterministic batching and replay, near-encounter stops, invalid parameters, perturbation/recentering, bounded buffers and async cancellation. The baseline figure eight stays below1e-5 relative energy error over20 T₀ at the default step; this is a tested example, not an accuracy bound for every modified input.

Browser gate: nebular emission/reflection/darkness, full/open planetary and supernova shells, formation at cloud, accretion/disk and fusion handoffs, all three star/planet cases and their phase controls, all three numerical presets, Chinese/English, narrow layout, chapter switching and legacy direct links. Source tests do not prove visual fidelity.

## Presentation and illustrative surface activity

The chapters share a viewport-fitted observation workspace and optional explanation panel. The scene canvas uses the smaller of the horizontal and vertical scale factors, preserving circular stellar disks and equal coordinate axes. Immersion keeps chapter and playback controls; Escape restores the reading layout without resetting the experiment.

Photosphere textures evolve at a bounded 8 Hz on an independent illustration clock, using the shared object-bound granule field, slow coherent deformation, rotating dark regions and limb contrast. The focused anatomy steps retain their active-region selection; the 3D overview uses modest illustrative active-region contrast. Compact remnants use a smoother emissive profile rather than solar granulation. Texture sizes are bounded (256 or 64 pixels), reused per palette/size/active-region state and released with the renderer. Surface playback does not advance orbital phase, integrate Newtonian steps or alter saved snapshots. It can be paused separately, starts off for reduced-motion preferences and pauses when hidden. The speed, features and enhanced colors are not calibrated observations; different stellar surfaces are not claimed to be identical.

恒星表面活动是增强对比的示意，速度与细节未经真实恒星标定；独立于轨道和三体数值时间。隐藏页面、减少动态效果和单独暂停均可停止它。布局改变保留实验条件与历史数据。

阅读版由 `study.ts` 按演化阶段、太阳结构步骤、固定多星案例和三体实验选择。儿童短句贴近画面，学术说明在观察区下方，说明关系式、证据及示意限制；三体的完整初值和误差说明也移到下方。`reading=academic` 保留选择，不改变恒星质量路径、实验初值、动画时间或回放历史。


## This revision's six design questions

1. **Core question:** how do matter source, energy source and birth mass distinguish a cloud, living star, explosion, extended debris and compact remnant?
2. **Variable conditions:** choose nebular mechanism, representative birth mass and reversible phase; rotate/zoom the same 3D case, or switch to the independent linear comparison. Opening a shell changes the observation, not the science state.
3. **Observable result:** one cloud changes from warm emission to scattered blue light to an obscuring silhouette without changing its parcel positions. Cloud-to-disk flattening, polar outflow, envelope expansion, shell ejection and a remaining compact center follow the supplied phase. Low-mass stars do not acquire the solar giant or explosion shell.
4. **Cause:** self-gravity and angular momentum precede the luminous protostar; sustained hydrogen fusion defines main sequence. Later structure and outcome depend on mass and other conditions. Nebular emission, scattering and extinction are separate mechanisms; a late stellar envelope and a supernova remnant are separate matter histories.
5. **Likely misconceptions:** a ring in projection is not necessarily flat; a bright white dwarf need not still fuse; not every star explodes, every neutron star is observed as a pulsar, or every black hole has a disk. A low-mass red-dwarf future is not an already observed population.
6. **Evidence and limits:** spectra, astrometry, expansion across epochs and multiwavelength imaging constrain real objects. The 3D fields are authored geometry, enhanced colors and recognition magnifications. They do not solve stellar structure, gas flow, shocks, radiation transport or a particular object's 3D reconstruction.

## Low-mass future and nebular evidence

The 0.2 M☉ branch uses a trillion-year timescale beyond the current Universe's approximately 13.8-billion-year age. Its last three stops are explicitly theoretical. It becomes hotter and ultimately approaches a helium-rich cooling white dwarf without the Sun-like giant envelope or an imposed bright planetary nebula. The rounded future radii are illustrative anchors, not digitized results from a stellar-evolution calculation. Binary-produced low-mass white dwarfs do not establish that isolated natural pathway. See [Adams & Laughlin (1997), low-mass evolution](https://arxiv.org/html/astro-ph/9701131) and [NASA red dwarfs](https://science.nasa.gov/universe/stars/types/).

The nebula chapter compares an uneven star-forming cloud with different illumination, a planetary-nebula shell with a hot central core, and one shell-like core-collapse remnant with a neutron star. They are independent cases rather than a forced sequence. The faint three-dimensional shell and a small number of curved filaments distinguish the extended debris from the center. Opening the near-side shell applies the same cut to the particle field, shell surface and filaments. Neither the idealized ellipsoid nor its central locator is a measured scale.

- [NASA Hubble: nebula mechanisms](https://science.nasa.gov/mission/hubble/science/universe-uncovered/hubble-nebulae/) supports emission, scattering, extinction and planetary-nebula distinctions.
- [NASA Goddard: remnant classes and limb brightening](https://imagine.gsfc.nasa.gov/science/objects/supernova_remnants.html) supports the optically thin shell interpretation and the distinction from pulsar-wind and composite remnants.
- [NASA Hubble: stellar explosions](https://science.nasa.gov/mission/hubble/science/science-behind-the-discoveries/hubble-stellar-explosions/) distinguishes thermonuclear Type Ia from core collapse. The selected central neutron star is not assigned to every supernova remnant.
- [NASA Hubble: pulsar observations](https://science.nasa.gov/mission/hubble/science/science-behind-the-discoveries/hubble-pulsars/) supports the viewing-beam qualification; the 3D remnant is not given automatic lighthouse beams.
- [ESA Gaia H–R diagram](https://www.esa.int/ESA_Multimedia/Images/2018/04/Gaia_s_Hertzsprung-Russell_diagram) connects temperature, luminosity, giants, main sequence and white dwarfs. The representative 30000 K comparison does not turn color into a mass measurement.

## 3D resource and pacing budget

A topic instance retains at most one lazy WebGL renderer and one existing Canvas fallback. `spaceModel.ts` still owns the same 2800 numbered parcels and continuous cloud/disk/envelope positions. `spaceVolume.ts` splats those supplied positions into one retained 48³ RGBA medium; switching illumination, opening the near side, moving the camera or advancing only surface time does not rebuild that geometry. `src/visuals/nebulaPortrait.ts` owns the common gas emission, illustrative scattering/extinction, fine sheets and bounded 48-step view integral. The topic retains one 32³ repeating detail field, 220 outflow points, 360 distant background points, one shared 56×32 sphere, and 26 fixed short filament paths of 30 line segments each. The line paths are faint supplementary cues only in the supernova case; the planetary shell is carried by the volume, avoiding a wire-cage appearance.

The two shared stellar portraits retain one 256² RGBA photospheric map, two 80×56 spheres and two bounded glare disks; the compact portrait has no photospheric texture. The Canvas surface projection lazily samples an independent copy of the same deterministic field and retains its bounded palette/size maps. The volume has 442,368 bytes of RGBA input, 32,768 bytes of detail input and 1,769,472 bytes of reusable CPU accumulation, before driver overhead; no physical-resolution or measured GPU-memory claim is made. All textures, shader materials, buffers, observers, controls and GPU geometries are released on renderer teardown/context failure. No remote images, post-processing targets or worker are added.

Pixel ratio is capped at 1.75, with a two-million-pixel drawing-buffer budget. The 3D owner has no animation loop: input and resize redraw the supplied snapshot; the existing independent illustration clock updates stellar surfaces at at most 8 Hz. Camera magnification follows a bounded supplied-phase close-up, preserving its target and user-chosen direction/distance: the main-sequence surface is larger, while outflows and late shells get wider framing. The square-root stellar close view retains radius order; narrow viewports reduce magnification, and independent nebular cases do not share a physical length ruler. The nearby bilingual caption explicitly distinguishes this observing change from material coordinates and progress. Evolution playback remains user-started, never a loop. Hidden pages pause it, reduced-motion preferences start surface motion off, and nebulae stop the surface clock entirely. Density upload occurs only when parcel geometry changes. These are resource and lifecycle bounds, not measured frame-rate or load-time claims.

The parent integration performs the production build, generated entry projection and real-browser gate. Local tests distinguish deterministic geometry and lifecycle evidence from visual acceptance; neither implies a commit, push or deployment.

## Shared material sync · 2026-10-23

The universe guide and this topic now consume the same complete stellar/nebular presentation owners in `src/visuals/`; neither imports the other topic. Scientific geometry, evolution anchors, illumination choices, shell cut plane and experiment lifetime remain owned here. Canvas star surfaces use the same periodic field as GPU photospheres and a separate smooth compact-remnant profile. The existing metric comparisons are preserved. Gas/dust shading, surface contrast, colours and display glare remain teaching illustrations, not feature maps, real brightness measurements or a calibrated radiative-transfer calculation. See [validation](VALIDATION.md) for the scoped evidence and root-owned visual gate.


## Soft photosphere and larger observation stage · 2026-10-23

The shared photosphere now uses overlapping, unequal hot patches with multiscale periodic warping
and fine emission mottling. It no longer outlines nearest-cell polygons. Bright patch interiors,
soft darker gaps, restrained contrast, spots and limb darkening describe a luminous gas surface;
there is no bump/normal relief or hard glazed shell. GPU and Canvas sample the same retained field;
compact-remnant materials remain smooth. [NASA Marshall's photosphere overview](https://solarscience.msfc.nasa.gov/surface.shtml)
is the morphology/limb-darkening reference, not the source of a measured feature map, a calibrated
granule size or a claim that giant and solar surfaces are identical.

The default 3D observation canvas uses a bounded 450–570px desktop height (59dvh) and retains
330px on a narrow phone. Branch and phase choices are in a native disclosure; its open state is
kept across ordinary updates. The current phase, playback and progress stay visible outside it.
Independent nebular cases use the same disclosure pattern while their illumination remains direct.
Opening/closing options changes layout in the existing scene and does not change its experiment,
progress, camera or geometry. The taller canvas refits the same frame without stretching the star.

Visible bipolar outflows use the wider bounded camera cap before they reach full opacity, keeping
the near polar tip inside the taller canvas despite perspective. This is an observation adjustment;
no parcel, disk, outflow, stellar radius or shell coordinate changes with it.

## Luminous surfaces and observable cooling: learning contract

The follow-up asks how a living Sun-like star, an expanded orange giant and a compact cooling
remnant can be distinguished before reading their names. The variable remains the same mass path
and reversible progress; surface activity and the observing camera are separate controls. The
observable changes are photospheric patch scale, irregular active regions, limb emission, radius,
and later a remnant's fading heat and surrounding debris. These must consume one supplied state
in the 3D view and the radius/orbit comparison.

Solar granules, faculae, spots and limb darkening follow the morphological guidance in
[NASA Marshall's photosphere overview](https://solarscience.msfc.nasa.gov/surface.shtml).
The distinction between orange giants and cooling white dwarfs follows
[NASA's stellar types](https://science.nasa.gov/universe/stars/types/).
The display does not simulate calibrated radiative transfer, a measured convection map, a corona,
or a white-dwarf cooling age. Screen playback may give phases unequal observing time; it is not
a common physical time scale. A late remnant remains an object to inspect rather than vanishing
or being presented as an already observed black dwarf. Forward, reverse, pause, view switching
and URL restoration must keep the same remnant and material history.

The authored playback lasts 84 screen seconds, including a 22-second remnant-observation tail.
`evolutionPlayback.ts` maps progress to observing seconds in both directions; it does not advance
physical age. The first six legacy stops keep their URL positions (the giant remains at `4/6`),
the remnant stop is now `.9`, and `.9..1` observes the same object cooling or its debris dispersing.
The final button selects `.9`, so playback from that stop can show the tail. The original radius,
fuel and rounded age anchors are unchanged; late age is qualified as after the last anchor rather
than presenting an invented cooling age. All branches retain their own remnant outcome.

The same supplied state determines morphology, color, emission and glare in the 3D and Canvas
views. Solar granulation is finer than the orange giant's soft convection pattern; the compact
profile has no solar granulation or dark-spot map. Compact display radiance is compressed to
keep a dimmer remnant visibly emitting on a screen; the rendered brightness is not a measured
luminosity. The white-dwarf cooling slice ends at a still-visible warm-white object. Neither the
stellar radius nor disk opacity is used to fake its fading. Shell release geometry and visibility
are separate: the same numbered parcels continue outward as they fade. Shell optical properties
follow shell identity, not a brightness threshold. The camera waits for fading before approaching
the remnant, and the compact disk remains smaller than the main-sequence disk in this close view.

The shared stellar owner still has no clock or animation loop. Its one 256² field is retained for
the emitting surface; the compact GPU surface has no feature map. The Canvas owner uses at most
12 rendered maps in an LRU cache and two deterministic 256² fields (solar and red-dwarf seeds).
No remote texture, post-processing target or worker was added. The existing surface cadence,
hidden-page pause and teardown limits remain in effect; these are resource bounds, not measured
hardware performance.
