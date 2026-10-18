import type { SceneStudy } from '../../src/platform/sceneReading.ts';
import type { Scenario } from './model.ts';
const w = (zh: string, en: string) => ({ zh, en });
const programming = { title: 'Barefoot Computing · Programming', url: 'https://www.barefootcomputing.org/concepts-and-approaches/programming' };
const selection = { title: 'Barefoot Computing · Selection', url: 'https://www.barefootcomputing.org/concepts-and-approaches/selection' };
const debugging = { title: 'Barefoot Computing · Debugging', url: 'https://www.barefootcomputing.org/concepts-and-approaches/debugging' };
const kidbots = { title: 'University of Canterbury · CS Unplugged: Kidbots', url: 'https://www.csunplugged.org/en/topics/kidbots/' };
export const studies: Record<Scenario, SceneStudy> = {
  sequence: {
    child: w('先取货，再走四格，最后放下。小车每次只执行下一张卡；它不会替我们补上忘掉的步骤。', 'Pick up, travel four squares, then put down. The cart executes the next card each time; it does not add steps we forgot.'),
    title: w('顺序：程序把计划变成可执行的动作', 'Sequence: a plan becomes executable actions'),
    theory: w('人先确定目标，再用设备能执行的命令表达步骤。本页的“取货”“走一格”“放下”是预先定义的命令；程序指针记录下一条的位置，执行后才推进。取货改变包裹状态，移动改变小车位置，卸货要求小车在 B 点且确实带着货。同一批命令换个顺序，会改变是否满足这些前提。', 'A person sets a goal and expresses steps using commands the device can execute. Here, “pick up”, “move one square” and “put down” are predefined commands. A program pointer records the next instruction and advances after execution. Pickup changes parcel state; movement changes cart position. Unloading requires both arrival at B and a parcel on board. Reordering the same commands can change whether these requirements are met.'),
    evidence: w('编程教育常把可编程玩具的动作与旁边的步骤计划对应起来。本页通过保留同一个包裹和执行指针，让顺序的作用可检查。', 'Computing education often connects a programmable toy’s actions with a step-by-step plan beside it. The retained parcel and execution pointer make the effect of order inspectable here.'),
    limits: w('小车执行的是有限指令集合，没有解释任意自然语言。机械取放动作、移动精度和执行时间是教学简化；真实设备还需要供电、控制电路和软件运行环境。', 'The cart executes a finite command set, not arbitrary natural language. Pickup mechanics, movement precision and execution time are simplified; real devices also need power, control electronics and a software runtime.'),
    sources: [programming, kidbots],
  },
  condition: {
    child: w('小车到路口，才执行“看看前面”。有箱子就绕旁路，没有就直走。同一份程序，收到不同输入，可以走不同的路。', 'At the junction, the cart executes “look ahead”. A box means a detour; no box means straight ahead. One program can take different routes when its input changes.'),
    title: w('条件：读取输入，再执行其中一个分支', 'Selection: read an input, execute one branch'),
    theory: w('判断卡执行时，传感器读取前方那一格是否被箱子占据。程序把这个读数交给预先写好的规则：如果被占据，加入上移、右移三次和下移；否则加入右移三次。所选指令随后逐条执行，再回到共有的卸货步骤。传感器不是程序，读数不是意愿，判断也不表示机器像人一样理解道路。', 'When the decision card executes, the sensor reads whether a box occupies the next square. The program applies a predefined rule to that reading: if blocked, insert an upward move, three rightward moves and a downward move; otherwise insert three rightward moves. These commands execute in turn before the shared unloading step. A sensor is not the program, its reading is not an intention, and the decision does not mean human-like understanding of a road.'),
    evidence: w('条件选择使同一程序能对不同输入产生不同输出；自动门等系统也是日常入口。这里可以先改箱子，再单步执行判断，比较两次读数与路线。', 'Selection allows one program to produce different outputs for different inputs; systems such as automatic doors provide everyday examples. Change the box before stepping through the decision to compare readings and routes.'),
    limits: w('读数被设为准确的“有／无”，并只在判断卡执行时采样一次。之后若放上新箱子，屏幕实验的防重叠保护会拒绝那次移动；这不是传感器又读了一次，也不是程序已具备安全停车能力。真实机器人若不重新感知，可能碰撞，需要持续测量、处理误差和更完整的安全策略。', 'The reading is an exact yes/no value, sampled only when the decision card executes. If a box is added later, the screen activity’s overlap guard rejects that move. This is neither another sensor reading nor evidence of safe stopping in the program. A real robot that does not sense again could collide; it needs ongoing measurements, uncertainty handling and more complete safety strategies.'),
    sources: [selection, programming],
  },
  debug: {
    child: w('先猜，再试，再找出不对的那一步。小车先走开，第二张卡却叫它取货；把取货移到前面，再从头测试。', 'Predict, test, then find the first wrong step. The cart moves away, but the second card asks it to pick up. Move pickup first, then test from the start.'),
    title: w('找错：比较目标、指令与实际状态', 'Debugging: compare goal, instructions and actual state'),
    theory: w('目标是把 A 点的包裹送到 B 点，不是仅仅让小车到 B 点。错误顺序的第一条移动本身能执行，但它让第二条取货的前提不再成立。停住后查看包裹的位置和卡片，能把原因定位到顺序，而非速度或外形。交换前两条后从相同初始状态重新测试，才是在检查修正是否有效。', 'The goal is to deliver A’s parcel to B, not simply to move the cart to B. The first movement in the faulty order is executable, but it makes the second command’s pickup requirement false. Inspecting the parcel and cards after the stop locates the cause in order, rather than speed or appearance. Swapping the first two commands and testing from the same initial state checks whether the correction works.'),
    evidence: w('逐条执行和比较预期与实际结果，是小学找错活动中的常用方法。错误不是小车在“闹脾气”；写规则的人需要检查步骤和假设。', 'Stepping through instructions and comparing expected with actual results are common approaches in primary debugging activities. The cart is not “being stubborn”; the rule’s author needs to inspect steps and assumptions.'),
    limits: w('本例遇到无法完成的动作就停止，并把失败卡标出来。真实软件可能继续运行、报错、重试或产生难以察觉的错误结果，具体行为由程序和系统规定。一次成功也不是所有情况都正确的证明。', 'This example stops on an impossible action and marks the failed card. Real software may continue, report an error, retry or produce subtle wrong results, depending on the program and system. One successful test does not prove correctness in every situation.'),
    sources: [debugging, kidbots],
  },
};
