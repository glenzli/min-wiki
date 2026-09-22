# 恒星与多星系统 / Stars and multiple-star systems

The workspace connects apparent solar size, stellar diversity, shared-center orbit illustrations and a separate live Newtonian three-body experiment with a bounded history window. The original three lenses retain observer distance, stellar selection and phase; the numerical chapter owns its own initial conditions and recorded history. No iframe or universal evolution timeline is introduced.

## Ownership

- `model.ts`: validated chapter/query input, observer distance, circular binary and hierarchical triple coordinates. The precise solar observation functions remain owned by `../sun-star/model.ts`.
- `content.json`: bilingual labels, representative stellar properties, schematic layer profiles and qualifications.
- `scene.ts`: Sun-relative linear size comparisons, labeled magnification inset and continuous circular orbit illustration with age-fading dashed trails.
- `stellarSurface.ts`: topic-local emissive photosphere drawing shared by comparison, orbit and numerical scenes. Deterministic spherical granulation, projected dark active regions and limb darkening use bounded per-color/size canvases, updated at most 8 Hz; no random-per-frame texture or directional billiard-ball lighting. Enhanced colors and solar-inspired detail are illustrative, not observed maps of other star types.
- `main.ts`: controls, user-started animation, finite selection state and page visibility lifetime.
- `learning.json`: three deeper mechanisms and four narration segments per language.
- `threeBody/model.ts`: validated planar point masses, sourced initial conditions, fixed-step velocity-Verlet, diagnostics, resolution stops, and bounded deterministic snapshots.
- `threeBody/runner.ts`: retained finite offline preparation utility, tested but no longer invoked by the page.
- `threeBody/controller.ts`: one user-started live pair, bounded stepping (at most 50 steps per animation frame), pause/review/resume, reset, fallback readings and visibility lifetime. Readouts refresh at 5 Hz, not every render.
- `threeBody/scene.ts`: equal-axis linear coordinates, expanding barycenter-centered framing, stable A/B/C identities and trails ending at the selected frame. CSS-pixel fonts remain legible on narrow screens.
- `threeBody/content.json`: paired scientific text and controls for the numerical experiment.

The old `sun-star` URL redirects to `stars/?chapter=sun`, preserving query language and hash. Solar-system’s high-detail Sun remains independently reachable through a chapter-specific link. Black-hole binary and scale content are linked rather than copied.

## Scientific limits

Physical radius, mass, effective temperature and apparent angular size are different measures. The size chart compares 0.25×, 1×, 50× and 800× solar diameters (equivalently radii), with a 50× intermediate giant alongside the 800× model. Main disks use the same scale; a labeled, separately enlarged Sun inset is not part of that scale. The four stellar presets are rounded teaching models, not measurements of specific named stars and not a single inevitable evolutionary sequence. The low-mass giant specifically illustrates a helium core plus hydrogen-burning shell; the massive supergiant does not claim a fixed onion-layer structure. Cores and layer thicknesses in cutaways are enlarged/schematic. Colors and granulation are not spectral measurements or interior photographs.

Binaries use exact center-of-mass allocation within a circular two-body construction. Triple motion nests circular inner/outer Jacobi coordinates with separation ratio 12 and equal individual masses; outer/inner period ratio is sqrt(12³ × 2/3). This is an illustrative hierarchy, NOT a three-body integrator, arbitrary-orbit sandbox or long-term stability proof. No mass transfer, collision, tides or stellar evolution is solved.

## 三体数值实验 / Numerical three-body experiment

Direct route: `/topics/stars/?chapter=three-body` (supports `lang=en`). This fourth chapter is visibly separate from the old orbit construction. There is no automatic playback. Preset changes restore original conditions; slider edits invalidate the old result instead of showing it under new parameters. Only the chapter is stored in the URL; experimental initial conditions and time are page-local.

Three point masses obey `a_i = Σ(j≠i) m_j (r_j-r_i)/|r_j-r_i|³`. Units are chosen with `T₀ = sqrt(L₀³/(G M₀))`, hence numerical `G=1`; times are not seconds or years. The physical system is Newtonian, planar and isolated, with no softened potential, collision model, stellar radii, tides, mass transfer, relativity or evolutionary effects.

Initial presets:

