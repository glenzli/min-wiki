import { t } from '../i18n.ts';

/**
 * 光学与彩虹物理常数与计算工具
 * 涵盖：七色光谱波长、柯西色散折射率公式、斯涅尔定律、笛卡尔光线极值角
 */

export interface SpectrumColor {
  id: string;
  nameZh: string;
  nameEn: string;
  wavelengthNm: number;
  hex: string;
  waterIndex: number; // 20°C 水的折射率
  glassIndex: number; // 冕牌玻璃折射率
  primaryAngleDeg: number; // 主虹出射偏折角
  secondaryAngleDeg: number; // 副虹出射偏折角
}

export const SPECTRUM_COLORS: SpectrumColor[] = [
  {
    id: 'red',
    nameZh: t('红光'),
    nameEn: 'Red',
    wavelengthNm: 680,
    hex: '#ff3b30',
    waterIndex: 1.3312,
    glassIndex: 1.5130,
    primaryAngleDeg: 42.3,
    secondaryAngleDeg: 50.4
  },
  {
    id: 'orange',
    nameZh: t('橙光'),
    nameEn: 'Orange',
    wavelengthNm: 610,
    hex: '#ff9500',
    waterIndex: 1.3328,
    glassIndex: 1.5170,
    primaryAngleDeg: 42.0,
    secondaryAngleDeg: 50.9
  },
  {
    id: 'yellow',
    nameZh: t('黄光'),
    nameEn: 'Yellow',
    wavelengthNm: 580,
    hex: '#ffd60a',
    waterIndex: 1.3336,
    glassIndex: 1.5190,
    primaryAngleDeg: 41.8,
    secondaryAngleDeg: 51.3
  },
  {
    id: 'green',
    nameZh: t('绿光'),
    nameEn: 'Green',
    wavelengthNm: 530,
    hex: '#34c759',
    waterIndex: 1.3353,
    glassIndex: 1.5230,
    primaryAngleDeg: 41.5,
    secondaryAngleDeg: 51.9
  },
  {
    id: 'cyan',
    nameZh: t('青光'),
    nameEn: 'Cyan',
    wavelengthNm: 490,
    hex: '#32ade6',
    waterIndex: 1.3371,
    glassIndex: 1.5270,
    primaryAngleDeg: 41.1,
    secondaryAngleDeg: 52.4
  },
  {
    id: 'blue',
    nameZh: t('蓝光'),
    nameEn: 'Blue',
    wavelengthNm: 450,
    hex: '#007aff',
    waterIndex: 1.3396,
    glassIndex: 1.5310,
    primaryAngleDeg: 40.7,
    secondaryAngleDeg: 52.9
  },
  {
    id: 'violet',
    nameZh: t('紫光'),
    nameEn: 'Violet',
    wavelengthNm: 410,
    hex: '#af52de',
    waterIndex: 1.3435,
    glassIndex: 1.5380,
    primaryAngleDeg: 40.3,
    secondaryAngleDeg: 53.6
  }
];

export interface OpticalMedium {
  id: string;
  nameZh: string;
  nameEn: string;
  baseIndex: number; // 589nm 钠黄光基准折射率
  cauchyB: number; // 柯西色散系数 B (μm²)
  dispersionDesc: string;
}

export const OPTICAL_MEDIA: OpticalMedium[] = [
  {
    id: 'water',
    nameZh: t('纯净水滴'),
    nameEn: 'Water Drop',
    baseIndex: 1.333,
    cauchyB: 0.0033,
    dispersionDesc: t('天然形成彩虹的介质，色散温和清晰。')
  },
  {
    id: 'crown_glass',
    nameZh: t('冕牌玻璃 (K9)'),
    nameEn: 'Crown Glass',
    baseIndex: 1.516,
    cauchyB: 0.0042,
    dispersionDesc: t('牛顿三棱镜经典实验材质，色散鲜艳明亮。')
  },
  {
    id: 'flint_glass',
    nameZh: t('火石玻璃'),
    nameEn: 'Flint Glass',
    baseIndex: 1.620,
    cauchyB: 0.0085,
    dispersionDesc: t('含铅高折射玻璃，偏折更大，光谱展开更宽。')
  },
  {
    id: 'diamond',
    nameZh: t('璀璨金刚石'),
    nameEn: 'Diamond',
    baseIndex: 2.417,
    cauchyB: 0.0120,
    dispersionDesc: t('极高折射率与强色散，产生耀眼的七彩火彩。')
  }
];

