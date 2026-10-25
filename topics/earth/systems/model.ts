export const observations = ['water', 'sky', 'conditions'] as const;
export const conditionKeys = ['orbit', 'atmosphere', 'gravity', 'interior', 'moon', 'magnetic'] as const;
export type Observation = typeof observations[number];
export type ConditionKey = typeof conditionKeys[number];

export interface SystemsState {
  observation: Observation;
  waterTemp: number;
  waterSalt: number;
  waterProgress: number;
  skyHour: number;
  skyWind: boolean;
  skyField: boolean;
  skyAurora: boolean;
  skyAzimuth: number;
  skyElevation: number;
  skyDistance: number;
  condition: ConditionKey;
  orbitDistance: number;
}

export const defaults: Readonly<SystemsState> = Object.freeze({
  observation: 'water', waterTemp: 25, waterSalt: 32, waterProgress: 0,
  skyHour: 12, skyWind: true, skyField: true, skyAurora: true,
  skyAzimuth: 322, skyElevation: 18, skyDistance: 4.25,
  condition: 'orbit', orbitDistance: 1,
});

const numberSpecs = {
  waterTemp: [5, 25, 1], waterSalt: [30, 38, .5], waterProgress: [0, 1, .01],
  skyHour: [0, 24, .5], orbitDistance: [.9, 1.1, .01],
  skyAzimuth: [0, 360, .1], skyElevation: [-80, 80, .1], skyDistance: [2.6, 8, .01],
} as const;

function strictNumber(value: unknown, fallback: number, spec: readonly number[]) {
  if (typeof value !== 'string' || !/^-?(?:0|[1-9]\d*)(?:\.\d+)?$/.test(value)) return fallback;
  const n = Number(value), [min, max, step] = spec;
  if (!Number.isFinite(n) || n < min || n > max || Math.abs((n - min) / step - Math.round((n - min) / step)) > 1e-7) return fallback;
  return n;
}

export function parseState(raw: Record<string, string> = {}): SystemsState {
  const state = { ...defaults };
  if (observations.includes(raw.observation as Observation)) state.observation = raw.observation as Observation;
  if (conditionKeys.includes(raw.condition as ConditionKey)) state.condition = raw.condition as ConditionKey;
  for (const key of Object.keys(numberSpecs) as (keyof typeof numberSpecs)[]) {
    state[key] = strictNumber(raw[key], defaults[key], numberSpecs[key]);
  }
  for (const key of ['skyWind', 'skyField', 'skyAurora'] as const) {
    if (raw[key] === '0' || raw[key] === '1') state[key] = raw[key] === '1';
  }
  return state;
}

export function serializeState(state: SystemsState): Record<string, string> {
  return Object.fromEntries(Object.entries(state).map(([key, value]) => [key, typeof value === 'boolean' ? (value ? '1' : '0') : String(value)]));
}

/** EOS-80, surface pressure only. Inputs: ITS-90 Celsius and practical salinity.
 * MRI/JMA Technical Report 80, chapter 4, equations 4.1–4.2 and temperature-scale footnote.
 * Retained historical equation for a limited comparison, not the current TEOS-10 standard.
 */
export function surfaceDensity(temperature: number, salinity: number): number {
  if (!Number.isFinite(temperature) || !Number.isFinite(salinity) || temperature < 0 || temperature > 40 || salinity < 0 || salinity > 40) {
    throw new RangeError('Surface comparison supports 0–40 Celsius and practical salinity 0–40.');
  }
  const t = temperature * 1.00024;
  const water = 999.842594 + 6.793952e-2 * t - 9.09529e-3 * t ** 2 + 1.001685e-4 * t ** 3 - 1.120083e-6 * t ** 4 + 6.536332e-9 * t ** 5;
  const a = .824493 - 4.0899e-3 * t + 7.6438e-5 * t ** 2 - 8.2467e-7 * t ** 3 + 5.3875e-9 * t ** 4;
  const b = -5.72466e-3 + 1.0227e-4 * t - 1.6546e-6 * t ** 2;
  return water + a * salinity + b * salinity ** 1.5 + 4.8314e-4 * salinity ** 2;
}

