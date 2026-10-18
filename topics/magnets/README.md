# 磁铁 / Magnets

- 核心问题：什么会被明显吸引？看不见的磁场方向怎样被发现？
- 可变条件：物品、距离、相对磁极；另一项磁针实验中的探针位置、中央磁铁朝向。
- 可见结果：托盘物品的吸引/排斥/无明显位移，以及磁针 N 端的方向。
- 因果链：磁相互作用与摩擦/约束决定物品运动；磁力矩使小磁针趋向磁场方向。
- 防误解：并非所有金属都被明显吸住；磁场方向不是物体移动方向，指针不是力计。
- 边界：两项独立实验，状态各自保留，不把托盘中的第二块磁铁带进单偶极模型。

`model.ts` and `scene.ts` retain qualitative constrained tray motion. `compassModel.ts`
owns the normalized direction of an ideal point dipole, B proportional to
3(m dot r-hat)r-hat - m. `compass.ts` owns probe placement and pole reversal and renders
the same model coordinates in an undistorted top view. N is marked in addition to color.
The bar graphic indicates the dipole orientation, not a near-field geometry calculation.
No Earth field, mutual probe disturbance, physical force magnitude or rotational inertia
is calculated. This diagram does not predict a real bar magnet's surface field.

The compass now retains up to eight separated observation points as small, unconnected N-tip directions. Each mark keeps the magnet orientation at the time of the reading; flipping the center magnet grays the old marks and keeps the probe at exactly the same point, briefly showing its earlier direction as a dashed arrow. The new orientation is recorded only where the probe is actually visited. These are sampled model directions, not a particle trail or a calculated field line. The academic note gives the ideal dipole expression with the fixed-radius and near-surface limits next to the experiment.

Switching questions suspends tray animation and retains both experiments. Focus mode retains
the same DOM and conditions. Reopening the page starts new experiments.

## Manual pole reversal · 2026-10-19

右边的条形磁铁用同一组保留的 SVG 面、材料色和 N/S 标记显示手动掉头，不再先换字、再压扁整块图形。Reader 的有限 2D 时间线只提供 560 ms 的转向取样；长面、端面与落影围绕同一中心投影。红、蓝两段仍是同一块磁铁上的标记。翻转按钮立即改变原模型中的磁极朝向与受力条件；转向画面不是自由磁铁的旋转动力学，也不改变托盘上的位移、接触或排斥计算。

The retained bar faces, enamel colors and N/S marks turn around one fixed center. Reader's
seek-only 2D track supplies the finite presentation angle; the existing tray clock and force
model remain authoritative. Repeated presses reverse from the visible angle. Reset, question
changes, hidden-page suspension and reduced motion settle the presentation at the current
model orientation; final page departure disposes its track. The manual turn is an illustration,
not a rotational dynamics calculation or permission for the free bar to turn itself.

Source: [OpenStax magnetic fields](https://openstax.org/books/physics/pages/20-1-magnetic-fields-field-lines-and-force).
Validation: tray and compass tests, bilingual/type/build gates, and production browser controls.

## Presentation layout

The topic opts its existing scene and controls into shared viewport fitting and reversible immersion. Explanation/settings remain available in the adjacent disclosure panel. Multi-chapter studies retain their own state and clocks. Introductory diagrams can be expanded separately, and narrow screens retain document flow.
