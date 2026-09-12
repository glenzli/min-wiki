export interface Settings { basin: 'crater' | 'caldera'; supply: number; leak: 'low' | 'high' }
export const smooth = (a: number, b: number, x: number) => { const u = Math.min(1, Math.max(0, (x - a) / (b - a))); return u * u * (3 - 2 * u); };
// Sequenced teaching states, not a pressure or rock-fracture solver.
export function calderaState(progress: number) {
  return { withdrawal: smooth(.04, .24, progress), fracture: smooth(.18, .30, progress), subsidence: smooth(.27, .46, progress) };
}
export function formationProgress(progress: number, kind: Settings['basin']) {
  return kind === 'caldera' ? calderaState(progress).subsidence : smooth(.14, .43, progress);
}
export function netSupply(settings: Settings) { return settings.supply - .08 - (settings.leak === 'high' ? .8 : .08); }
export function waterFraction(progress: number, settings: Settings) { return Math.max(0, Math.min(1, netSupply(settings) * 1.65 * smooth(.48, 1, progress))); }
export function basinDimensions(kind: Settings['basin']) { return kind === 'caldera' ? { radius: 180, floor: 110, rim: 118 - 220 * Math.exp(-((180 / 190) ** 2)), maxDepth: 74 } : { radius: 83, floor: 42, rim: -58, maxDepth: 84 }; }
export function terrain(x: number, progress: number, kind: Settings['basin']) {
  const { radius, floor, rim } = basinDimensions(kind), u = Math.abs(x) / radius;
  const initial = 118 - 220 * Math.exp(-((x / 190) ** 2));
  const final = u < 1 ? floor - (floor - rim) * u ** 6 : kind === 'caldera' ? initial : rim + (118 - rim) * (1 - Math.exp(-(Math.abs(x) - radius) / 110));
  const formed = formationProgress(progress, kind); return initial + (final - initial) * formed;
}
export function readout(progress: number, settings: Settings) { return { value: `${Math.round(waterFraction(progress, settings) * 100)}%`, stage: progress < .2 ? 0 : progress < .48 ? 1 : progress < .83 ? 2 : 3, limited: progress > .5 && netSupply(settings) <= 0 }; }
