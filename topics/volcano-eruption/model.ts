export interface Settings { vents: number; gas: number; viscosity: number }
export const smooth = (a: number, b: number, x: number) => { const u = Math.min(1, Math.max(0, (x - a) / (b - a))); return u * u * (3 - 2 * u); };
export const terrain = (x: number) => 115 - 158 * Math.exp(-((x / 168) ** 2)) + 20 * Math.exp(-((x / 25) ** 2));
export const ventPositions = (count: number) => count === 3 ? [-126, 0, 126] : [0];
export const supplyPerVent = (count: number) => 1 / ventPositions(count).length;
export const explosivity = (settings: Settings) => settings.gas * (.25 + .75 * settings.viscosity);
export const activity = (p: number) => smooth(.28, .46, p) * (1 - smooth(.77, 1, p));
export function readout(progress: number, settings: Settings) { return { value: String(ventPositions(settings.vents).length), stage: progress < .22 ? 0 : progress < .45 ? 1 : progress < .84 ? 2 : 3, limited: false }; }