- **Figure eight:** equal masses `m=1`, positions A=(-0.97000436,0.24308753), B=-A, C=(0,0); velocities A=B=(-0.466203685,-0.43236573), C=(0.93240737,0.86473146). Values follow [Montgomery’s author page, credited to Simó](https://people.ucsc.edu/~rmont/Nbdy/NbdyC1.html). The [original paper](https://arxiv.org/abs/math/0011268) establishes a special periodic solution, not a universal triple-star path.
- **Equilateral comparison:** equal masses on radius-one vertices at angles 0, 2π/3, 4π/3, tangential speeds `ω=sqrt(1/sqrt(3))`. Summing the two inverse-square accelerations gives radial acceleration `1/sqrt(3)`. This is a Lagrange relative-equilibrium comparison, not a stable-family promise; its subsequent positions are still numerically integrated.

C’s mass may be changed from0.5 to2 M₀, initial x by ±0.3 L₀, and vx by ±0.3 L₀/T₀. Then all positions and velocities are shifted uniformly into the center-of-mass rest frame. The second run adds `δx_C=10^-4 L₀` before its own recentering, keeping mass and other relative changes identical. Both actual sets of initial conditions are available in the page. Every subsequent sample is integrated, not an offset copied onto another path.

Integration uses [velocity-Verlet](https://fb15.pages.uni-marburg.de/ag-von-domaros/teaching/molecular-dynamics/core_algorithms.html), with `dt=0.001 T₀`, continuous during playback, stored every0.02 T₀ (finite offline preparation still defaults to20 T₀). Before accepting a step, each pair must have `r≥0.04 L₀` and `dt≤0.03 sqrt(r³/(m_i+m_j))`; the minimum separation along the full linear half-kick drift is also checked. A proposed relative energy error above0.001 stops before that step. These conservative guards limit this implementation’s resolution; they do not prove a physical collision or certify every coordinate. There is no adaptive step or silent softening.

Each trajectory has exactly one fixed-capacity `Float64Array` of1001×19 scalars (152,152bytes), plus bounded metadata. A pair uses304,304bytes of snapshot storage. The live pair uses circular snapshot buffers, retaining the latest20 T₀ without resetting bodies, time or original conservation references. Each animation callback admits at most50 fixed steps per run; slow frames slow the demonstration instead of increasing the numerical step or accumulating unbounded work. Parameter edits synchronously replace the pair and pause. Leaving the chapter or hiding the page pauses both integration and replay; return preserves state without automatic restart. Disposal releases the pair. No worker, external dependency or long-lived preset cache is introduced.

Only the two runs’ shared saved interval is playable if either stops early. Replay and backtracking read the same immutable snapshots, not backward integration. The frame expands about the fixed barycenter to contain current bodies; equal axes are preserved. Trails retain the latest3.6 T₀, use continuous dashed paths and fade by age. Optional perturbation bodies are hollow rings; the main bodies are stellar disks, explicitly not physical radii. Readings show model time, both runs’ current/maximum-in-reviewed-window relative energy errors, absolute momentum changes, center-of-mass drift, minimum pair distance, and RMS position difference. Energy normalization is `max(|E₀|,10^-8(K₀+|U₀|))`; momentum has units M₀L₀/T₀. Small conserved-quantity errors are not a proof of orbit accuracy, and finite-time perturbation separation is not a chaos diagnosis.

中文边界：前三章的层级三星仍是示意构造；第四章才直接求解三体牛顿引力。采用持续积分、固定步长、无软化的点质量模型；近遇无法解析或能量误差超限时停止，不模拟碰撞。恒星盘与空心圆是两次不同初值计算，不是预设轨迹；两者都用渐淡虚线。最近20 T₀内回拖同一帧会得到完全相同的数据。数值稳定性与真实三星长期稳定性是不同问题。

The Sun distance experiment retains geometric angular diameter, vacuum d/c light travel and unabsorbed inverse-square irradiance. Crosshairs mark subpixel disks without inflating their physical size. No direct solar observing is encouraged.

## Evidence and verification

Sources: [NASA Sun](https://science.nasa.gov/sun/facts/), [NASA star types](https://science.nasa.gov/universe/stars/types/), [NASA TESS hierarchical triple](https://www.nasa.gov/universe/nasas-tess-spots-record-breaking-stellar-triplets/).

Focused command: `node --import tsx --test topics/stars/tests/*.test.* topics/sun-star/tests/*.test.*`.
Model tests cover symmetric configurations, momentum/center/energy/angular invariants, second-order step convergence, deterministic batching and replay, near-encounter stops, invalid parameters, perturbation/recentering, bounded buffers and async cancellation. The baseline figure eight stays below1e-5 relative energy error over20 T₀ at the default step; this is a tested example, not an accuracy bound for every modified input.

Browser gate: all four chapters, distance reversal, giant versus supergiant, cutaway, unequal binary, hierarchical phase scrubbing, numerical presets/edits/live-continue/guard-stop, perturbation overlay, paused replay, rapid chapter switching, English/Chinese390px, legacy Sun URL and hidden/page return. Root integration owns production browser validation; source tests do not prove visual fidelity.

## Presentation and illustrative surface activity

All four chapters share a viewport-fitted observation workspace and optional explanation panel. The scene canvas uses the smaller of the horizontal and vertical scale factors, preserving circular stellar disks and equal coordinate axes. Immersion keeps chapter and playback controls; Escape restores the reading layout without resetting the experiment.

Photosphere textures evolve at a bounded 8 Hz on an independent illustration clock, using coherent rotating granules, dark regions and small brightness changes. Texture sizes are bounded (256 or 64 pixels), reused per palette/size and released with the renderer. Surface playback does not advance orbital phase, integrate Newtonian steps or alter saved snapshots. It can be paused separately, starts off for reduced-motion preferences and pauses when hidden. The speed, features and enhanced colors are not calibrated observations; different stellar surfaces are not claimed to be identical.

恒星表面活动是增强对比的示意，速度与细节未经真实恒星标定；独立于轨道和三体数值时间。隐藏页面、减少动态效果和单独暂停均可停止它。布局改变保留实验条件与历史数据。
