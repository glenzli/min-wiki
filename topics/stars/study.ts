import type { SceneStudy } from '../../src/platform/sceneReading.ts';
import type { Track } from './evolutionModel.ts';

const w = (zh: string, en: string) => ({ zh, en });
const life = { title: 'NASA · Stars and their life cycles', url: 'https://science.nasa.gov/universe/stars/' };
const webb = { title: 'NASA Webb · Star lifecycle', url: 'https://science.nasa.gov/mission/webb/star-lifecycle/' };
const sun = { title: 'NASA · Sun facts', url: 'https://science.nasa.gov/sun/facts/' };
const magnetic = { title: 'NASA · Solar storms and flares', url: 'https://science.nasa.gov/sun/solar-storms-and-flares/' };
const kepler = { title: 'NASA · Orbits and Kepler’s laws', url: 'https://science.nasa.gov/solar-system/orbits-and-keplers-laws/' };

const evolution: readonly SceneStudy[] = [
  {
    child: w('一大片冷气体和尘埃不会一下子变成星球。较密的地方先在引力下慢慢收缩。', 'A cold cloud of gas and dust does not instantly become a star. Denser regions can begin contracting under gravity.'),
    title: w('分子云：什么时候开始收缩？', 'Molecular cloud: when can collapse begin?'),
    theory: w('自引力试图压缩云核，气体压强、湍流与磁场则提供不同程度的支撑。常用自由落体时间估计“若忽略支撑”时的收缩量级；真实恒星形成还涉及碎裂、角动量和持续吸积。', 'Self-gravity compresses a cloud core while gas pressure, turbulence and magnetic fields provide varying support. A free-fall time estimates a collapse timescale only if support is neglected; real star formation also involves fragmentation, angular momentum and continuing accretion.'),
    formula: 'tff = √(3π / 32Gρ)',
    terms: w('ρ 是均匀云的平均密度。此式是假定无压、均匀球的参考时间，不是本动画的播放速度。', 'ρ is the mean density of a uniform cloud. This is a pressure-free uniform-sphere reference time, not the animation speed.'),
    evidence: w('红外和毫米波观测穿过尘埃，看到分子云中的致密核、年轻星体与外流。', 'Infrared and millimeter observations probe dusty clouds, dense cores, young stars and outflows.'),
    limits: w('动画不是流体、磁场或辐射转移求解；颗粒是示意，不代表一粒尘埃会沿画出的路线成为一颗星。', 'The animation does not solve fluid flow, magnetic fields or radiative transfer. Particles are illustrative, not traced dust grains that become stars along exact paths.'),
    sources: [webb, life],
  },
  {
    child: w('收缩的气体围着年轻的星旋转，部分物质落向中心，部分可能沿两极流走。中心还不一定已经稳定地烧起氢聚变。', 'Gas circles a young star; some falls inward and some may flow out near the poles. Stable hydrogen fusion need not have begun yet.'),
    title: w('原恒星：盘、吸积与外流', 'Protostar: disk, accretion and outflow'),
    theory: w('带角动量的物质不能径直全落向中心，因而形成旋转结构。向内吸积释放引力能，盘和原恒星可发光；双极喷流与磁场、盘的相互作用有关。原恒星不是一颗已进入稳定主序的成熟恒星。', 'Material with angular momentum cannot all fall straight inward and forms a rotating structure. Infall releases gravitational energy and can make the disk and protostar luminous; bipolar outflows involve interactions with the disk and magnetic fields. A protostar has not necessarily reached a stable main sequence.'),
    formula: 'Lacc ∼ GMṀ / R',
    terms: w('M、R 是吸积中心质量和半径，Ṁ 是吸积率；数量级关系，真实辐射效率、盘结构和喷流分流未在此求解。', 'M and R describe the accretor and Ṁ the accretion rate; this is an order-of-magnitude relation, not a solved disk, radiation-efficiency or jet model.'),
    evidence: w('JWST 等红外观测可分辨尘埃包层、年轻星与喷流；光谱和运动信息帮助区别气体流入与流出。', 'JWST and other infrared observations resolve dusty envelopes, young stars and jets; spectra and motions help distinguish inflow from outflow.'),
    limits: w('盘和喷流的形状与时间都被编排成教学动画；不同恒星形成环境不会遵循同一张分镜。', 'Disk and jet geometry and timing are composed for teaching; every star-forming environment does not follow one storyboard.'),
    sources: [webb, life],
  },
  {
    child: w('当核心开始稳定地把氢变成氦，恒星进入很长的主序阶段。质量越大，通常越亮，也更快走完这一段。', 'When its core stably fuses hydrogen into helium, a star enters its long main-sequence phase. More massive stars are generally brighter and finish this phase sooner.'),
    title: w('主序：聚变怎样支撑恒星发光', 'Main sequence: fusion and starlight'),
    theory: w('核心中的核聚变把一小部分质量差转成能量；向外的压强梯度与向内引力近似平衡。光谱给出有效温度线索，亮度、半径与有效温度的关系能把观测接到恒星结构模型。不同质量不能只用同一条寿命曲线缩放。', 'Core fusion converts a small mass difference into energy, while the outward pressure gradient approximately balances gravity. Spectra constrain effective temperature, and luminosity, radius and effective temperature connect observations to stellar-structure models. Lifetimes do not follow one simple scaled track for every mass.'),
    formula: 'E = Δmc² ; L = 4πR²σTₑff⁴',
    terms: w('后一式把有效温度定义为具有同样总辐射的黑体温度；真实恒星光谱并非完美黑体。', 'The second relation defines an effective temperature through equal total blackbody emission; real stellar spectra are not perfect blackbodies.'),
    evidence: w('光谱、视差与双星轨道分别帮助测温、定距和测质量，联合检验演化模型。', 'Spectra, parallax and binary orbits help infer temperature, distance and mass, jointly testing evolution models.'),
    limits: w('画面用代表质量轨道，不从聚变网络或结构方程推算这些年龄和半径。', 'The view uses representative mass tracks; its ages and radii are not solved from a fusion network or stellar-structure equations.'),
    sources: [life, { title: 'NASA · Stefan–Boltzmann law', url: 'https://science.nasa.gov/universe/glossary/' }],
  },
  {
    child: w('核心里的氢逐渐变少，原来的平衡会改变。外层和内层的变化不会同时、同速发生。', 'Hydrogen in the core runs low and the old balance changes. Inner and outer regions do not change at the same time or speed.'),
    title: w('核心燃料减少后，结构为什么会重排', 'Why structure changes as core hydrogen runs low'),
    theory: w('核心氢丰度下降改变能量产生与压强支撑；核心可收缩，壳层燃烧和外包层响应随质量与组成而异。恒星演化计算要同时处理静力平衡、能量传输、核反应和物质混合。', 'Falling core hydrogen changes energy generation and pressure support; the core may contract while shell burning and envelope response depend on mass and composition. Stellar-evolution calculations couple hydrostatic balance, energy transport, nuclear reactions and mixing.'),
    formula: 'dP/dr = −GM(r)ρ/r²',
    terms: w('这是球对称、近静力状态的结构方程之一；单靠它不能推出完整的晚年路径。', 'One equation for a nearly hydrostatic spherical star; it cannot by itself predict the full late-life path.'),
    evidence: w('不同年龄的星团和双星质量测量为理论轨道提供约束；一次演示的时间轴不是单颗真实恒星的观测录像。', 'Star clusters of different ages and binary mass measurements constrain theoretical tracks; the timeline is not a filmed lifetime of one observed star.'),
    limits: w('图中的“剩余燃料”是教学进度，不是由反应网络算出的核心氢质量分数。', 'The displayed “fuel remaining” is teaching progress, not a core-hydrogen fraction calculated from a reaction network.'),
    sources: [life, webb],
  },
  {
    child: w('恒星晚年外层会大幅膨胀。对太阳型示例，变大的外层可能到达内侧行星轨道；行星真正的命运还要看轨道和质量流失。', 'A star’s outer layers can swell late in life. In the Sun-like example they may reach inner planetary orbits; real planetary fates also depend on orbit changes and mass loss.'),
    title: w('巨星膨胀与行星轨道的区别', 'Giant-star expansion versus planetary orbits'),
    theory: w('核心和壳层能量过程改变外包层结构，半径可能增长很多，表面有效温度却可下降。若把恒星半径与行星轨道半长轴放在同一长度单位，便能判断几何相交；真实吞没还涉及潮汐、恒星风和轨道演化。', 'Changing core and shell energy processes alter the envelope; radius can increase enormously while effective surface temperature falls. Comparing radius and orbital semimajor axis in one unit identifies geometric overlap, but actual engulfment also involves tides, stellar wind and orbit evolution.'),
    formula: 'R★ ≥ aₚ  (geometric overlap)',
    terms: w('R★ 是图中恒星外层半径，aₚ 是取整的行星轨道距离；这不是完整的吞没判据。', 'R★ is the displayed stellar radius and aₚ a rounded planetary orbital distance; this is not a complete engulfment criterion.'),
    evidence: w('巨星的光度、温度、脉动和质量流失约束外层演化；行星能否存活需单独的动力学研究。', 'Giant-star luminosity, temperature, pulsation and mass loss constrain envelope evolution; planetary survival needs separate dynamical study.'),
    limits: w('三个质量示例并非一条恒星必经路线。画面尺寸和年龄使用代表锚点插值，识别视角不能拿来量半径。', 'The three masses are alternatives, not successive lives of one star. Sizes and ages interpolate representative anchors; the recognition view is not a radius ruler.'),
    sources: [life, { title: 'NASA · Sun facts and future', url: 'https://science.nasa.gov/sun/facts/' }],
  },
  {
    child: w('太阳型恒星会抛出外层；更大质量的恒星可能经历核心坍缩和超新星。它们不是同一种爆炸。', 'A Sun-like star can shed its outer layers; a much more massive star may undergo core collapse and a supernova. These are different events.'),
    title: w('晚年分岔：抛层与核心坍缩', 'Late-life branches: envelope loss and core collapse'),
    theory: w('太阳型示例通过晚期质量流失露出炽热核心，外抛气体可被照亮。较大质量恒星的核心若形成铁核，聚变不再提供净支撑；坍缩与抛射的结局依赖初始质量、金属丰度、质量流失、双星相互作用等。', 'In the Sun-like example, late mass loss exposes a hot core that can illuminate ejected gas. In a sufficiently massive star, an iron core can no longer gain net support from fusion; collapse and ejection outcomes depend on initial mass, metallicity, mass loss and binary interactions.'),
    evidence: w('星云的光谱显示抛出物的元素；超新星残骸和中微子事件为核心坍缩模型提供不同证据。', 'Nebular spectra reveal ejected elements; supernova remnants and neutrino events offer distinct evidence for core-collapse models.'),
    limits: w('动画中的扩散速度、亮度和产物形状不是一次实测事件；约 15 与 30 个太阳质量只代表分支案例，不能当成遗骸分界线。', 'Expansion speed, brightness and debris geometry are not a recorded event. Roughly 15 and 30 solar masses are branch examples, not fixed remnant thresholds.'),
    sources: [webb, life],
  },
];

