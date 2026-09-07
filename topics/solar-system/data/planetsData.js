/**
 * 太阳与八大行星天文物理数据与教学元数据
 * 数据基准参考：NASA Planetary Fact Sheet & JPL Solar System Dynamics
 */

export const SUN_DATA = {
  id: 'sun',
  name: '太阳',
  nameZh: '太阳',
  englishName: 'The Sun',
  nameEn: 'The Sun',
  symbol: '☉',
  type: 'star',
  typeName: '黄矮星 (G2V 主序恒星)',
  typeZh: '黄矮星 (G2V 主序恒星)',
  radiusKm: 696340,
  diameterKm: 1392680,
  relativeEarthDiameter: 109.3,
  relativeEarthVolume: 1300000,
  massKg: 1.989e30,
  relativeEarthMass: 333000,
  surfaceTempC: 5500,
  coreTempC: 15000000,
  colorHex: '#ffaa22',
  kidFact: '太阳是太阳系里唯一的发光大火球！它占了整个太阳系 99.86% 的总重量，肚子里能装下整整 130 万个地球！',
  quickFact: '太阳是太阳系里唯一的发光大火球！它占了整个太阳系 99.86% 的总重量，肚子里能装下整整 130 万个地球！',
  academicNote: '太阳系绝对的引力主导中心。通过核心热核聚变（质子-质子链反应）辐射能量，提供行星运动所需的引力势阱与辐射平衡。',
  academicFact: '太阳系绝对的引力主导中心。通过核心热核聚变（质子-质子链反应）辐射能量，提供行星运动所需的引力势阱与辐射平衡。'
};

