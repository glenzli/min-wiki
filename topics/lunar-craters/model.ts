export interface Settings { diameter: number; speed: number }
export const LUNAR_GRAVITY = 1.62;
export const DENSITY = 3000;
export function impactEnergy(diameter: number, speedKmS: number) { const mass = Math.PI / 6 * diameter ** 3 * DENSITY; return .5 * mass * (speedKmS * 1000) ** 2; }
export function energyRatio(settings: Settings) { return impactEnergy(settings.diameter, settings.speed) / impactEnergy(100, 20); }
export const smooth = (a: number, b: number, x: number) => { const u = Math.min(1, Math.max(0, (x - a) / (b - a))); return u * u * (3 - 2 * u); };
export function ejectaPosition(speed: number, angle: number, seconds: number): [number, number] { return [speed * Math.cos(angle) * seconds, speed * Math.sin(angle) * seconds - .5 * LUNAR_GRAVITY * seconds ** 2]; }
export function craterRadius(settings: Settings) { return Math.min(165, 70 * energyRatio(settings) ** .19); }
export function terrain(x: number, progress: number, settings: Settings) {
  const r = craterRadius(settings), formation = smooth(.35, .63, progress), settled = smooth(.65, .95, progress), u = Math.abs(x) / r;
  const bowl = u < 1 ? (1 - u * u) * r * (.60 - .13 * settled) : 0;
  const rim = Math.exp(-(((u - 1.04) / .18) ** 2)) * r * .15;
  return 64 + formation * (bowl - rim);
}
export function readout(progress: number, settings: Settings) { return { value: `${energyRatio(settings).toFixed(1)}×`, stage: progress < .33 ? 0 : progress < .46 ? 1 : progress < .84 ? 2 : 3, limited: false }; }
