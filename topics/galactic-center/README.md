# 黑洞与伴星 / A black hole and its companion

沿用 `/topics/galactic-center/` 地址以保持已有链接，内容已改为用户期望的恒星级黑洞伴星双星系统。默认打开持续溢流；另有分离双星和恒星风供给。不是吞噬整个星系，也不是整颗伴星被潮汐瓦解。

- `model.ts`：16:9 的示意质量比、固定间距圆周绕行和共同质心；Eggleton 等体积洛希瓣半径参考。虚线只是近似尺度，不是实际临界等势面。
- 气流使用与伴星表面、盘外缘连续连接的曲线，粒子从起点渐入、内侧渐出。恒星风另有广泛向外的物质；集中供给流不代表全部恒星风被捕获。没有求解流体、实际质量损失或恒星结构变化。
- `scene.ts`：Three.js 场景、带表面颗粒与临边昏暗的伴星、细柔粒子流、参考线和标签。选择系统全景、黑洞近景、俯视或自由转动。绕行可单独开关，默认固定位置以看清供气。所有动作由 32 秒可倒拖时间轴驱动。
- `src/visuals/blackHoleOptics.ts`：三个黑洞专题共享的独立光学部件。非自旋球对称空间光线中央力形式、有限体积内积分、光学厚的薄盘交点；色温、条纹与多普勒对比是示意。黑洞光学大小与物质运动参数相互独立，不是完整 GRMHD、Kerr 或观测光谱复原。
- `content.ts`、`locales/en.json`：双语故事、范围说明与参考资料。真正的光谱、捕获率、伴星收缩和黑洞增长不在本模型中。

The existing URL is retained, but the topic now explains a stellar-mass black hole with a donor companion. The three scenarios distinguish a detached binary, Roche-lobe overflow and wind-fed accretion. The Three.js scene has whole-system, close-up, top and free-camera views. Orbital motion is optional so the gas source remains easy to inspect.

Gas paths are continuous teaching curves, not a fluid solution. The shared finite-volume, non-spinning black-hole optics creates view-dependent disk images. Display scales and emissivity are illustrative and do not predict accretion rates or spectra.

Sources: [NASA binary systems](https://www.nasa.gov/universe/nasa-visualization-rounds-up-the-best-known-black-hole-systems/), [NASA visualization](https://svs.gsfc.nasa.gov/4996/), [Cyg X-1 wind](https://ntrs.nasa.gov/citations/20110007118), [NASA warped light](https://www.nasa.gov/universe/nasa-visualization-shows-a-black-holes-warped-world/).

Validation: `node --import tsx --test topics/galactic-center/tests/model.test.mjs`; integration: `npm run check` plus actual WebGL views in both languages and narrow screens.