export const PLANETS_DATA = [
  {
    id: 'mercury',
    index: 1,
    name: '水星',
    englishName: 'Mercury',
    symbol: '☿',
    type: 'terrestrial',
    typeName: '类地岩石行星',
    semiMajorAxisAU: 0.387,
    semiMajorAxisKm: 57909000,
    orbitalPeriodYears: 0.2408,
    orbitalPeriodDays: 87.97,
    orbitalVelocityKmS: 47.4,
    eccentricity: 0.2056,
    inclinationDeg: 7.0,
    radiusKm: 2439.7,
    diameterKm: 4879.4,
    relativeEarthDiameter: 0.383,
    relativeEarthVolume: 0.056,
    massKg: 3.301e23,
    relativeEarthMass: 0.055,
    rotationHours: 1407.6, // 58.6 days
    axialTiltDeg: 0.034,
    colorHex: '#a0a0a0',
    colorSecondary: '#6e6e6e',
    rings: false,
    kidFact: '溜冰冠军水星！它是离太阳最近的小朋友，跑得最快（88天就过完一年），但因为没有大气棉被，白天400多度能烤肉，晚上零下一百多度！',
    academicNote: '水星处于强引力场中，爱因斯坦广义相对论的经典实验验证之一便是解释其每百年 43 角秒的反常近日点进动。无显著稠密大气。'
  },
  {
    id: 'venus',
    index: 2,
    name: '金星',
    englishName: 'Venus',
    symbol: '♀',
    type: 'terrestrial',
    typeName: '类地岩石行星',
    semiMajorAxisAU: 0.723,
    semiMajorAxisKm: 108209000,
    orbitalPeriodYears: 0.6152,
    orbitalPeriodDays: 224.7,
    orbitalVelocityKmS: 35.0,
    eccentricity: 0.0067,
    inclinationDeg: 3.39,
    radiusKm: 6051.8,
    diameterKm: 12103.6,
    relativeEarthDiameter: 0.949,
    relativeEarthVolume: 0.857,
    massKg: 4.867e24,
    relativeEarthMass: 0.815,
    rotationHours: -5832.5, // 243 days retrograde
    axialTiltDeg: 177.36,
    colorHex: '#e8c47f',
    colorSecondary: '#c4974d',
    rings: false,
    kidFact: '倒着转的明亮金星！天空中除了太阳和月亮最亮的就是它。它裹着厚厚的黄色浓硫酸云被子，自己倒着慢慢转，太阳从西边升起！',
    academicNote: '失控温室效应的极端典型。厚达数十公里的二氧化碳与硫酸云层导致地表气压高达 92 个地球大气压，平均表面温度高达 465°C。'
  },
  {
    id: 'earth',
    index: 3,
    name: '地球',
    englishName: 'Earth',
    symbol: '♁',
    type: 'terrestrial',
    typeName: '类地岩石行星',
    semiMajorAxisAU: 1.000,
    semiMajorAxisKm: 149598000,
    orbitalPeriodYears: 1.000,
    orbitalPeriodDays: 365.25,
    orbitalVelocityKmS: 29.8,
    eccentricity: 0.0167,
    inclinationDeg: 0.0,
    radiusKm: 6371.0,
    diameterKm: 12742.0,
    relativeEarthDiameter: 1.000,
    relativeEarthVolume: 1.000,
    massKg: 5.972e24,
    relativeEarthMass: 1.000,
    rotationHours: 23.934,
    axialTiltDeg: 23.44,
    colorHex: '#2b75b2',
    colorSecondary: '#4da672',
    rings: false,
    hasMoon: true,
    moonRadiusKm: 1737.4,
    kidFact: '我们最温暖美丽的蓝色家园！拥有清澈的大海、绿色森林、氧气和可爱的月亮伙伴，是太阳系里唯一的生命大摇篮！',
    academicNote: '处于太阳系宜居带（Goldilocks Zone）正中。具有稳定的氮氧大气层、全球性偶极磁场、板块构造与丰富液态水圈，维系复杂碳基生命演化。'
  },
  {
    id: 'mars',
    index: 4,
    name: '火星',
    englishName: 'Mars',
    symbol: '♂',
    type: 'terrestrial',
    typeName: '类地岩石行星',
    semiMajorAxisAU: 1.524,
    semiMajorAxisKm: 227944000,
    orbitalPeriodYears: 1.8808,
    orbitalPeriodDays: 686.98,
    orbitalVelocityKmS: 24.1,
    eccentricity: 0.0934,
    inclinationDeg: 1.85,
    radiusKm: 3389.5,
    diameterKm: 6779.0,
    relativeEarthDiameter: 0.532,
    relativeEarthVolume: 0.151,
    massKg: 6.417e23,
    relativeEarthMass: 0.107,
    rotationHours: 24.623,
    axialTiltDeg: 25.19,
    colorHex: '#cc5024',
    colorSecondary: '#943310',
    rings: false,
    kidFact: '红彤彤的沙漠侦探星！土壤里富含生锈的氧化铁，两极顶着白雪般的水冰与干冰帽。人类派去了好多辆火星车在上面探险呢！',
    academicNote: '拥有全太阳系最高的火山（奥林匹斯山，高约 21 km）和最长峡谷（水手号峡谷）。虽大气稀薄，但拥有古河流三角洲冲积证据。'
  },
  {
    id: 'jupiter',
    index: 5,
    name: '木星',
    englishName: 'Jupiter',
    symbol: '♃',
    type: 'gas_giant',
    typeName: '气态巨行星',
    semiMajorAxisAU: 5.204,
    semiMajorAxisKm: 778570000,
    orbitalPeriodYears: 11.862,
    orbitalPeriodDays: 4332.6,
    orbitalVelocityKmS: 13.1,
    eccentricity: 0.0485,
    inclinationDeg: 1.30,
    radiusKm: 69911.0,
    diameterKm: 139822.0,
    relativeEarthDiameter: 10.973,
    relativeEarthVolume: 1321.3,
    massKg: 1.898e27,
    relativeEarthMass: 317.8,
    rotationHours: 9.925, // fastest rotation
    axialTiltDeg: 3.13,
    colorHex: '#c78f58',
    colorSecondary: '#995a2d',
    rings: false,
    hasSpot: true,
    kidFact: '太阳系的巨无霸大队长！它个头大到能装进 1300 多个地球！肚子上还有个吹了300多年的大红斑风暴，比两个地球还要大！',
    academicNote: '质量是太阳系其他所有行星总质量的 2.5 倍。成分以氢、氦为主，巨大的自转速度驱动纬向喷流带与大红斑（反气旋风暴）。'
  },
  {
    id: 'saturn',
    index: 6,
    name: '土星',
    englishName: 'Saturn',
    symbol: '♄',
    type: 'gas_giant',
    typeName: '气态巨行星',
    semiMajorAxisAU: 9.582,
    semiMajorAxisKm: 1433530000,
    orbitalPeriodYears: 29.457,
    orbitalPeriodDays: 10759.2,
    orbitalVelocityKmS: 9.7,
    eccentricity: 0.0555,
    inclinationDeg: 2.49,
    radiusKm: 58232.0,
    diameterKm: 116464.0,
    relativeEarthDiameter: 9.140,
    relativeEarthVolume: 763.6,
    massKg: 5.683e26,
    relativeEarthMass: 95.2,
    rotationHours: 10.656,
    axialTiltDeg: 26.73,
    colorHex: '#e5c17d',
    colorSecondary: '#a88544',
    rings: true,
    ringInnerRatio: 1.25,
    ringOuterRatio: 2.30,
    kidFact: '戴着全宇宙最漂亮金光草帽的明星！壮丽的光环其实是由无数亮晶晶的碎冰块和小岩石排着队构成的，闪闪发光！',
    academicNote: '平均密度仅约 0.69 g/cm³（唯一低于水密度的行星）。光环处于洛希极限之内，强烈潮汐剪切阻止了冰雪残骸聚集成单一卫星。'
  },
  {
    id: 'uranus',
    index: 7,
    name: '天王星',
    englishName: 'Uranus',
    symbol: '♅',
    type: 'ice_giant',
    typeName: '冰巨行星',
    semiMajorAxisAU: 19.201,
    semiMajorAxisKm: 2872460000,
    orbitalPeriodYears: 84.017,
    orbitalPeriodDays: 30685.4,
    orbitalVelocityKmS: 6.8,
    eccentricity: 0.0463,
    inclinationDeg: 0.77,
    radiusKm: 25362.0,
    diameterKm: 50724.0,
    relativeEarthDiameter: 3.981,
    relativeEarthVolume: 63.1,
    massKg: 8.681e25,
    relativeEarthMass: 14.5,
    rotationHours: -17.24, // retrograde sideways
    axialTiltDeg: 97.77, // sideways roll
    colorHex: '#6ec9c5',
    colorSecondary: '#3b8a86',
    rings: true,
    ringInnerRatio: 1.6,
    ringOuterRatio: 1.95,
    kidFact: '调皮的“躺平打滚星”！别的星球都是像陀螺一样立着转，天王星却躺得平平的（倾斜98度），像个保龄球一样沿着轨道向前滚！',
    academicNote: '富含水、氨、甲烷冰质物质的冰巨星。其异常极端的近 98° 自转轴倾角，被普遍认为是太阳系早期遭受原行星巨型侧撞击的结果。'
  },
  {
    id: 'neptune',
    index: 8,
    name: '海王星',
    englishName: 'Neptune',
    symbol: '♆',
    type: 'ice_giant',
    typeName: '冰巨行星',
    semiMajorAxisAU: 30.047,
    semiMajorAxisKm: 4495060000,
    orbitalPeriodYears: 164.79,
    orbitalPeriodDays: 60189.0,
    orbitalVelocityKmS: 5.4,
    eccentricity: 0.0095,
    inclinationDeg: 1.77,
    radiusKm: 24622.0,
    diameterKm: 49244.0,
    relativeEarthDiameter: 3.865,
    relativeEarthVolume: 57.7,
    massKg: 1.024e26,
    relativeEarthMass: 17.1,
    rotationHours: 16.11,
    axialTiltDeg: 28.32,
    colorHex: '#3a6fc4',
    colorSecondary: '#1f4382',
    rings: false,
    kidFact: '守在太阳系大门最远处的蔚蓝大巨人！阳光要走4个多小时才能跑到它那里。上面刮着全太阳系最凶猛的高速狂风！',
    academicNote: '绕日一周需地球时间近 165 年。甲烷强烈吸收红光赋予其深邃宝石蓝外观，内部热源驱动了时速超过 2,100 km/h 的超音速大气狂风。'
  }
];

