# 地球和月亮 / Earth and the Moon

月亮为什么有圆有缺？绕着地球走一圈，同时看太空中的月球和地面上看到的月相。

八个可选月相沿同一条进度线定位；主图、地球视角月盘、受光比例和金色近侧标记保持同步。儿童版把当前月相的一两句话放在图旁；学术版在图旁给出当前机制和关系式，完整条件、读数与误区在图下展开。真实大小与距离是独立的尺度对照，不把排列误读为当前月相。

Eight phase stops share one progress line, keeping the space view, Earth-facing disk, lit fraction and near-side marker in sync. The child view keeps the phase explanation next to the scene; the academic view places a compact mechanism cue beside it and expands conditions, live values and caveats below. The true-scale comparison is a separate scale study, not the current phase configuration.

真实比例视图使用独立的双语尺度讲解与读数：中心距离约 30.2 个地球直径，扣除两端半径后表面间空隙约 29.5 个地球直径。进入此静态比较会暂停月相播放与过渡，保留已有进度，并停用月相时间控件；返回轨道或地球视角后继续操作。尺度视图不把保存的相位角或受光比例当作眼前排列的结果。

The scale study has its own bilingual explanation and values: center distance is about 30.2 Earth diameters, while the surface gap is about 29.5 after subtracting both radii. Entering this static comparison stops phase playback/seek transitions, retains progress and disables phase-time controls. Returning to orbit or Earth view restores those controls. Saved phase angles and lit fractions are not presented as results of the independent lineup.

轨道和月相按几何关系演示，不是实时星历。地月大小与距离默认分开缩放；真实比例视图单独比较。月球天平动、椭圆轨道和日月食未模拟；表面贴图与云层为静态。

Orbit and phase follow illustrative geometry, not a live ephemeris. Body sizes and distances are scaled separately by default; the true-scale view is separate. Libration, eccentricity and eclipses are omitted. Surface maps and clouds are static.

## Ownership

`model.ts` owns orbital, scale and north-up observer geometry; `scene.ts` owns the space view; `observer.ts` owns the enlarged geocentric projection and its renderer lifecycle; `content.ts` and `locales/en.json` own bilingual explanations. `main.ts` owns controls and playback. Full-page navigation releases rendering resources. Nothing plays automatically.

## Sources

- [NASA · Moon phases](https://science.nasa.gov/moon/moon-phases/)
- [NASA · Tidal locking](https://science.nasa.gov/moon/tidal-locking/)
- [NASA · Moon facts](https://science.nasa.gov/moon/facts/)
- [JPL · Planetary physical parameters](https://ssd.jpl.nasa.gov/planets/phys_par.html)
- [JPL · Satellite physical parameters](https://ssd.jpl.nasa.gov/sats/phys_par/)
- [Solar System Scope · CC BY 4.0 textures](https://www.solarsystemscope.com/textures/)

## Validation

Run `node --import tsx --test topics/earth-moon/tests/model.test.mjs`. Tests cover phase fractions, scale, observer basis, first/last-quarter handedness, near-side map orientation and agreement with the actual Three.js lookAt transform. The root task owns the final full build. Browser acceptance: enlarge first quarter, compare last quarter, check the maria remain in place, switch back at unchanged progress, toggle markers, then compare true scale. Check both languages and narrow layouts. Model tests validate implementation assumptions, not empirical calibration.

`tests/controller.test.mjs` executes the actual controller, authored HTML/explanations and finite transition. It checks Chinese/English scale readings independently of phase, repeated view/reading-mode changes, retained progress, cancellation of pending playback/seeks on scale entry and reduced-motion stepping after return. DOM adapters do not validate browser layout, hit testing or GPU appearance.

Playback clamps elapsed frame time to a nonnegative value and retains a monotonic timestamp anchor. A first RAF timestamp earlier than the play click therefore leaves phase at zero instead of selecting a negative explanation stage; later frames continue normally. The actual-controller regression injects this ordering in both languages, then checks continued playback, pause and resume.

播放采用非负时间增量，并保留单调时间基准；首帧时间戳早于点击时间时，进度保持原值，后续帧继续推进。实际控制器回归在中英两版注入此顺序，并检查暂停、继续和讲解状态。

## Shared lunar surface / 同一月面

The space view and Earth view share the same lunar mesh geometry, texture and material. The texture's central meridian is rotated onto the local Earth-facing +z axis. The observer renderer uses that fixed local frame, with the world Sun direction projected onto its right/up/toward-Earth basis. First quarter is therefore right-lit and last quarter left-lit without flipping or replacing the albedo map. Enlarging the observer window changes its display area; it does not move the Moon, reset time or synthesize a different surface.

地球视角固定月球北方朝上，沿地心方向观察；月盘角直径放大，暗面亮度仅为辨认轮廓而增强。这不是地照光计算，也不是针对某地某时刻的天空方向。真实的视差、月球天平动、月盘相对地平线的转动及反射亮度特性未求解。两套图共用照明与近侧几何，不能据此把简化模型当成实时星历。
