# 飞机为什么能起飞？ / Why can an airplane take off?

## Learning design · 2026-10-22

- **Question:** how can a heavy airplane leave the runway without losing its weight?
- **Conditions:** horizontal speed relative to still air, 0–60 m/s, and an externally held whole-airframe/wing attitude, 0–26°. Mass, area, density and the hypothetical coefficients remain fixed.
- **Observation:** start with a recognizable whole airplane and runway. Identify its fuselage, cambered main wings, cockpit, tail, propeller and wheels. A blue wing-root mark, a click on the wing, Enter on the focused canvas, or the nearby close-up button opens the same wing's section. Return to the whole airplane without resetting conditions or progress.
- **Cause:** relative airflow → flow and pressure interaction around both wing surfaces → aerodynamic force → remaining runway support or upward acceleration and lift-off.
- **Comparisons:** 0 m/s; 38 m/s at 12°; the same 38 m/s at 26°. No relative motion produces no aerodynamic force. The moderate-angle example lifts off; the excessive-angle example has separated flow, smaller lift coefficient, greater drag and stays grounded.
- **Misconceptions:** forward engine thrust directly holds up an ordinary airplane; weight disappears; upper/lower air must meet simultaneously; greater angle always helps; stall means engine failure or zero lift; pitch above the horizon always equals angle of attack.

Four linked questions ask where relative airflow comes from, how air lifts a wing, whether having lift guarantees lift-off, and why excessive angle can stall. Each question opens with the whole airplane. Inspecting the selected wing is a deliberate local observation, rather than the opening picture. The section gains qualitative pressure relationships for the force question and separation for the stall question; it is not a separate experiment. The lift-coefficient graph is the actual invented curve consumed by the model, with the current angle marked.

The Reader's single toolbar contains question, view, comparison, camera and reading-depth choices. Playback and progress remain visible. The topic groups the real controls after Reader presentation mounting, because the Reader can flatten the authored transport wrapper. Desktop uses one playback row. The spatial camera fits per-mesh airframe bounds against the actual stage rectangle; it does not frame the full runway or derive desktop height from width. The phone stage has a bounded aspect ratio. Chinese and English explanations have equivalent qualifications.

## Scientific sources checked 2026-10-22

