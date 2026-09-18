export const WORLDS = [
  { id: 'mercury', kind: 'rock', body: 'planet', color: '#aea496', surface: true, liquid: 'none', evidence: 'observed' },
  { id: 'venus', kind: 'rock', body: 'planet', color: '#d2af71', surface: true, liquid: 'none', evidence: 'observed' },
  { id: 'earth', kind: 'rock', body: 'planet', color: '#68a2a9', surface: true, liquid: 'water', evidence: 'observed' },
  { id: 'mars', kind: 'rock', body: 'planet', color: '#c48057', surface: true, liquid: 'none', evidence: 'observed' },
  { id: 'jupiter', kind: 'gas', body: 'planet', color: '#cbb198', surface: false, liquid: 'none', evidence: 'observed' },
  { id: 'neptune', kind: 'ice', body: 'planet', color: '#82b4c3', surface: false, liquid: 'none', evidence: 'observed' },
  { id: 'titan', kind: 'icy', body: 'moon', color: '#c89951', surface: true, liquid: 'hydrocarbon', evidence: 'observed' },
  { id: 'cancri', kind: 'rock', body: 'exoplanet', color: '#e7753b', surface: true, liquid: 'silicate-melt', evidence: 'inferred' },
] as const;
export type World = typeof WORLDS[number];
export type WorldId = World['id'];
export type View = 'landscape' | 'globe' | 'section';
export const clamp = (value: number, low = 0, high = 1) => Number.isFinite(value) ? Math.min(high, Math.max(low, value)) : low;
export const smooth = (low: number, high: number, value: number) => { const p = clamp((value - low) / (high - low)); return p * p * (3 - 2 * p); };
const hash = (x: number, y: number) => { const h = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return h - Math.floor(h); };
export const field = (x: number, y: number) => {
  const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
  const a = hash(ix, iy) * (1 - u) + hash(ix + 1, iy) * u, b = hash(ix, iy + 1) * (1 - u) + hash(ix + 1, iy + 1) * u;
  return (a * (1 - v) + b * v) * 2 - 1;
};
export const noise = (x: number, y: number) => (field(x * .022, y * .022) + .5 * field(x * .057 + 31, y * .057) + .25 * field(x * .14, y * .14 + 82)) / 1.75;
