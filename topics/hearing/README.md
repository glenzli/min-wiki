# 耳朵怎样听见声音？ / How do ears hear sound?

A topic-owned, silent exploration of air-conduction hearing for children aged 4–6, with a deeper academic reading mode. Original SVG anatomy includes a pinna and canal, eardrum, ossicles, cochlear coil, uncoiled membrane view and a local inner-hair-cell mechanism. Separate scene coordinates keep every structure mounted as cameras move; the same progress drives all views. Neither reading mode nor view selection resets the process.

Manual play runs one finite sequence. Scrubbing and stage buttons control the same state. Pitch continuously moves a qualitative response envelope toward the base or apex; amplitude changes displacement independently. The hair-cell illustration separates bundle deflection, cellular response and a subsequent auditory-nerve signal. No audio APIs, background loop or external images are used. Native buttons and ranges support keyboard and touch. Phase announcements avoid per-frame screen-reader output; reduced-motion preference resolves finite transitions; hiding stops playback, and pagehide cleans up transitions.

`model.ts` owns explanatory stages and bounded place/displacement functions. `scene.ts` owns the teaching illustration; `main.ts` owns interactions and lifetime. `learning.json` provides three academic sections and four narration segments per language, with visual directions separate from spoken prose. Topic-local catalog proposals await coordinator integration.

## Scientific limits

The drawings are at different scales and omit the round-window detail, a complete organ of Corti, outer-hair-cell active feedback, tectorial-membrane mechanics and detailed neural relays. Sound is mechanical before transduction; air never travels through nerves. A hair-cell receptor potential is distinguished from an auditory-nerve action potential. The amplitude slider is not a decibel scale, and the silent comparison is not a hearing test. Timing, geometry and colors are explanatory choices.

Sources reviewed 2026-09-17:
- NIH / NIDCD, [How Do We Hear?](https://www.nidcd.nih.gov/health/how-do-we-hear)
- UTHealth, [Auditory System: Structure and Function](https://nba.uth.tmc.edu/neuroscience/m/s2/chapter12.html)
- NIH / NIDCD, [Sensory Cell Development and Function](https://www.nidcd.nih.gov/research/labs/section-sensory-cell-development-and-function)

Focused model tests cover causal ordering, pitch/amplitude independence, input bounds and finite displacement. The coordinator owns catalog registration, the final full build, and production browser acceptance.
