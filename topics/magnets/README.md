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

Switching questions suspends tray animation and retains both experiments. Focus mode retains
the same DOM and conditions. Reopening the page starts new experiments.

Source: [OpenStax magnetic fields](https://openstax.org/books/physics/pages/20-1-magnetic-fields-field-lines-and-force).
Validation: tray and compass tests, bilingual/type/build gates, and production browser controls.

## Presentation layout

The topic opts its existing scene and controls into shared viewport fitting and reversible immersion. Explanation/settings remain available in the adjacent disclosure panel. Multi-chapter studies retain their own state and clocks. Introductory diagrams can be expanded separately, and narrow screens retain document flow.
