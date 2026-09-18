# 滑出去的玩具为什么会停？ / Why do sliding toys stop?

三块无轮木块用同一个初速，在三种示意摩擦系数下连续滑动。播放按钮可暂停，时间可回拖；选择接触窗口不会重置比较。近景显示局部接触与相对滑动，和主场景使用同一位移。

能量条用恒定动摩擦模型计算剩余动能与转移到木块、地面的能量；总长守恒。橙色不是火花、温度或实际材料测量。模型不代表滚动车辆，也不把粗糙外观等同于固定摩擦大小。停下后不倒滑。

Three wheel-free blocks share an initial speed under three illustrative friction conditions. Playback pauses and time scrubs; a contact window follows the same displacement without resetting the comparison. Energy bars conserve initial energy as motion energy is transferred to the block and surface. Orange is not a temperature reading. No autoplay; hidden pages pause and reduced motion jumps to the end.

`learning.json` contains three academic notes and four bilingual narration segments with separate visual directions. The constant-friction model and energy accounting have focused tests in `tests/model.test.js`.

Primary textbook sources rechecked 2026-09-19:

- https://openstax.org/books/university-physics-volume-1/pages/6-2-friction
- https://openstax.org/books/university-physics-volume-1/pages/7-3-work-energy-theorem

Run `node --import tsx --test topics/friction/tests/model.test.js`. Final site build, browser review and publication belong to the integration task.