const remnants: Record<Track, SceneStudy> = {
  solar: {
    child: w('太阳型示例最后留下很小、很密的白矮星。它不再靠核心氢聚变发光，会慢慢冷却。', 'The Sun-like example leaves a small, dense white dwarf. It no longer shines by core hydrogen fusion and slowly cools.'),
    title: w('白矮星：小核心怎样留下来', 'White dwarf: the core that remains'),
    theory: w('外层抛出后，遗留核心由电子简并压支撑；其热辐射来自过去储存的能量，之后逐渐冷却。白矮星半径可接近地球量级，但它并不是“缩小的太阳表面”。', 'After the envelope is lost, electron degeneracy pressure supports the remnant core. Its thermal light comes from stored energy and fades as it cools. A white dwarf can be Earth-sized, but it is not a miniature version of the Sun’s old photosphere.'),
    evidence: w('白矮星光谱、视差与双星测量用于检验其温度、质量和半径。', 'White-dwarf spectra, parallaxes and binary measurements test temperatures, masses and radii.'),
    limits: w('右侧识别视角放大了遗骸；左侧保留原恒星外层尺度作对照，不能用屏幕圆盘直接量比值。', 'The recognition view enlarges the remnant; the previous envelope is retained as context. Screen disks do not provide a direct size ratio.'),
    sources: [life, webb],
  },
  massive: {
    child: w('大质量示例坍缩后留下中子星：把许多物质压进一座城市般的尺度。它的命运还取决于坍缩和抛射时发生的事。', 'The massive-star example leaves a neutron star, packing a great deal of matter into a city-sized region. The outcome depends on collapse and ejection details.'),
    title: w('中子星：致密遗骸如何与原星比较', 'Neutron star: a compact remnant beside its former star'),
    theory: w('核心坍缩可把物质压到核物质密度量级；中子简并与强相互作用对支撑都重要。遗骸质量、半径及超新星机制仍是活跃研究问题，不由初始质量一个数唯一决定。', 'Core collapse can compress matter toward nuclear densities. Neutron degeneracy and the strong interaction both matter for support. Remnant mass, radius and supernova mechanism remain active research questions and are not fixed by initial mass alone.'),
    evidence: w('脉冲星计时、双星轨道和引力波事件提供互补约束。', 'Pulsar timing, binary orbits and gravitational-wave events provide complementary constraints.'),
    limits: w('图中的中子星直径是数量级示意；原星与遗骸共屏时采用不同观察放大率，画面会标示对照关系。', 'The neutron-star diameter is schematic; the former star and remnant use different recognition magnifications and are labeled accordingly.'),
    sources: [life, { title: 'NASA · Types of stars', url: 'https://science.nasa.gov/universe/stars/types/' }],
  },
  'very-massive': {
    child: w('极大质量示例可能留下黑洞。黑洞刚形成时不一定有亮盘；要有附近物质持续落入，才可能形成吸积盘。', 'A very massive example may leave a black hole. A new black hole need not have a bright disk; a disk needs nearby matter to feed it.'),
    title: w('黑洞遗骸：视界与吸积盘是两件事', 'Black-hole remnant: horizon and disk are different'),
    theory: w('在简化的无自旋模型中，史瓦西半径随黑洞质量线性增长。视界是时空中的边界；吸积盘是外部气体具有角动量并持续供给时可能形成的物质结构，不是黑洞出生自带的一圈光。', 'For a simplified non-spinning black hole, the Schwarzschild radius scales linearly with mass. The horizon is a spacetime boundary; an accretion disk is outside matter that may form if angular-momentum-bearing gas is supplied. It is not a ring of light present at birth.'),
    formula: 'rₛ = 2GM/c²',
    terms: w('G 为引力常数，M 为黑洞质量，c 为光速；此式不描述旋转黑洞或亮盘外缘。', 'G is the gravitational constant, M black-hole mass and c the speed of light; this is not a rotating-hole or disk-edge radius.'),
    evidence: w('黑洞候选体可由伴星轨道、吸积辐射和引力波等证据研究；有些黑洞在缺少供气时很暗。', 'Candidates are studied through companion orbits, accretion emission and gravitational waves; some are dim when little material is supplied.'),
    limits: w('黑洞结局是此代表轨道的一种可能，不是所有 30 个太阳质量恒星的必然结果。遗骸镜头放大，亮盘只在有供气条件下出现。', 'This black-hole outcome is one representative possibility, not the fate of every 30-solar-mass star. The remnant is magnified, and a bright disk requires supplied matter.'),
    sources: [{ title: 'NASA · Black holes', url: 'https://science.nasa.gov/universe/black-holes/' }, life],
  },
};