| Claim | Primary source and scope |
| --- | --- |
| Lift perpendicular to relative motion, opposing drag, weight, forward thrust and force balance | [NASA Glenn: Four Forces on an Airplane](https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/four-forces-on-an-airplane/) |
| Lift depends on relative speed, density, area and coefficient; speed squared comparisons require other conditions to remain fixed | [NASA Glenn: Lift Equation](https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/lift-equation/) |
| Pressure and momentum descriptions are compatible; both wing surfaces matter; equal-transit reasoning is false | [NASA Glenn: Bernoulli and Newton](https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/bernoulli-and-newton/) |
| Angle of attack, critical angle, separation and stall; lift need not vanish; unpowered gliders obtain wing lift | [FAA: Glider Flying Handbook, Chapter 3](https://www.faa.gov/regulations_policies/handbooks_manuals/aviation/glider_handbook/gfh_chapter_3.pdf), printed pp. 3-2–3-5 and 3-14–3-15 |

These support mechanisms and force definitions. They do not supply this airframe, its proportions, force coefficients, 15° threshold, pressure colours or flow curves. Pale pressure regions only describe a common attached lifting case; they are not a pressure solution and are hidden for zero flow or separated flow. No paired particles or equal-arrival rule is used.

## Topic-owned source boundaries

- `model.ts`: existing conditions, coefficients, forces, unilateral ground support and deterministic short vertical response; its numerical behavior is unchanged by this upgrade.
- `journey.ts`: bounded URL state, historical chapter compatibility, force-coordinate projection and contact poses for both views.
- `airfoil.ts`: the one closed cambered section used by both the 3D wing and 2D close-up. Its shape illustrates a wing and does not calculate the force coefficient.
- `aircraftGeometry.ts`: retained closed airframe/wing geometry, independent of the browser renderer.
- `runwayView.ts`: one lazily mounted Three.js scene, materials, runway references, shadows, camera fitting, orbit/zoom, wing picking, context-loss response and GPU disposal. It consumes a supplied `FlightSnapshot`; it owns no clock.
- `scene.ts`: precise section and SVG runway fallback, qualitative flow/pressure, force vectors and coefficient graph; every projection consumes the same snapshot.
- `study.ts`: four paired Chinese/English observation tasks, explanations, transitions and limitations.
- `main.ts`: experiment composition, one bounded playback clock, controls, route saves and document lifecycle.
- `learning.json`: three academic notes and four narration segments per language; topic-only manuscripts and narration exports are projected with the repository's existing logic. Registration and common resources remain parent-owned.

The spatial renderer owns its complete camera/gesture/failure/resource lifecycle; the numerical model remains separate. There is no new shared scientific service or dependency.

## Model and geometry qualifications

Chosen values: ρ=1.225 kg/m³, S=14 m², m=1000 kg, g=9.81 m/s². No real aircraft is represented. With α in degrees, clamped numerically to −10°…26°:

```text
CL = .24 + .08 α                 for α ≤ 15°
CL = 1.44 − .07 (α − 15)         for α > 15°
CD = .035 + .045 CL² + .025 max(0, α − 15)
L = ½ρ V² S CL; D = ½ρ V² S CD; W = mg
γ = atan2(v_vertical, v_horizontal)
α = externally held attitude − γ
L_vertical = L cos γ; D_vertical = −D sin γ
N = max(0, W − L_vertical − D_vertical) only at ground contact
F_vertical = L_vertical + D_vertical + N − W
T_horizontal = L sin γ + D cos γ
```

A fixed-step replay, dt≤1/240 s, computes 1.2 model seconds. Playback stretches this to about six real seconds and is labelled slow replay. Horizontal speed and attitude are held externally; thrust is simplified as horizontal and balances horizontal aerodynamic components without engine limits. The entire airframe pitches with the fixed wing; the wing does not articulate relative to the fuselage. The pose places the lowest tyre surface at model height. A raised nose wheel with main-wheel contact is a geometric projection of the imposed attitude, not a solved rotation or pitch maneuver. Nose/belly/tail geometry stays above the runway throughout 0–26°.

The scene omits full takeoff acceleration, wheel friction, body/tail forces, pitch moments, trim, flaps, wind, ground effect, wingtip vortices and landing. Ascent updates relative velocity and angle of attack; it is not a scripted lift-off for every setting. It cannot estimate real takeoff speed/distance or guide aircraft operation.

Conventions: nose and aircraft motion point toward world −x; +y is up. Relative incoming air points toward +x and downward during ascent. Lift is perpendicular to relative motion, drag opposes it, weight is down, and imposed thrust stays horizontal. The 3D scene uses one world metre per model metre, but the invented airframe proportions and rendered wing area are identifying geometry, not the model's calibrated physical dimensions. All 3D force arrows share 0.000055 world units/N; section/fallback arrows share 0.0032 px/N. Origins are offset for clarity. These are drawing scales, not real application points. The SVG fallback maps travel at 3.2 px/m and height at 5 px/m separately from its identifying airframe size.

Flow curves are qualitative. Their upstream tangent follows γ; the outgoing tangent follows γ+atan(0.18 CL), a drawing choice showing downward turning for positive lift. Neither curve spacing, moving dashes, pale pressure colours nor separated eddy shapes measure pressure, velocity or turbulence.

## State, lifecycle and recovery

`?question=airflow|forces|runway|stall`, `?view=runway|wing`, `speed`, `pitch` and `p` preserve the bounded experiment in the URL. Historical `?chapter=wing|runway` links still work; language and unrelated Reader settings are retained. View/question/reading-depth changes preserve conditions and progress. Parameter/preset changes intentionally return the short response to its start. Back/Forward restores the route. Saved progress is rounded to four decimal places.

One user-started clock supplies every motion, including propeller, wheel roll, flow traces and both scene projections. Seeking is deterministic and reversible. Reduced-motion playback selects the endpoint without a tween; steps and ranges remain available. Visibility loss, pagehide and reduced-motion changes pause. A bfcache page retains its instance; permanent pagehide cancels pending imports and disposes controls, observer, geometry, textures, materials and renderer.

A WebGL creation error or context loss reveals the same-state SVG runway view and a retry button. Retry disposes the predecessor, replaces its canvas with a shallow clone retaining the ID, ARIA, focus and display attributes, then rebuilds the renderer and its wing/keyboard interaction against that new context owner. It restores the current experiment; its observer camera can reset. The import generation guard runs before canvas replacement, so a late retry cannot replace a disposed document's canvas. There are no remote assets, audio/autoplay, workers or external service calls.

## Validation and integration handoff

See [VALIDATION.md](VALIDATION.md) for current source evidence and the browser acceptance handoff. No commit, push or deployment is part of this topic work.
