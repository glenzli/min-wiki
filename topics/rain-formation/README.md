# 雨是怎样形成的 / How rain forms

云里的小水滴，怎样变成落到地面的雨？走进云中，比较暖云、冰晶和干燥空气带来的不同结果。

How do tiny cloud droplets become rain at the ground? Look inside a cloud and compare warm droplets, ice growth and evaporation in dry air.

## Teaching boundaries

这是粒子与气块的概念示意，未计算完整云微物理、上升速度或真实粒径分布。两条路径用于比较，实际可以并存；本页冰晶路径假定下方有足够深的暖层，使冰融化成雨。

This is a conceptual parcel and particle illustration, without full cloud microphysics, updraft calculations or a realistic size distribution. The two routes may coexist; the ice route assumes a sufficiently deep warm layer to melt ice into rain.

## Ownership and interaction

`model.ts` owns numeric and stage contracts, `scene.ts` owns deterministic Canvas rendering, `content.ts` owns bilingual stage explanations, and `main.ts` owns playback and accessible controls. No autoplay. Visibility and page lifecycle pause animation, restore bfcache state and release the canvas observer on final exit. Kids and academic modes share an interactive scene with distinct stage-linked explanations.

## Sources

- [NOAA · Precipitation](https://www.noaa.gov/jetstream/atmosphere/precipitation)
- [Met Office · Rain](https://weather.metoffice.gov.uk/learn-about/weather/types-of-weather/rain)
- [NWS · Cloud development](https://www.weather.gov/source/zhu/ZHU_Training_Page/clouds/cloud_development/clouds.htm)

## Validation

Focused tests cover the teaching-model invariants, not empirical weather accuracy. Root integration runs localization, TypeScript and a production build, followed by desktop/mobile browser checks.

`cover.svg` is a deterministic, authored vector illustration using the same visual composition; it is not a scientific observation.

## Focused evidence · 2026-09-12

Weather-owner strict TypeScript check and source/HTML/placeholder translation scan passed. `node --import tsx --test topics/typhoon/tests/model.test.mjs topics/tornado/tests/model.test.mjs topics/rain-formation/tests/model.test.mjs topics/lightning-thunder/tests/model.test.mjs`: 18 tests passed. Production integration and actual viewport checks remain the root task’s responsibility; this evidence does not claim browser verification.


## Continuous precipitation refinement — 2026-09-17

Representative droplets retain their radius while approaching and transfer liquid volume only after first contact. The icy inset highlights riming by supercooled droplets before melting; deposition/aggregation remain explained but are not separately simulated. Each full-scene precipitation particle has a finite birth, descent and either evaporation or ground-impact outcome. Landed drops leave wet marks and a brief expanding ripple; they never wrap back to cloud base. A marked cloud patch connects the landscape to the inset.

Focused tests additionally protect pre-contact volume retention, the exact contact distance, monotone descent and persistent terminal outcomes in dry and humid air.
