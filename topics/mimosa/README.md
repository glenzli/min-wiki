# 会动的植物 / Plants in motion

Bilingual botanical journey comparing mimosa touch responses, Venus flytrap closure and young-shoot phototropism. Each station keeps its own experiment state and can run in a compact or immersive presentation. The original mimosa station retains local/wider stimulation, four selectable pinnae, a five-stage response and pulvinus/cell views. All playback is user-started; both reading modes retain the same scientific boundaries.

## Scientific contract

A touch triggers electrical and calcium signaling; movement occurs at the pulvinus through ion redistribution, water redistribution and turgor differences. Leaflets close sequentially along a pinna. Recovery is slower in nature and compressed here. A stronger/wider response can reach other pinnae and the main pulvinus, but this is one illustrative case, not a deterministic stimulus-strength law. The primary pulvinus and leaflet-base pulvini are distinct levels. The magnified drawing is a schematic of motor tissue and vascular tissue, not a histological reconstruction. Water values are normalized trends, not measured concentrations or pressure.

The model tests causal order, local versus extended responses, temporary turgor loss and full recovery. It does not claim a complete electrophysiology model. Naturalistic geometry uses deterministic local variation in leaflet size, orientation, veins, shadows and pinna placement; no random noise is added to scientific state. No photographic or generated raster assets are used; the topic owns its vector cover and Canvas artwork.

## Sources / 依据

- Hagihara et al. (2022), *Calcium-mediated rapid movements defend against herbivorous insects in Mimosa pudica*, Nature Communications 13, 6412. https://www.nature.com/articles/s41467-022-34106-x — simultaneous calcium/electrical measurements, touch versus wounding, pulvinus and herbivory experiments.
- Allen (1969), *Mechanism of the Seismonastic Reaction in Mimosa pudica*, Plant Physiology. https://pubmed.ncbi.nlm.nih.gov/16657174/ — potassium efflux and turgor mechanism.
- Hagihara & Toyota (2020), *Mechanical Signaling in the Sensitive Plant Mimosa pudica L.* https://pmc.ncbi.nlm.nih.gov/articles/PMC7284940/ — synthesis and remaining mechanistic questions.

## Earlier mimosa validation (historical)

`node --import tsx --test topics/mimosa/tests/model.test.mjs`

Focused model tests passed (4/4 for this topic); scoped strict TypeScript and local English coverage/interpolation checks passed. Live desktop browser checks passed in Chinese and English at 1280 px: canvas rendering and labels, primary interactions, advanced explanations and no horizontal overflow; browser warning/error log was empty. Hydrangea current-bloom isolation and the acidic/aluminum-rich white control were verified. Root integration owns registration, bilingual platform metadata, packaged build and mobile checks. No commit, push or deployment is part of this topic work.


## Moving-plants journey — 2026-09-22

The stable `/topics/mimosa/` route now presents three related experiments: mimosa touch,
Venus flytrap stimulus integration and young-shoot phototropism. `?plant=flytrap` and
`?plant=seedling` select the added stations; no parameter or an invalid one opens mimosa.
Catalog identity and covers remain stable; the mimosa cover represents the first case.
The title, searchable names, learning notes and narration cover the series in both languages.

The original mimosa model and anatomical cell identity are retained. `main.ts` owns plant
selection and browser history. Switching plants pauses playback and retains each case's
progress and conditions; changing conditions explicitly begins a new trial. Immersive mode
uses the shared presentation helper and hides explanation panels without changing experiments.
`movementStudy.ts` owns bounded state and user-started playback for the two new experiments;
`movementModel.ts` owns their scientific projections and `movementScene.ts` owns drawing.

Flytrap touch scenarios compare one brief stimulus, two close stimuli and two separated by
40 simulated seconds. The illustrative signal decays between stimuli; a 30-second teaching
window allows rapid closure. That threshold is not universal, and one slow physical deflection
can itself produce multiple electrical signals. Closure is shown slowly, with distinct signal
and geometry stages. The diagram is a projection of lobe folding/curvature change, not a
biomechanical shell solver. It omits digestion, prey dynamics and reopening. Reset is replay.

The flytrap's whole view now gives the lobes more of the shallow canvas, makes trigger hairs,
surface texture and marginal cilia legible, and points to a hair rather than leaving the trigger
only in prose. As closure progresses, a faint previous-open outline stays for comparison. The
detail view places an illustrative changing lobe cross-section between the signal bar and touch
timeline. This cross-section and the open outline are visual comparisons, not measured curvature
or a second biological trap. Children choose one of three named trials; academic mode also exposes
the simulated touch interval and the topic model's bounded exponential signal expression. The
normalized signal is not a calcium concentration, and this renderer does not solve buckling.

The shoot experiment compares directional light with a separate two-sided-light control.
Both cell rows elongate; the shaded side elongates more. One continuous constant-curvature
stem uses those side lengths, retaining its base and cotyledons. The detail view follows the
same growing stem region and shows its side-length difference. Relative elongation is not
measured auxin concentration or a calibrated growth rate, and replay is not biological reversal.
Light direction changes start a fresh trial instead of instantly redirecting an already-grown stem.
This is shoot phototropism under otherwise suitable conditions, not a rule for roots or all organs.

Sources added: [Suda et al. 2020](https://www.nature.com/articles/s41477-020-00773-1),
[Forterre et al. 2005](https://www.nature.com/articles/nature03185),
[Burri et al. 2020](https://journals.plos.org/plosbiology/article?id=10.1371/journal.pbio.3000740),
and [Ding et al. 2011](https://www.nature.com/articles/ncb2208).
See [follow-up validation](../../docs/moving-plants-20260922.md) for current evidence.
