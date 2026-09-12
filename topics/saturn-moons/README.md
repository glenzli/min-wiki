# 土星和它的卫星们 / Saturn and its moons

土星的身边不只有光环。认识七颗代表卫星，比较绕行快慢、真实大小和不同的冰雪世界。

本页不是完整卫星目录。采用圆轨道与示意初始位置，忽略摄动、共振细节及食。总数注明来源日期；大小比较与轨道示意使用不同显示尺度。

This is not a complete moon catalog. Circular orbits and illustrative starting positions omit perturbations, detailed resonances and eclipses. The count is dated; size comparison and orbit views use different display scales.

## Ownership

`model.ts` owns the scientific teaching state and numeric contracts; `scene.ts` owns rendering; `content.ts` and `locales/en.json` own bilingual explanations. `main.ts` owns controls and playback. Full-page navigation releases rendering resources. Nothing plays automatically.

## Sources

- [NASA · Saturn moons (August 2026)](https://science.nasa.gov/saturn/moons/)
- [JPL · Mean orbital elements](https://ssd.jpl.nasa.gov/sats/elem/)
- [JPL · Satellite physical parameters](https://ssd.jpl.nasa.gov/sats/phys_par/)
- [NASA · Titan](https://science.nasa.gov/saturn/moons/titan/facts/)
- [NASA · Enceladus](https://science.nasa.gov/saturn/moons/enceladus/)
- [NASA · Saturn’s moons: facts](https://science.nasa.gov/saturn/moons/facts/)
- [Solar System Scope · CC BY 4.0 textures](https://www.solarsystemscope.com/textures/)

## Validation

Run `npm run check`, then verify the production page in both languages, controls, playback and narrow layouts. Model tests validate implementation assumptions, not empirical calibration.
