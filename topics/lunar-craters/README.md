# 月球上的陨石坑 / Craters on the Moon

一块太空岩石撞上月球后会怎样？改变大小和速度，看岩石飞散、地面凹陷，留下一个撞击坑。

垂直撞击、均匀靶体和示意坑形；不模拟冲击波流体力学、熔融或复杂坑坍塌。能量比以直径 100 米、速度 20 km/s 的同密度撞击体为基准。

Vertical impact, a uniform target and illustrative crater shape. Shock hydrodynamics, melting and complex crater collapse are not simulated. Energy is relative to a 100 m impactor at 20 km/s with the same density.

## Ownership

`model.ts` owns the scientific teaching state and numeric contracts; `scene.ts` owns rendering; `content.ts` and `locales/en.json` own bilingual explanations. `main.ts` owns controls and playback. Full-page navigation releases rendering resources. Nothing plays automatically.

## Sources

- [NASA · Lunar craters](https://science.nasa.gov/moon/lunar-craters/)
- [NASA · Exploring the Moon: impact craters](https://science.nasa.gov/wp-content/uploads/2024/01/exploring-the-moon-teachers-guide.pdf)
- [NASA · Moon facts](https://science.nasa.gov/moon/facts/)

## Validation

Run `npm run check`, then verify the production page in both languages, controls, playback and narrow layouts. Model tests validate implementation assumptions, not empirical calibration.
