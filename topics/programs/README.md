# Programs: instructions, inputs and testing

## Learning question and path

Children should recognize a program as instructions a device can execute, separate it from physical hardware, and predict a visible next action. A retained tabletop cart and parcel connect three experiments: order, conditional selection, and debugging. This is a concept introduction, not an arbitrary code editor or an AI lesson.

- **Change:** single-step or run/pause execution; condition scenario's obstacle input; explicit swap of the first two debugging instructions.
- **Observe:** next instruction pointer, executed markers, cart position, one parcel's location, retained travel trace, sampled sensor result and selected branch.
- **Causal chain:** predefined command → input/state check → permitted state update → next command. Only the selected conditional branch is inserted into the interpreter queue.
- **Misconceptions:** a program is not the machine; reaching the destination is not delivering the parcel; a sensor does not understand the goal; a prewritten branch is not AI. The cart does not guess missing instructions.
- **Limits:** finite command set; exact grid movement; ideal yes/no sensor sampled once; atomic illustrative pickup/unload; no motor, mechanics, electrical or safety model. A separate screen-activity guard rejects movement that would overlap a box added after the decision. It does not resample the sensor or imply that the program can safely stop a real robot: a robot without further sensing could collide. This distinction is explicit in the child's live result, nearby input text, academic study and learning boundary. Time and dimensions are uncalibrated. Real systems can execute concurrent tasks and repeatedly sample inputs.

Each scenario retains its own state during in-page switching. Reading depth shares that experiment. Reset or editing the order explicitly begins a fresh test, preserving current obstacle choice. Language navigation follows the platform contract and does not promise retained experiment progress. Hidden pages and `pagehide` stop execution; no auto-run or audio.

## Primary source map (accessed 2026-10-01)

| Claim / design decision | Primary computing education source |
| --- | --- |
| Programs express instructions a computer can execute; programmable toys make order visible | [Barefoot Computing: Programming](https://www.barefootcomputing.org/concepts-and-approaches/programming) |
| One condition selects one set of instructions according to the input; automatic doors as an everyday example | [Barefoot Computing: Selection](https://www.barefootcomputing.org/concepts-and-approaches/selection) |
| Predict, observe, locate the error, change and test again; line-by-line inspection | [Barefoot Computing: Debugging](https://www.barefootcomputing.org/concepts-and-approaches/debugging) |
| Programs occur in familiar appliances; distinguish design, instructions and testing | [University of Canterbury: CS Unplugged, Kidbots](https://www.csunplugged.org/en/topics/kidbots/) |

All prose, cart art, route and finite interpreter are original. Sources support the educational concepts, not a claim that this is the control system of a real delivery robot. `study.ts` supplies scene-specific equivalent Chinese/English notes; `learning.json` contains the contracted three academic notes and four narration segments.

## Ownership

`model.ts` owns the interpreter and scenario state. `scene.ts` maps that state to the original SVG cart/parcel/trace/sensor. `main.ts` owns native control actions, finite animation lifetime and scenario selection. No user-entered text is evaluated and no network model API is used. `catalog-entry.json` / `catalog-en.json` are integration suggestions only; the parent integrator owns the shared catalog and translations.

## Verification and browser targets

Focused command: `node --import tsx --test topics/programs/tests/model.test.mjs`.

Important selectors: `[data-scenario="sequence|condition|debug"]`, `#step`, `#run`, `#pause`, `#reset`, `#obstacle`, `#fix-order`, `#break-order`, `[data-mode="kids|academic"]`. Scene exposes `#program-scene` data attributes `x`, `y`, `parcel`, `choice`; `.program-lab` exposes `scenario`, `status`, `executed`. No test-only global API is installed.

Production browser matrix for integration:

1. Sequence: step to pickup, mid-route and delivered; run then pause, wait and verify stable execution count; reset.
2. Condition: default blocked input chooses detour; reset and uncheck obstacle before decision to choose straight; add box after clear decision and verify the explicitly labelled screen-overlap guard stops the test without rewritten sensor/branch.
3. Debug: failure at second card leaves parcel at A; swap cards explicitly resets and then delivers; restore faulty order.
4. Switch away and back mid-test and between child/academic modes without changing parcel, position or pointer. Confirm first return is paused.
5. Repeat desktop/mobile and zh/en, light/dark; native keyboard operation, visible focus, reduced motion, direct `?experiment=condition|debug` routing and sibling links.

Parent integration owns final full `npm run check`, built-production browser evidence and publication decisions. This contribution does not claim those checks before they run.

## Reader layout · 2026-10-18

默认优先显示小车与指令证据；窄或低高窗口由 Reader 收起操作，用户可随时展开。章节、讲解方式和次要条件通过 Reader 的折叠菜单或「解说与设置」打开。保留原有控件、绘图实例与实验状态。完整指令卡与小车同屏，展开后的执行按钮紧随小车；运行结果留在状态栏。输入与分支证据继续按原情境显示，次要说明按需展开。

The default Reader layout prioritizes the cart and instruction evidence. Narrow or short windows collapse real controls behind Reader’s operation entry. Chapter, reading-depth and secondary-condition menus start closed. Original controls, rendering instances and experiment state are retained; live evidence remains available through the scene, status and explanation panel.
## Material refinement · 2026-10-19

小车保留可追踪的教学玩具外形，橡胶轮、金属外壳、固定件和传感器玻璃使用克制的材质区分。所有细节位于原有 `robot-body` 中，仍由同一指令状态驱动；不增加拟人表情、传感能力、运动规则或物理精度。

Rubber, casing, fasteners and sensor-glass details share the original cart transform. These are illustration details, not additional simulated hardware or improved sensor capability. Grid coordinates, parcel identity, branch input and instruction execution are unchanged.

Responsive Reader composition keeps the cart and executable cards together when their actual container is wide enough, including short landscape windows. The compact action row exposes either the original run or pause button and captures keyboard focus before controls become disabled or hidden. Reset uses a 44px icon with its full original accessible label and title, keeping it in the same compact row; handlers and interpreter semantics are unchanged. Reader may collapse the real controls, while instruction cards, status and scientific qualifications remain visible. The scene consumes the shared available-size budget, and only the card list scrolls to its current instruction. Width changes retain the same interpreter, cart, parcel and instruction nodes.

The instruction evidence uses a content-bounded rail (`clamp(12rem, 26%, 17rem)`) when the paired layout fits, and returns to normal stacked flow in a narrow container. Instructions are reading rows, not buttons: their 14px text can wrap naturally, while the original sequence numbers, next arrow, executed check and failure mark retain state meaning. A shallow current-row background and short left mark replace enclosing card borders; the rail owns a single 10px right-edge inset. Below the full-width scene, actions, status and captions share a 12px inline inset; status keeps its text without a decorative left rule.
