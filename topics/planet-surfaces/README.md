# 行星的表面是什么样的 / Planetary surfaces

Six representative planets: Mercury, Venus, Earth, Mars, Jupiter, Neptune. Light reading UI, Chinese/English, children/science explanations. Switch from representative close-up terrain to an illustrative downward section; Earth distinguishes air/water/seabed, while giants never expose a landing line.

`model.ts` owns composition categories and exploration encounters, `content.ts` owns explanations, `scene.ts` owns cached procedural globes and natural landscape/cloud illustrations. No claimed reconstruction of a landing site, calibrated colors, physical depth or flight dynamics. Neptune is an ice giant, not a demonstrated exposed-ocean planet. Global maps and giant interiors remain illustrative.

Sources: NASA Science facts pages for [Mercury](https://science.nasa.gov/mercury/facts/), [Venus](https://science.nasa.gov/venus/facts/), [Earth](https://science.nasa.gov/earth/facts/), [Mars](https://science.nasa.gov/mars/facts/), [Jupiter](https://science.nasa.gov/jupiter/facts/), [Neptune](https://science.nasa.gov/neptune/facts/). Checked 2026-09-12. Tests protect solid versus fluid encounters and the rocky ocean-world distinction.

Validation: `node --import tsx --test topics/planet-surfaces/tests/*.test.js`, then project `npm run check` and production preview, all six worlds/section controls/both languages/mobile.
