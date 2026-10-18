# 运动、摩擦与停下来 / Motion, friction and coming to a stop

统一问题是“谁对谁施力，让哪个对象慢下来，运动能量去了哪里”。沿同初速滑块、轮胎接触、汽车停车、乘员约束逐层增加条件，不把滑块摩擦系数套到汽车，也不把乘员惯性画成额外前推力。

The journey adds conditions from sliding blocks to wheel contact, vehicle stopping and passenger restraints. Its persistent reference distinguishes acting bodies, energy transfer, units and model clocks; it is not an iframe or a collection of links.

## Journey and ownership / 路径与职责

- `?chapter=slide|contact|braking|restraints`; invalid chapters default to slide. `projectModel.ts` exports `readMotionChapter`, `motionHref`, `legacyCarChapter`. Query parameters, hash and platform language/deployment base survive navigation. The car-safety entry redirects to braking, or restraints for a protection/seat/belt anchor.
- `slidingStudy.ts` owns the existing block geometry, micro-contact view, energy bars, inputs and finite RAF playback. Its `model.ts` remains unchanged.
- `contactStudy.ts` and `wheelContact` own a bounded, deterministic rigid-wheel contact comparison. One tread marker follows rolling geometry or a locked sliding wheel. This is kinematics, not tire-force, ABS or stopping-distance computation. Changing contact condition explicitly resets only this comparison.
- `../car-safety/study.ts` retains the original stopping controller, road scene, shoulder/lap fit selection, an independent fitted-band loading window, and child-seat diagrams. Its unchanged model keeps one-second reaction and chosen 6/3 m/s² decelerations. The unified main reads actual device snapshots rather than reimplementing either model.
- Each mounted owner has one instance. Chapter changes pause playback and belt highlighting, preserving inputs and progress. Hidden/pagehide stops work; return does not auto-resume. Reading mode changes content only. Input changes retain the original documented experiment-reset behavior.
- 主参照能量条显示初始平动动能的比例，不比较不同模型的绝对能量，也不包含汽车轮子的转动动能。The shared bars show fractions of initial translational kinetic energy, not cross-model absolute energies or wheel rotational energy.

## Original sliding experiment / 原滑块实验

三块无轮木块用同一个初速，在三种示意摩擦系数下连续滑动。播放按钮可暂停，时间可回拖；选择接触窗口不会重置比较。近景显示局部接触与相对滑动，和主场景使用同一位移。

能量条用恒定动摩擦模型计算剩余动能与转移到木块、地面的能量；总长守恒。橙色不是火花、温度或实际材料测量。模型不代表滚动车辆，也不把粗糙外观等同于固定摩擦大小。停下后不倒滑。

Three wheel-free blocks share an initial speed under three illustrative friction conditions. Playback pauses and time scrubs; a contact window follows the same displacement without resetting the comparison. Energy bars conserve initial energy as motion energy is transferred to the block and surface. Orange is not a temperature reading. No autoplay; hidden pages pause and reduced motion jumps to the end.

The selected lane now carries a visible contact anchor in the overview. Its ring follows that block during scrubbing and identifies the sample enlarged in the adjacent contact window; the drawn asperities remain illustrative, not a measurement of the friction coefficient.

`learning.json` contains three academic notes and four bilingual narration segments with separate visual directions. The constant-friction model and energy accounting have focused tests in `tests/model.test.js`.

Primary textbook sources rechecked 2026-09-19:

- https://openstax.org/books/university-physics-volume-1/pages/6-2-friction
- https://openstax.org/books/university-physics-volume-1/pages/7-3-work-energy-theorem

Run `node --import tsx --test topics/friction/tests/model.test.js`. Final site build, browser review and publication belong to the integration task.

## Safety and source review / 安全边界与来源

No loose-belt parameter, unsafe-fitting exercise, injury or crash-score comparison is offered. The new dashed inertia reference is an abstract passenger without horizontal restraint; it is not a recommended traveling condition or crash simulation. The fitted-band window uses exact tangent contact, path-dependent elastic tension and one reversible teaching trajectory. Its first relative turning point is not a completed vehicle stop; an ideal continuation would rebound. Mass, stiffness, displacement and time are uncalibrated teaching units, and the full shoulder restraint, real dissipative mechanisms and body deformation are omitted. The correctly fitted adult and child-seat diagrams retain their separate identities. Restraints exert real forces; inertia is not an additional forward push. Normal no-slip road contact primarily transmits braking force through static friction, unlike the relative sliding of pads on discs. Actual tire deformation, local slip, ABS and regenerative braking are separately qualified in the deeper content.

NHTSA [child seats](https://www.nhtsa.gov/vehicle-safety/car-seats-and-booster-seats), [belt fit](https://www.nhtsa.gov/vehicle-safety/seat-belts), and [CDC child passenger prevention](https://www.cdc.gov/child-passenger-safety/prevention/index.html) were browsed again on 2026-09-20. Seat stages depend on child size, product limits and proper fit; manuals and local requirements govern actual use. These US sources are not presented as local law. No numerical injury percentages are copied.

`learning.json` keeps the existing contract: exactly three academic notes and four narration segments in each language. The page retains the original expanded block mechanics, brake-disc/tire explanation, adult belt and child-seat content; the short companion is not their replacement.

## Focused verification / 定向验证

`node --import tsx --test topics/friction/tests/*.test.* topics/car-safety/tests/*.test.*` covers original models, no-slip geometry, routes and the actual combined source entry/controllers with a deterministic DOM/animation adapter. It exercises playback, backward scrubbing, contact selection, input resets, independent chapter state, car road/seat/belt behavior, live energy projection, history, reduced motion and hide cancellation. Layout, pointer behavior and packaged URLs still require the parent's browser checks.

The braking scene carries a cursor at the car's front edge over the planned reaction/braking distance bar. The cursor follows the same modeled distance while time moves forward or backward. In the integrated presentation, the two segment readings and total sit directly below the road drawing; the road camera crops unused sky without changing distance geometry or the legacy route.

## Presentation layout

The topic opts its existing scene and controls into shared viewport fitting and reversible immersion. Explanation/settings remain available in the adjacent disclosure panel. Multi-chapter studies retain their own state and clocks. Introductory diagrams can be expanded separately, and narrow screens retain document flow.
