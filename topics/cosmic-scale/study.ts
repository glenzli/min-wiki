import type { SceneStudy } from '../../src/platform/sceneReading.ts';
import type { Origin } from './model.ts';

const w = (zh: string, en: string) => ({ zh, en });
const solar = { title: 'NASA · Solar System facts', url: 'https://science.nasa.gov/solar-system/solar-system-facts/' };
const galaxy = { title: 'ESA Gaia · Studying the Milky Way from inside', url: 'https://www.esa.int/Science_Exploration/Space_Science/Gaia/Why_was_it_so_difficult_to_study_the_Milky_Way_before_Gaia' };
const local = { title: 'NASA · The Galaxy Next Door', url: 'https://science.nasa.gov/earth/earth-observatory/the-galaxy-next-door/' };
const lan = { title: 'Tully et al. (2014) · Laniakea', url: 'https://www.nature.com/articles/nature13674' };
const web = { title: 'ESA Planck · Distribution of matter', url: 'https://www.esa.int/Science_Exploration/Space_Science/Planck/The_cosmic_microwave_background_and_the_distribution_of_matter_in_the_Universe' };
const horizon = { title: 'NASA · How big is space?', url: 'https://www.nasa.gov/science-research/astrophysics/how-big-is-space-we-asked-a-nasa-expert-episode-61/' };

const diameter: SceneStudy = {
  child: w('把两个天体放在同一把尺上，才看得出谁更大。这里比较的是直径，不是它们之间的距离。', 'Put two bodies on one ruler to compare size. This compares diameters, not the distance between them.'),
  title: w('大小比较：直径必须共用一把尺', 'Size comparison: one ruler for both diameters'),
  theory: w('在同一平面与投影下，画面直径按物理直径线性换算。半径、质量与体积是不同量：直径大一倍并不意味着质量大一倍。离开“同尺并排”视角后，后续镜头按距离重新选取视野。', 'In a common plane and projection, displayed diameters scale linearly with physical diameters. Radius, mass and volume are different quantities: twice the diameter does not mean twice the mass. The later distance camera uses a different field of view.'),
  formula: 'D = 2R ; V = 4πR³/3',
  terms: w('D 为直径、R 为半径、V 为球体积。图中直接比较 D；V 只说明为什么不能把直径当成体积。', 'D is diameter, R radius and V spherical volume. The scene compares D; V shows why diameter cannot be mistaken for volume.'),
  evidence: w('地球、木星与太阳的代表半径来自测量体系；恒星半径则常由距离、光度、温度、干涉测量和模型联合估计。', 'Representative Earth, Jupiter and solar radii come from measurement systems; stellar radii often combine distance, luminosity, temperature, interferometry and modeling.'),
  limits: w('并排是反事实摆放，不表示天体真实相邻。小物体的标签不算直径，发光晕也不算直径。', 'Side-by-side placement is counterfactual, not a real separation. A small body’s label and a glow are not its diameter.'),
  sources: [{ title: 'NASA · Planetary parameters', url: 'https://ssd.jpl.nasa.gov/planets/phys_par.html' }, solar],
};
const stars: SceneStudy = {
  child: w('巨星的半径要靠观测和模型估计，会有误差。把它放到太阳原来的位置，只是帮助想象尺寸。', 'A giant star’s radius is estimated from observations and models, with uncertainty. Placing it where the Sun was only helps us imagine its size.'),
  title: w('巨星半径：从光度与温度推到大小', 'Giant-star radius: from luminosity and temperature to size'),
  theory: w('有效温度与总光度联系到光球半径；距离不确定、尘埃遮挡与延展大气都会改变估计。所选半径代表特定研究的估计值，不是无争议的“最大恒星”排行榜。', 'Effective temperature and total luminosity constrain photospheric radius. Distance uncertainty, dust and extended atmospheres affect the estimate. The selected values are study-dependent estimates, not a settled largest-star ranking.'),
  formula: 'R/R☉ = √(L/L☉) (T☉/Tₑff)²',
  terms: w('L 是光度，Tₑff 是有效温度；式子由 L=4πR²σTₑff⁴ 推出，前提是明确光球与总光度的定义。', 'L is luminosity and Tₑff effective temperature. This follows from L=4πR²σTₑff⁴, provided the photosphere and bolometric luminosity are defined.'),
  evidence: w('光谱、视差、干涉测量和红外辐射共同约束半径；VY 大犬座与 St2-18 的数值来自不同研究，误差性质也不同。', 'Spectra, parallax, interferometry and infrared emission constrain radii. VY Canis Majoris and St2-18 values come from different studies with different uncertainties.'),
  limits: w('橙色边缘只画选定光球半径，不把分子和尘埃外包层算进去。叠在行星轨道上是同尺反事实比较，不预测吞没。', 'The orange outline denotes the chosen photospheric radius, excluding extended molecular and dusty material. Overlaid planetary orbits are a same-ruler counterfactual, not an engulfment prediction.'),
  sources: [{ title: 'Wittkowski et al. (2012) · VY CMa', url: 'https://arxiv.org/abs/1203.5194' }, { title: 'Fok et al. (2012) · St2-18', url: 'https://arxiv.org/abs/1209.6427' }],
};
const pairChildren = [
  w('木星比地球宽得多，但两颗行星的直径都在同一把尺上。', 'Jupiter is much wider than Earth, and both diameters share one ruler.'),
  w('太阳比木星还要大得多；直径和质量是两种问题。', 'The Sun is far wider than Jupiter; diameter and mass answer different questions.'),
  w('大角星比太阳宽得多，这里用的是估计半径。', 'Arcturus is much wider than the Sun here, using an estimated radius.'),
  w('心宿二的外层可以远大于大角星；这些都是估计光球大小。', 'Antares can have a much larger outer photosphere than Arcturus; these are estimated sizes.'),
  w('大犬座 VY 很大，但它周围的气体和尘埃不全算在光球半径里。', 'VY Canis Majoris is huge, but surrounding gas and dust are not all part of its photospheric radius.'),
  w('St2-18 的选定估计更大，误差也值得留意；这不是“宇宙最大”的定论。', 'The selected St2-18 estimate is larger and uncertain; it is not a proven “largest in the universe.”'),
] as const;
export function pairStudy(index: number): SceneStudy {
  const selected = index >= 2 ? stars : diameter;
  return { ...selected, child: pairChildren[Math.max(0, Math.min(5, index))]! };
}