// Attach convenient field aliases
for (const p of PLANETS_DATA) {
  p.nameZh = p.name;
  p.nameEn = p.englishName;
  p.typeZh = p.typeName;
  p.quickFact = p.kidFact;
  p.academicFact = p.academicNote;
}

/**
 * 教学尺度计算工具：
 * 兼顾“轨道运转可辨性”与“真实物理大小对比”
 */

// 1. 轨道全景模式下的轨道间距压缩（平滑幂律映射，避免外行星离屏幕几十米）
export function getVisualOrbitRadius(semiMajorAxisAU) {
  // 映射关系：水星 (0.387AU) -> ~17, 地球 (1.0AU) -> ~31, 海王星 (30AU) -> ~125
  return 10.0 + Math.pow(semiMajorAxisAU, 0.58) * 21.0;
}

// 2. 轨道全景模式下的行星视觉尺寸（保留明确的阶梯比例：巨行星显著大于类地行星，同时类地行星不丢失像素）
export function getVisualPlanetRadius(relativeEarthDiameter) {
  // 映射：水星 (0.38) -> 1.05, 地球 (1.0) -> 1.80, 木星 (11.0) -> 5.80
  return 0.85 + Math.pow(relativeEarthDiameter, 0.65) * 0.95;
}

// 3. 真实物理尺寸排排队模式下的行星尺寸（以地球直径为基准的严格真实物理比例）
export function getTrueScaleLineupRadius(relativeEarthDiameter) {
  // 严格正比：地球为 0.90，水星为 0.35，木星为 9.87，土星为 8.23
  return relativeEarthDiameter * 0.90;
}

// 4. 真实大小排队时的水平排列 X 坐标（按从水星到海王星的顺序排布基准线，接受 1-8 索引）
export function getLineupPositionX(planetIndex) {
  const offsets = [
    -54, // 水星
    -46, // 金星
    -37, // 地球
    -28, // 火星
    -10, // 木星 (巨大，需要开阔空间)
     14, // 土星 (带光环，需要空间)
     36, // 天王星
     48  // 海王星
  ];
  return offsets[planetIndex - 1] ?? 0;
}
