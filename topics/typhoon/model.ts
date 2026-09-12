export interface Settings { temperature: number; shear: number; hemisphere: 'north' | 'south' | 'equator' }
export const smooth = (a: number, b: number, x: number) => { const u = Math.min(1, Math.max(0, (x - a) / (b - a))); return u * u * (3 - 2 * u); };
export function coriolis(latitudeDegrees: number) { return 2 * 7.292115e-5 * Math.sin(latitudeDegrees * Math.PI / 180); }
/** Qualitative favorability, explicitly not a forecast probability. */
export function favorability(settings: Settings) {
  const ocean = smooth(25, 28.5, settings.temperature), wind = 1 - smooth(6, 24, settings.shear), rotation = settings.hemisphere === 'equator' ? 0 : 1;
  return ocean * wind * rotation;
}
export const organization = (progress: number, settings: Settings) => smooth(.12, .93, progress) * favorability(settings);
export function readout(progress: number, settings: Settings) { return { value: favorability(settings) >= .5 ? 'favorable' : 'unfavorable', stage: progress < .2 ? 0 : progress < .48 ? 1 : progress < .8 ? 2 : 3, limited: favorability(settings) < .5 }; }

/** Canvas angles grow clockwise; the band winding mirrors between hemispheres. */
export function spiralAngle(radius: number, progress: number, arm: number, hemisphere: Settings['hemisphere']) {
  const direction = hemisphere === 'north' ? -1 : 1;
  return arm * Math.PI * 2 / 3 - direction * radius * .025 + direction * progress * 5;
}
