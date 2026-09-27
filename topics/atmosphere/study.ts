import type { SceneStudy } from '../../src/platform/sceneReading.ts';

const w = (zh: string, en: string) => ({ zh, en });
const standard = { title: 'NOAA / NASA · U.S. Standard Atmosphere 1976', url: 'https://ntrs.nasa.gov/citations/19770009539' };
const layers = { title: 'NASA · Earth’s atmospheric layers', url: 'https://science.nasa.gov/earth/earth-atmosphere/earths-atmosphere-a-multi-layered-cake/' };
const ozone = { title: 'NASA Earth Observatory · Ozone', url: 'https://science.nasa.gov/earth/earth-observatory/ozone/' };

export const overviewStudy: SceneStudy = {
  child: w('地球外面包着一层越来越稀薄的空气。我们沿同一处地面向外看，不会撞到一堵“空气墙”。', 'Earth is wrapped in air that becomes thinner outward. We look up from one place; there is no solid wall where air ends.'),
  title: w('为什么大气越高越稀薄？', 'Why does air thin with height?'),
  theory: w('下方的空气承受上方空气的重量。静力平衡把压力梯度与重力联系起来；再用理想气体关系，可从指定温度剖面推算低层参考压力。真实大气有风、湿度、日夜和太阳活动，不能由这一条公式描尽。', 'Air below supports the weight of air above. Hydrostatic balance links the pressure gradient to gravity; an ideal-gas relation and a prescribed temperature profile give a lower-atmosphere reference pressure. Winds, moisture, day–night changes and solar activity require more than this relation.'),
  formula: 'dP/dz = −ρg ; P = ρRᵈT',
  terms: w('P 为压力，ρ 为密度，g 为重力加速度，Rᵈ 为干空气比气体常数，T 为绝对温度。', 'P is pressure, ρ density, g gravitational acceleration, Rᵈ the dry-air specific gas constant and T absolute temperature.'),
  evidence: w('标准大气表提供可复算的参考剖面；探空、卫星和火箭观测则揭示真实大气的变化。可从标准大气的温度、压力与密度表继续学习。', 'Standard-atmosphere tables provide a reproducible reference profile; soundings, satellites and rockets reveal the variable real atmosphere. Continue with the tables of temperature, pressure and density.'),
  limits: w('本页低层读数是干空气标准剖面，不是今日实测；模型只算到约 85 km。彩色层带与 1000 km 终点是观察安排，并非硬边界。', 'Lower readings use a dry standard profile, not today’s sounding; this model stops near 85 km. Colored bands and the 1000 km endpoint organize the view and are not hard boundaries.'),
  sources: [standard, layers],
};