export function evolutionStudy(track: Track, phase: number): SceneStudy {
  const entry = phase === 6 ? remnants[track] : evolution[Math.min(5, Math.max(0, phase))]!;
  if (phase !== 4) return entry;
  if (track === 'solar') return entry;
  return {
    ...entry,
    child: track === 'massive'
      ? w('大质量恒星的外层可胀成红超巨星。外层变大不等于核心也膨胀。', 'A massive star can swell into a red supergiant. A larger envelope does not mean its core also expands.')
      : w('极大质量示例的外层可能很大，但质量流失和内部变化让真实轨道并不唯一。', 'A very massive example may have an enormous envelope, but mass loss and internal changes make real tracks diverse.'),
  };
}

export const anatomyStudies: readonly SceneStudy[] = [
  {
    child: w('太阳主要在核心把氢变成氦。释放的能量慢慢向外传，最后才成为我们看见的光。', 'The Sun mainly fuses hydrogen into helium in its core. Energy moves outward before we see it as light.'),
    title: w('核心聚变：能量从哪里来', 'Core fusion: where the energy begins'),
    theory: w('太阳主要通过质子—质子链把氢转为氦，产物的总质量略低于反应前；差值对应释放的能量。核心反应率对温度敏感，但本页没有求解反应网络。', 'The Sun mainly converts hydrogen to helium through the proton–proton chain. Product mass is slightly lower; the difference corresponds to released energy. Rates depend strongly on temperature, but this page does not solve a reaction network.'),
    formula: 'E = Δmc²',
    terms: w('Δm 是反应前后总质量差；不能把整颗恒星的质量直接代入当作每秒发光量。', 'Δm is the total reactant–product mass difference; the whole star’s mass is not its luminosity per second.'),
    evidence: w('太阳光度、光谱与太阳中微子观测共同约束内部模型。', 'Solar luminosity, spectra and solar-neutrino measurements jointly constrain interior models.'),
    limits: w('剖面中的核心大小、箭头速度与颗粒不是可量测的太阳内部录像。', 'The cutaway core, arrows and particles are not measurable footage of the Sun’s interior.'),
    sources: [sun, { title: 'NASA · Layers of the Sun', url: 'https://science.nasa.gov/blogs/the-sun-spot/2023/09/26/layers-of-the-sun/' }],
  },
  {
    child: w('能量从核心向外走，有的区域主要靠辐射，有的区域主要靠热物质上下流动。', 'Energy moves out from the core: radiation dominates in one region and hot material circulates in another.'),
    title: w('辐射区与对流区：传热方式的更替', 'Radiative and convective zones: changing transport'),
    theory: w('辐射扩散和对流都是能量输送方式。透明度、温度梯度与物质状态决定哪种输送更有效；箭头表示机制，单个光子不会笔直穿越层界。', 'Radiative diffusion and convection both transport energy. Opacity, temperature gradients and material state determine which dominates. Arrows encode a mechanism; an individual photon does not travel straight across these zones.'),
    evidence: w('日震学通过表面振荡推断太阳内部声速与层界，和辐射—对流模型比较。', 'Helioseismology infers interior sound speed and boundaries from surface oscillations, testing radiative–convective models.'),
    limits: w('没有解辐射转移或流体对流；图形是结构剖面而不是实际流线。', 'The view does not solve radiative transfer or convective fluid flow; its shapes are a structural cutaway, not measured streamlines.'),
    sources: [sun, { title: 'NASA · Layers of the Sun', url: 'https://science.nasa.gov/blogs/the-sun-spot/2023/09/26/layers-of-the-sun/' }],
  },
  {
    child: w('我们看到的是太阳发出可见光的一层附近。表面亮暗斑驳来自热物质上下翻动，不是硬壳上的花纹。', 'We see light from near the photosphere. Its mottled pattern comes from hot material circulating, not marks on a solid shell.'),
    title: w('光球：为何会看到颗粒', 'Photosphere: why granulation is visible'),
    theory: w('光球是可见光的主要逸出区域，不是固体边界。对流带来的热物质升起、冷却并下沉，形成有寿命和尺度的颗粒图案；辐射亮度也随温度显著变化。', 'The photosphere is where much visible light escapes, not a solid boundary. Convection brings hot material upward; it cools and sinks, producing granules with finite sizes and lifetimes. Radiative brightness changes steeply with temperature.'),
    formula: 'F ≈ σTₑff⁴',
    terms: w('这是有效温度的总辐射通量关系，不表示每一粒真实光球气体都是完美黑体。', 'This is total radiative flux at an effective temperature, not a claim that every photospheric parcel is a perfect blackbody.'),
    evidence: w('高分辨率太阳成像能追踪颗粒的演变；光谱测量帮助判断温度和速度。', 'High-resolution solar imaging follows granule evolution; spectroscopy constrains temperatures and velocities.'),
    limits: w('本页纹理与颗粒速度为示意，不是太阳表面实时影像。', 'The page’s texture and granule motion are illustrative, not live solar imagery.'),
    sources: [{ title: 'NASA · Layers of the Sun', url: 'https://science.nasa.gov/blogs/the-sun-spot/2023/09/26/layers-of-the-sun/' }],
  },
  {
    child: w('太阳黑子看着较暗，是因为那里比周围光球较冷。它们与复杂磁场有关，不是太阳表面的洞。', 'Sunspots look darker because they are cooler than nearby photosphere. They are linked to strong magnetic fields, not holes in the Sun.'),
    title: w('黑子：磁场如何改变局部亮度', 'Sunspots: magnetic fields and local brightness'),
    theory: w('集中磁场会影响局部对流输热，令区域相对较冷、较暗。黑子与活动区相关，但有黑子并不意味着每一刻都发生耀斑。', 'Concentrated magnetic fields alter local convective heat transport, making an area relatively cooler and darker. Spots mark active regions but do not guarantee a flare at every moment.'),
    evidence: w('磁像仪、连续光照片与时间序列联合追踪磁场和黑子的变化。', 'Magnetograms, continuum images and time series jointly trace fields and spot changes.'),
    limits: w('黑子的面积、形状和出现时刻由教学节奏控制，不是太阳周期预测。', 'Spot area, shape and timing follow the teaching sequence, not a solar-cycle forecast.'),
    sources: [magnetic, { title: 'NASA · Solar flares FAQ', url: 'https://science.nasa.gov/blogs/solar-cycle-25/2022/06/10/solar-flares-faqs/' }],
  },
  {
    child: w('磁场扭曲后有时会突然重新连接，短时间释放大量能量，出现耀斑。耀斑不是恒星平时发光的燃料。', 'Twisted magnetic fields can suddenly reconnect and release energy as a flare. A flare is not the fuel behind ordinary starlight.'),
    title: w('耀斑：短时磁能释放', 'Flares: short-lived magnetic-energy release'),
    theory: w('耀斑关联活动区中的磁重联：磁场拓扑变化可把储存的磁能转为粒子加速、加热和辐射。其时间尺度与核心聚变维持长期光度完全不同。', 'Flares involve magnetic reconnection in active regions: changing field topology converts stored magnetic energy into particle acceleration, heating and radiation. Their timescale differs sharply from core fusion sustaining long-term luminosity.'),
    evidence: w('多波段太阳观测把磁场变化、亮度爆发和高能粒子联系起来。', 'Multiwavelength observations connect magnetic change, bright bursts and energetic particles.'),
    limits: w('亮弧长度、爆发时刻和颜色不是按一次真实耀斑标定。', 'Arc length, timing and color are not calibrated to a particular observed flare.'),
    sources: [magnetic],
  },
  {
    child: w('太阳外面的稀薄日冕很热，带电粒子不断向外流，形成太阳风。它不是从太阳表面吹出的普通空气。', 'The sparse outer corona is very hot, and charged particles flow outward as solar wind. This is not ordinary air blowing off the surface.'),
    title: w('日冕与恒星风：外层如何延伸', 'Corona and stellar wind: how the outer atmosphere extends'),
    theory: w('日冕是高温、低密度等离子体。磁场结构影响加热和流出；太阳风携带粒子与磁场进入行星际空间。局部粒子温度、总能量通量和可见亮度是不同物理量。', 'The corona is hot, low-density plasma. Magnetic structure affects heating and outflow; solar wind carries particles and fields into interplanetary space. Particle temperature, energy flux and visible brightness are different quantities.'),
    evidence: w('日冕仪、太阳探测器和行星际原位粒子探测共同研究这条联系。', 'Coronagraphs, solar probes and in-situ interplanetary particle instruments study this connection.'),
    limits: w('风线和粒子被放大；画面没有求解等离子体流动或真实日冕加热机制。', 'Wind lines and particles are enlarged; the view does not solve plasma flow or the full coronal-heating problem.'),
    sources: [sun, magnetic],
  },
];

