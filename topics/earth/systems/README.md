# Earth systems study

默认只围绕海水温盐、密度与大洋联系展开；旧链接仍可打开明确标识的天空或条件观察。它不是对真实海洋或地球未来的预测器。

The independent topic now opens only the water comparison and circulation question. New navigation connects sky and habitability questions to other topics. Explicit old `sky` / `conditions` URLs keep their original bounded observations and are labelled as previously saved views; they are not offered as a default ocean sequence. No view predicts the future of the real Earth.

## Learning contract

| Question | Change | Hold fixed | Observe | Causal boundary |
| --- | --- | --- | --- | --- |
| Does cold water always sink? | A temperature 5–25°C; practical salinity 30–38 | Same A/B identities; B = 15°C, SP 34; equal comparison volume and pressure | Surface-pressure density; relative density order; retained tracer positions | EOS-80 estimates density only. Position progress is reversible explanatory interpolation, with no time, velocity, mixing or pressure-depth prediction. |
| What causes day/night and auroras? | Solar hour; explanation layers; camera | Same equatorial site EQ-A, equinox geometry, Sun direction −X | Site illumination, continuously rotating surface and fixed solar lighting; a separate magnetosphere section | Camera orbit is independent of scientific rotation. Photons, solar-wind plasma and auroral excitation have different causal roles. Layer switches do not remove physical conditions. |
| What if one condition changes? | Six evidence lenses; distance 0.9–1.1 AU | For inverse-square calculation only: solar luminosity and a directly facing receiving area above the atmosphere | Irradiance ratio; supported inference and missing assumptions | No temperature, ocean-loss deadline or habitability score is generated. |

A/B circle/diamond tracers are retained display marks, not molecules. Their number and identities remain stable. The ocean-basin drawing is an original explanation of several connected circulation mechanisms, not observed flow vectors, a geographic route map, a single conveyor or current conditions.

The condition lenses are orbit, greenhouse effect, mass/gravity, internal heat/rocks, Moon and magnetic environment. The deeper thread connects air–sea exchange, upwelling and photosynthesis, and slow rock/carbon exchange. Energy flow and material cycling are distinguished, as are ocean and geological timescales. Links lead to the independent climate and minerals galleries.

## Ownership

- `model.ts`: strict state codec; EOS-80 surface density with ITS-90 → IPTS-68 conversion; stable water-body/tracer geometry; equatorial solar geometry; camera-coordinate codec; inverse-square irradiance.
- `study.ts`: host-scoped DOM, controls, complete state callbacks, bilingual observation flow, finite user-started water playback, original mechanism diagrams, lazy legacy activation and fallback.
- `waterScene.ts`: retained fixed-view SVG water bodies, origin marks and shared boundary, consuming `waterFrame` without a second model or clock.
- `earthScene.ts`: one shared `threeStage` instance when sky is active; textured Earth/clouds, fixed Sun, retained site, manually controlled camera and resource lifetime. It removes the shared exhibition lights before adding its own solar illumination.
- `content.json`: matching Chinese/English scientific explanations.
- `style.css`: styles scoped to `.systems-study`.
- `sources.md`: sources, claims, qualifications and assets.

`mountStudy(host, context)` implements `StudyInstance`. It emits the full normalized state on mount and on each supported user change. It queries only its own root and creates no global IDs. `dispose()` invalidates pending dynamic imports, removes event listeners and disposes an active 3D view. Late texture callbacks dispose their textures after leaving. Water separation uses the shared finite presentation driver only after a click; condition edits, scrubbing and host pause stop it. Scientific playback, ambient animation and audio never start automatically. Shared rendering uses requested frames and observes visibility/intersection; `pause()` stops pending stage work. The SVG fallback retains the same site and time when WebGL, a texture or the dynamic import is unavailable.

## State

All state values are strings at the study boundary. Unsupported values fall back per field; partial numeric strings, exponents, non-finite values, off-step values and out-of-range values are rejected.

