# 星系与宇宙尺度 / Galaxies and cosmic scales

The learning journey begins with diameter comparisons, follows a five-stop structural address (Solar System → Milky Way → Local Group → Laniakea → observable region), inspects galaxies in a manual 3D structure study, and then opens the retained continuous physical zoom. A Local Group–Virgo Cluster comparison and a close view of the cosmic web sit beside the address path. The comparison and structure views are not physical orbital layouts or distance maps; only the final observable circle indicates an approximate horizon span, while its texture remains illustrative.


One continuous length-coordinate journey starts at a selectable Earth or Sun close-up and connects the Solar System, selected nearby stars, the Milky Way, representative Local Group members, Laniakea and the observable horizon. The Virgo Cluster and illustrative cosmic web appear along the way but are no longer selectable main waypoints. Scale changes do not reset the location anchor. Milky Way structure can be rotated face-on to edge-on and its components independently inspected.

## Ownership and units

`model.ts` owns km/AU/light-year conversions, logarithmic half-width, linear within-frame orthographic projection, smooth center/orientation transitions, ruler intervals, observable-radius reference and versioned URL scale state. `scene.ts` owns the Three.js orthographic scene, mapped Earth/cloud/Moon spheres, physical orbit geometry, illustrative local-star population, screen-space annotation overlay and GPU lifetime. `macroScene.ts` owns the distance-anchored labels and dashed region/horizon references within that camera. `cosmicWebModel.ts` and `cosmicWeb3d.ts` own the statistical spatial volumes shared with the structural address; `cosmicSpaceModel.ts` owns their physical-camera placement. `observableWeb.ts` remains the Canvas fallback texture. `galaxy.ts` owns bounded deterministic disk/dust/bulge/halo point populations and shaders. `flight.ts` owns a finite, cancellable eased camera journey. `main.ts` binds controls, URL state, user-started travel, scrubbing, reduced-motion preferences and page visibility. `content.json` and `learning.json` own both languages and scientific qualifications.

`galacticModel.ts` separately owns six structural cases, deterministic 3D samples, the solar disk position, manual camera bounds and URL state. `galacticScene.ts` projects that same geometry through WebGL or a rotatable Canvas fallback, owns a two-case LRU, context loss/retry and GPU disposal. `galacticStudy.ts` owns the manual gestures, presets, component controls and demand-render scheduling. `galacticContent.json` owns both languages and case-specific questions, evidence and limitations, consumed by `study.ts`. These coordinates belong to an illustrative structure study and never replace the kilometer-based camera or the same-ruler diameter model.

