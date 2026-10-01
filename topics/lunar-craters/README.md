# 月球上的陨石坑 / Craters on the Moon

一块太空岩石撞上月球后会怎样？改变大小和速度，看岩石飞散、地面凹陷，留下一个撞击坑。

垂直撞击、均匀靶体和示意坑形；不模拟冲击波流体力学、熔融或复杂坑坍塌。能量比以直径 100 米、速度 20 km/s 的同密度撞击体为基准。

Vertical impact, a uniform target and illustrative crater shape. Shock hydrodynamics, melting and complex crater collapse are not simulated. Energy is relative to a 100 m impactor at 20 km/s with the same density.

接触使用同一个归一化进度点：到达前岩石沿垂直方向下降，按当前大小、朝向与实际地形三角网格确定支撑高度；接触时才开始闪光照明与撞击讲解。随后依次显示向外扩展的示意波纹、挖掘与抛射。这些阶段和显示速度不是标定的撞击时间，也不把闪光、波纹当作冲击波求解。

One normalized timeline instant governs contact, impact lighting and the explanation. Before contact the rock descends vertically; its current size and orientation are fitted to the rendered terrain triangles. The flash starts at contact, followed by an illustrative outward ring, excavation and ejecta. Stage timing, flash brightness and the ring are presentation cues, not a calibrated impact or shock-wave solution.

## Ownership

`model.ts` owns the scientific teaching state and numeric contracts; `scene.ts` owns rendering; `content.ts` and `locales/en.json` own bilingual explanations. `main.ts` owns controls and playback. Full-page navigation releases rendering resources. Nothing plays automatically.

## Sources

- [NASA · Lunar craters](https://science.nasa.gov/moon/lunar-craters/)
- [NASA · Exploring the Moon: impact craters](https://science.nasa.gov/wp-content/uploads/2024/01/exploring-the-moon-teachers-guide.pdf)
- [NASA · Moon facts](https://science.nasa.gov/moon/facts/)

## Validation

Run `npm run check`, then verify the production page in both languages, controls, playback and narrow layouts. Model tests validate implementation assumptions, not empirical calibration.

Focused regressions: `node --import tsx --test topics/lunar-craters/tests/*.test.mjs`. The scene test executes production `draw` with real Three.js geometry, lights, raycasts and OrbitControls while adapting the GPU/browser boundaries. It checks actual terrain contact at the diameter/speed limits, absence of pre-impact lighting, causal stage order and reversible scrubbing. Pixel appearance remains a browser check.

## Presentation layout

The topic selects its existing scene and controls for the shared viewport-fitted presentation frame. At desktop widths the scene and primary playback stay together, with independently scrollable explanation/settings; immersion can hide and reopen that panel without remounting the experiment. Narrow screens retain normal document flow. Scientific state and geometry remain topic-owned.