export const homeStudies: readonly SceneStudy[] = [
  {
    child: w('太阳和绕它运行的行星属于太阳系。画面里的小圆是位置提示，不代表行星有那么大。', 'The Sun and its orbiting planets form the Solar System. Tiny circles help locate planets and do not show their sizes.'),
    title: w('太阳系：轨道尺度与天体直径', 'Solar System: orbital distance and body diameter'),
    theory: w('天文单位是地球—太阳平均距离的长度单位。行星轨道半长轴与行星直径常差许多数量级，因此一张图若同时让行星可辨，必须分别标出真实尺和放大符号。', 'The astronomical unit is a length based on the Earth–Sun separation. Orbital semimajor axes and planet diameters differ by many orders of magnitude, so a diagram that keeps planets visible must distinguish its ruler from enlarged symbols.'),
    formula: '1 AU = 149 597 870.7 km',
    terms: w('AU 是距离单位，不是时间；可用它比较轨道尺度，再另用千米比较天体直径。', 'AU is a distance unit, not time; use it for orbital scales and kilometers for body diameters.'),
    evidence: w('测距、雷达与航天器轨道资料约束太阳系尺度。', 'Ranging, radar and spacecraft orbit data constrain Solar System scales.'),
    limits: w('这一站是结构地址图，不按比例；真实长度请切到连续拉远的物理标尺。', 'This stop is a structural address diagram, not to scale. Use the continuous camera for a physical ruler.'),
    sources: [solar],
  },
  {
    child: w('太阳只是银河系许多恒星中的一颗，位于星系盘里。银河的外观是从内部观测再重建的。', 'The Sun is one of many Milky Way stars, in its disk. Its outside appearance is reconstructed from observations made inside.'),
    title: w('银河系：从星图重建“外面看”', 'Milky Way: reconstructing an outside view'),
    theory: w('视差、恒星颜色和运动、气体的谱线与天空消光共同约束银河的盘、核球、棒和晕。我们无法把相机送出银河拍一张全景；暗物质晕也由引力效应推断，而非直接发光。', 'Parallax, stellar colors and motions, gas spectral lines and extinction constrain the disk, bulge, bar and halo. We cannot photograph our Galaxy from outside, and its dark-matter halo is inferred from gravity rather than direct starlight.'),
    formula: 'd(pc) ≈ 1 / p(arcsec)',
    terms: w('只适用于可靠的小角视差；远处结构需其他距离指标和统计重建。', 'This applies to reliable stellar parallaxes; more distant structure needs other distance indicators and statistical reconstruction.'),
    evidence: w('Gaia 测量恒星视差与自行；射电巡天追踪气体，帮助构造盘与旋臂模型。', 'Gaia measures stellar parallax and proper motion; radio surveys trace gas and help model the disk and arms.'),
    limits: w('侧面与正面切换的是同一示意银河，纹理不是外部拍到的照片；太阳标记是位置，不是太阳直径。', 'Face-on and edge-on views show one schematic Galaxy, not an external photograph; the Sun symbol is a locator, not its diameter.'),
    sources: [galaxy, { title: 'ESA · Annotated Milky Way reconstruction', url: 'https://www.esa.int/ESA_Multimedia/Images/2023/12/Top-down_view_of_the_Milky_Way_annotated' }],
  },
  {
    child: w('银河、仙女座、三角座和许多小星系一起组成了本星系群。图上几个亮点不是全部成员。', 'The Milky Way, Andromeda, Triangulum and many small galaxies belong to the Local Group. A few bright marks are not its whole population.'),
    title: w('本星系群：成员怎样被识别', 'Local Group: how membership is established'),
    theory: w('星系距离、方向和相对运动共同帮助判断局部成员关系。本星系群既有几座大星系，也有数十座矮星系；成员清单会随更暗的矮星系被发现而更新。', 'Galaxy distances, sky positions and relative motions help establish nearby membership. The Local Group has major spirals and many dwarf galaxies; its census changes as fainter dwarfs are found.'),
    evidence: w('单颗恒星的亮度、变星距离指标、光谱速度与深度巡天可用于识别矮星系。', 'Resolved stars, variable-star distance indicators, spectral velocities and deep surveys identify dwarf galaxies.'),
    limits: w('画面标记为抽样，不是完整星系群成员目录；直径与彼此距离不共尺。', 'Marks are a sample, not a complete Local Group census; galaxy diameters and separations do not share one ruler.'),
    sources: [local, { title: 'NASA · Galaxies', url: 'https://science.nasa.gov/universe/galaxies/' }],
  },
  {
    child: w('星系群和星系团都由许多星系组成，但大小与成员数可以相差很大。室女座星系团是本星系群附近的另一处结构。', 'Groups and clusters both contain galaxies, but their size and population differ. The Virgo Cluster is a separate nearby structure.'),
    title: w('星系群与星系团：如何比较', 'Galaxy groups and clusters: what differs'),
    theory: w('群与团是星系分布的描述，常借成员速度分散、热气体和引力透镜研究总质量。维里量级关系可提供受限估计；该式不把本星系群和室女座星系团变成套娃式的一内一外。', 'Groups and clusters describe concentrations of galaxies. Velocity dispersion, hot gas and gravitational lensing constrain their mass. A virial scaling is only an estimate; it does not put the Local Group inside Virgo as nested shells.'),
    formula: 'M ∼ σᵥ²R/G',
    terms: w('σᵥ 是成员速度分散、R 是代表尺度；需近似动力学平衡等条件，不能套用到任意图标。', 'σᵥ is velocity dispersion and R a representative scale; approximate dynamical equilibrium is required.'),
    evidence: w('光谱红移、X 射线热气体和弱引力透镜为星系团提供不同质量证据。', 'Spectroscopic redshifts, X-ray gas and weak lensing offer distinct mass evidence for clusters.'),
    limits: w('对照视图是局部镜头，不计入拉远主链；成员位置和大小不按真实三维比例绘制。', 'This is a local comparison, not a main zoom stop; member positions and sizes are not a scaled 3D map.'),
    sources: [{ title: 'NASA · Galaxies and clusters', url: 'https://science.nasa.gov/universe/galaxies/' }, { title: 'NASA · Virgo Cluster / M60', url: 'https://science.nasa.gov/mission/hubble/science/explore-the-night-sky/hubble-messier-catalog/messier-60/' }],
  },
  {
    child: w('拉尼亚凯亚是研究者用星系运动重建的广大区域，不是把我们周围所有星系绑在一起的一颗“大球”。', 'Laniakea is a large region reconstructed from galaxy motions, not a giant ball that binds everything inside.'),
    title: w('拉尼亚凯亚：流向定义的区域', 'Laniakea: a region defined by flows'),
    theory: w('研究先从观测速度中减去平均宇宙膨胀的贡献，估计星系的本动速度，再重建局部流向与流域分界。区域定义依赖距离数据与重建方法；它不是如行星轨道那样清楚、永久且整体引力束缚的结构。', 'Researchers subtract mean cosmic expansion from observed velocities to estimate peculiar motions, then reconstruct local flows and watershed boundaries. The region depends on distance data and reconstruction methods; it is not a sharp, permanent, wholly gravitationally bound system like a planetary orbit.'),
    formula: 'vₚₑc ≈ vₒᵦₛ − H₀d  (nearby low z)',
    terms: w('H₀ 为哈勃常数，d 为距离；这是近邻的简化记法，论文的三维流向重建更复杂。', 'H₀ is the Hubble constant and d distance. This is low-redshift shorthand; the published 3D flow reconstruction is more involved.'),
    evidence: w('Tully 等 2014 年用距离与本动速度编制流域图；后续数据可能修改边界的概率判断。', 'Tully and colleagues used distances and peculiar velocities to map a flow basin in 2014; later data can alter boundary probabilities.'),
    limits: w('发光区域与边界是研究重建的教学画法，不是拍到的“拉尼亚凯亚外壳”。', 'The glowing region and boundary illustrate a reconstruction, not a photographed Laniakea shell.'),
    sources: [lan, { title: 'Nature Astronomy (2024) · Probabilistic flow basins', url: 'https://www.nature.com/articles/s41550-024-02370-0' }],
  },
  {
    child: w('星系并没有均匀撒在宇宙里：许多聚在丝线和结点附近，中间留下较空的区域。宇宙网不是拉尼亚凯亚外面新增的一层。', 'Galaxies are not spread evenly: many gather near filaments and knots, with emptier voids between them. The cosmic web is a pattern, not an outer shell.'),
    title: w('宇宙网：密度起伏怎样长大', 'Cosmic web: growth of density fluctuations'),
    theory: w('早期物质分布有微小密度起伏；引力使较密区域进一步聚集，形成片、丝、结点与空洞。观测上需要星系位置和红移来绘图，暗物质分布还可借引力透镜推断；模拟图不是逐颗实测星系。', 'Early matter had small density variations. Gravity amplified denser regions into sheets, filaments, knots and voids. Observational maps need galaxy positions and redshifts; lensing also probes dark matter. A simulation is not an individually measured galaxy catalogue.'),
    formula: 'δ = (ρ − ρ̄) / ρ̄',
    terms: w('δ 是相对平均密度的起伏；它是研究大尺度结构的变量，不等于画面亮度。', 'δ is density contrast relative to the mean; it is a large-scale-structure variable, not canvas brightness.'),
    evidence: w('星系红移巡天、弱透镜和宇宙微波背景统计把不同时代的结构联系起来。', 'Redshift surveys, weak lensing and CMB statistics connect structure across epochs.'),
    limits: w('本页网纹在各方向延伸，是统计风格的结构示意；线条位置、粗细和局部连线不能当作测量数据。', 'The web extends in all directions as a statistical illustration; line positions, widths and local connections are not measurements.'),
    sources: [web, { title: 'ESA Planck · History of structure formation', url: 'https://www.esa.int/Science_Exploration/Space_Science/Planck/History_of_cosmic_structure_formation' }],
  },
  {
    child: w('我们能看到的范围有极限，但那条虚线不是宇宙的墙。它只表示光来得及把消息带到我们的范围。', 'There is a limit to what we can observe, but the dashed circle is not a wall. It marks the region from which light has had time to reach us.'),
    title: w('可观测宇宙：边界属于观察者', 'Observable universe: a boundary of observation'),
    theory: w('宇宙年龄约 138 亿年，但空间在光传播期间持续膨胀。因此“今天的距离”和“光走了多久”不相同；给出的约 930 亿光年直径是模型下当前距离的近似，而不是宇宙整体的直径。', 'The universe is about 13.8 billion years old, yet space expanded while light travelled. Present-day distance and light-travel time are different quantities. An approximately 93-billion-light-year observable diameter is a model-based present-day estimate, not the diameter of all space.'),
    formula: 'χₕ = c ∫₀ᵗ⁰ dt / a(t)',
    terms: w('χₕ 是共动粒子视界距离，a(t) 为宇宙尺度因子；取 a(t₀)=1 时才可把它表述为今天的距离。', 'χₕ is comoving particle-horizon distance and a(t) the cosmic scale factor; with a(t₀)=1 it can be expressed as a present-day distance.'),
    evidence: w('红移、宇宙微波背景和宇宙学距离模型共同限定可观测范围；不同距离定义需要单独说明。', 'Redshifts, the cosmic microwave background and cosmological distance models constrain the observable region; different distance definitions must be stated explicitly.'),
    limits: w('圆圈以观察者为中心，是观测地平线的符号；里面的网是统计示意，不是全宇宙逐点测绘图。连续镜头没有求解宇宙膨胀。', 'The observer-centered circle symbolizes an observing horizon. Its web is a statistical illustration, not a point-by-point survey. The continuous camera does not solve cosmic expansion.'),
    sources: [horizon, { title: 'Hogg · Distance measures in cosmology', url: 'https://arxiv.org/abs/astro-ph/9905116' }],
  },
];

