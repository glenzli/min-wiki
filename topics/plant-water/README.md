# 根喝到的水怎样到叶子里？

## Integrated entry · 2026-09-20

This URL now enters `/topics/leaf-colors/?view=water`; `main.ts` is compatibility routing only. `model.ts` retains the water cohort and phase-change contract. `scene.ts` owns the original persistent root, xylem, leaf and enlarged pore geometry, with no timers, controls or global event listeners. The leaf lifecycle controller supplies water progress and a bounded transport-availability state; it retains leaf age separately and stops this mature-leaf example before expansion or when the connection closes. The transport map is explicitly a structural illustration, not an equal-scale map of the branch. Existing scientific notes and provenance below remain applicable to that model; earlier standalone playback descriptions are historical. Final integration/browser checks belong to the root task.

## 2026-10-01 蒸发与出口对应 / Evaporation and pore correspondence

整株图与叶片剖面共用同一水状态：液态水从湿润叶肉表面蒸发到叶内空隙，随后水汽经本例选定的下侧气孔离开。两幅图的气孔与空气出口都在叶片下方；追踪批次也以实心、空心区分液态与水汽。气孔位置、通道和细胞均为放大的教学结构，不代表所有植物的气孔分布，也没有新增气孔调控或木质部张力求解。

Whole-plant and leaf-detail views project one water state: liquid evaporates from wet mesophyll surfaces into internal air spaces before vapour leaves through the lower pore chosen for this example. Both views show that selected exit below the leaf, and cohort markers distinguish liquid from vapour. Pore placement, conduits and cells are enlarged teaching structures, not a claim about every plant's stomatal distribution. Dynamic pore regulation and xylem tension remain outside the simulation.

Focused regression checks inspect route continuity, evaporation before pore exit and actual SVG attribute projection. They also revisit retained water progress after the leaf lifecycle becomes unavailable. These checks do not replace browser visual acceptance, which belongs to the integrating task. Mechanism reference: [OpenStax — Transport of Water and Solutes in Plants](https://openstax.org/books/biology-2e/pages/30-5-transport-of-water-and-solutes-in-plants).

一起跟着蓝色水滴，从土里出发，走过根和茎，最后来到叶子。

水沿水势梯度从土壤进入根，经木质部运输。叶内蒸发产生的张力和水分子的内聚性共同维持上升水流；气孔调节气体交换与失水。水还参与光合作用并维持细胞膨压，植物不是把全部吸收的水都变成身体。

## 教学边界

蓝点是路线标记，不是能看见的真实水分子。画面把木质部、气孔和运输阶段放大分开；真实运输连续发生。芹菜实验从切口吸水，展示茎的运输，不能单独证明根怎样吸水。

## References

- [USGS · Evapotranspiration](https://www.usgs.gov/water-science-school/science/evapotranspiration-and-water-cycle)
- [USGS · Plant water transport](https://pubs.usgs.gov/sir/2013/5014/section3.html)



## Continuous observation refinement · 2026-09-19

A 22-second controlled water journey links roots, xylem and leaf departure. The enlarged leaf section includes a water conduit, mesophyll air space and guard-cell opening. Filled and open markers distinguish liquid water and vapour; the same progress survives changing view. Cohorts are tracking aids, not molecule counts. No internal SVG text obscures the path.

All playback is explicit and finite. Hidden documents pause active playback; page exit cancels frame work. Reduced-motion mode advances to inspection states rather than starting continuous movement. Phase/status text changes only at meaningful stages. Topic-local model tests cover the changed causal and continuity contracts; root task owns the full build and desktop/mobile browser acceptance.

Selected source explanations were rechecked; the linked institutional material and primary research support the mechanism, not the drawn timing, dimensions or trajectories. No external figures were copied.
