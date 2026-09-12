# 台风是怎样形成的 / How typhoons form

暖海水怎样帮助风暴成长？改变海温、风切变和半球，看雷雨能否组织成带有螺旋云带的热带气旋。

云点代表空气和云团的示意位置，不是数值天气预报。假定已有扰动和足够湿度，未模拟海洋深度、陆地、锋面或真实风速；条件等级不是发生概率。

Cloud points are illustrative, not a numerical weather forecast. An initial disturbance and enough moisture are assumed. Ocean depth, land, fronts and actual wind speeds are omitted; the condition rating is not a probability.

## Ownership

`model.ts` owns the scientific teaching state and numeric contracts; `scene.ts` owns rendering; `content.ts` and `locales/en.json` own bilingual explanations. `main.ts` owns controls and playback. Full-page navigation releases rendering resources. Nothing plays automatically.

## Sources

- [NOAA · How hurricanes form](https://oceanservice.noaa.gov/facts/how-hurricanes-form.html)
- [NOAA · Tropical cyclone formation conditions](https://www.aoml.noaa.gov/hrd/project97/tcfaqA.html)
- [NOAA · Hurricane, typhoon and cyclone names](https://oceanservice.noaa.gov/facts/cyclone.html)

## Validation

Run `npm run check`, then verify the production page in both languages, controls, playback and narrow layouts. Model tests validate implementation assumptions, not empirical calibration.

## Natural scene refinement · 2026-09-12

The light reading default is retained with an independently colored scene. Unequal cloud masses, coherent lighting, atmospheric depth and terrain texture replace regular repeated geometry. The view control toggles structure/airflow overlays while retaining the same scientific state. Seeded detail remains stable while scrubbing; this is an illustrated teaching view, not a meteorological reconstruction.