const nearbyStars: SceneStudy = {
  child: w('离开太阳系后，下一颗恒星仍非常远。这个尺度上太阳和行星的真实圆盘都小得看不见。', 'Even the next stars are very far beyond the Solar System. At this scale, the real disks of the Sun and planets are too small to see.'),
  title: w('恒星间距离：光年是长度', 'Distances between stars: a light-year is a length'),
  theory: w('光年是光在真空中一年行进的长度。近邻恒星可用视差测距；把天体直径与它们之间的距离放到一张线性图时，前者常落到像素以下，需要单独的定位符。', 'A light-year is the distance light travels in vacuum in one year. Nearby stars can be ranged by parallax. On one linear view of body diameters and separations, disks often fall below a pixel and need separate locator symbols.'),
  formula: '1 ly ≈ 9.46 × 10¹² km',
  terms: w('光年是距离单位。标记是“这里有天体”的提示，不能读成真实直径。', 'A light-year is a distance unit. A locator marks presence and must not be read as a physical diameter.'),
  evidence: w('Gaia 的视差和自行测量建立近邻恒星三维地图。', 'Gaia parallaxes and proper motions build a 3D map of nearby stars.'),
  limits: w('邻星点列是代表性抽样，不是完整星表；位置与尺寸不能从画面直接测量。', 'Nearby stars are a representative sample, not a complete catalogue; their positions and sizes cannot be measured from the drawing.'),
  sources: [galaxy],
};