export const orbitStudies: Record<string, SceneStudy> = {
  circumbinary: {
    child: w('两颗恒星围着共同的中心转。离它们足够远的行星可以围着两颗星一起转。', 'Two stars circle a shared center. A planet sufficiently far away can orbit both stars.'),
    title: w('近双星与环双星行星', 'Close binary and circumbinary planet'),
    theory: w('双星绕共同质心运动，轨道周期与两星总质量、相对轨道半长轴有关。较远的行星可围绕双星整体运动；是否长期稳定取决于距离、偏心率和质量比，不能从一帧画面判断。', 'Binary stars orbit their barycenter. Their period depends on total mass and the relative orbit’s semimajor axis. A distant planet may orbit the pair; long-term stability also depends on distance, eccentricity and mass ratio.'),
    formula: 'P² = 4π²a³ / G(M₁ + M₂)',
    terms: w('P 为双星相对轨道周期，a 为两星相对轨道半长轴；不是外侧行星的周期公式。', 'P and a describe the relative binary orbit, not the outer planet’s period.'),
    evidence: w('食双星光变与视向速度给出双星轨道；环双星行星可由凌星时刻变化等方法识别。', 'Eclipsing-binary light curves and radial velocities constrain the stellar orbit; circumbinary planets can be recognized from transit timing patterns.'),
    limits: w('这里是预设的示例结构，不是任意参数的长期稳定性求解；星球的光晕不是半径。', 'This is a preset example, not a long-term stability solution for arbitrary inputs; stellar glow is not stellar radius.'),
    sources: [kepler, { title: 'NASA · Kepler-16 b', url: 'https://science.nasa.gov/exoplanets/other-stars-other-worlds/kepler-16-b-almost-a-real-life-tatooine/' }],
  },
  circumprimary: {
    child: w('两颗恒星相距较远时，一颗行星也可以主要围着其中一颗转；另一颗是远处的伴星。', 'When two stars are far apart, a planet can orbit mainly one of them while the other remains a distant companion.'),
    title: w('宽双星：行星围绕其中一颗', 'Wide binary: a planet around one star'),
    theory: w('在层级分明的距离结构中，近处行星主要受主星吸引，远处伴星提供随时间变化的扰动。只有在行星轨道与双星分离足够悬殊等条件下，简单的双体近似才有用。', 'With well-separated scales, the nearby planet feels its host star most strongly while the distant companion perturbs it. A simple two-body approximation is useful only when the planetary and stellar separations are sufficiently distinct.'),
    formula: 'F = GMm/r²',
    terms: w('每一对天体都有引力作用；图中的轨道不是只受单一恒星支配的精确圆。', 'Every pair interacts gravitationally; the displayed path is not an exact circle caused by one star alone.'),
    evidence: w('双星轨道和行星凌星、视向速度资料可分别约束宿主恒星及行星路径。', 'Binary orbits and planetary transits or radial velocities constrain host stars and planets.'),
    limits: w('间距、周期与轨道平面作教学选择；不能据此预测某个真实系统的长期演化。', 'Separations, periods and orbital planes are chosen for teaching and do not predict a particular real system’s long-term evolution.'),
    sources: [kepler, { title: 'NASA · Frozen world in a binary system', url: 'https://science.nasa.gov/universe/exoplanets/frozen-world-discovered-in-binary-star-system/' }],
  },
  hierarchical: {
    child: w('三颗恒星不必挤在一起。两颗组成较近的一对，第三颗在更远处绕它们；行星也可能靠近其中一颗。', 'Three stars need not crowd together. A close pair can have a third star farther away, while a planet may stay near one member.'),
    title: w('层级三星：两套不同尺度的运动', 'Hierarchical triple: motion on two scales'),
    theory: w('内侧双星绕共同质心运动；外侧恒星绕更大的系统质心运动。层级结构减弱直接近距离遭遇的机会，但倾角、偏心率与扰动仍会改变长期轨道，不能仅由“外星比较远”保证永远稳定。', 'An inner binary orbits its barycenter; the outer star orbits the wider system barycenter. Hierarchy reduces close encounters, yet inclination, eccentricity and perturbations still shape long-term behavior; distance alone does not guarantee eternal stability.'),
    evidence: w('长期测光、光谱速度和天体测量可揭示多个周期并估计各成员质量。', 'Long-baseline photometry, spectroscopic velocities and astrometry reveal multiple periods and constrain component masses.'),
    limits: w('两个运动尺度和行星只作结构对照，恒星大小与距离并非同一比例。此画面不是任意三体初值的预测。', 'The two motion scales and planet compare structures; stellar sizes and separations are not on one scale. This is not a prediction for arbitrary three-body initial conditions.'),
    sources: [kepler, { title: 'NASA · Multiple star systems', url: 'https://science.nasa.gov/universe/stars/multiple-star-systems/' }],
  },
};

