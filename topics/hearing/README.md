# 耳朵怎样听见声音？ / How do ears hear sound?

A topic-owned, silent exploration of air-conduction hearing for children aged 4–6, with a deeper academic reading mode. Original SVG anatomy includes a pinna and canal, eardrum, ossicles, cochlear coil, uncoiled membrane view and a local inner-hair-cell mechanism. Separate scene coordinates keep every structure mounted as cameras move; the same progress drives all views. Neither reading mode nor view selection resets the process.

Manual play runs one finite sequence. Scrubbing and stage buttons control the same state. Pitch continuously moves a qualitative response envelope toward the base or apex; amplitude changes displacement independently. The hair-cell illustration separates bundle deflection, cellular response and a subsequent auditory-nerve signal. No audio APIs, background loop or external images are used. Native buttons and ranges support keyboard and touch. Phase announcements avoid per-frame screen-reader output; reduced-motion preference resolves finite transitions; hiding stops playback, and pagehide cleans up transitions.

`model.ts` owns explanatory stages and bounded place/displacement functions. `scene.ts` owns the scoped teaching illustration; `study.ts` owns interactions and lifetime, consumed by the sound journey. `panel.html` and `panel.css` preserve anatomy and long explanations without a second page shell. `main.ts` is now a compatibility redirect to `sound-vibrations?chapter=ear`. The shared journey carries qualitative pitch/amplitude conditions while preserving independent observation clocks; its synthesized hertz values do not calibrate cochlear position. `learning.json` remains the legacy topic's three academic sections and four narration segments; the primary journey has its own complete summary.

## Scientific limits

The drawings are at different scales and omit the round-window detail, a complete organ of Corti, outer-hair-cell active feedback, tectorial-membrane mechanics and detailed neural relays. Sound is mechanical before transduction; air never travels through nerves. A hair-cell receptor potential is distinguished from an auditory-nerve action potential. The amplitude slider is not a decibel scale, and the silent comparison is not a hearing test. Timing, geometry and colors are explanatory choices.

Sources reviewed 2026-09-30:
- NIH / NIDCD, [How Do We Hear?](https://www.nidcd.nih.gov/health/how-do-we-hear)
- UTHealth, [Auditory System: Structure and Function](https://nba.uth.tmc.edu/neuroscience/m/s2/chapter12.html)
- NIH / NIDCD, [Sensory Cell Development and Function](https://www.nidcd.nih.gov/research/labs/section-sensory-cell-development-and-function)

Focused model tests cover causal ordering, pitch/amplitude independence, input bounds and finite displacement. Catalog registration belongs to the sound journey; acceptance includes the composed interface and the legacy entry redirect.


## September 30 refinement

The main illustration carries one short, stage-specific explanation. Children see one observation window at a time, with the selected closeup and process state retained when reading modes change. Academic mode keeps the whole ear and the detail together and adds a changing mechanism paragraph, variable definitions, model limits and a primary-source reading link beside the demonstration. The middle-ear pressure relation is an ideal force/area and lever approximation, not a computed transfer function or an energy source.

Anchor A links the cochlear coil to its uncoiled schematic. Anchor B marks a representative inner hair cell in the qualitatively stronger-response region; it selects a different region when pitch changes. The detail is magnified again to explain transduction, not an image of a measured individual cell. Pitch interpolates from the current response position, independently of the process clock. Interrupted transitions settle at the selected conditions before another chapter resumes. Playback and lens controls share the observation toolbar to leave room for the anatomy.

## Local arrival and close-up motion · 2026-10-01

`selectedHairCell` selects the retained cell nearest the qualitative response peak. The B marker, strip cell and enlarged cell now consume that location's membrane state. Before its wavefront arrives, the enlarged cell, bundle and fluid remain at rest and local transduction cues are gated off. Arrival comes from the wavefront coordinate, independently of displacement zero crossings. Backward scrubbing and pitch changes recompute the same local state; no new clock or lifecycle is introduced.

The close-up movements are enlarged qualitative projections that preserve causal order. They do not solve or assert an exact phase relation between basilar-membrane displacement, fluid motion and bundle deflection. Bilingual captions and model limits state this distinction. NIH/NIDCD's [How Do We Hear?](https://www.nidcd.nih.gov/health/how-do-we-hear), rechecked on 2026-10-01, supports the sequence from cochlear traveling motion to hair-cell response. Renderer regression tests exercise the production SVG renderer before local arrival, during response, across pitch/amplitude changes and after rewind; actual browser and integration validation belong to the root task.


## Zero-input comparison · 2026-10-01

`strength=0` now gives exactly zero illustrated mechanical amplitude, replacing the
old 35% visibility floor. It also suppresses this input's traveling packet, local
transduction and neural cues, the ear-route signal and brain response marker.
Positive input retains the qualitative stage sequence; no detection threshold,
loudness law or neural firing-rate curve has been invented. This drawing shows
input-evoked changes, not resting or spontaneous neural activity. Bilingual panel
text and zero-input stage captions make that scope explicit. The selected pitch,
observation position and progress remain available while input is zero.

零振幅现在是真正的无输入对照：机械位移与该输入诱发的换能、神经、脑部标记
均为零；不把真实安静状态说成所有神经停止活动。正振幅仅控制示意位移，
没有推算听觉阈值、响度或神经放电率。