export const layerStudies: readonly SceneStudy[] = [
  {
    child: w('我们呼吸的空气和大多数云、天气都在较低处。暖湿空气上升、冷却后可能成云，云还要继续长大才可能下雨。', 'Most breathing air, clouds and weather lie low down. Rising moist air may cool into clouds; droplets must grow further before rain can fall.'),
    title: w('对流层：气压、冷却与成云', 'Troposphere: pressure, cooling and clouds'),
    theory: w('对流层的压力随高度降低。未饱和气块上升时，外部压力减小使其膨胀并近似绝热冷却；达到凝结条件后，水汽可在凝结核上形成云滴。是否降水还取决于水分供给、云滴或冰晶的增长及下落途中蒸发。', 'Pressure falls with height. An unsaturated rising parcel expands and cools approximately adiabatically as surrounding pressure drops. At saturation, vapor can condense on nuclei; rain also requires moisture supply, droplet or ice-crystal growth and survival against evaporation below.'),
    formula: 'dP/dz = −ρg ; Γᵈ ≈ g/cₚ ≈ 9.8 K/km',
    terms: w('Γᵈ 是干绝热温度递减率；真实环境递减率与湿气块递减率会变化，不能把 9.8 K/km 当作每天天气。', 'Γᵈ is the dry adiabatic lapse rate; environmental and moist-parcel lapse rates vary, so 9.8 K/km is not a daily forecast.'),
    evidence: w('探空气球测量温度、湿度和气压的垂直剖面；云和降水还需雷达、卫星与地面观测联合判断。', 'Weather balloons sample vertical temperature, humidity and pressure; clouds and precipitation are also studied with radar, satellites and surface observations.'),
    limits: w('本页只显示标准参考温压与一个条件性的云雨过程，不求解湿对流和每一朵云。约 11 km 是示意层界，真实对流层顶会变化。', 'This view gives reference temperature and pressure and a conditional cloud–rain sequence; it does not solve moist convection or every cloud. About 11 km is a diagram boundary, while the real tropopause varies.'),
    sources: [standard, { title: 'NWS · Cloud development', url: 'https://www.weather.gov/source/zhu/ZHU_Training_Page/clouds/cloud_development/clouds.htm' }],
  },
  {
    child: w('这里的臭氧会吸收一部分太阳紫外线，让平流层上部变暖。它是一片气体，不是一层玻璃罩。', 'Ozone here absorbs some solar ultraviolet light and warms the upper stratosphere. It is gas, not a glass roof.'),
    title: w('平流层：臭氧怎样改变温度结构', 'Stratosphere: how ozone changes the temperature profile'),
    theory: w('紫外光使氧分子解离，氧原子又可与氧分子生成臭氧；臭氧吸收另一部分紫外光并转化能量。由此形成的温度随高度升高趋势，通常抑制强烈的垂直对流，但空气仍可水平和垂直输送。', 'Ultraviolet light splits oxygen molecules; oxygen atoms can then combine with oxygen molecules to form ozone. Ozone absorbs additional UV and transfers energy to the air. The resulting upward warming usually suppresses vigorous vertical convection, while transport still occurs.'),
    formula: 'O₂ + hν → 2O ; O + O₂ + M → O₃ + M',
    terms: w('hν 代表紫外光子，M 是带走多余能量的第三个分子；实际臭氧浓度还受破坏反应与输送影响。', 'hν denotes a UV photon and M a third molecule that carries away excess energy; ozone abundance also depends on loss reactions and transport.'),
    evidence: w('卫星与地面光谱测量臭氧总量和垂直分布；臭氧的光化学循环可继续从 NASA Earth Observatory 阅读。', 'Satellite and ground-based spectroscopy measure ozone columns and profiles; NASA Earth Observatory explains the photochemical cycle.'),
    limits: w('动画只画一条能量路径，没有求解光化学速率或季节性的臭氧变化。臭氧层并不是固定厚度的实体。', 'The animation shows one energy pathway, without solving chemical reaction rates or seasonal ozone changes. The ozone layer is not a fixed-thickness solid.'),
    sources: [ozone, layers],
  },
  {
    child: w('这里空气更稀薄，许多小流星体高速穿过时会留下短暂亮迹。有些会消散，有些碎片可能落到地面。', 'Air is thinner here. Many small meteoroids make brief bright trails as they speed through it; some disappear and some fragments may reach the ground.'),
    title: w('中间层：流星为什么会发光', 'Mesosphere: why meteors shine'),
    theory: w('流星体与大气高速相遇，前方气体被压缩加热，流星体表面也可烧蚀；发光来自被激发的气体和蒸发物质等过程。轨迹、亮度和能否留下陨石取决于速度、尺寸、成分、角度与空气密度。', 'A fast meteoroid compresses and heats air ahead of it while its surface may ablate. Excited gas and vaporized material contribute to the light. Speed, size, composition, entry angle and air density affect the trail and whether any meteorite remains.'),
    formula: 'Eₖ = ½mv²',
    terms: w('动能随速度平方增加；这只说明可用能量，不单独预测亮度、烧蚀率或落地结果。', 'Kinetic energy rises with the square of speed; this alone does not predict brightness, ablation rate or survival.'),
    evidence: w('多站相机、雷达与光谱可约束轨道、速度和成分；NASA 的流星资料区分流星体、流星与陨石。', 'Multi-station cameras, radar and spectra constrain trajectory, speed and composition; NASA distinguishes meteoroids, meteors and meteorites.'),
    limits: w('本图不跟踪真实气动或烧蚀，亮头和尾迹都经放大。标准低层温压剖面到约 85 km 为止。', 'This view does not solve aerodynamics or ablation; the bright head and trail are enlarged. The lower reference profile ends near 85 km.'),
    sources: [{ title: 'NASA · Meteors and meteorites', url: 'https://science.nasa.gov/solar-system/meteors-meteorites/' }, standard],
  },
  {
    child: w('粒子很少，但有些粒子运动得很快。极光还需要带电粒子和磁场等条件，不会因为这里“热”就到处出现。', 'Particles are sparse but some move very fast. Auroras also need charged particles and magnetic conditions; heat alone does not make them appear everywhere.'),
    title: w('热层：高粒子温度与极光不是一回事', 'Thermosphere: particle temperature is not an aurora switch'),
    theory: w('高能太阳辐射可提高稀薄气体粒子的平均动能；极光则是带电粒子沿磁场进入极区高层大气，使原子和分子激发后发光的另一条路径。高温不等于高热通量，物体吸热还受粒子密度与辐射收支限制。', 'Energetic solar radiation can raise the mean kinetic energy of sparse gas. Auroras follow another pathway: charged particles guided into polar upper air excite atoms and molecules that emit light. High temperature does not imply high heat flux; density and radiative balance matter.'),
    formula: '⟨Eₖ⟩ = 3kᴮT/2',
    terms: w('理想气体平动能的关系式；T 是粒子温度，不是航天器表面会达到的温度。', 'For translational motion in an ideal gas; T is particle temperature, not the temperature a spacecraft surface will reach.'),
    evidence: w('高层大气与电离层由卫星、雷达和地面极光观测共同研究；可继续追踪太阳活动与地磁活动如何改变能量输入。', 'Satellites, radars and ground-based aurora observations study the upper atmosphere and ionosphere; follow how solar and geomagnetic activity changes the energy input.'),
    limits: w('本页没有给出未经计算的热层温度或压力。动画分开示意辐射加热与极光，不表示两者总在同处同刻发生。', 'The page does not invent thermospheric temperature or pressure values. Radiation heating and aurora are shown as distinct examples, not guaranteed simultaneous events.'),
    sources: [{ title: 'NASA · Ionosphere, thermosphere and mesosphere', url: 'https://science.nasa.gov/heliophysics/focus-areas/ionosphere_thermosphere_mesosphere/' }, layers],
  },
  {
    child: w('越往外，粒子越少。有些仍被地球留住，有些会逃向更远处；大气没有整齐的终点。', 'Particles become rarer outward. Some stay near Earth and some escape farther away; the atmosphere has no neat ending.'),
    title: w('外逸层：留住与逃逸的条件', 'Exosphere: conditions for retention and escape'),
    theory: w('在极稀薄区域，粒子很少碰撞，不能再把它当作普通的连续空气来读。粒子能否逃逸取决于速度、质量、所在高度及其他过程；观测到的地冕氢延伸很远。单一“顶界”无法描述其全部。', 'At extremely low density, collisions are rare and ordinary continuum-air intuition fails. Escape depends on particle speed, mass, location and other processes; Earth’s hydrogen geocorona extends far outward. One top boundary cannot describe it all.'),
    formula: 'vₑₛc(r) = √(2GM⊕/r)',
    terms: w('这是简化二体引力的逃逸速度，不是说所有达到此速的粒子都会沿画出的虚线离开，也未包含碰撞、电磁和太阳辐射作用。', 'This is the escape speed in a simple two-body gravity model. It does not make the drawn path a measured trajectory or include collisions, electromagnetic effects and solar radiation.'),
    evidence: w('地冕可借紫外观测研究；Carruthers 任务关注外逸层氢及其变化。', 'Ultraviolet observations probe the geocorona; the Carruthers mission studies exospheric hydrogen and its variations.'),
    limits: w('600 km 是本图参考分界，1000 km 只是镜头终点。粒子点与路径是教学符号，不表示实际密度或单粒子轨道。', '600 km is a diagram boundary and 1000 km only the camera endpoint. Dots and paths are teaching symbols, not density measurements or individual trajectories.'),
    sources: [{ title: 'NASA · Carruthers Geocorona Observatory', url: 'https://science.nasa.gov/mission/carruthers-geocorona-observatory/' }, layers],
  },
];

