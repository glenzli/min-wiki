# 地球和月亮 / Earth and the Moon

月亮为什么有圆有缺？绕着地球走一圈，同时看太空中的月球和地面上看到的月相。

轨道和月相按几何关系演示，不是实时星历。地月大小与距离默认分开缩放；真实比例视图单独比较。月球天平动、椭圆轨道和日月食未模拟；表面贴图与云层为静态。

Orbit and phase follow illustrative geometry, not a live ephemeris. Body sizes and distances are scaled separately by default; the true-scale view is separate. Libration, eccentricity and eclipses are omitted. Surface maps and clouds are static.

## Ownership

`model.ts` owns the scientific teaching state and numeric contracts; `scene.ts` owns rendering; `content.ts` and `locales/en.json` own bilingual explanations. `main.ts` owns controls and playback. Full-page navigation releases rendering resources. Nothing plays automatically.

## Sources

- [NASA · Moon phases](https://science.nasa.gov/moon/moon-phases/)
- [NASA · Tidal locking](https://science.nasa.gov/moon/tidal-locking/)
- [NASA · Moon facts](https://science.nasa.gov/moon/facts/)
- [Solar System Scope · CC BY 4.0 textures](https://www.solarsystemscope.com/textures/)

## Validation

Run `npm run check`, then verify the production page in both languages, controls, playback and narrow layouts. Model tests validate implementation assumptions, not empirical calibration.
