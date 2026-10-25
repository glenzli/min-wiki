# Sources and reconstruction provenance

Sources checked 2026-10-25. Scientific sources constrain this original implementation; no photographs, dioramas, mesh scans, museum page artwork or textures were copied. Every scene is labeled as a reconstruction. Colors, spacing, poses and counts are authored and not observations. Stable node IDs track taxa or explicitly named functional groups, never a single individual across geological time.

## Early microbial ecosystems and oxygenation

- [Smithsonian NMNH: History of life on Earth](https://naturalhistory.si.edu/education/teaching-resources/life-science/early-life-earth-animal-origins). Institutional overview of early microbial ecosystems and later animals; historical rounded period-boundary ages on this page are not used as the current stratigraphic scale. Microbial production and sustained oxygen accumulation are distinct.
- [Farquhar, Bao & Thiemens 2000, Science 289:756–758](https://pubmed.ncbi.nlm.nih.gov/10926533/), DOI [10.1126/science.289.5480.756](https://doi.org/10.1126/science.289.5480.756). Sulfur-isotope evidence constrains atmospheric processing/redox conditions; it does not identify the organism that produced oxygen.
- [Noffke et al. 2008, GSA Today 18(10)](https://www.geosociety.org/gsatoday/archive/18/10/pdf/i1052-5173-18-10-4.pdf). Microbially induced sedimentary structures and modern comparisons. Lamination alone is not sufficient to assign cyanobacteria or oxygenic photosynthesis.

The two microbial windows are representative about 2.7 Ga and about 2.4–2.1 Ga. No land plants or animals are placed here. Oxygenation restricts some anaerobic surface roles while anoxic habitats persist; the interface never extinguishes every anaerobe.

## White Sea Ediacaran organisms, about 558 Ma

- [Bobrovskiy et al. 2018, Science](https://doi.org/10.1126/science.aat7228). Sterols in specific organically preserved Dickinsonia specimens support animal affinity; this does not resolve every Ediacaran taxon or its detailed feeding anatomy.
- [Ivantsov et al. 2019: Traces of locomotion of Ediacaran macroorganisms](https://www.mdpi.com/2076-3263/9/9/395). Body/trace associations, repeated impressions and scratch patterns support interpretations with limits on unique trace makers.
- [NHM 2022: Evidence of the world’s oldest meal may have been discovered](https://www.nhm.ac.uk/discover/news/2022/november/evidence-worlds-oldest-meal-may-have-been-discovered.html), describing [Bobrovskiy et al., Guts, gut contents, and feeding strategies of Ediacaran animals](https://doi.org/10.1016/j.cub.2022.10.051). Kimberella biomarker and substrate interpretations. We do not reproduce the article’s “oldest meal” claim as a museum ranking.

Our forms remain in a White Sea regional window rather than combining Charnia at Mistaken Point with White Sea forms as one observed assemblage. “Dickinsonia” is not classified as a modern jellyfish despite its Chinese common name. No eye, tooth, radula or gut is invented in the drawing.

## Burgess Shale, about 508 Ma

- [Royal Ontario Museum: Burgess Shale](https://burgess-shale.rom.on.ca/). Community and exceptional-preservation context. This window is much later than the beginning of the Cambrian diversification.
- [ROM: Olenoides serratus](https://burgess-shale.rom.on.ca/fossils/olenoides-serratus/). Trilobite axial/lateral lobes, dorsal segments and preserved appendages. The illustration does not imply that all trilobites have this species’ body.
- [ROM: Anomalocaris canadensis](https://burgess-shale.rom.on.ca/fossils/anomalocaris-canadensis/). Complete specimens constrain frontal appendages, stalked eyes, flaps and tail structure.
- [Bicknell et al. 2023, Proceedings B 290:20230638](https://doi.org/10.1098/rspb.2023.0638). Functional/biomechanical support for fast soft-prey capture; this is not a directly observed diet. No mandatory shell-crushing link to Olenoides is rendered. A generic soft-prey node explicitly does not identify a proven individual prey species.

## Carboniferous wetlands and original plant meshes, about 310 Ma

- [University of Michigan Museum of Paleontology: fossil plants](https://umorf.ummp.lsa.umich.edu/wp/mi-backyard-fossils-plants/). Lepidodendron-type stem surface/leaf cushions and calamite/foliage context.
- [Kentucky Geological Survey: Calamites](https://www.uky.edu/KGS/fossils/fossil-month-12-2021-calamites.php). Nodes, internodes and branch scars. Many fossils are pith casts; cast ribs are not uncritically presented as an outer epidermis. The page was searchable during checking; its direct fetch intermittently returned 502.
- [NPS: seed fern fossil](https://www.nps.gov/articles/seed-fern.htm). Supports the distinction between fern-like foliage and seed reproduction. Its actual Hermit Shale specimen is about 285 Ma (Permian), not a Carboniferous specimen; the implementation says so and does not transfer it into the 310 Ma scene. Its simplified claims about “advanced” plants and universal extinction are not adopted.
- [Kenrick & Strullu-Derrien 2014: The origin and early evolution of roots](https://pmc.ncbi.nlm.nih.gov/articles/PMC4213089/). Earlier small land plants, root structure and multiple origins; the coal forest is not presented as first land colonization.
- [NHM: How trees changed the world](https://www.nhm.ac.uk/discover/how-trees-changed-the-world.html). Vegetation, carbon stores and surface environments. We distinguish storage in living tissue from long-term burial.
- [Nelsen et al. 2016, PNAS: Delayed fungal evolution did not cause the Paleozoic peak in coal production](https://repository.si.edu/handle/10088/28188). Rejects the absence-of-lignin-decomposers story; climate and tectonic accommodation matter. Decomposers are present in the scene.

`geometry.ts` builds its own curved, tapered axes and lamina meshes. The lycopsid trunk has many separate diamond leaf cushions plus smaller upper leaf scars; branches carry narrow microphylls, without a modern palm crown. The calamite reconstruction emphasizes structural nodes, internodes and whorled branches, with modest longitudinal texture rather than claiming pith casts are bark. The seed-fern exhibit is a compound-frond fragment with pinnae, pinnules, midveins and lateral venation; it adds no seed at an unverified attachment. Counts, posture, colors and crown reconstruction are illustrative; meshes have no measured allometry, scan provenance or identification guarantee. Mobile/desktop tessellation changes geometric resolution without changing scientific identity.

## End-Permian and K–Pg: different mechanisms, uneven survival

- [Penn et al. 2018, Science: Temperature-dependent hypoxia…](https://pubmed.ncbi.nlm.nih.gov/30523082/). Warming, oxygen supply and oxygen demand as an evidence-tested physiological model; other stresses and regional differences are retained.
- [Clapham et al. 2007: Prolonged Permian–Triassic ecological crisis recorded by molluscan dominance](https://pmc.ncbi.nlm.nih.gov/articles/PMC1941817/). Community change and recovery are not the instantaneous return of original species. Broad brachiopod/bivalve nodes preserve lineage/guild anchors with explicit partial survival.
- [NPS: Mass extinctions through geologic time](https://www.nps.gov/subjects/fossils/mass-extinctions-through-geologic-time.htm). Different events, selective losses and reef-building groups. This museum uses no mismatched species/genus/family extinction percentages.
- [Smithsonian NMNH: Mass extinction—solving the dinosaur mystery](https://naturalhistory.si.edu/education/teaching-resources/paleontology/mass-extinction-solving-dinosaur-mystery). Impact and paleobotanical evidence around 66 Ma, beyond non-avian dinosaur losses. End-Permian volcanism and K–Pg impact are not interchangeable stress buttons.
- [Field et al. 2018, Current Biology: Early evolution of modern birds structured by global forest collapse…](https://doi.org/10.1016/j.cub.2018.04.062). Surviving avian branches and evidence-constrained ecological hypotheses; not all birds survive and a seed diet does not guarantee survival. Mammals existed and diversified before K–Pg, with selective losses during it.

The pre/post controls switch representative snapshots. They do not claim the same individual survives, the whole post-crisis system globally recovers at once, or that the post-crisis composition is the next day. Lost lineage ghosts only preserve comparison locations. Ecological arrows never serve as ancestry arrows.

## Late Pleistocene northern mammoth-steppe mosaic

- [NPS: Pleistocene megafauna in Beringia](https://www.nps.gov/articles/aps-17-1-4.htm). Regional vegetation, radiocarbon occurrences, overlap and different hypotheses concerning humans/climate. Lack of one type of archaeological site is not treated as proof against every human influence.
- [MacDonald et al. 2012: Pattern of extinction of the woolly mammoth in Beringia](https://pmc.ncbi.nlm.nih.gov/articles/PMC3621396/). Synthesis of regional population, environment and human evidence; different mainland/island endpoints are not conflated. The scene’s about 40–12 ka range is a regional composite, not one co-occurrence census.

## Taphonomic teaching experiment

- [NPS: How fossils form](https://www.nps.gov/subjects/fossils/how-fossils-form.htm).
- [NPS: Taphonomy—death & decay](https://www.nps.gov/subjects/fossils/taphonomy.htm).

These support directional differences in durability, transport, decay, burial and collection, **not** the experiment’s numerical probabilities. The twelve records and retention thresholds are deterministic teaching choices. The “rapid burial” option explicitly includes exceptional detail preservation, rather than claiming all rapid burial preserves soft bodies. Extra chemistry, sediment, microbial and diagenetic controls in nature are stated. Wider sampling is nested and cannot undo source exclusion or destruction. Missing fossils alone do not imply an organism never existed; last finds need not equal true extinction dates.

The finite playback adds an ordered presentation of those same rules. Its approximately nine-second duration, screen travel, stage spacing, fading, fracture marks and stop symbols are authored explanatory devices, without measured transport distances, decay rates or geological durations. A faded ghost records loss of recognizable morphology in this teaching filter; it does not claim all physical material chemically vanishes. Scrubbing revisits the explanation. No new ancient predation behavior, whole-tree growth or extinction reversal is asserted.
