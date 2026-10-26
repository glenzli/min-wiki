# Local refinement and validation — 2026-10-25

Scope: `topics/earth/systems/**` and `topics/earth-systems/**`; base `705f68bb44d7cf8da77a9f40cf87c83b5a4f8bff`. Default entry remains the ocean question. Explicit old sky/conditions links remain supported and identified as saved observations.

## Changed contract

`model.ts` retains EOS-80 values and all 13 state keys. It now supplies two continuous equal-area display regions, a shared explanation boundary and the same 32 stable circle/diamond identities. Their reversible geometric deformation shows density order; equal display area is not a claim of closed-parcel mass, heat or salt conservation. Markers remain inside their source region, including the diagonal midpoint. `waterScene.ts` retains SVG nodes and projects that same frame into a softly lit fixed water section; colors identify origin and the dashed boundary is not a membrane.

The main section occupies the full workspace. Temperature/salinity and play/scrub stay near the experiment; presets/density readouts and the multi-basin mechanism diagram start collapsed. User-started finite playback uses `finitePlayback.ts`, seven display seconds and the same `waterProgress`. Changing a condition, scrubbing, leaving/pausing or disposing stops it; it does not auto-run or loop. The clock is presentation time, not sinking speed.

Chinese/English runtime copy, native learning text, static projection and narration cues now describe the continuous bodies, origin coding and finite/reversible explanation. The first Chinese narration explicitly compares equal-sized volumes rather than ambiguous equal amounts. Unrelated sky/habitability references were removed from the default ocean manuscript; their legacy runtime sources remain in their own lenses.

## Scene review

| Scene | Current inspection and refinement |
| --- | --- |
| Side-by-side A/B | Actual Chinese and English Reader views inspected. Water volumes, lit surface, side face and base contact replace isolated marks on an empty rectangle. All 32 marks retain their identities. |
| Dense A, midpoint and endpoint | Actual cold/salty midpoint (5°C, SP 38, 50%) and played endpoint inspected; A = 1030.1 kg/m³, B = 1025.2 kg/m³ at displayed precision. A ends below B. |
| Cold but fresher A | Actual 5°C, SP 30 endpoint inspected. A remains lighter and above B, preserving the meaningful temperature/salt counterexample. |
| Equal-density contrast | Actual 15°C, SP 34 endpoint inspected. The view keeps side-by-side origin regions and reports no clear density stratification within the display band. |
| Playback and controls | Actual click starts `continuous` playback with 32 marks; endpoint becomes `complete` at 100% with the play label restored. Editing temperature paused at 6%; a later read confirmed that fraction remained unchanged. |
| Ocean-scale mechanisms | Expanded original multi-basin diagram inspected after the shared theme fix. It retains surface wind loops, branching deep exchange and several return mechanisms, with explicit non-geographic/non-conveyor limitations. |
| Legacy sky | Original `earth/?chapter=systems&earth.systems.observation=sky&earth.systems.skyHour=18` redirected to the independent topic, retained hour 18 and created one Earth canvas. Globe illumination, EQ-A and the distinct magnetosphere section remained visible. |
| Six legacy condition lenses | Orbit, atmosphere, gravity, interior, Moon and magnetism selected through the live UI. Each retains inference and missing-assumption columns; the orbit case retains its proportional irradiance chart. |

## Evidence

- Paired owner test command: `node --import tsx --test topics/earth/rocks/tests/*.test.mjs topics/earth/systems/tests/*.test.mjs`: 28 passed, 0 failed. Ten water/system tests include independent EOS check values, all five presets and 101 progress samples each for coverage, marker inclusion and bounded continuous movement; sky, camera, strict codec and bilingual shape checks remain covered.
- Final `npm run typecheck`, `npm run check:i18n` (7,522 messages / 83 English namespaces), `npm run check:entries` and scoped `git diff --check` passed; 43 local Markdown targets across the paired nine documents passed. Root owns complete Reader/build/review gates.
- Actual Reader at `http://127.0.0.1:55291/encyclopedia/`; screenshots observed at 1280×720 in the in-app browser. This child did not change viewport or browser appearance. Root owns the 390×844 Chinese/English matrix and final reduced-motion/media acceptance.
- Chinese cold/fresher, dense midpoint, neutral and English dense endpoint had 32 live marker nodes and no horizontal overflow. Restoring the English default route did not expose the legacy scene selector or start playback.
- Evidence in `/tmp/earth-rocks-ocean-refine-20261025/`: `ocean-zh-start.jpg`, `ocean-zh-cold-fresher-end.jpg`, `ocean-zh-dense-mid50.jpg`, `ocean-zh-dense-play-end.jpg`, `ocean-zh-matched.jpg`, `ocean-en-dense-end.jpg`, `ocean-zh-global-mechanisms.jpg`, `ocean-legacy-sky18.jpg`, `ocean-legacy-conditions.jpg`.

Owner runtime/test input fingerprint (same sorted path/file-hash method described in the paired rock note): `1ed37f19945fc3d2225a9dfa39cdb126642c4283f4ee3a7fa923cd88e7d594fe`. Shared theme/Reader inputs remain the integrator's evidence boundary.

## Scientific and delivery limits

The EOS pressure/temperature/salinity boundary is unchanged. No flow field, diffusion, turbulent mixing, actual water-mass geography, global conveyor trajectory or climate forecast is computed. [NOAA thermohaline circulation](https://oceanservice.noaa.gov/education/tutorial_currents/05conveyor1.html) and [wind-driven upwelling](https://oceanservice.noaa.gov/facts/upwelling.html) were rechecked; [sources.md](sources.md) preserves EOS/TEOS-10/mixing qualifications. The basin illustration stays schematic and no photograph or generated bitmap was added.

No commit, push, installation or deployment was performed. Earlier Linux harness timing/resource figures in README concern the earlier source and are not new-renderer performance evidence.