`model.ts` owns the eight rounded mean planetary radii used by the physical scene and size references. `planetGlyph.ts` owns the non-metric recognition symbols used by the Solar System membership diagram and the orbit-view legend. Its monotone power compression preserves Jupiter > Saturn > Uranus > Neptune > Earth > Venus > Mars > Mercury, with the membership Sun larger than all planets. Earth has blue oceans and land, Jupiter has cloud bands, and Saturn has rings. These symbols do not share the orbit ruler: the quantitative orbit view uses crosses for planet positions, while its stellar outline and orbital radii retain their common linear scale. The rank is independently supported by [NASA's planet-size comparison](https://science.nasa.gov/solar-system/planet-sizes-and-locations-in-our-solar-system/).

## Galaxy structure study · 2026-10-23

The question is how spatial arrangement differs from apparent shape and from structural membership. Readers can change the observer's direction, independently hide the Milky Way disk/bulge/stellar halo, and compare six cases. View changes retain every sample and the solar locator; selection changes compare different examples and are never presented as an evolutionary clock. There is no automatic rotation or simulated stellar motion.

- `?mode=galaxies&galaxy=milky-way`: the Sun stays at 26,000 / 50,000 = 0.52 of the rounded disk radius while face-on and edge-on views expose arms and thickness. Axis lines have illustrative direction, without a physical length scale. Stellar-halo outlines are reference guides, not measured boundaries.
- `galaxy=spiral`, `elliptical`, `irregular`: broad inter-arm stars, a centrally concentrated 3D ellipsoid, and unequal off-centre volumes provide contrasts. Cases have independent framing; differences in displayed size and point count are not measurements. Morphology is not a mandatory spiral → elliptical → irregular sequence.
- `galaxy=star-cluster`: an example halo location and an independently enlarged globular-cluster volume distinguish membership from magnification. The connector is not an orbit. A cluster is not defined as a galaxy below one universal star-count threshold.
- `galaxy=local-group`: three larger galaxies and a nonuniform dwarf-location sample show that a galaxy group contains whole galaxies. Sizes, distances and directions remain schematic here; the separate continuous zoom supplies the distance scale. Virgo remains a neighbouring structure.

`galaxyYaw`, `galaxyPitch`, `galaxyDisk`, `galaxyBulge`, `galaxyHalo` and `galaxyGuides` restore camera/component state. Outlines and coordinates default off; the Sun locator stays visible with an external leader. Manual sliders and component controls live in a native View options disclosure. Components/coordinate controls appear only for the disk cases; other cases use direction A/B rather than claiming a common disk plane. Reference visibility never changes magnification. Old `mode=compare|homes|zoom`, `pair`, `home`, `scale`, `scaleVersion` and `origin` links retain their meanings. Case geometry has at most 19,000 teaching points; the renderer retains at most two visited cases and releases evictions. Hidden/inactive views schedule no frames, dragging coalesces into one requested frame, and reduced-motion readers have the same manual controls without an animation transition. Context failure retains the same 3D coordinates in a bounded CPU projection and exposes retry; non-bfcache page exit disposes resources. Continuous-zoom galaxy buffers now allocate only when that scale is first reached, and retry removes its previous canvas wrapper. These resource policies are source/test facts, not a measured frame-rate claim.

Science references checked for this addition: [NASA galaxy types](https://science.nasa.gov/universe/galaxies/types/), [ESA Gaia guide to the Milky Way](https://www.esa.int/Science_Exploration/Space_Science/Gaia/Guide_to_our_galaxy), [NASA star clusters](https://science.nasa.gov/universe/star-clusters-inside-the-universes-stellar-collections/), and the existing NASA Local Group/Andromeda sources below. The point fields are authored reconstructions, not extracted imagery or measured catalogues.

Every physical position and radius uses kilometers. The camera’s view width changes logarithmically; body geometry does not. A horizontal ruler measures the same linear projection as objects. Small disks disappear into explicitly distinguished crosshairs/open circles. Label spacing and position markers never count as physical diameter. The selected Earth or Sun remains the same physical anchor while the camera shifts toward the galactic center at large scales. Its label changes with the enclosing scale: Earth/Sun → Solar System → Milky Way → Local Group → Laniakea region. These are approximate location names, not claims that the cross marks each structure's geometric center.

Milky Way disk radius is a rounded 50,000 light-years, Sun-to-center distance 26,000 light-years. Andromeda and Triangulum are placed at rounded distances of 2.5 and 2.7 million light-years with illustrative directions and inclinations. Those three larger members have physical disk geometry; small rings sample other Local Group members in the annotation layer. The rings' placement is illustrative and cannot be measured with the ruler. Virgo's marker is anchored at a rounded 54-million-light-year distance; its magnified point cloud is a spatial symbol, not a measurable cluster diameter. Laniakea's dashed region conveys the roughly 520-million-light-year span reported by Tully et al., not a precise boundary. The external galactic view is a structure reconstruction, not a photograph taken outside the Milky Way or a measured individual-star catalog. The inferred dark-matter layer is off by default.

The nearby-star-to-galaxy passage uses overlapping close and wider illustrative star samples. Each sample fades while its boundary is still outside the frame, then the continuous galactic disk takes over; neither population is a measured star map or a physical concentration around the Sun. The Milky Way explanation begins after the local samples recede and the disk starts to become recognizable, rather than at the logarithmic midpoint between the two stops.

## Limits

Nearby-star directions, circular planetary phases, stellar-point positions, halo extent, galaxy tilts, distant filament positions and cosmic-web point counts are illustrative. The full zoom uses a single linear spatial projection within each frame, while the slider is logarithmic; at cosmological scales its lengths denote approximate present-day separation, not light-travel time. The cosmic web uses three retained statistical spatial fields. Their details crossfade under the unchanged physical camera as the view widens; this is a display transition, not a formation sequence. The last field is shared with the structural address. The distributions stay fixed during each view and are not surveyed galaxy positions or a measured filament-width catalogue. The dashed horizon uses an approximate 46.5-billion-light-year radius from the at-least-93-billion-light-year observable diameter and is not a physical wall. No orbit dynamics, cosmic expansion, collision forecast, dark-matter particle distribution or cosmological lookback-time calculation is claimed. The central black hole does not control the entire galaxy as a giant Solar System. Existing black-hole scale content is linked directly.

Sources: [ESA Guide to our galaxy](https://www.esa.int/content/view/full/423444), [NASA Earth](https://science.nasa.gov/earth/facts/), [NASA Andromeda](https://www.nasa.gov/universe/galaxies/andromeda-galaxy/), [NASA Local Group](https://science.nasa.gov/earth/earth-observatory/the-galaxy-next-door/), [NASA Virgo distance](https://science.nasa.gov/mission/hubble/science/explore-the-night-sky/hubble-messier-catalog/messier-60/), [Tully et al. on the flow-defined Laniakea region](https://www.nature.com/articles/nature13674), [ESA on the cosmic web as a distribution pattern](https://www.esa.int/Science_Exploration/Space_Science/Planck/Tools_to_study_the_distribution_of_matter_in_the_Universe), [ESA observable universe](https://www.esa.int/kids/en/learn/Our_Universe/Story_of_the_Universe/The_Universe), [NASA Solar System](https://science.nasa.gov/solar-system/solar-system-facts/).

Earth, cloud and Moon maps reuse the existing [Solar System Scope assets and attribution](../solar-system/assets/ATTRIBUTION.md), licensed CC BY 4.0. These are static visual maps, not live weather or current illumination. Lighting, circular orbit phases, nearby-star distribution and galactic dust attenuation are illustrative. The local population represents structure, not measured counts. Maps remain spherical at every scale; there is no switch to a differently sized planet illustration.

Buttons fly to their stop from the current scale; manual seeking cancels the journey immediately. Reduced-motion mode lands directly. A full user-started outward journey lasts 65 seconds of bounded visible frame time; hidden pages pause rather than catching up. Resize and texture completion redraw once, without an idle animation loop. GPU populations are allocated once, DPR is capped at 2, context loss exposes the text fallback, and non-bfcache page exit disposes geometry/materials/textures/observer/renderer. Bfcache retains the stopped scene. Earlier `scale=` links without `scaleVersion=2` are translated from the original Local Group endpoint; new routes save version 2 so old links keep their physical view.

Focused command: `node --import tsx --test topics/cosmic-scale/tests/*.test.*`. Browser acceptance: intermediate zoom states, returning to Earth, linearly correct ruler, marker identity, galaxy side view and each layer, reduced motion/user-started travel, pause, rapid manual scrubbing, language/mobile and direct scale URL. See `VALIDATION.md` for the local verification record.

`origin=earth|sun` selects the retained camera anchor. Missing/invalid origin preserves legacy Earth behavior; Sun links without scale open at a 2.2-million-km half-width. Choosing an origin explicitly resets to its close-up; stop 1 and restart return to that origin. The Sun uses the same physical geometry and kilometer ruler as the other bodies. The diameter comparison now lives in the first chapter, independent of the physical zoom. Source: https://science.nasa.gov/sun/facts/.

## Comparison ownership and compatibility

`comparisonModel.ts` owns the seven body radii, continuous shared diameter scaling, stellar/orbit overlay geometry and chapter route defaults. `comparison.ts` owns finite cancellable comparison motion, membership controls, resize and image completion. `membership3d.ts` owns a lazy, demand-rendered structural-address scene, while `membershipModel.ts` owns its non-metric layout, bounded view and projected label placement. `membershipScene.ts` remains the deterministic Canvas fallback, including cached galactic textures and the flat `observableWeb.ts` fallback. `comparisonContent.json` owns bilingual labels and distinctions. Main binds chapter state while the existing physical scene initializes only on first opening the zoom chapter.

`mode=compare|homes|zoom`, `pair=0..6`, and `home=0..6` preserve the journey state alongside `origin` and versioned `scale`. Existing `home=3` and `home=5` links still open the Virgo comparison and cosmic-web close view; previous/next now traverse only main stops 0, 1, 2, 4 and 6. Fresh links default to comparisons; legacy links with origin or scale retain zoom. Chapter switching stops motion and keeps both view states. Diameter ratios use Earth6371/Jupiter69911/Sun695700 km radii and Arcturus25.4 solar radii, an estimate from https://arxiv.org/abs/1109.4425. The former static Sun/Earth inset is removed in favor of the full comparison chapter. Membership diagrams show selected representatives, not orbital distances, census data or solid galaxy surfaces. The Local Group view draws three major spirals and irregular dwarf-galaxy samples; these are not a complete or measured census. The side comparison contrasts this group with the denser Virgo Cluster and an explicitly false-color hot-gas illustration; the two panels do not share a scale. Laniakea is a reconstructed flow region, not a shell containing every galaxy group or cluster. The cosmic web is a distribution pattern, shown as an optional local illustration, not the next enclosing object. The structural address and physical zoom endpoint share `CosmicWebVolume`: fixed point populations with irregular three-dimensional filaments, concentrations and comparatively sparse voids, inside a softly tapered observing volume with a separate dashed reference circle: a 520-million-light-year Laniakea span is under 1% of the roughly 93-billion-light-year observable diameter, so its center glyph is a deliberately enlarged locator. Neither the network nor the local web texture maps actual galaxy positions or counts. The continuous camera follows the same origin through these scales, with rounded distance anchors and clearly marked illustrative web geometry. The dashed Laniakea outline is an illustrative region, not a bound wall. Superclusters are generally not bound as a whole; the observable horizon is not the edge of the entire universe. Two bilingual observation cues per membership stop explain what each drawing encodes. Earth/Jupiter illustrative maps reuse the attributed Solar System Scope assets.

Comparison stellar disks use bounded cached, deterministic spherical photosphere illustrations with granulation, limb darkening and restrained glow; Sun-only spots are illustrative. Earth and Jupiter maps are projected onto lit spheres and rotate on the same pauseable illustrative clock, with their diameters unchanged. Texture scale and colors are not live surface data. Neither planet rotation speed nor stellar pattern evolution is calibrated to real time.

Antares extends the final comparison at approximately 700 solar radii, sourced from ESO eso1726; the existing Arcturus pair index remains 2. The membership fallback retains three cached 720px procedural galaxy illustrations. Its primary view uses the same volumetric disk, spiral, warm central population and dust resources as the physical zoom. Projection, directions and texture details are illustrative, not observed maps or a distance scale.

## Viewport and immersive interaction — 2026-09-22

The comparison, membership and physical zoom chapters share a viewport-sized observation workspace.
Explanation and settings are independently collapsible; immersive entry closes them and Escape restores
the reading layout and previous disclosure choices. Changing layout preserves chapter, pair, origin,
zoom progress and the original renderer. The comparison reads its actual CSS canvas height and applies
one scale to every body, preserving diameter ratios. Narrow/mobile layouts retain natural scrolling.

Physical zoom expands the horizontal camera span uniformly when width exceeds twice the available
height, keeping the origin globe visible in a short theater. The same framing factor is applied to
positions, radii and the physical ruler. The width readout consumes the renderer's actual framed span,
including after resize; URL progress and the identity of the Earth/Sun anchor remain unchanged.
At the final observing-horizon stop, portrait framing smoothly tightens enough to show the whole
horizon while keeping one linear ruler and reporting the actual visible width. This is responsive
camera framing, not a change in physical body size or a new distance measurement.


VY Canis Majoris adds pair 4 after Antares without changing older pair indices. Its drawn
photospheric radius is the central value 1420 R☉ of the 1420 ± 120 R☉ estimate by
[Wittkowski et al. (2012)](https://arxiv.org/abs/1203.5194). The bilingual explanation distinguishes
this model-assisted photospheric estimate from the extended molecular/dust envelope and from
any largest-star ranking. The black-hole reference chooser consumes this same body entry.


## Extreme-star estimates and planetary orbits

The current main sequence moves from VY Canis Majoris directly to Stephenson 2-18. WOH G64
was removed from the default comparison because its selected 1540 R☉ estimate was too close
to VY Canis Majoris's 1420 ± 120 R☉ estimate to add a useful scale transition. Legacy pair
links at 5 and 6 land on the retained final comparison; newly saved links include
`pairVersion=2`. St2-18 uses approximately 2150 R☉, derived from log(L/L☉)=5.64 and T=3200 K in
[Fok et al. (2012)](https://arxiv.org/html/1209.6427), with R/R☉ = √(L/L☉) × (5772 K/T)².
The latter depends on uncertain distance and cluster membership; see the association discussion in
[Humphreys et al. (2020)](https://arxiv.org/html/2008.01108). These are selected, dated estimates,
not a confirmed current size ranking. Extended atmospheres and circumstellar dust are not added
to the chosen photospheric radii. Both languages show a brief estimate label; detailed qualifications
are in the expandable explanation and learning notes.

“Compare with planetary orbits” puts the selected star at the Sun’s former position. Mercury
through Saturn use the same linear km-to-pixel conversion as the stellar outline; rounded orbital
radii are shared with the physical zoom through `model.ts`. Crosses locate the planets; their phases
are illustrative. The inner planets therefore cluster near the centre; a separate labelled icon legend keeps
them recognisable. VY Canis Majoris reaches beyond Jupiter but not Saturn with these values; St2-18 reaches
slightly beyond Saturn. This is a counterfactual size overlay, not an evolution, swallowing, orbital
or thermal simulation. It does not show the full Solar System.

The compact chooser names pairs in the comparison and stars in the orbit view. Switching into the
orbit view during a pair animation retains the selected destination. Chapter/layout changes retain
the chosen star and view in memory; the view toggle itself is not encoded in the URL. See
[the scoped validation record](../../docs/giant-stars-20260922.md).

## Illustrative surface activity

Diameter comparisons retain their chosen objects and common scale while Earth and Jupiter slowly rotate and stellar photospheres rotate and evolve. A separate control pauses this illustrative activity; bounded 320-pixel planet and star textures refresh at at most roughly 6 Hz. Planet maps are sampled with spherical coordinates under a fixed light, so surface features cross the lit disk without changing its outline. This does not change diameters, drive the comparison transition or update DOM readouts every frame. Leaving the comparison, hiding the page or requesting reduced motion pauses the surface clock. Details and speed are not observational measurements.

恒星表面颗粒、暗斑与亮暗变化为示意，可独立暂停；不改变尺度比较，不表示真实自转周期或已观测到的表面图像。

`study.ts` 分别解释直径对比、结构地址与连续拉远的当前站。儿童版只讲眼前尺度关系，学术版在观察区下方解释所用距离、重建方法、方程的条件及资料入口；宇宙网与可观测边界尤其区分统计示意和实测分布。阅读版不改变已有的缩放位置、配对或结构选择。

## 默认演示布局 · 2026-10-18

章节、比较对象与延伸选项集中在默认收起的切换菜单；当前问题仍显示在画面上方，播放与进度留在画面下方。解说侧栏按需展开，默认让主画面使用全部宽度；切换布局只移动原控件，不重建场景或改变直径比。窄屏保留大画面与自然滚动。

## Reader menu hierarchy · 2026-10-27

The four retained observations use one bilingual 01–04 sequence: size comparison, structural membership, galaxy structure, then continuous physical zoom. The route keys and all selected pair/home/galaxy/zoom states keep their existing meanings. Reader moves the original galaxy chooser into the common observation menu; `GalacticStudy` therefore applies its chapter-active visibility directly to that retained chooser group, so inactive galaxy options do not leak into the comparison, membership or zoom menus.

The physical zoom renderer keeps its inserted `cosmic-view` wrapper at the actual allocated stage height. This prevents a former flex-only zero-height rule from collapsing it after the Reader stage was wrapped; its original canvas, overlay, framing and ruler remain together.

## Diameter observation and explicit zoom entry · 2026-10-27

At each stable diameter pair, one compact estimate/check action reveals a ratio computed from the canonical `bodies` radii and linear diameter marks on the original canvas. Every complete gold interval is the smaller body's diameter; the final remainder can be fractional. This compares lengths, not packing, mass or volume. Revealing the ruler does not change either body, its size, the camera, or the independent illustrative surface clock. Each pair retains its checked state in memory; the orbit view and intermediate pair transitions hide this task.

The galaxy chapter distinguishes a new physical-ruler journey from resuming the previously reached scale. Only the explicit new-journey action returns the existing camera to the currently selected Earth/Sun origin, paused and ready to play. Resume and ordinary chapter selection preserve the retained zoom state and all comparison/galaxy choices. No new URL format is introduced.


## Shared spatial appearance for 02 and 04 · 2026-10-27

The four questions keep their distinct meanings: 01 compares diameters, 02 gives a structural address,
03 examines galaxy structure, and 04 follows one physical distance ruler. Their warm central populations,
cooler outer stars, dark dust and restrained point rendering form a common visual family. The layouts
in 02 remain explicitly non-metric; they do not acquire the distance ruler from 04.

`cosmicWebModel.ts` owns deterministic statistical populations and their sparse voids. `cosmicWeb3d.ts`
owns their bounded GPU buffers and soft point material; it owns no camera, renderer, clock or universe
model. `cosmicSpaceModel.ts` maps the three retained detail levels through the exact orthographic
transform used for physical bodies and the ruler. `scene.ts` retains these volumes across zoom changes;
`macroScene.ts` now draws only labels and dashed distance/region references. No filled sky disk,
connected luminous ropes or solid horizon shell is used in the primary 3D view. Detail levels crossfade
as a change in representation, not as structures forming or galaxies moving through time.

02 allows full-azimuth drag/arrow-key rotation from top-down to edge-on, with direct top/edge/reset actions and an independent retained view for each address. The camera gently widens for a face-on plane when needed, without changing bodies; collapsed orbit reference lines fade near edge-on. Its two-entry
geometry cache bounds resources, and leaving the chapter stops all frame requests. Unsupported or lost
WebGL exposes the labelled 2D fallback and a retry action. Planet surfaces reuse attributed Solar System
Scope maps. The manually inspected views and proportionate checks are recorded in
[the spatial refinement record](../../docs/cosmic-spatial-style-20261027.md).


### Solar photosphere and reachable edge-on view

`solarSurfaceModel.ts` owns one golden Sun profile for 01, 02 and 04: deterministic spherical
surface sampling, selected spots, limb darkening and the radius-relative soft halo. The CPU disk keeps
the approved 01 pixels and existing surface clock; `solarPhotosphere3d.ts` translates the same integer
hash, interpolation and coefficients into a self-luminous GPU material with pixel-footprint filtering.
The local-coordinate adapter preserves the same spot layout as the observer turns. The selected golden
colour is enhanced illustration, not an intrinsic-colour/temperature measurement or a dated solar image.
See [NASA/Marshall photosphere](https://solarscience.msfc.nasa.gov/surface.shtml) and
[NSO photosphere](https://nso.edu/for-public/sun-science/photosphere/).

There are no new textures, external flame shell or autonomous clocks. 02 and 04 take a snapshot of
01's existing illustrative surface phase on chapter entry. They preserve it during their own camera
changes; returning to 01 retains the paused activity state. The shared halo owns one four-vertex
billboard and a separate transparent material per 3D Sun. It does not enlarge the opaque sphere,
measured radius, kilometre ruler, diameter marks or position locators; the consumer releases both
resources with its existing scene lifetime. The labelled Canvas fallback uses the same Sun sampler.
See [the unification record](../../docs/cosmic-solar-unification-20261027.md).

`membershipModel.ts` now admits pitch 0 to π/2 and wraps the full azimuth. The edge preset has zero
yaw and pitch π/2, so the actual orbital plane projects horizontally; it is not a replacement 2D picture.
The top preset admits the full circular orbit into the camera. View changes retain object locations,
spherical radii and chapter choices. These observer directions remain local to the structural address;
they do not reinterpret the saved 03 galaxy view parameters or the 04 physical scale.