| Key | Supported values / default |
| --- | --- |
| `observation` | `water`, `sky`, `conditions`; default `water` |
| `waterTemp` | 5–25, step 1; default 25°C |
| `waterSalt` | 30–38, step 0.5; default SP 32 |
| `waterProgress` | 0–1, step 0.01; default 0 |
| `skyHour` | 0–24, step 0.5; default 12 (teaching solar hours) |
| `skyWind`, `skyField`, `skyAurora` | `0` / `1`; default `1`; drawing layers only |
| `skyAzimuth` | 0–360°, step 0.1; default 322° |
| `skyElevation` | −80–80°, step 0.1; default 18° |
| `skyDistance` | 2.6–8 display radii, step 0.01; default 4.25 |
| `condition` | `orbit`, `atmosphere`, `gravity`, `interior`, `moon`, `magnetic`; default `orbit` |
| `orbitDistance` | 0.9–1.1 AU, step 0.01; default 1 |

Camera motion changes only camera keys; the site, globe rotation and solar direction remain tied to the same solar-time state. Home/reset restores the standard camera. There is no real-time ephemeris, atmospheric-escape solver, climate simulator or ecology solver.

## Assets and rendering budget

Earth day map and clouds are reused unchanged from `topics/earth-moon/assets/2k_earth_daymap.webp` and `2k_earth_clouds.webp`. Original maps: [Solar System Scope / INOVE](https://www.solarsystemscope.com/textures/), [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). The existing [attribution](../../earth-moon/assets/ATTRIBUTION.md) records their source. They are static educational composites with adjusted colors, not current imagery. Cloud height, atmospheric rim and site marker are enhanced for visibility and cannot be used to measure altitude.

The two existing WebP files total 918,556 bytes. They are requested only on entering the sky scene. The low-detail sphere has 96×48 segments and desktop has 128×64; Earth, clouds and rim share its geometry. There is no particle loop or post-processing pipeline. DPR and resource disposal belong to the shared `threeStage` implementation. Actual GPU/frame counts and browser performance belong to the root integration record; geometry limits alone are not a measured frame-rate claim.

Reference photographs supplied by the user were only scientific/design prompts. No photograph is copied into this module or published.

## Validation

Executed in the selected Linux workspace on 2026-10-25:

```sh
node --import tsx --test topics/earth/systems/tests/*.test.mjs
npm run check:i18n
npm run typecheck
```

Nine model/content tests pass, including independent EOS check values, salt/temperature reversals, retained tracer identities and reversible positions, illumination and magnetic-layer independence, strict state parsing/round trips, 3D/2D rotation agreement, independent restored cameras and bilingual content structure. TypeScript and the repository i18n check passed at this source revision.

Actual browser checks used a locally bundled module harness in `/tmp/earth-systems-browser` with Linux Chromium 151.0.7922.173, headless SwiftShader, Chinese/English at 390×844 and 1280×1000. All four configurations passed range focus/drag, touch input, camera keyboard/orbit, state restoration, six sky/water round trips, no horizontal overflow and a static frame counter while idle. Screenshots were inspected for the Earth’s illumination/material, water start/end states and mobile text/plots. These are simulated phone viewports, not measurements on a physical phone.

| Measured after rendering | 390 px, touch/DPR 2 device emulation | 1280 px, DPR 1 |
| --- | --- | --- |
| Effective DPR | 1.35 | 1 |
| Rendered triangles | 27,882 | 49,194 |
| Geometries / textures | 6 / 2 | 6 / 2 |
| Canvas backing size | 467×351 | 686×429 |

Local harness water readiness measured 101–137 ms in the final four-case run; entering sky reached the surface-ready callback in 97–109 ms. These local, partly cached timings do not represent production network or phone GPU performance. No frames were added during a 500 ms idle check. A further 12 sky→water cycles returned to the same GC-assisted DOM counts: 1 document, 289 nodes, 29 listeners before and after. One sky canvas existed only while sky was active.

Additional actual browser checks passed late-import cancellation, aborted surface-texture fallback, dynamic-import fallback, forced `WEBGL_lose_context`, and retry after texture/context loss while retaining the selected solar hour. Both fallback and restored 3D remained operable. There were no unhandled page exceptions. Evidence: `/tmp/earth-systems-browser/report.json`, `lifecycle-report.json`, `retry-report.json`, and the Chinese/English screenshots in that directory. Temporary harness files are not publication assets.

The root integrator still owns the complete production build, real Reader entry/alias URLs, Back/Forward and language/base-path routing, and integration-level hidden/bfcache checks. Unit and harness tests do not establish empirical scientific calibration. No commit, push or deployment is performed by this subtask.

The current native-Reader continuous-water refinement and explicit legacy checks are recorded in [REFINEMENT-20261025.md](REFINEMENT-20261025.md). Earlier harness numbers above belong to their stated older source, not the new water illustration.