const zoomChildren = [
  w('从地球出发，先看它真实的大小。继续拉远时，地球会小到只剩位置提示。', 'Begin at Earth’s size. As we zoom out, Earth becomes too small and needs a location marker.'),
  w('太阳系里，行星之间的距离比行星自身直径大得多。', 'In the Solar System, gaps between planets dwarf the planets’ own diameters.'),
  nearbyStars.child,
  homeStudies[1]!.child,
  homeStudies[2]!.child,
  homeStudies[3]!.child,
  homeStudies[4]!.child,
  homeStudies[5]!.child,
  homeStudies[6]!.child,
] as const;
const sunCloseup: SceneStudy = {
  child: w('从太阳出发，先用千米标尺看它的大小。继续拉远时，同一颗太阳会小到只剩位置提示；外面的光晕不算直径。', 'Begin at the Sun and use the kilometer ruler to read its size. As we zoom out, the same Sun becomes a location marker; its glow does not count as its diameter.'),
  title: w('太阳起点：光球直径与物理标尺', 'Starting at the Sun: photospheric diameter and a physical ruler'),
  theory: w('太阳是恒星。这里用代表性光球半径绘制约 139 万千米的直径，圆盘和标尺共用线性长度换算。拉远改变的是镜头范围，不是太阳的物理大小；圆盘小到无法分辨后，定位符继续标出它的位置。', 'The Sun is a star. A representative photospheric radius gives a diameter of about 1.39 million kilometers; its disk and the ruler use one linear length conversion. Zooming changes the camera span, not the Sun’s physical size. A locator retains its position when the disk becomes too small to resolve.'),
  formula: 'D☉ = 2R☉ ≈ 1.39 × 10⁶ km',
  terms: w('R☉ 是本模型所取的太阳光球半径，D☉ 是直径。光晕、标签和定位符都不是可量取的太阳边缘。', 'R☉ is the representative solar photospheric radius used here, and D☉ is its diameter. Glow, labels and locators are not measurable solar edges.'),
  evidence: w('太阳大小由观测确定；近景表面与发光效果只是帮助辨认恒星，不是实时太阳图像。', 'Observations establish the Sun’s size; the illustrated surface and glow identify the star and are not live solar images.'),
  limits: w('本镜头比较长度，不计算太阳活动、轨道运动或光照变化。', 'This camera compares lengths; it does not calculate solar activity, orbital motion or changing illumination.'),
  sources: [{ title: 'NASA · Sun facts', url: 'https://science.nasa.gov/sun/facts/' }],
};
export function zoomStudy(stage: number, origin: Origin = 'earth'): SceneStudy {
  const bases = [homeStudies[0]!,homeStudies[0]!,nearbyStars,homeStudies[1]!,homeStudies[2]!,homeStudies[3]!,homeStudies[4]!,homeStudies[5]!,homeStudies[6]!];
  const i = Math.max(0,Math.min(8,stage));
  const base = i === 0 && origin === 'sun' ? sunCloseup : bases[i]!;
  const camera = w('这一章只有镜头视野宽度按对数变化；每一帧内部仍共用线性长度标尺。远处丝线与点不是可测量的星系目录。', 'Only camera width changes logarithmically; geometry within each frame keeps one linear length ruler. Distant filaments and points are not a measurable galaxy catalogue.');
  return { ...base, child:i === 0 && origin === 'sun' ? base.child : zoomChildren[i]!, limits:{ zh: `${base.limits.zh} ${camera.zh}`, en: `${base.limits.en} ${camera.en}` } };
}

export function homeStudy(index: number): SceneStudy { return homeStudies[Math.max(0,Math.min(6,index))]!; }