export const worldStudies: Record<string, SceneStudy> = {
  venus: {
    child: w('金星有很厚的二氧化碳大气和硫酸云，地表又热又有很高的气压。火星也有二氧化碳，却远没有这么厚。', 'Venus has thick carbon-dioxide air and sulfuric-acid clouds, with intense surface heat and pressure. Mars also has carbon dioxide but much less air.'),
    title: w('金星：成分之外，还要问大气有多少', 'Venus: composition is only part of the story'),
    theory: w('太阳输入、反射率、向外热辐射与温室气体吸收共同决定能量收支。无大气的有效辐射温度只是比较起点；金星厚重的二氧化碳大气造成强温室效应，不能用一个简单公式直接算出地表温度。', 'Incoming sunlight, reflectivity, outgoing thermal radiation and greenhouse absorption shape energy balance. An airless effective temperature is only a comparison baseline; Venus’s massive CO₂ atmosphere produces strong greenhouse warming that one simple equation cannot predict.'),
    formula: '(1 − A)S/4 = σTₑff⁴',
    terms: w('A 为反照率，S 为入射太阳通量；式子是全球平均的无大气辐射平衡基线，Tₑff 不是金星地表温度。', 'A is albedo and S incoming solar flux. This is a global-mean airless radiative baseline; Tₑff is not Venus’s surface temperature.'),
    evidence: w('金星探测器与雷达观测测得厚云、气压和地表状态。NASA 的金星资料可进一步追踪云层高度与温室效应。', 'Spacecraft and radar measurements constrain Venus’s cloud deck, pressure and surface. NASA’s Venus facts lead into cloud altitudes and greenhouse warming.'),
    limits: w('两列的高度行仅比较代表现象；图中的颜色、云形与尺寸不是等比例或实时观测。', 'The two columns compare representative phenomena, not matched altitudes. Colors, cloud shapes and sizes are not to scale or live observations.'),
    sources: [{ title: 'NASA · Venus facts', url: 'https://science.nasa.gov/venus/venus-facts/' }, { title: 'NASA · Planetary atmospheres', url: 'https://science.nasa.gov/solar-system/10-things-planetary-atmospheres/' }],
  },
  mars: {
    child: w('火星空气很薄，地面气压很低。水很难像地球海水那样长期稳定在地表。', 'Mars has very thin air and low surface pressure. Water does not remain on its surface like Earth’s seas.'),
    title: w('火星：低气压改变水的处境', 'Mars: low pressure changes what water can do'),
    theory: w('物质相态取决于温度与压力。火星地表压力很低，液态水的稳定范围受到强烈限制；寒冷、季节性二氧化碳霜、稀薄水冰云和尘埃过程共同塑造所见环境。单个平均温度不能代表一天或整个星球。', 'Phase stability depends on temperature and pressure. Low Martian surface pressure strongly restricts stable liquid water. Cold conditions, seasonal CO₂ frost, thin water-ice clouds and dust processes also shape the environment. One mean temperature cannot represent a day or a planet.'),
    evidence: w('着陆器直接测量气压、温度和地表；轨道器追踪水冰云、尘暴及季节变化。', 'Landers measure pressure, temperature and the surface directly; orbiters track water-ice clouds, dust storms and seasonal change.'),
    limits: w('数值为代表地表值，不是所选地点当前天气；并排的层段不共用同一高度尺。', 'Values are representative surface figures, not current weather at a selected site; paired rows do not share one altitude ruler.'),
    sources: [{ title: 'NASA · Mars facts', url: 'https://science.nasa.gov/mars/facts/' }, { title: 'NASA · Planetary atmospheres', url: 'https://science.nasa.gov/solar-system/10-things-planetary-atmospheres/' }],
  },
  titan: {
    child: w('土卫六很冷，云和湖里的主要液体是甲烷、乙烷。它也有“蒸发和下雨”，但循环的不是地球的水。', 'Titan is very cold; its clouds and lakes involve methane and ethane. It has evaporation and rain too, but the cycling liquid is not Earth’s water.'),
    title: w('土卫六：相似的循环，不同的材料', 'Titan: similar cycles, different materials'),
    theory: w('相变与输送可以形成蒸发、云、降雨和地表流动，但土卫六的低温让甲烷与乙烷承担了地球上常由水承担的角色。其大气以氮为主，甲烷只是较少的一部分；紫外光还驱动有机化学与雾霾生成。', 'Phase changes and transport can drive evaporation, clouds, rain and surface flow. Titan’s low temperature lets methane and ethane play roles often filled by water on Earth. Its air is mostly nitrogen, with less methane; UV light also drives organic chemistry and haze.'),
    evidence: w('卡西尼—惠更斯观测云、湖泊、河道和大气成分，留下可继续研究的多种证据链。', 'Cassini–Huygens observed clouds, lakes, channels and atmospheric composition, providing several lines of evidence for further study.'),
    limits: w('图像是代表性剖面对照，不是一次真实天气事件；湖、云和大气层厚度不按同一尺绘制。', 'The image is a representative comparison, not one observed weather event; lakes, clouds and atmospheric thickness do not share one scale.'),
    sources: [{ title: 'NASA · Titan facts', url: 'https://science.nasa.gov/saturn/moons/titan/facts/' }],
  },
  moon: {
    child: w('月球周围只有极少量粒子。它们不像地球空气那样频繁相撞，也形成不了日常天气。', 'Only very few particles surround the Moon. They rarely collide like Earth’s air and cannot make everyday weather.'),
    title: w('月球：为什么“有粒子”仍不等于有天气', 'Moon: why a few particles do not make weather'),
    theory: w('月球外逸层的粒子常在碰到另一粒子前走很远。来自表面溅射、撞击和太阳风的粒子可沿各自路径迁移、落回或离开，不能用地球低层大气的连续流体模型直接描述。', 'Lunar exosphere particles often travel far before colliding. Surface sputtering, impacts and solar wind supply particles that migrate, return or escape; Earth’s lower-air continuum-fluid model does not transfer directly.'),
    evidence: w('Apollo 与 LADEE 的探测，以及远程光谱，帮助分辨粒子来源、组成和变化。', 'Apollo and LADEE measurements, together with remote spectroscopy, help identify particle sources, composition and variation.'),
    limits: w('本页不显示虚构的零气压或单一气温；月球右列的稀疏符号不代表能呼吸的空气。', 'The page does not invent a zero pressure or one air temperature; sparse marks in the Moon column are not breathable air.'),
    sources: [{ title: 'NASA · The Moon’s atmosphere', url: 'https://science.nasa.gov/moon/lunar-atmosphere/' }],
  },
  mercury: {
    child: w('水星受太阳照得很强，但只有很稀薄的外逸层。它很难把白天的热留住并送到漫长的夜晚。', 'Mercury receives strong sunlight but has only a sparse exosphere. It cannot store and move daytime heat through its long night as thick air can.'),
    title: w('水星：日照很强，保温与输送却很弱', 'Mercury: strong sunlight, weak heat storage and transport'),
    theory: w('太阳辐射通量随距离平方衰减，但地表温度还取决于反照率、表面热惯量、自转和大气输送。水星的外逸层极稀薄，不能像厚大气那样有效平衡昼夜温差。', 'Solar irradiance decreases with distance squared, but surface temperature also depends on albedo, thermal inertia, rotation and atmospheric transport. Mercury’s exosphere is too sparse to balance day–night temperatures as thick air can.'),
    formula: 'S(r) ∝ 1/r²',
    terms: w('这里只表示距离改变日照的趋势，不直接给出水星昼夜地表温度。', 'This gives the distance trend in sunlight, not a direct calculation of Mercury’s day–night ground temperature.'),
    evidence: w('MESSENGER 等任务观测表面和外逸层；NASA 的水星资料提供昼夜温度及粒子来源。', 'MESSENGER and other missions observed the surface and exosphere; NASA’s Mercury facts give day–night temperatures and particle sources.'),
    limits: w('右列不画成厚空气；太阳风是来自太阳的带电粒子流，不等于天气里的风。', 'The right column does not represent thick air; solar wind is a charged-particle flow from the Sun, not weather wind.'),
    sources: [{ title: 'NASA · Mercury facts', url: 'https://science.nasa.gov/mercury/facts/' }],
  },
};
