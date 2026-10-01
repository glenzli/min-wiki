# Little Encyclopedia · 小小百科

[中文](README.md)

A growing collection of small science demos in Chinese and English. Each page explores a question through interaction, animation, explanations and references. Made for children and parents to explore together, and for anyone who is curious.

The collection covers space, Earth, life, physics and engineering. Closely related demonstrations are being integrated into larger topics; existing links still reach their corresponding chapters.

![Solar-system demo: eight planets at one diameter scale](docs/images/solar-system.png)

## Explore the collection

Browse by category, search by keyword, or navigate numbered pages with up to 24 demos per page and direct links to adjacent pages. The [content catalog](content/catalog.json) lists every topic.

| Category | Examples |
| --- | --- |
| Space & Astronomy | [Solar System and planet comparisons](topics/solar-system/), [Stars and multiple-star systems](topics/stars/), [Galaxies and cosmic scales](topics/cosmic-scale/), [Black holes](topics/black-holes/) |
| Earth & Nature | [Atmospheres](topics/atmosphere/), [Water cycle](topics/rain-cycle/), [Wind and storms](topics/wind/), [Volcanoes](topics/volcano-eruption/) |
| Life & the Body | [The life of a leaf](topics/leaf-colors/), [Cells: structure and teamwork](topics/cells/), [Hearing](topics/hearing/), [Digestion](topics/digestion/) |
| Physics & Matter | [Rainbows](topics/rainbow/), [Buoyancy](topics/buoyancy/), [Water states](topics/water-states/), [Sound](topics/sound-vibrations/) |
| Technology & Engineering | [Tap water](topics/tap-water/), [Air conditioning](topics/air-conditioner/), [Refrigerators](topics/refrigerator/), [Batteries](topics/batteries/) |

See the [integration record (Chinese)](docs/science-journeys-20260920.md) for the scope and limits of the life, Earth and space learning paths. Contextual next-stop links connect topics without placing every subject on one page.

The new everyday-technology path starts with five familiar questions. Each topic stands on its own and offers explicit next-stop links:

| Everyday question | What to explore |
| --- | --- |
| [Circuits and electronics: a lamp responds to a signal](topics/electronics-circuits/) | Switch contacts, a complete circuit and a sensing nightlight; energy versus control signals |
| [What is a program?](topics/programs/) | Execute instructions, select a conditional path and debug; a machine does not fill in omitted instructions |
| [What is AI?](topics/ai/) | Compare uses and roles, practice requests and evidence; all activities are clearly labelled local prewritten examples |
| [How does a phone send a message far away?](topics/mobile-networks/) | Follow the same numbered parts through stations and networks; distinguish offline, delivered and read |
| [Why can an airplane take off?](topics/flight/) | A wing changes airflow; compare speed, angle of attack and stall, then use the same conditions at the runway |

The existing [Batteries](topics/batteries/) topic retains its deeper energy, materials, charging and pack explanations. We do not add a duplicate battery entry. See the [scope and acceptance record](docs/modern-technology-20261001.md) for this addition.

## Reading and interaction

- **Story view** offers stories, observation prompts and interactions for children and adults to explore together.
- **Science view** adds principles, model assumptions and references for readers who want more depth.
- Every topic includes an observation task, three deeper notes, a common misconception and model limits. Changing the explanation mode retains the current experiment state.
- **Narration** in the top navigation opens a child-friendly script in the current language, with separate downloads for spoken words and visual directions. See the [narration guide](docs/narration.md) for batch export and voice production.
- Depending on the topic, controls support playback, pausing, scrubbing or comparing conditions. Each topic explains its scale choices and simplifications, from molecules to planets.
- Appearance options include light, dark and matching the topic. The catalog, navigation and controls use a neutral UI aligned with glenzli.com, while demonstrations retain their scientific colors.

Switch between 中文 and English at the top of any page, or share a link with `?lang=zh` or `?lang=en`. The first visit follows your browser language; a manual choice is saved locally. Switching language reloads the current topic and restarts its animation.

## Local development

Before adding, integrating or refining a topic, read the [design principles and acceptance requirements (Chinese)](docs/design-principles.md). They cover learning progression, scientific causality, continuity, scale, visuals, bilingual content, resource lifecycles and delivery checks. See the [architecture guide](docs/architecture.md) for engineering contracts and [SKELETON.md](SKELETON.md) for source ownership.

Requires Node.js 22.12 or later.

```sh
npm ci
npm run dev
```

Open the local URL shown in the terminal. `npm run check` runs tests, strict type checking, translation coverage checks and a production build. After building, `npm run preview` serves the static output in `dist/`. Rebuild after source changes to update the preview.

Built with **TypeScript, Vite, Three.js and i18next**, with dependencies managed by npm and a lockfile. Each topic has its own build entry; the home page does not load the 3D engine. See the [development notes](docs/architecture.md#adding-a-topic-and-translations) for adding demos and translations.
