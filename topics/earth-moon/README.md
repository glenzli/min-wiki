# 地球和月亮 / Earth and the Moon

月亮为什么有圆有缺？绕着地球走一圈，同时看太空中的月球和地面上看到的月相。

轨道和月相按几何关系演示，不是实时星历。地月大小与距离默认分开缩放；真实比例视图单独比较。月球天平动、椭圆轨道和日月食未模拟；表面贴图与云层为静态。

Orbit and phase follow illustrative geometry, not a live ephemeris. Body sizes and distances are scaled separately by default; the true-scale view is separate. Libration, eccentricity and eclipses are omitted. Surface maps and clouds are static.

## Ownership

`model.ts` owns orbital, scale and north-up observer geometry; `scene.ts` owns the space view; `observer.ts` owns the enlarged geocentric projection and its renderer lifecycle; `content.ts` and `locales/en.json` own bilingual explanations. `main.ts` owns controls and playback. Full-page navigation releases rendering resources. Nothing plays automatically.

## Sources

- [NASA · Moon phases](https://science.nasa.gov/moon/moon-phases/)
- [NASA · Tidal locking](https://science.nasa.gov/moon/tidal-locking/)
- [NASA · Moon facts](https://science.nasa.gov/moon/facts/)
- [Solar System Scope · CC BY 4.0 textures](https://www.solarsystemscope.com/textures/)

## Validation

Run `node --import tsx --test topics/earth-moon/tests/model.test.mjs`. Tests cover phase fractions, scale, observer basis, first/last-quarter handedness, near-side map orientation and agreement with the actual Three.js lookAt transform. The root task owns the final full build. Browser acceptance: enlarge first quarter, compare last quarter, check the maria remain in place, switch back at unchanged progress, toggle markers, then compare true scale. Check both languages and narrow layouts. Model tests validate implementation assumptions, not empirical calibration.

## Shared lunar surface / 同一月面

The space view and Earth view share the same lunar mesh geometry, texture and material. The texture's central meridian is rotated onto the local Earth-facing +z axis. The observer renderer uses that fixed local frame, with the world Sun direction projected onto its right/up/toward-Earth basis. First quarter is therefore right-lit and last quarter left-lit without flipping or replacing the albedo map. Enlarging the observer window changes its display area; it does not move the Moon, reset time or synthesize a different surface.

地球视角固定月球北方朝上，沿地心方向观察；月盘角直径放大，暗面亮度仅为辨认轮廓而增强。这不是地照光计算，也不是针对某地某时刻的天空方向。真实的视差、月球天平动、月盘相对地平线的转动及反射亮度特性未求解。两套图共用照明与近侧几何，不能据此把简化模型当成实时星历。