export const threeBodyStudy: SceneStudy = {
  child: w('三颗星会互相拉扯。同样的起点只改动一点，走久以后路线也可能很不一样；有些精心安排的路线却能维持很久。', 'Three stars pull on one another. A tiny change at the start can lead to very different paths later, although some carefully arranged paths can last a long time.'),
  title: w('三体：从引力方程到数值轨道', 'Three bodies: from gravity to numerical paths'),
  theory: w('每颗星同时受另外两颗引力影响，一般没有一条适用于任意初始条件的封闭轨道公式。这里对给定质量、位置和速度逐步积分，并叠加微小初值差异；长期分离体现敏感性，但数值误差也须与真实动力学区别。', 'Each star feels gravity from the other two. There is no single closed orbit formula for arbitrary initial conditions. The page integrates chosen masses, positions and velocities step by step and overlays a tiny perturbation; later separation illustrates sensitivity, while numerical error must be distinguished from dynamics.'),
  formula: 'r̈ᵢ = G Σⱼ≠ᵢ mⱼ (rⱼ − rᵢ) / |rⱼ − rᵢ|³',
  terms: w('i、j 标记不同恒星。质量、位置、速度及时间单位在本页的初值说明中给出；碰撞判据是模型设置。', 'i and j label different stars. Mass, position, velocity and time units are listed in the initial-conditions notes; the encounter threshold is a model choice.'),
  evidence: w('数值解可用能量、动量误差和更小时间步复查；真实多星轨道则由重复天体测量与光谱观测约束。经典“8 字形”是特殊对称解，不代表普通三星。', 'Check the numerical path with energy and momentum drift and smaller time steps; real multiple-star orbits are constrained by repeated astrometry and spectra. The figure-eight is a special symmetric solution, not a typical triple.'),
  limits: w('任意预设都只在已计算时间窗内展示；画面没有证明无限期稳定，也未模拟潮汐、气体、碰撞后的物理结果。', 'Presets are shown only over the integrated time window. The scene does not prove indefinite stability or simulate tides, gas or the physics after a collision.'),
  sources: [{ title: 'Chenciner & Montgomery (2000) · Figure-eight solution', url: 'https://arxiv.org/abs/math/0011268' }, { title: 'NASA · Orbits and Kepler’s laws', url: kepler.url }],
};

