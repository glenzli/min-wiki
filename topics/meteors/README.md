# 流星与陨石 / Meteors and meteorites

`model.ts` owns the deterministic teaching journey: prescribed decelerating entry, continuously decreasing solid mass, continuous tangent into the surviving fragment's downward dark flight, and wake parcels anchored where the luminous head previously passed. `scene.ts` projects that state into SVG. `main.ts` owns playback, cancellable seeking and controls. Switching the two examples preserves progress for direct comparison.

这些是教学路径，不是轨迹或落点预报：没有求解大气密度、阻力、烧蚀、碎裂与化学反应。图中尺寸、高度及各阶段时长均经过调整。可见余迹是所选情景的特征，不能据此断言所有流星都有持久余迹。小碎片情景在空中消散，不落地；幸存情景在明显发光结束后继续暗飞行，到达地面后停止。

The illustration does not solve atmosphere, drag, ablation, fragmentation or chemistry. Size, altitude and stage durations are adjusted. A visible wake is an example, not a universal persistent-train prediction. One fragment is lost aloft; the other survives dark flight and comes to rest on the ground.

Primary references: [NASA facts](https://science.nasa.gov/solar-system/meteors-meteorites/facts/), [Towner et al., dark-flight estimates](https://arxiv.org/abs/2108.04397), [Cordonnier et al., persistent meteor trains](https://arxiv.org/abs/2407.18344). The latter distinguishes the moving meteor from emission remaining along its track and discusses chemical emission, diffusion and winds.

Focused verification: `node --import tsx --test topics/meteors/tests/model.test.mjs`. Tests cover path/tangent continuity, mass loss, no light in space or dark flight, ground contact, wake birth anchors and deterministic reverse scrubbing. Browser acceptance should compare 43% (bright head/wake), 79% (no solid versus dark remnant), 100% (no meteorite versus ground contact), play/pause, keyboard seeking, reduced motion, and Chinese/English layouts.
