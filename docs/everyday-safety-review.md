# Everyday safety topics — editorial review

The three new pages extend the encyclopedia's existing independent-topic architecture. Their shared visual reference is the early leaf-colors experience plus docs/cover-art-review.md: quiet reading surfaces, credible everyday materials, soft light, deliberate hierarchy and readable focal subjects. Each topic owns its illustration, interactions, explanation, translations and references.

## Scope

- tap-water: water components, microbial risks, boiling and clean covered storage; the difference between boiling-water and chemical-contamination advice.
- car-safety: reaction and braking distance, tyre/road contact, inertia, restraint and size-appropriate child seats.
- handwashing: soap, rubbing, rinsing and drying; hand-area coverage and the difference between a screen exercise and real washing.

## Editorial acceptance

- No claim that all tap water is unsafe, or that boiling makes every source safe. Clear water is not a water-quality test. Dissolved substances do not all disappear when heated. Boiling advice is tied to local water guidance; hot water is handled by an adult and cooled before drinking.
- No fictitious force of inertia, injury percentage, universal stopping distance or legal age cutoff. Braking distances use an explicitly limited teaching model. Car seat choice and installation depend on manufacturer limits and instructions; restraint illustrations teach concepts and cannot certify installation.
- Soap helps lift oils and microbes for removal; rubbing and rinsing matter. The 20-second recommendation is rubbing time. Bubble count is not a cleanliness measurement, and screen completion cannot verify clean hands. Not all microbes are harmful.
- The child explanation comes first; parent details and sources remain accessible. Both languages carry equivalent qualifications. Buttons, labels, status text and layouts must remain usable at 390px.

## Primary source cross-checks

Reviewed 2026-09-12:
- CDC, Drinking Water Advisories: https://www.cdc.gov/water-emergency/about/drinking-water-advisories-an-overview.html
- NHTSA, Car Seats and Booster Seats: https://www.nhtsa.gov/vehicle-safety/car-seats-and-booster-seats
- CDC, About Handwashing: https://www.cdc.gov/clean-hands/about/index.html

Each finished page includes its own more specific references and illustration/model limits.

## Cover artwork

All three covers use separate built-in imagegen calls, with the selected outputs saved in their topic directories as 1200 × 800 JPEGs. They are editorial illustrations, not documentary photographs or installation instructions. The parent review checked composition, natural light, credible materials, focal subjects and thumbnail readability. The car cover uses an empty rear-facing child seat; actual installation depends on the product and vehicle instructions.

| Topic | Saved illustration | Complete prompts and provenance |
| --- | --- | --- |
| Tap water | [cover-v2.jpg](../topics/tap-water/cover-v2.jpg) | [COVER.md](../topics/tap-water/COVER.md) |
| Car safety | [cover-v2.jpg](../topics/car-safety/cover-v2.jpg) | [COVER.md](../topics/car-safety/COVER.md) |
| Handwashing | [cover-v2.jpg](../topics/handwashing/cover-v2.jpg) | [COVER.md](../topics/handwashing/COVER.md) |

## Integration

The three topics retain the existing engineering/life categories and share the searchable tag `生活安全` / `Everyday safety`. Existing topic metadata and translations, including the concurrently added microbial topics, are preserved. Each entry leads to its own page; no new shared simulation or topic framework is introduced.

This task makes local content changes only; no commit, push or external deployment.

## Completed validation — 2026-09-12

- `npm test`: 133 tests passed, including the 10 new topic-local tests (4 water, 3 braking, 3 handwashing). These test the teaching-state contracts and constant-deceleration model, not real water quality, injury outcomes or hand cleanliness.
- `npm run build -- --outDir /tmp/mini-wiki-safety-dist`: passed strict TypeScript, translation coverage (4693 messages; 50 namespaces including the shared namespace), and the full 49-topic production build. The existing large Three.js chunk warning remains.
- Shared integration whitespace check passed. All 46 inherited topic entries and all existing shared English translations were retained. The three new entries use the shared searchable safety tag.
- Packaged browser checks at `127.0.0.1:4185`: direct entry and language switching work; all three covers load. Chinese and English pages each satisfy `scrollWidth === innerWidth === 390`. English and Chinese catalog safety searches each return exactly these three topics. Browser warning/error logs were empty for the inspected pages.
- Car: default 30 km/h dry-road model reads 8.3 m reaction + 5.8 m braking = 14.1 m. At 60 km/h on the wet-road setting it reads 16.7 + 46.3 = 63.0 m; playback reaches the stopped state and stays there. The mobile timeline, surface buttons, shoulder/lap explanations, and child-seat tabs work. Checked the car-seat background orientation, dark reading appearance and return to content appearance.
- Water: the microbial comparison changes to inactivation while minerals remain; the chemical scenario retains the warning after boiling in both languages. Adult handling, cooling and clean covered storage stay in the explanation.
- Handwashing: all five areas can be explored, repeated choices do not add credit, and rinse stays disabled until all five have been reviewed. The packaged English mobile page advances through rinse to dry; the completion message still requires real soap rubbing for at least 20 seconds. No cleanliness score is presented.
- The three completed topic directories have no active child-agent Claims. No global simulation engine, dependencies or deployment settings were changed by this task.

Relevant safety-source fingerprint (SHA-256; sorted topic runtime/assets/tests plus catalog and shared English): `7ae437b2338a3856b2b165ba5d841954579effb3572a9e152d53c9b08aa358a9`.