/**
 * 斯涅尔折射定律计算 (Snell's Law)
 * n1 * sin(theta1) = n2 * sin(theta2)
 * @param incidentAngleRad 入射角 (弧度)
 * @param n1 入射介质折射率
 * @param n2 出射介质折射率
 * @returns 折射角 (弧度)，若发生全内反射返回 null
 */
export function calcRefractionAngle(incidentAngleRad: number, n1: number, n2: number): number | null {
  const sinTheta2 = (n1 / n2) * Math.sin(incidentAngleRad);
  if (Math.abs(sinTheta2) > 1.0) {
    return null; // 全反射 Total Internal Reflection
  }
  return Math.asin(sinTheta2);
}

/**
 * 柯西色散公式计算指定波长在介质中的折射率 (Cauchy's Equation)
 * n(λ) = A + B / λ² (λ 单位为 μm)
 * @param wavelengthNm 波长 (nm)
 * @param baseIndex 基准折射率 (A)
 * @param cauchyB 色散常数 B (μm²)
 */
export function calcCauchyIndex(wavelengthNm: number, baseIndex: number, cauchyB: number): number {
  const lambdaMicrons = wavelengthNm / 1000.0;
  return baseIndex + cauchyB / (lambdaMicrons * lambdaMicrons);
}

/**
 * 计算单个球形水滴的主虹散射角 (笛卡尔偏转角)
 * 经历 1 次内反射 + 2 次折射
 * 公式：θ(b) = 4 * arcsin(b / n) - 2 * arcsin(b)
 * @param impactParameter 撞击参数 b (0 ~ 1，0 为穿心光线，1 为边缘相切)
 * @param refractiveIndex 水滴折射率 n
 * @returns 散射出射角 (度，与入射日光方向的反向夹角)
 */
export function calcPrimaryRainbowAngle(impactParameter: number, refractiveIndex: number): number {
  const b = Math.max(0.0001, Math.min(0.9999, impactParameter));
  const r = Math.asin(b / refractiveIndex);
  const i = Math.asin(b);
  const thetaRad = 4.0 * r - 2.0 * i;
  return (thetaRad * 180.0) / Math.PI;
}

/**
 * 计算笛卡尔主虹极值撞击参数 b_crit
 * 极值条件：dθ/db = 0  ==>  b_crit = sqrt((4 - n²) / 3)
 */
export function calcDescartesImpactParameter(refractiveIndex: number): number {
  const val = (4.0 - refractiveIndex * refractiveIndex) / 3.0;
  return Math.sqrt(Math.max(0.0, Math.min(1.0, val)));
}

/**
 * 计算单个球形水滴的副虹 (霓) 散射角
 * 经历 2 次内反射 + 2 次折射
 * 公式：θ2(b) = 2 * arcsin(b) - 6 * arcsin(b / n) + 180°
 * 极值条件：b_crit = sqrt((9 - n²) / 8)
 */
export function calcSecondaryRainbowAngle(impactParameter: number, refractiveIndex: number): number {
  const b = Math.max(0.0001, Math.min(0.9999, impactParameter));
  const r = Math.asin(b / refractiveIndex);
  const i = Math.asin(b);
  const thetaRad = 2.0 * i - 6.0 * r + Math.PI;
  return (thetaRad * 180.0) / Math.PI;
}

export type Point = readonly [number, number];
/** Unit-circle path in mathematical coordinates; incident sunlight moves right.
 * Each boundary point is on the same circle. Exit direction is obtained by
 * continuing the chord rotation and applying Snell's law, not drawn by hand. */
export function traceDropRay(n: number, reflections: 1 | 2 = 1): Point[] {
  const k = reflections + 1;
  const b = Math.sqrt((k * k - n * n) / (k * k - 1));
  const i = Math.asin(b), r = Math.asin(b / n);
  const start = Math.PI - i;
  const points: Point[] = [[-2.8, b]];
  for (let j = 0; j <= reflections + 1; j++) {
    const theta = start - j * (Math.PI - 2 * r);
    points.push([Math.cos(theta), Math.sin(theta)]);
  }
  const last = points[points.length - 1];
  const theta = start - (reflections + 1) * (Math.PI - 2 * r);
  const direction = theta - i;
  points.push([last[0] + 1.5 * Math.cos(direction), last[1] + 1.5 * Math.sin(direction)]);
  return points;
}

// Readouts and sky geometry share the same refractive-index model.
for (const color of SPECTRUM_COLORS) {
  color.primaryAngleDeg = calcPrimaryRainbowAngle(calcDescartesImpactParameter(color.waterIndex), color.waterIndex);
  color.secondaryAngleDeg = calcSecondaryRainbowAngle(Math.sqrt((9 - color.waterIndex ** 2) / 8), color.waterIndex);
}
