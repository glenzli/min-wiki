# 飞机为什么能起飞？ / Why can an airplane take off?

## Learning design

- **Question:** how can a heavy airplane leave a runway without becoming lighter?
- **Conditions:** initial horizontal speed relative to still air (0–60 m/s), fixed wing nose-up orientation (0–26°); mass, area and density are fixed.
- **Observation:** a physically oriented cambered wing section, attached versus separated illustrative airflow, lift/drag arrows, then runway contact or lift-off under the same model state.
- **Cause:** relative airflow around both wing surfaces → changed flow/pressure → aerodynamic forces → contact support or a positive net vertical force.
- **Comparisons:** no airflow, 38 m/s at 12°, and the same speed at 26°. The first has no aerodynamic forces; the second leaves the ground in this invented example; the third remains on it with separated flow and less lift coefficient.
- **Likely misconceptions:** engines directly hold an ordinary airplane upward; the airplane becomes lighter; paired upper/lower air must meet simultaneously; ever greater angle is better; stall means engine failure, no motion or no remaining lift; wing angle above the horizon always equals angle of attack.

The opening gives a child a recognizable airplane and a question, then three concrete tests. The two observation windows retain the same conditions and progress. A short, user-started replay permits pause, step and reversible seeking. Changing an input returns only this model to its initial state. Reading mode preserves all experiment state. Reduced motion moves directly to the short window endpoint when play is requested; sliders and steps remain available. Hidden pages pause and bfcache returns retain state without creating another controller. The topic does not collect information or call external services.

## Scientific sources checked 2026-10-01

