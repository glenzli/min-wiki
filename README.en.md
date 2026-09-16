# Little Encyclopedia · 小小百科

[中文](README.md)

A growing collection of small science demos in Chinese and English. Each page explores a question through interaction, animation, explanations and references. Made for children and parents to explore together, and for anyone who is curious.

The collection currently contains 59 topics across space, Earth, life, physics and engineering.

![Solar-system demo: eight planets at one diameter scale](docs/images/solar-system.png)

## Explore the collection

Browse by category, search by keyword, or navigate numbered pages with up to 24 demos per page and direct links to adjacent pages. The [content catalog](content/catalog.json) lists every topic.

| Category | Topics | Examples |
| --- | ---: | --- |
| Space & Astronomy | 10 | [A star passes a black hole](topics/black-hole/), [Solar system](topics/solar-system/), [Lunar craters](topics/lunar-craters/) |
| Earth & Nature | 11 | [Seasons](topics/earth-seasons/), [Rain formation](topics/rain-formation/), [Water cycle](topics/rain-cycle/) |
| Life & the Body | 25 | [Leaf colors](topics/leaf-colors/), [Tadpole to frog](topics/frog-life/), [Handwashing](topics/handwashing/), [Pain signals](topics/pain-signals/), [Taste and smell](topics/taste-smell/), [Blood cells](topics/blood-cells/), [Body cells](topics/body-cells/), [Hearing](topics/hearing/), [Digestion](topics/digestion/) |
| Physics & Matter | 8 | [Rainbows](topics/rainbow/), [Buoyancy](topics/buoyancy/), [Magnets](topics/magnets/), [Water states](topics/water-states/), [Sound](topics/sound-vibrations/), [Soap bubbles](topics/soap-bubbles/) |
| Technology & Engineering | 5 | [Tap water](topics/tap-water/), [Car safety](topics/car-safety/), [Air conditioning](topics/air-conditioner/), [Refrigerators](topics/refrigerator/), [Batteries](topics/batteries/) |

## Reading and interaction

- **Story view** offers stories, observation prompts and interactions for children and adults to explore together.
- **Science view** adds principles, model assumptions and references for readers who want more depth.
- Every topic includes an observation task, three deeper notes, a common misconception and model limits. Changing the explanation mode retains the current experiment state.
- **Narration** in the top navigation opens a child-friendly script in the current language, with separate downloads for spoken words and visual directions. See the [narration guide](docs/narration.md) for batch export and voice production.
- Depending on the topic, controls support playback, pausing, scrubbing or comparing conditions. Each topic explains its scale choices and simplifications, from molecules to planets.
- Appearance options include light, dark and matching the topic. The catalog, navigation and controls use a neutral UI aligned with glenzli.com, while demonstrations retain their scientific colors.

Switch between 中文 and English at the top of any page, or share a link with `?lang=zh` or `?lang=en`. The first visit follows your browser language; a manual choice is saved locally. Switching language reloads the current topic and restarts its animation.

## Local development

Requires Node.js 22.12 or later.

```sh
npm ci
npm run dev
```

Open the local URL shown in the terminal. `npm run check` runs tests, strict type checking, translation coverage checks and a production build. After building, `npm run preview` serves the static output in `dist/`. Rebuild after source changes to update the preview.

Built with **TypeScript, Vite, Three.js and i18next**, with dependencies managed by npm and a lockfile. Each topic has its own build entry; the home page does not load the 3D engine. See the [development notes](docs/architecture.md#adding-a-topic-and-translations) for adding demos and translations.
