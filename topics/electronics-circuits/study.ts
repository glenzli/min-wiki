import type { CircuitObservation } from './model.ts';
import type { SceneStudy } from '../../src/platform/sceneReading.ts';

const w = (zh: string, en: string) => ({ zh, en });
const sources = [
  { title: 'U.S. EIA Energy Kids · Complete circuits', url: 'https://www.eia.gov/kids/energy-sources/electricity/science-of-electricity.php' },
  { title: 'Micro:bit Educational Foundation · Sensors', url: 'https://microbit.org/get-started/features/sensors/' },
  { title: 'OpenStax · Current and drift', url: 'https://openstax.org/books/college-physics-2e/pages/20-1-current' },
  { title: 'Texas Instruments · Power MOSFETs', url: 'https://www.ti.com/lit/pdf/snva008' },
];

export function studyFor(observation: CircuitObservation): SceneStudy {
  const common = {
    child: w('先看灯，再沿粗实线找一整圈。', 'Look at the lamp, then trace one complete loop along the thick lines.'),
    sources,
    limits: w('只投影正常低压直流回路的稳定通断；没有计算电压、电流大小、温度、灯丝冷却、电磁传播或开关瞬态。电池始终可供能。机械接点画出真实的接触关系，电子开关内部的绿线只是导通编码，不是实际剖面。感光器与比较器另由同一电池供电，供电支路省略；灯回线断开只影响灯支路。形状和尺度不是接线或维修图。', 'Only the stable on/off behavior of a normal low-voltage DC circuit is projected. Voltage, current magnitude, temperature, filament cooling, electromagnetic propagation and switching transients are not calculated. The battery remains available. Mechanical contacts show contact geometry; the green line inside the electronic switch only encodes conductivity and is not a cutaway. A separate branch of the same battery supplies the sensor and comparator; its power wiring is omitted. Breaking the lamp return affects only the lamp branch. Geometry and scale are not wiring or repair instructions.'),
  };
  if (observation.state.mode === 'manual') return {
    ...common,
    title: w('完整路径与持续供能', 'A complete path and sustained energy supply'),
    theory: w('本板先让电子开关保持导通，单独观察机械开关与灯回线。任一处断开，灯支路就不能维持电流；合上供电开关不能跨过另一个断口。电池的化学能通过电路转移，灯丝把电能转成光和热。金属导线本来有可移动电子，合闸后的电磁变化使回路各处响应，并不是等待一颗电子从电池跑到灯才亮。开路不等于所有导线上都没有电压，也不等于电池耗尽。', 'The electronic switch is held conducting in this first view so that the mechanical switch and lamp return can be examined separately. Either opening prevents sustained current in the lamp branch; closing one switch cannot bridge another gap. The circuit transfers chemical energy from the battery, and the filament converts electrical energy into light and heat. Metal wires already contain mobile electrons. Electromagnetic changes following closure cause the circuit to respond; the lamp does not wait for one electron to travel from the battery. An open circuit does not imply that every wire has zero voltage or that the battery is depleted.'),
    evidence: w('EIA 的电路教学图支持“导线—负载—另一条导线”形成完整路径。OpenStax 区分电子平均漂移与电信号传播；这页没有用慢速小点冒充供能速度。真实手电筒可有额外驱动、接触电阻及不同的开关结构。', 'EIA’s circuit illustration supports a complete wire–load–return-wire path. OpenStax distinguishes electron drift from electrical signal propagation; this page does not use slow dots to portray the speed of energy transfer. Real flashlights can include additional drivers, contact resistance and different switch mechanisms.'),
  };
  return {
    ...common,
    title: w('信息控制导通，能源仍来自电池', 'Information controls conduction; energy still comes from the battery'),
    theory: w('感光器把附近光照转成电信号；功能性的比较器把输入与设定分界比较，输出控制电子开关。这里只实现“低于分界”与“等于或高于分界”的两类，并可反转控制规则。晶体管用电信号控制导通，不需要像机械开关那样移动接点。虚线把感知、比较、控制的职责连接起来，不是实际的单根信号接线；真实信号电路也有参考与返回路径。灯只有在供电开关、灯回线和电子开关都导通时才亮。', 'A light sensor converts nearby illumination into an electrical signal. A functional comparator compares the input with a chosen boundary and controls the electronic switch. This model distinguishes “below the boundary” from “at or above the boundary” and allows the rule to be reversed. A transistor uses an electrical signal to control conduction without moving mechanical contacts. The dashed paths connect sensing, comparison and control roles; they are not literal single-wire connections. Real signal circuits also need reference and return paths. The lamp lights only when the supply switch, lamp return and electronic switch all conduct.'),
    evidence: w('Micro:bit 教育基金会以光传感器、输入／处理／输出和夜灯示例说明这条职责链。TI 的 MOSFET 应用资料支持通过栅极电信号控制器件导通；这里不教授栅压或器件接线。固定的自动规则不需要 AI，也不一定需要程序：可以由电子比较电路实现，亦可由处理器执行程序实现。', 'The Micro:bit Educational Foundation explains this functional chain through light sensors, input–processing–output and nightlight examples. TI’s MOSFET application note supports electrical gate control of conduction; this page teaches neither gate voltages nor wiring. A fixed automatic rule requires no AI and does not necessarily require a program: an electronic comparison circuit can implement it, or a processor can execute a program.'),
    limits: w('亮暗与分界采用未标定的 0–100 教学刻度，不是 lux；等于分界归到“亮”。传感信号断开时，本页明确选用“禁止点灯”的失效策略，不声称所有产品都这样做。没有噪声、采样延迟、滞回、驱动损耗或灯照到自身感光器的反馈；滑条控制的是感光器附近的外部光照。感光器和比较器的电池供电线省略，虚线也省略参考与返回路径。', 'Light and boundary use an uncalibrated 0–100 teaching scale, not lux; equality belongs to “bright.” For unavailable sensor input, this page explicitly chooses an inhibit-light policy, not a universal product behavior. Noise, sampling delays, hysteresis, driver losses and feedback from the lamp onto its own sensor are omitted. The slider controls external light near the sensor. Battery power wires for the sensor and comparator, and signal reference and return paths, are omitted.'),
  };
}