| Claim | Primary source and scope |
| --- | --- |
| Weight, lift perpendicular to motion, drag opposing motion, ordinary forward thrust; equilibrium differs from acceleration | [NASA Glenn: Four Forces on an Airplane](https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/four-forces-on-an-airplane/) |
| Lift depends on relative speed, density, area and a coefficient, with speed squared only under otherwise fixed conditions | [NASA Glenn: Lift Equation](https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/lift-equation/) |
| Pressure and momentum accounts are compatible; both wing surfaces contribute; equal-transit explanation is false | [NASA Glenn: Bernoulli and Newton](https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/bernoulli-and-newton/) |
| Increasing inclination affects drag; separated flow is not an attached-flow continuation or predictable universal coefficient | [NASA Glenn: Inclination Effects on Drag](https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/inclination-effects-on-drag/) |
| Angle is between chord and relative motion; excessive angle causes stall, lift need not vanish, and stall may occur at different speeds and attitudes; gliders obtain wing lift without engines | [FAA: Glider Flying Handbook, Chapter 3](https://www.faa.gov/regulations_policies/handbooks_manuals/aviation/glider_handbook/gfh_chapter_3.pdf), especially printed pp. 3-2–3-5 and 3-14–3-15 |

These sources support qualitative mechanisms and standard force definitions. They **do not** supply the invented airplane, coefficients, 15° model threshold or the page's plotted streamline geometry. We do not present the illustration as a wind-tunnel or CFD result.

## Model and ownership

`model.ts` owns conditions, coefficient choices, aerodynamic forces, unilateral ground support and deterministic vertical replay. `flowGeometry.ts` owns the clearly illustrative routes in a relative-flow coordinate frame: their upstream tangent equals the current flow angle γ and their outgoing tangent is γ+atan(0.18Cₗ), turning downward relative to incoming flow for positive lift. This drawing choice is not a computed downwash value. `scene.ts` only projects a `FlightSnapshot`, including wing orientation, relative-flow direction, separation and every force arrow. `main.ts` owns bounded playback, controls, two view windows and lifecycle. `learning.json` holds matched Chinese/English deeper notes and narration. Topic-local catalog fragments are handoff material; registration belongs to the parent integrator.

Chosen values: ρ=1.225 kg/m³, S=14 m², m=1000 kg, g=9.81 m/s². These resemble convenient engineering units but describe no actual aircraft. With α in degrees and a numerical coefficient domain −10°≤α≤26°:

```text
CL = .24 + .08 α                 for α ≤ 15°
CL = 1.44 − .07 (α − 15)         for α > 15°
CD = .035 + .045 CL² + .025 max(0, α − 15)
q = ½ρ V²; L = q S CL; D = q S CD; W = mg
γ = atan2(v_vertical, v_horizontal)
α = fixed wing pitch − γ
L_vertical = L cos γ; D_vertical = −D sin γ
N = max(0, W − L_vertical − D_vertical) only at ground contact
F_vertical = L_vertical + D_vertical + N − W
T_horizontal = L sin γ + D cos γ
```

The loop applies semi-implicit Euler with steps ≤1/240 s for a 1.2 s window. Horizontal speed is externally held and horizontal thrust exactly balances backward aerodynamic components, with no engine limit. It does not model acceleration from rest, wheel friction, rotation, flight trim, fuselage/tail forces, flaps, gusts, ground effect, three-dimensional tip vortices, engine performance or landing. At 0 m/s the ground bears weight and no motion starts. When the model rises, relative speed and flow direction update, so angle of attack differs from fixed wing pitch. Position is never pre-scripted to leave the ground for all settings. The hypothetical coefficient curve is a qualitative experiment, not measured precision or a claim that every wing stalls at 15°.

SVG convention: the airplane's nose points left, motion over the runway is leftward, airflow relative to it goes rightward. Positive upward model velocity draws the airplane higher and incoming flow downward-right. The same wing pitch rotates its nose upward in both views. Lift points perpendicular to relative motion; drag is antiparallel to airplane-relative motion; thrust remains horizontal. All force arrows use one fixed pixel/newton mapping but origins are offset for readability, not claimed pressure centers. World displacement is projected as 3.2 px/m horizontally and 5 px/m vertically; the exaggerated identifying airframe is not drawn to this spatial scale. The page therefore does not show an equal-scale trajectory or real aircraft dimensions.

## Validation and integration handoff

Focused command: `node --import tsx --test topics/flight/tests/model.test.mjs` (7 tests). Contracts cover zero-speed support; speed-squared under fixed conditions; coefficient/drag stall contrast and distinct runway outcomes; force-vector direction and sums; changing angle of attack during ascent; deterministic reverse/replay and bounded input; far-flow tangent correctness across conditions and the 60m/s,20°,endpoint ascent regression.

Parent must register `catalog-entry.json` and merge `catalog-en.json` into the common dictionary, then run repository `npm run check` and production browser validation. Main selectors: `#speed`, `#pitch`, `#progress`, `#play-flight`, `#step-flight`, `#reset-flight`; `[data-preset=still|lifting|stalled]`; `[data-flight-chapter=wing|runway]`; `#flight-lab[data-flight-state]` and SVG ARIA summaries. Deep links: `?chapter=runway` and `?lang=en`; malformed chapter defaults to the wing.

Topic-owner source validation completed: focused strict TypeScript exit 0; local translation/learning contract check found 87 English messages with no missing or unwrapped source strings; 7 model tests passed. Registered Vite source preview at `http://127.0.0.1:4175` was exercised in independent Chromium contexts for Chinese/English and desktop 1440×1000/mobile 390×844. All 87 assertions passed with 0 runtime errors, including native mouse/touch controls, keyboard seeking, playback/pause, step, repeated view changes, exact reverse/replay geometry, reading/theme state retention, single learning/narration mount, zero-speed and equal-speed lift-off/stall contrasts, extreme settings, reduced motion, and the rendered ascent-flow regression. Sixteen screenshots were retained at `/workspace/wiki-modern-technology-artifacts/flight-draft`, with browser script/result and source hashes. These are local source-preview evidence, not production validation or formally uploaded Library attachments. Actual browser back/forward and bfcache restoration remain for parent acceptance; lifecycle stops are implemented but not claimed from a screenshot.

Browser acceptance: Chinese/English at desktop and 390 px; theme/read-mode changes preserve state; no-airflow shows no routes or lift; moderate angle lifts off during playback; equal-speed excessive angle stays grounded; repeat pause/step/seek back/forward and rapid window switches; observe force tilt and reduced angle as the plane rises; keyboard focus and touch range input; reduced motion play/step; background pause and Back/Forward chapter restoration. The diagram's meaning must be judged visually, not inferred from unit tests. No source push or deployment belongs to this topic task.
