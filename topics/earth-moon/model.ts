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
/** North-up geocentric observer basis; columns are screen right, up, toward Earth. */
export function moonObserverFrame(phase: number) {
  const a = phase * 2 * Math.PI;
  const right: [number, number, number] = [-Math.sin(a), 0, -Math.cos(a)];
  const up: [number, number, number] = [0, 1, 0];
  const towardEarth: [number, number, number] = [Math.cos(a), 0, -Math.sin(a)];
  // Project the world Sun direction (-x) onto the same frame used by lookAt(Earth).
  const sunLocal: [number, number, number] = [-right[0], 0, -towardEarth[0]];
  return { right, up, towardEarth, sunLocal };
}
/** The map's central meridian (u=.5) is the near side, presented along local +z. */
export const LUNAR_MAP_ROTATION = -Math.PI / 2;
export function readout(progress: number, _settings: Settings) {
  return { value: `${Math.round(litFraction(progress) * 100)}%`, stage: Math.min(3, Math.floor(progress * 4)), limited: false };
}

/** Eight named phase neighborhoods, wrapping the next new Moon to the first. */
export const phaseIndex = (progress: number) => ((Math.round(progress * 8) % 8) + 8) % 8;
