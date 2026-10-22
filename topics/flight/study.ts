import { language } from '../../src/platform/i18n.ts';
import type { Question } from './journey.ts';
const w = (zh: string, en: string) => language === 'en' ? en : zh;

/** Each question changes the observation task while retaining the same wing and flight state. */
export const studies = {
  airflow: {
    label: w('01 · 空气从哪里来？', '01 · Where does the airflow come from?'),
    title: w('机翼需要和空气相遇', 'The wing needs motion relative to air'),
    kids: w('飞机向前，空气就相对机翼向后经过。先把速度降到零，再恢复：抬起机翼，也不能凭空产生升力。', 'As the airplane moves forward, air passes backward relative to its wing. Set speed to zero, then restore it: raising a wing cannot create lift without relative motion.'),
    watch: w('先认出机身、机翼、尾翼和轮子，再点蓝色翼根，放大同一片机翼。', 'Find the fuselage, main wings, tail and wheels, then select the blue wing root to inspect that same wing.'),
    science: w('“迎面气流”取决于飞机相对空气的运动。这里空气对地静止；真实逆风时，空速和地速可以不同。箭头表示相对方向，短划线只帮助追踪路线，不代表配对分子、测得流速或飞行时间。', 'Relative airflow depends on motion between airplane and air. This experiment holds the air still relative to the ground; with a real headwind, airspeed and ground speed can differ. Arrows show relative direction. Moving dashes only help trace routes; they are not paired molecules, measured velocities or transit times.'),
    bridge: w('有了相对气流，机翼怎样受到向上的作用？', 'Once air passes, how does the wing receive an upward force?'),
    limit: w('蓝线是定性绕流示意。没有求解空气速度场，不能从线距或短划线的移动算出压力。', 'Blue curves illustrate qualitative flow. No velocity field is solved, so line spacing and moving dashes cannot determine pressure.'),
  },
  forces: {
    label: w('02 · 空气怎样托住机翼？', '02 · How does air lift a wing?'),
    title: w('翼面压力和向下转的气流', 'Surface pressure and downward-turning air'),
    kids: w('机翼让周围气流改变方向，翼面上的压力分布也随之改变。常见的升力情形里，经过的空气总体向下转，机翼受到向上的作用。', 'The wing changes the surrounding flow, together with its surface pressure distribution. In common lifting flow, the air turns downward overall and the wing receives an upward force.'),
    watch: w('看同一片机翼：上、下两面都参与，绿色箭头与迎面气流垂直。', 'Watch the same wing: both surfaces contribute, and green lift is perpendicular to the incoming flow.'),
    science: w('把整个翼面上的压力与剪切作用相加，得到气动力；把它分解为垂直于相对运动的升力与反向的阻力。观察整股空气的动量改变，是同一流动的另一种描述。图中浅色区域只示意常见附着升力情形的相对压力关系，没有计算压力大小，也不用于分离流。', 'Summing pressure and shear over the whole surface gives the aerodynamic force. Lift is its component perpendicular to relative motion; drag opposes that motion. The momentum change of the whole airflow describes the same interaction. Pale regions only illustrate a common relative pressure relationship in attached lifting flow; no pressure magnitude is computed, and they are not applied to separated flow.'),
    bridge: w('有升力，轮子就一定离开跑道吗？', 'Does any lift make the wheels leave the runway?'),
    limit: w('压力色区是概念关系，不是计算压力图；上下气流没有必须在尾缘同时会合的规则。', 'Pressure colours show a concept, not a computed pressure map. Upper and lower air have no obligation to meet at the trailing edge.'),
  },
  runway: {
    label: w('03 · 有升力就能离地吗？', '03 · Does lift always mean lift-off?'),
    title: w('跑道先托住了剩下的重量', 'The runway carries the remaining load'),
    kids: w('有升力时，轮子仍可能压着跑道。播放同一组条件：竖直合力向上，飞机才开始向上加速，离地后跑道支持力消失。', 'The wheels can still press on the runway even with lift. Play the same conditions: an upward net vertical force begins upward acceleration. Runway support disappears after lift-off.'),
    watch: w('看轮胎接触和灰蓝箭头，再比较适中角度与同速大角度。', 'Watch tyre contact and the grey-blue support arrow; compare moderate and excessive angle at the same initial speed.'),
    science: w('上升时，升力与阻力的方向跟随相对速度，不能只比较升力数值与重量。模型用竖直分量与地面支持求合力，水平推力自动平衡水平气动力。稳定水平飞行可以受力平衡；有向上合力描述的是加速。三维视图沿同一条跑道跟随飞机，翼根的蓝色标记对应刚才的切面。', 'During ascent, lift and drag follow relative velocity, so comparing lift magnitude with weight alone is insufficient. This model sums vertical components and ground support, while horizontal thrust balances horizontal aerodynamic force. Steady level flight can have balanced forces; an upward net force describes acceleration. The spatial view follows the same airplane along one runway. The blue wing-root mark identifies the section studied earlier.'),
    bridge: w('把翼头再抬高一些，会总是更容易飞吗？', 'Will raising the wing nose farther always help?'),
    limit: w('1.2 秒教学响应；速度与整机姿态被外部保持，推力简化为水平。最低轮胎表面定义离地高度，未计算俯仰、配平或实机性能。', 'A 1.2-second teaching response with externally held speed and whole-airframe attitude; thrust is simplified as horizontal. Height is the lowest tyre clearance. Pitch dynamics, trim and real performance are not calculated.'),
  },
  stall: {
    label: w('04 · 角度越大越好吗？', '04 · Is a greater angle always better?'),
    title: w('迎角过大，气流会分离', 'Excessive angle of attack separates flow'),
    kids: w('保持同样的速度，把翼头抬得更多。超过临界迎角，上方气流明显离开翼面，升力系数下降、阻力增加：这叫失速。', 'Keep the same initial speed and raise the wing nose farther. Beyond a critical angle, flow separates extensively above the wing: lift coefficient falls and drag grows. This is a stall.'),
    watch: w('先试 12°，再试 26°；失速还有升力，也不表示发动机停了。', 'Compare 12° with 26°. A stalled wing can still have lift; stall does not mean engine failure.'),
    science: w('迎角量的是弦线与相对运动方向之间的夹角。上升时，相对运动方向改变，即使翼头对水平线的角度没变，迎角也会变。图线来自本页人为设定的升力系数，15°只是教学转折；真实临界迎角随翼型、表面状态和配置变化。低速不自动等于失速，失速也可以发生在不同速度。', 'Angle of attack is between chord and motion relative to air. Ascent changes that direction, so angle of attack can change while the wing angle above the horizon stays fixed. The graph shows the page’s invented lift coefficients; 15° is only a teaching threshold. A real critical angle depends on airfoil, surface condition and configuration. Low speed alone does not define a stall, which can occur at different speeds.'),
    bridge: w('带着同一组条件，回到跑道验证你的判断。', 'Take these same conditions back to the runway to check your prediction.'),
    limit: w('棕色虚线和涡形是分离示意，没有模拟真实湍流；图线是教学系数，不能用来驾驶飞机。', 'Brown dashes and eddy shapes illustrate separation without simulating real turbulence. The coefficient graph is illustrative and cannot guide aircraft operation.'),
  },
} satisfies Record<Question, {label: string; title: string; kids: string; watch: string; science: string; bridge: string; limit: string}>;