export const sunDistanceStudy: SceneStudy = {
  child: w('离太阳越远，它看起来越小，收到的光也越少。太阳本身没有因为镜头变化而变小。', 'Farther from the Sun, it looks smaller and sends less light to each area. The Sun itself has not shrunk.'),
  title: w('太阳距离：角大小与辐照度', 'Sun distance: angular size and irradiance'),
  theory: w('在距离远大于太阳半径时，角直径近似与距离成反比，单位面积接收的辐照度近似与距离平方成反比。二者是不同观测量。', 'Well beyond the solar radius, angular diameter scales approximately as inverse distance, while irradiance per unit area scales as inverse distance squared. They are distinct observables.'),
  formula: 'θ ≈ 2R☉/d ; F ∝ 1/d²',
  terms: w('θ 用弧度，d 是观察者到太阳中心的距离；近似式要求 R☉ ≪ d。', 'θ is in radians and d is distance from observer to solar center; the approximation requires R☉ ≪ d.'),
  evidence: w('太阳角直径、光行时间和太阳常数可由几何与辐射测量交叉检验。', 'Solar angular size, light travel time and irradiance can be checked against geometry and radiation measurements.'),
  limits: w('场景只改观察距离，不模拟行星大气、季节或相机曝光。', 'The scene changes observing distance but does not model planetary air, seasons or camera exposure.'),
  sources: [sun],
};

