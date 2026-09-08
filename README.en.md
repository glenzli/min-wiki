# Little Encyclopedia · 小小百科

[中文](README.md)

A growing collection of small science demos in Chinese and English. Each page explores a question through interaction, animation, explanations and references. Made for children and parents to explore together, and for anyone who is curious.

Starting with space and Earth, with room for nature, life, physics and engineering.

![Solar-system demo: eight planets at one diameter scale](docs/images/solar-system.png)

## Demos

- [A star passes a black hole](topics/black-hole/): change the route and compare the star's encounters.
- [The solar system](topics/solar-system/): explore orbits and compare planetary sizes.
- [Day, night and seasons](topics/earth-seasons/): discover the roles of Earth's rotation and axial tilt.

Switch between 中文 and English at the top of any page, or share a link with `?lang=zh` or `?lang=en`. The first visit follows your browser language; a manual choice is saved locally. Switching language reloads the current topic and restarts its animation.

## Local development

Requires Node.js 22.12 or later.

```sh
npm ci
npm run dev
```

Open the local URL shown in the terminal. `npm run check` runs tests, strict type checking, translation coverage checks and a production build. `npm run preview` serves the static output in `dist/`.

Built with **TypeScript, Vite, Three.js and i18next**, with dependencies managed by npm and a lockfile. Each topic has its own build entry; the home page does not load the 3D engine. See the [development notes](docs/architecture.md#adding-a-topic-and-translations) for adding demos and translations.
