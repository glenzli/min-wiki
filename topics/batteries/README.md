# 电池怎样让玩具动起来？ / How does a battery make a toy move?

面向 4–6 岁儿童的双语电池专题：合上开关才接通回路，手动运行或拖动进度，观察电池化学能如何经电路带动玩具马达。整体回路、电芯内部、马达内部使用同一放电状态；观察角度和阅读模式不会重置进度。木质玩具、金属电池外壳、铜线圈、分层电极与多孔隔膜均为原创 SVG 插画，封面也在本目录维护。

A bilingual exploration of a complete toy circuit, a lithium-ion cell and a motor. Blue external electrons move from the negative terminal through the load toward the positive terminal. Gold lithium ions move internally from the negative electrode toward the positive electrode during discharge; they never follow the external wire. Chemical energy changes, rather than a disappearing supply of electrons, drive the lesson.

## Interaction and ownership

The switch becomes electrically closed only when its animated contacts meet. Opening it immediately stops discharge progress and carrier transport; wheels may coast through a short finite angle without spending additional chemical energy. Pausing freezes observation time while leaving circuit topology unchanged. The progress range can replay a completed part only while closed. Reset explicitly resets the screen example and does not represent recharging a real cell.

`model.ts` owns bounded discharge state, carrier progress and the illustrative energy accounting. `scene.ts` owns the original teaching illustrations, and `main.ts` owns controls, cameras and animation lifetime. `learning.json` contains three academic sections and four narration segments per language, with visual cues separate from speech. `catalog-entry.json` and `catalog-en.json` are registration proposals; the coordinator owns shared catalog integration.

There is no autoplay, audio or permanent animation loop. Buttons and the native range support keyboard and touch. Reduced-motion preferences resolve finite transitions, hiding the page stops playback, and pagehide cancels transitions. Status announcements change by meaningful phase rather than every frame.

## Scientific limits and safety

This is one qualitative lithium-ion discharge example, not the internal chemistry of every toy battery. Repeated markers represent a flow of carriers, not one ion completing an external circuit. Particle sizes, speeds, electrode occupancy and motor rotation are explanatory choices. The energy split of 65% mechanical contribution and 35% heat is an illustrative ledger, not a measured efficiency. Internal resistance, motor back EMF, switching transients, self-discharge, other ionic species and detailed reactions are omitted. Conventional current runs opposite to external electron motion.

Primary cells are not designed for repeated recharging. A rechargeable cell needs a compatible charger and external energy; this topic does not simulate charging. Cutaways are drawings, not instructions to open a cell. Child-facing text says to leave real batteries to adults, never open, heat or directly join their terminals, and never put a button battery in the mouth. Suspected swallowing needs immediate emergency medical attention.

Sources reviewed on 2026-09-17:

- U.S. DOE, [DOE Explains…Batteries](https://www.energy.gov/science/doe-explainsbatteries): chemical energy, separate electronic and ionic paths, and rechargeable operation.
- U.S. DOE, [Electrical Science, Volume 2, Modules 4 and 6](https://www.energy.gov/sites/default/files/2026-04/DOE-HDBK-1011-92_VOL2.pdf): primary and secondary cell definitions, external electron direction, motor torque and commutation. This historical fundamentals handbook is used for those principles, not present-day product specifications or a particular electrode formulation.
- U.S. CPSC, [Button Cell and Coin Batteries](https://www.cpsc.gov/Safety-Education/Safety-Education-Centers/Button-Cell-Coin-Battery-Information-Center): adult handling and the urgency of suspected ingestion.

Focused model tests verify open-circuit invariants, depletion, energy accounting, state retention and bounded deterministic carrier positions. The coordinator owns the final whole-site build and production mobile acceptance.
