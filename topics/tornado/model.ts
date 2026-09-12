export interface Settings { shear: number; updraft: number; condensation: boolean }
export const smooth = (a: number, b: number, x: number) => { const u = Math.min(1, Math.max(0, (x - a) / (b - a))); return u * u * (3 - 2 * u); };
export function rotationStrength(settings: Settings) { return settings.shear * settings.updraft; }
export function nearGroundRotation(progress: number, settings: Settings) { const strength = rotationStrength(settings); return strength >= .4 ? smooth(.70, .95, progress) * strength : 0; }
export function readout(progress: number, settings: Settings) {
  const strong = rotationStrength(settings) >= .4, ground = nearGroundRotation(progress, settings);
  return { value: ground > .3 ? 'tornado' : strong ? 'storm' : 'weak', stage: progress < .22 ? 0 : progress < .48 ? 1 : progress < .8 ? 2 : 3, limited: !strong };
}

/** The drawing's lowest air trace remains aloft until the selected ground-vortex stage. */
export function traceBottom(progress: number, settings: Settings) {
  const ground = nearGroundRotation(progress, settings);
  return 48 + Math.min(1, ground / .30) * 85;
}