export const referenceWater = Object.freeze({ id: 'B', temperature: 15, salinity: 34 });
export const waterPresets = Object.freeze({
  warmFreshened: { waterTemp: 25, waterSalt: 30 },
  coldSalty: { waterTemp: 5, waterSalt: 38 },
  coldFreshened: { waterTemp: 5, waterSalt: 30 },
  warmSalty: { waterTemp: 25, waterSalt: 38 },
  matched: { waterTemp: 15, waterSalt: 34 },
});
export type WaterPreset = keyof typeof waterPresets;
export type WaterTendency = 'rise' | 'sink' | 'neutral';

// Stable tracer identities. These are marks for two retained water bodies, not molecules.
const tracerSeeds = Array.from({ length: 16 }, (_, i) => ({
  u: ((i * 7) % 16 + .5) / 16,
  v: ((i * 5) % 16 + .5) / 16,
}));

export function waterFrame(state: Pick<SystemsState, 'waterTemp' | 'waterSalt' | 'waterProgress'>) {
  const densityA = surfaceDensity(state.waterTemp, state.waterSalt);
  const densityB = surfaceDensity(referenceWater.temperature, referenceWater.salinity);
  const delta = densityA - densityB;
  // 0.05 kg/m³ is a display-resolution band, not a dynamical mixing criterion.
  const tendency: WaterTendency = Math.abs(delta) < .05 ? 'neutral' : delta > 0 ? 'sink' : 'rise';
  const progress = Math.max(0, Math.min(1, state.waterProgress));
  const sign = tendency === 'neutral' ? 0 : tendency === 'sink' ? 1 : -1;
  const parcels = (['A', 'B'] as const).map(id => {
    const direction = id === 'A' ? sign : -sign;
    const startX = id === 'A' ? 180 : 420;
    const y = 180 + 66 * direction * progress;
    return {
      id, x: startX + (sign === 0 ? 0 : (300 - startX) * progress), y,
      tracers: tracerSeeds.map(({u, v}, i) => ({
        id: `${id}-${i}`, x: startX + (u - .5) * 104 + (sign === 0 ? 0 : (300 + (u - .5) * 380 - (startX + (u - .5) * 104)) * progress),
        y: y + (v - .5) * 62,
      })),
    };
  });
  return { densityA, densityB, delta, tendency, progress, parcels };
}

/** Equinox, fixed equatorial site, geometric horizon. Solar time, not civil time.
 * View from north; sunlight travels from left to right. Earth rotates counterclockwise.
 */
export function skyFrame(hour: number) {
  if (!Number.isFinite(hour) || hour < 0 || hour > 24) throw new RangeError('Solar hour must be 0–24.');
  const angle = hour * Math.PI / 12;
  const x = Math.cos(angle), y = -Math.sin(angle);
  const sunAboveHorizon = -x;
  const phase: 'horizon' | 'day' | 'night' = Math.abs(sunAboveHorizon) < 1e-8 ? 'horizon' : sunAboveHorizon > 0 ? 'day' : 'night';
  return { site: 'EQ-A', x, y, phase, sunAboveHorizon, rotationDegrees: -hour * 15, rotationRadians: angle };
}

export type SkyCameraState = Pick<SystemsState, 'skyAzimuth' | 'skyElevation' | 'skyDistance'>;
export function skyCameraPosition(state: SkyCameraState): [number,number,number] {
  const azimuth = state.skyAzimuth*Math.PI/180, elevation = state.skyElevation*Math.PI/180;
  return [state.skyDistance*Math.cos(elevation)*Math.sin(azimuth), state.skyDistance*Math.sin(elevation), state.skyDistance*Math.cos(elevation)*Math.cos(azimuth)];
}

export function cameraStateFromPosition(x: number, y: number, z: number): SkyCameraState {
  const distance = Math.hypot(x,y,z);
  if (![x,y,z].every(Number.isFinite) || distance === 0) throw new RangeError('Camera coordinates must be finite and nonzero.');
  const azimuth = ((Math.atan2(x,z)*180/Math.PI)%360+360)%360;
  return {
    skyAzimuth: Math.round(azimuth*10)/10%360,
    skyElevation: Math.round(Math.max(-80,Math.min(80,Math.asin(y/distance)*180/Math.PI))*10)/10,
    skyDistance: Math.round(Math.max(2.6,Math.min(8,distance))*100)/100,
  };
}

/** Relative direct-normal irradiance above the atmosphere; fixed solar luminosity. */
export function relativeSunlight(distance: number) {
  if (!Number.isFinite(distance) || distance < .9 || distance > 1.1) throw new RangeError('Distance comparison supports 0.9–1.1 AU.');
  return 1 / distance ** 2;
}