export const typesStudy: SceneStudy = {
  child: w('恒星的颜色、温度、质量和寿命不一样。剖面只是帮助看结构，不能从颜色直接量出内部。', 'Stars differ in color, temperature, mass and lifetime. A cutaway helps show structure but color alone cannot measure the interior.'),
  title: w('恒星分类：从光谱到物理量', 'Classifying stars: from spectra to physical properties'),
  theory: w('光谱型主要反映大气温度和谱线，光度级与演化状态相关；视差给出距离，结合通量才可推亮度。质量通常还需双星轨道等动力学证据。', 'Spectral type chiefly reflects atmospheric temperature and spectral lines; luminosity class relates to evolutionary state. Parallax supplies distance so flux can be converted to luminosity; mass usually needs dynamical evidence such as binary orbits.'),
  formula: 'L = 4πd²F ; L = 4πR²σTₑff⁴',
  terms: w('F 为观测通量、d 为距离；后一式是有效温度关系。消光、谱段和不确定性都需在真实研究中处理。', 'F is observed flux and d distance; the second is the effective-temperature relation. Real studies account for extinction, wavelength coverage and uncertainty.'),
  evidence: w('光谱、视差和双星轨道互相补足，而不是一张颜色卡片给出所有参数。', 'Spectra, parallax and binary orbits complement one another; one color swatch cannot determine every parameter.'),
  limits: w('画面给出代表类型和示意剖面，不是任一具体恒星的断层图。', 'The view presents representative types and schematic cutaways, not tomography of an individual star.'),
  sources: [life, { title: 'NASA · Universe glossary', url: 'https://science.nasa.gov/universe/glossary/' }],
};
