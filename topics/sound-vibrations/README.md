# 声音与振动 / Sound and vibration

The instrument view retains the wooden box and rubber-band illustration. A second view follows a local plane longitudinal disturbance in air. Every air parcel has a fixed equilibrium position and a time-delayed copy of the same finite source displacement. The gold parcel and open reference circle distinguish local oscillation from propagation. Compression shading follows the displacement gradient; the parcel mapping remains ordered throughout the supported control range.

Slow motion lasts 16 teaching seconds. The source tapers to zero by second 9; the emitted disturbance continues outward until it leaves the scene. Play/pause, replay and timeline scrubbing operate independently from an explicit button that plays a 1.65-second synthesized tone. Audio uses 196√T Hz with bounded gain. Changing tension or amplitude stops/reset the experiment, avoiding retroactive changes to a wave already in flight. Audio callbacks use generation identity, and hiding/leaving stops and disconnects nodes.

`model.ts` owns ideal-string pitch and the retarded-time displacement/density illustration. `scene.ts` owns the instrument and air SVG geometry. `main.ts` owns the finite clock, view transition and audio lifetime. Slow-motion distance, time and exaggerated displacement are not a measurement of actual sound speed; dots are parcel averages, not molecular thermal motion. Three-dimensional spreading, reflections and nonlinear acoustics are omitted.

Science: [OpenStax, Sound](https://openstax.org/books/college-physics-2e/pages/17-1-sound) supports longitudinal compressions/rarefactions and local particle motion; [Exploratorium Sound Sandwich](https://www.exploratorium.edu/snacks/sound-sandwich) connects vibrating material to audible sound. A source stopping does not erase waves already traveling through a medium.

验证：保持旧有张力—音高关系，加入传播前沿因果性、声源停后波包延续、末态回到平衡、粒子不交叉和密度正有限检查。中英文说明与四段讲稿同步。浏览器交互、音频按钮与手机布局由根任务统一验收。
