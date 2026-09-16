# 火山为什么会喷发 / Why volcanoes erupt

打开火山的剖面，看岩浆怎样向上走。试试一个喷口和多个喷口，再比较熔岩流与火山灰喷发。

这是通道、气泡和喷口关系的剖面示意，没有求解真实岩浆流变、压力场或火山灰输运。两个滑块表示相对条件，不是监测数值。

This illustrates relationships between pathways, bubbles and vents. It does not solve magma rheology, pressure fields or ash transport. Sliders represent relative conditions, not monitoring data.

## Ownership

`model.ts` owns the scientific teaching state and numeric contracts; `scene.ts` owns rendering; `content.ts` and `locales/en.json` own bilingual explanations. `main.ts` owns controls and playback. Full-page navigation releases rendering resources. Nothing plays automatically.

## Sources

- [USGS · How volcanoes erupt](https://www.usgs.gov/faqs/how-do-volcanoes-erupt)
- [USGS · Magma viscosity and gases](https://pubs.usgs.gov/gip/hawaii/page26.html)
- [USGS · Rift zones and multiple vents](https://www.usgs.gov/news/volcano-watch-getting-rift-zone-why-and-how-they-erupt)
- [USGS · Eruption styles](https://volcanoes.usgs.gov/volcanic_ash/eruption_styles.html)

## Validation

Run `npm run check`, then verify the production page in both languages, controls, playback and narrow layouts. Model tests validate implementation assumptions, not empirical calibration.

## 剖面呈现 / Cutaway presentation

岩层、通道边缘、岩浆内部流纹、上升气泡、抛射颗粒、卷入式灰云与熔岩冷却纹理使用连续进度驱动；保持原有喷口、气体和黏度教学关系。

Layered rock, magma pathways, rising bubbles, ballistic clasts, soft ash plumes and cooling lava textures share the existing timeline and teaching controls.

## Observation and material detail

Whole cutaway, vent close-up and slope-flow views move a single camera over the same scene. Camera changes preserve progress, settings and clast identity; fast reversals cancel previous camera interpolation. No new eruption starts when changing view.

The near edge of a lava ribbon exposes a hotter interior below a rapidly darkening crust. Colors, thickness and time are explanatory, not thermometry or a heat-transfer solution. Existing ballistic particles meet the first terrain intersection and retain their deposits. Multiple vents share one display source.

- [USGS HVO · Lava-flow crust and retained interior heat](https://www.usgs.gov/observatories/hvo/news/volcano-watch-how-do-lava-flows-cool-and-how-long-does-it-take)
- [USGS · Glossary: bombs, spatter and eruption products](https://www.usgs.gov/glossary/volcano-hazards-program-glossary)
