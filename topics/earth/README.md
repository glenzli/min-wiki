# Earth digital museum

The museum connects eight independently loadable galleries. It is based on GitHub `min-wiki` main `14d6fa684225db0f441ac8bd5b72bb77990ac662` and the separately verified `wiki-reader` main `c1fc4c9c89aa8a5c9d4939ba0a26268de8d15210`, not unsynchronized desktop files.

## Learning design

1. **Question:** how did one layered planet become the connected rock–water–air–life system we inhabit?
2. **Conditions:** choose depth, seismic wave/station, plate interaction, geological time window, oxygen sources and sinks, rock processes, crystal connections/growth conditions, mineral evidence, ice and water budgets, seawater properties, local solar time and habitability questions.
3. **Observation:** the same model state drives diagrams, 3D geometry where useful, selected explanations and readouts. Comparison conditions can produce different outcomes.
4. **Causal path:** formation/differentiation → deep structure and moving plates → changing rock material and mineral structures → long biological/environmental history → present exchanges of matter and energy. This is a learning route, not a claim that every process forms one inevitable sequence.
5. **Misconceptions:** solid mantle is not a global magma ocean; lithosphere is not synonymous with crust; meteorites are not samples drilled from the core; oxygen production is not atmospheric accumulation; metamorphism is not melting; rocks are not minerals or automatically ores; ancient glaciation is not the last ice age; day/night does not cause auroras.
6. **Evidence and limits:** every gallery distinguishes samples/measurements, inference, model budgets and illustrative shape. Numeric ranges and unresolved histories are qualified in both languages. Specific source claims belong to each gallery's source ledger and learning references.

## Gallery ownership and native routes

| Gallery | Scientific owner | Independent route |
| --- | --- | --- |
| Interior, evidence and plates | `interior/` | `/topics/earth-interior/` |
| Deep time, life and oxygen | `history/` | `/topics/earth-history/` |
| Ancient communities, evidence and plants | `../earth-life/` | `/topics/earth-life/` |
| Rock processes and specimens | `rocks/` | `/topics/earth-rocks/` |
| Crystals, properties and ores | `../earth-minerals/` | `/topics/earth-minerals/` |
| Ore formation, occurrence and uses | `../earth-ores/` | `/topics/earth-ores/` |
| Glacial history, reflection and ice budgets | `../earth-climate/` | `/topics/earth-climate/` |
| Ocean, sky and habitability | `systems/` | `/topics/earth-systems/` |

`wiki.json` remains the only registry. These eight routes use `parentTopic: earth` so discovery returns one museum, while each gallery has its own full manuscript, native entry and working direct link. No old topic or route is replaced. Existing volcano, atmosphere, water-cycle, Earth–Moon and seasons entries remain independently owned and linked.

`studyContract.ts` defines the timer-free mounting interface. `main.ts` coordinates one gallery at a time; `singleGallery.ts` mounts the same module for its independent route. Both preserve bounded, gallery-prefixed query state, language, base and static-reading anchors. Each gallery validates its own enums, ranges and process history. Camera movement does not advance scientific time. Focus changes preserve the same DOM/scene. Hidden pages pause; non-persisted page exits dispose resources. Lazy results carry a generation guard.

## 3D and performance

`threeStage.ts` owns presentation only: bounded camera/zoom, touch and keyboard orbiting, studio lighting where appropriate, on-demand rendering, resize/visibility handling and GPU lifetime. The sky gallery replaces studio lights with its fixed Sun. Galleries own their actual mesh, texture, scientific selection and scales. DPR is capped at 1.35 on narrow/coarse devices and 1.5 otherwise. There is no idle animation loop. Scenes are disposed before mounting the next one; textures, materials, geometry, observers and the WebGL context are released. SVG/Canvas and complete static reading remain available when WebGL or assets fail.

The original specimens, lattice diagrams, glacier landscape and deep-Earth textures are illustrative geometry rather than photogrammetric scans. Existing Earth textures retain their source attribution. Procedural details are deterministic and not new observation data. Actual performance and visual inspection evidence is recorded separately in the validation report, with headless software-rendering results distinguished from real mobile hardware.

`finitePlayback.ts` supplies a finite, initially paused observation clock for selected processes. Its fraction is not a universal geological time: each gallery maps it onto its own existing material/growth/ice/preservation state and labels that meaning. Playback stops at the endpoint, on pause, when its actual figure leaves view, in hidden documents and on disposal. Reduced-motion mode visits explicit stages. `routePersistence.ts` retains every live state update in memory while limiting URL/link writes during playback to twice a second; pausing and normal navigation flush the latest snapshot. A stopped process has no animation loop.

## Museum-photo reference handling

All nine supplied JPEGs were materialized through Library into the consumer cloud environment, verified readable and viewed as actual pixels before planning. They suggested oxygenation, rocks/minerals, shallow/deep structure evidence, habitability conditions, day/night, auroras and ocean circulation. Scope was subsequently expanded at the user's request to minerals, ore, glacial history and separate 3D galleries. No museum JPEG, visitor image, display asset or copied panel text is included in this repository. Differences and oversimplifications in panel dates, mineral names and habitability claims were checked against scientific sources.

## Preview and validation

The complete paired preview uses the content branch `codex/earth-encyclopedia-20261025` and Reader branch `codex/earth-gallery-navigation-20261025` in sibling checkouts. Install dependencies in both repositories, then run from the content repository:

```sh
npm ci --cache /tmp/earth-npm-cache
npm run prepare:entries
WIKI_READER_ROOT=../wiki-reader npm run dev
```

The usual URL is `http://localhost:5175/encyclopedia/topics/earth/?lang=zh`. Individual gallery IDs above work under the same base, in both languages. `?static=1` reads the complete manuscript without loading its study engine. The dependency remains pinned to the verified public Reader main until a separate publication decision; the paired checkout additionally preserves live state across ordinary manuscript and read-only links within an integrated topic family.

The full repository gate is `npm run check`. Browser evidence must come from the final production output, in addition to each module's isolated harness. No deployment, remote push or main-branch merge is authorized by this preview workflow.
