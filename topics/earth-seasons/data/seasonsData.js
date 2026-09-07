import { solarGeometry } from '../physics/solarGeometry.js';

/**
 * 地球自转、公转与四季天文物理常数与计算工具
 * 数据基准参考：NASA Earth Fact Sheet & 国际天文学联合会 (IAU)
 */

export const EARTH_CONSTANTS = {
  axialTiltDeg: 23.439281, // 真实黄赤交角，通常约称 23.44° 或 23.5°
  orbitalPeriodDays: 365.25636,
  rotationHoursSidereal: 23.9344696, // 恒星日 (23h 56m 4s)
  solarDayHours: 24.0, // 平太阳日 (24h 00m 0s)
  radiusKm: 6371.0,
  diameterKm: 12742.0,
  tropicLatitudeDeg: 23.439281, // 回归线纬度 (北回归线 / 南回归线)
  polarCircleLatitudeDeg: 66.560719, // 极圈纬度 (90° - 23.44°)
  perihelionDistanceAU: 0.98329, // 近日点约 1.47 亿公里 (每年1月初，北半球隆冬)
  aphelionDistanceAU: 1.01671 // 远日点约 1.52 亿公里 (每年7月初，北半球盛夏)
};

export const SOLAR_TERMS = [
  {
    id: 'spring_equinox',
    nameZh: '春分',
    nameEn: 'Spring Equinox',
    fractionOfYear: 0.0, // 0.0 起点设在春分
    dayOfYear: 80,
    approxDate: '3月21日前后',
    subsolarLat: 0.0,
    quickFact: '春分到啦！太阳直射赤道，大多数地方昼夜大致等长；极点附近情况不同。',
    academicFact: '太阳位于黄道与赤道升交点（春分点，赤经 0h），太阳赤纬 δ=0°。理想晨昏圈经过南北极，地轴方向保持不变。'
  },
  {
    id: 'summer_solstice',
    nameZh: '夏至',
    nameEn: 'Summer Solstice',
    fractionOfYear: 0.25,
    dayOfYear: 172,
    approxDate: '6月21日前后',
    subsolarLat: 23.44,
    quickFact: '夏至到了！太阳直射北半球北回归线，北半球白天最长；北极全天都是白天（极昼）！',
    academicFact: '太阳赤纬达到北向极值 δ=+23.44°。北极圈（66.5°N以上）出现极昼，南极圈（66.5°S以上）出现极夜。'
  },
  {
    id: 'autumn_equinox',
    nameZh: '秋分',
    nameEn: 'Autumn Equinox',
    fractionOfYear: 0.50,
    dayOfYear: 266,
    approxDate: '9月23日前后',
    subsolarLat: 0.0,
    quickFact: '秋风送爽！太阳再次直射赤道，大多数地方昼夜再次大致等长。候鸟开始飞往南方过冬。',
    academicFact: '太阳穿过降交点（秋分点，赤经 12h），太阳赤纬回到 δ=0°。正午太阳高度角与春分相同。'
  },
  {
    id: 'winter_solstice',
    nameZh: '冬至',
    nameEn: 'Winter Solstice',
    fractionOfYear: 0.75,
    dayOfYear: 356,
    approxDate: '12月22日前后',
    subsolarLat: -23.44,
    quickFact: '冬至夜最长！太阳跑到南回归线，北半球黑夜最漫长、白天最短；北极全天陷入黑夜（极夜）！',
    academicFact: '太阳赤纬达到南向极值 δ=-23.44°。北半球正午太阳高度角达到全年最低，南半球正值盛夏。'
  }
];

