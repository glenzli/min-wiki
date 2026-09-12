# 龙卷风是怎样形成的 / How tornadoes form

从不同高度的风开始，观察雷暴中的旋转怎样发展。漏斗云和触地的旋转气流，是不是同一回事？

气流轨迹、云形与进度均为概念示意，没有求解三维大气动力学。调高参数只是在本例中选择更有利的条件，不代表现实中必然出现龙卷风。

Air paths, cloud shape and progress are conceptual, not a three-dimensional atmospheric simulation. Higher settings select more favorable conditions in this example, not a guarantee of tornado formation.

## Ownership

`model.ts` owns the scientific teaching state and numeric contracts; `scene.ts` owns rendering; `content.ts` and `locales/en.json` own bilingual explanations. `main.ts` owns controls and playback. Full-page navigation releases rendering resources. Nothing plays automatically.

## Sources

- [NOAA NSSL · Tornado basics](https://nssl.noaa.gov/education/svrwx101/tornadoes/)
- [NOAA NSSL · Tornado types](https://www.nssl.noaa.gov/education/svrwx101/tornadoes/types/)
- [NOAA NSSL · Tornado questions](https://www.nssl.noaa.gov/education/svrwx101/tornadoes/faq/)

## Validation

Run `npm run check`, then verify the production page in both languages, controls, playback and narrow layouts. Model tests validate implementation assumptions, not empirical calibration.

## Natural scene refinement · 2026-09-12

The light reading default is retained with an independently colored scene. Unequal cloud masses, coherent lighting, atmospheric depth and terrain texture replace regular repeated geometry. The view control toggles structure/airflow overlays while retaining the same scientific state. Seeded detail remains stable while scrubbing; this is an illustrated teaching view, not a meteorological reconstruction.
