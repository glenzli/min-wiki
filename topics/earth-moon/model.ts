export interface Settings { guides: boolean }
export const SYNODIC_DAYS = 29.53059;
export const SIDEREAL_DAYS = 27.32166;
export const MOON_EARTH_RADIUS_RATIO = 1737.4 / 6371;
export const DISTANCE_EARTH_RADII = 384400 / 6371;
export const litFraction = (phase: number) => (1 - Math.cos(phase * 2 * Math.PI)) / 2;
export function moonPosition(phase: number, distance = 11): [number, number, number] {
  const a = phase * 2 * Math.PI;
  // Sun–Earth rotating frame; no eclipse geometry or orbital perturbations.
  return [-distance * Math.cos(a), 0, distance * Math.sin(a)];
}
export function readout(progress: number, _settings: Settings) {
  return { value: `${Math.round(litFraction(progress) * 100)}%`, stage: Math.min(3, Math.floor(progress * 4)), limited: false };
}

/** Eight named phase neighborhoods, wrapping the next new Moon to the first. */
export const phaseIndex = (progress: number) => ((Math.round(progress * 8) % 8) + 8) % 8;