export const MAJOR_CITIES = [
  {
    id: 'beijing',
    nameZh: '北京',
    nameEn: 'Beijing',
    lat: 39.9,
    lon: 116.4,
    country: '中国',
    desc: '北温带典型季风气候，四季分明。夏至白昼近 15 小时，冬至白昼仅 9 小时。'
  },
  {
    id: 'london',
    nameZh: '伦敦',
    nameEn: 'London',
    lat: 51.5,
    lon: -0.1,
    country: '英国',
    desc: '高纬度温带海洋气候。夏至晚上 10 点天色仍亮（白天近 16.5 小时），冬至下午 4 点已入夜。'
  },
  {
    id: 'new_york',
    nameZh: '纽约',
    nameEn: 'New York',
    lat: 40.7,
    lon: -74.0,
    country: '美国',
    desc: '与北京纬度相近（约 40°N），地方太阳时相差约 13 小时（北京正午时纽约正值深夜入眠）。'
  },
  {
    id: 'sydney',
    nameZh: '悉尼',
    nameEn: 'Sydney',
    lat: -33.9,
    lon: 151.2,
    country: '澳大利亚',
    desc: '南半球大都市！季节与北半球完全颠倒：12月盛夏过圣诞节，6月进入冬季。'
  },
  {
    id: 'equator',
    nameZh: '赤道 (新加坡)',
    nameEn: 'Equator (Singapore)',
    lat: 1.35,
    lon: 103.8,
    country: '赤道地区',
    desc: '全年没有春夏秋冬，终年如夏，全年白昼和黑夜都接近 12 小时。'
  },
  {
    id: 'north_pole',
    nameZh: '北极点',
    nameEn: 'North Pole',
    lat: 90.0,
    lon: 0.0,
    country: '北冰洋极地',
    desc: '终年冰雪覆盖。一年只有一次日出和日落：半年是连续白昼（极昼），半年是连续黑夜（极夜）。'
  }
];

/**
 * 计算公转进度下的太阳直射点纬度 (Subsolar Declination)
 * @param {number} fractionOfYear 0.0 ~ 1.0 (0.0 = 春分, 0.25 = 夏至, 0.5 = 秋分, 0.75 = 冬至)
 * @param {number} tiltDeg 地轴倾角，默认 23.44° (假想实验可传入 0°)
 * @returns {number} 直射点纬度 (度，北正南负)
 */
export function calcSubsolarLatitude(fractionOfYear, tiltDeg = EARTH_CONSTANTS.axialTiltDeg) {
  const value = solarGeometry(fractionOfYear, 0, tiltDeg).declination;
  return Math.abs(value) < 1e-9 ? 0 : value;
}

/**
 * 计算某纬度在某直射点下的正午太阳高度角 (Noon Solar Altitude Angle)
 * 公式：H = 90° - |纬度 - 直射纬度|
 * @param {number} latDeg 观察地纬度 (-90° ~ +90°)
 * @param {number} subsolarLatDeg 太阳直射纬度 (-23.44° ~ +23.44°)
 * @returns {number} 正午太阳高度角；负值表示太阳仍在地平线下
 */
export function calcNoonSolarAltitude(latDeg, subsolarLatDeg) {
  const diff = Math.abs(latDeg - subsolarLatDeg);
  const altitude = 90.0 - diff;
  return altitude;
}

/**
 * 计算某纬度在某直射点下的白昼时长 (Daylight Hours)
 * 利用球面三角学晨昏日出日落时角公式：cos(ω0) = -tan(φ) * tan(δ)
 * @param {number} latDeg 观察地纬度 (-90° ~ +90°)
 * @param {number} subsolarLatDeg 太阳直射纬度 (-23.44° ~ +23.44°)
 * @returns {number|null} 白昼时长；极点太阳位于理想地平线时为 null
 */
export function calcDaylightHours(latDeg, subsolarLatDeg) {
  const phi = latDeg * Math.PI / 180, delta = subsolarLatDeg * Math.PI / 180;
  const a = Math.sin(phi) * Math.sin(delta), b = Math.cos(phi) * Math.cos(delta);
  // At a pole on the equinox, the point Sun stays on the ideal horizon.
  // A 12-hour sunrise/sunset result is undefined there, not measured daylight.
  if (Math.abs(b) < 1e-12) return a > 1e-12 ? 24 : a < -1e-12 ? 0 : null;
  if (a >= b - 1e-12) return 24;
  if (a <= -b + 1e-12) return 0;
  return 24 * Math.acos(Math.max(-1, Math.min(1, -a / b))) / Math.PI;
}

/**
 * 太阳光线单位面积能量通量比（朗伯余弦定律）
 * 90° 直射为 100%，45° 为 70.7%，0° 为 0%
 * @param {number} altitudeDeg 太阳高度角 (0° ~ 90°)
 * @returns {number} 相对能量密度 (0.0 ~ 1.0)
 */
export function calcSolarHeatFlux(altitudeDeg) {
  const rad = (altitudeDeg * Math.PI) / 180.0;
  return Math.max(0.0, Math.sin(rad));
}
