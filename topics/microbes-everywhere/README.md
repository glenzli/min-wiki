# 微生物与健康 / Microbes and health

2026-10-25: the existing microbial workspace now follows six questions: microbial neighbors → bacteria → diverse viruses → infection at body sites → immune responses → cleaning and medicines. The introduction does not equate microbes with disease. The default virus example is influenza; norovirus supplies an envelope contrast, and phage is an explicitly separate bacterial-virus example.

## Six design decisions

1. **Question:** how do bacteria and viruses differ, cause illness and meet different defenses?
2. **Conditions:** habitat; bacterial shape, structure/exchange/division and resources; virus and structural/process view; example body site and barrier outcome; matching immune memory; intervention, target and an antibacterial-resistance contrast.
3. **Observation:** retained structures, a continuous genome/assembly/release path, multiplication and tissue injury, extracellular antibody binding versus infected-cell clearance, removal versus inactivation and target-specific inhibition.
4. **Cause:** entry and compatible cellular conditions precede replication; injury and inflammation are distinct; effectors and interventions consume the same selected case, progress and susceptibility state.
5. **Misconceptions:** presence is not illness; shape is not pathogenicity; a phage is not a generic human virus; a bacterial envelope is not a viral envelope; antibodies do not enter cells as soldiers; antibiotics do not treat viral infection; symptom relief is not pathogen clearance.
6. **Evidence/bounds:** primary institutional and textbook sources are linked per scene and in `learning.json`. Colors, counts, geometry and time are explanatory, not micrographs, biological rate estimates, infection probabilities or clinical predictions. No culture protocols, diagnostic classifier or medicine dose is implemented.

## Ownership

- `workspaceModel.ts`: validated URL state, bounded remembered progress per comparison and the only user-started finite clock. Structural observation does not admit process playback.
- `healthModel.ts`: pure qualitative human-virus, disease, immune and intervention states. Influenza genomes copy in the nucleus and acquire an envelope at budding; norovirus copies in cytoplasmic structures. Blocked entry cannot silently generate offspring or tissue injury. Antibodies, T-cell clearance, removal, inactivation, wall-synthesis inhibition, release inhibition, symptom relief and immune preparation remain different effects.
- `healthContent.json`, `healthReading.ts`: paired scene text, current-case explanation, limits and source mapping. The ordinary and scientific views describe one state; neither creates a separate experiment.
- `specimen3d.ts`: one retained Three.js structural viewport, procedural illustration materials, cutaway, bounded camera and complete GPU/gesture/resize cleanup. Only the reference rod is given detailed bacterial internal layers; round/spiral specimens compare shape. Each viral example has its own protein/envelope/genome construction and no ribosomes. This owner has no autonomous animation timer.
- `healthScene2d.ts`: local tissue, viral-cycle, immune and intervention diagrams. Camera close-ups change the viewBox of the same coordinates. The drawing retains organism/offspring identities, distinguishes flu budding from internal component assembly, and keeps immune binding outside cells separate from infected-cell clearance.
- `healthRenderer.ts`: selects a responsibility-specific factory through the workspace's existing `SceneLease`. At most one structural GPU viewport or one SVG process is mounted; loading, cancellation, supersession, retry and failure remain bounded.
- `workspace.ts`: composition, one compact question/conditions/explanation toolbar, native controls, URL history, playback, hidden-page pause, bfcache and disposal. Conditions and explanation use the same shared Reader panels; mobile opens the requested panel immediately before the scene.
- `workspaceRenderer.ts`: retained environment and detailed bacterial/phage SVG factories; it does not mount the former pages. `bacteria/` retains membrane exchange and DNA-before-division mechanics. `viruses/` retains the T4-like host/camera/assembly/lysis model. `scene.ts` retains representative habitat art.

## Identities and scientific limits

Environment E is an illustration, not a specimen identification. B is a thick-walled reference rod without an outer membrane. The wound example uses a potentially pathogenic staphylococcus, distinct from B. Phage host H has an outer membrane/thin wall and is also distinct. Normal microbiota, the human infection examples and these structural references are not silently transformed into one organism.

The airway/influenza, intestinal/norovirus and broken-skin/staphylococcal cases are examples, not a one-to-one disease atlas. Exposure, colonization, infection and symptomatic disease differ. The wound route illustrates tissue-damaging products in one pathogenic example; it does not claim all bacteria use that route. Innate and adaptive immunity overlap in reality. The selected successful immune sequence does not imply that all infections resolve unaided, that all virions are removed, or that memory guarantees protection.

Washing carries some residents away without requiring inactivation; some remain visible. Alcohol-based hand sanitizer is compared on susceptible objects and norovirus without making a universal sterilization claim. The antibiotic example blocks wall synthesis in a growing susceptible bacterium; a pre-existing resistant contrast retains that target's function. Other antibiotics can inhibit other bacterial processes. The antiviral example targets influenza neuraminidase-mediated release and is not a generic antiviral treatment. Fever/pain relief leaves the illustrated pathogens present. Vaccination uses an influenza antigen/memory example rather than treating an ongoing infection or implying a corresponding vaccine for every pathogen.

Adults use medicines and disinfectants according to medical advice or labels. Surface cleaning, internal treatment and advance immune preparation cannot substitute for one another. Existing handwashing and drinking-water topics retain their procedural and heating qualifications; this topic links to them.

## Route and lifecycle contract

The six `chapter` identifiers are stable and chapter changes save the departing process before adding history. Current-case progress can be restored by URL; other visited contrasts are bounded in-memory state, not a promise of a complete multi-case save file. View/cutaway/reading changes preserve scientific conditions and progress. Deliberately selecting a separate comparison reveals its separately remembered history. One process runs to a finite endpoint; structural views have no background process loop.

Legacy `/bacteria/` and `/viruses/` redirects retain language, base, hash and valid parameters. Specific old virus `host`, `view` or `p` links select the phage case. The unqualified virus chapter now starts with a human-virus structure. `flat=1` selects a usable 2D structural alternative; a failed 3D window provides retry/2D continuation without resetting its selected example. Hide/page exit stop unnecessary work and reject late loads.

## Checks

Focused:

```sh
node --import tsx --test topics/microbes-everywhere/tests/*.test.mjs topics/bacteria/model.test.ts topics/viruses/tests/*.test.mjs
```

Final acceptance also uses repository type/i18n/image/entry/editorial gates, repository tests, a complete Reader consumer build, and actual bilingual desktop/390px interaction checks. A passing model test is neither visual acceptance nor clinical validation. No commit, push or deployment is implied.
