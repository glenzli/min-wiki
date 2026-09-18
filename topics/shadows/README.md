# 影子 / Shadows

A simplified wooden figure is sampled in three dimensions and its surface points are projected from a point source to a flat receiving plane. Each body part forms a convex projected footprint. Changing lamp height or horizontal position continuously recomputes the rays, without swapping shadow pictures. Oblique and overhead views share this geometry. The complete footprint remains when the centerline length reaches zero overhead.

The lamp can make a finite left-to-right journey, pause and resume, or be scrubbed and returned to three reference positions. Changing controls cancels an unfinished preset journey. Nine source samples illustrate an extended lamp and partial illumination at the boundary; edge smoothing is visual antialiasing, not calibrated penumbra photometry. Display divisions are not physical length units. Reflection and diffraction are omitted.

`model.ts` owns ray-plane geometry and deterministic wooden shapes; `scene.ts` owns SVG projection, floor, silhouette and source drawing; `main.ts` owns finite playback, view transitions and controls. Hidden/pagehide stops active playback. Labels stay outside the geometry.

Scientific sources: [NASA eclipse geometry](https://science.nasa.gov/eclipses/geometry/) explains extended-source umbra and penumbra; [OpenStax propagation of light](https://openstax.org/books/university-physics-volume-3/pages/1-1-the-propagation-of-light) supports straight-ray geometric optics. The tabletop formula applies to a point source above the figure, not directly to distant sunlight.

验证：投影与源—遮挡点共线、落在地面，最低灯高时所有身体部分有限，正上方仍有完整木偶宽度；双语学术说明与四段讲稿同步。离线 SVG 渲染已检查斜视/俯视构图，浏览器交互与手机验收由根任务统一完成。
