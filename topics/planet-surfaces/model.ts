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
export type Layer = 'air' | 'water' | 'seabed' | 'ground' | 'clouds' | 'dense-fluid' | 'hydrocarbon' | 'icy-bed' | 'melt';
export type View = 'landscape' | 'globe' | 'section';
export const clamp = (value: number, low = 0, high = 1) => Number.isFinite(value) ? Math.min(high, Math.max(low, value)) : low;
export const smooth = (low: number, high: number, value: number) => { const p = clamp((value - low) / (high - low)); return p * p * (3 - 2 * p); };
export function layersFor(world: World): Layer[] {
  if (!world.surface) return ['clouds', 'dense-fluid'];
  if (world.liquid === 'water') return ['air', 'water', 'seabed'];
  if (world.liquid === 'hydrocarbon') return ['air', 'hydrocarbon', 'icy-bed'];
  // A magma-ocean depth and base have not been measured for this exoplanet.
  if (world.liquid === 'silicate-melt') return ['air', 'melt'];
  return ['air', 'ground'];
}
export function encounter(world: World, progress: number): Layer {
  const p = clamp(progress);
  if (!world.surface) return p < .42 ? 'clouds' : 'dense-fluid';
  if (world.liquid === 'water') return p < .38 ? 'air' : p < .78 ? 'water' : 'seabed';
  if (world.liquid === 'hydrocarbon') return p < .38 ? 'air' : p < .78 ? 'hydrocarbon' : 'icy-bed';
  if (world.liquid === 'silicate-melt') return p < .38 ? 'air' : 'melt';
  return p < .62 ? 'air' : 'ground';
}
export const SECTION = { top: -182, interface: -34, bed: 145, bottom: 202 };
/** The marker shows layer encounters, not a survivable probe trajectory or a depth scale. */
export function markerY(world: World, progress: number): number {
  const p = clamp(progress), { top, interface: boundary, bed, bottom } = SECTION;
  if (!world.surface) return top + p * (bottom - top);
  if (world.liquid === 'silicate-melt') return p < .38 ? top + p / .38 * (boundary - top) : boundary + (p - .38) / .62 * (bottom - boundary);
  if (world.liquid !== 'none') return p < .38 ? top + p / .38 * (boundary - top) : boundary + clamp((p - .38) / .4) * (bed - boundary);
  return top + clamp(p / .62) * (boundary - top);
}
const hash = (x: number, y: number) => { const h = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return h - Math.floor(h); };
export const field = (x: number, y: number) => {
  const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
  const a = hash(ix, iy) * (1 - u) + hash(ix + 1, iy) * u, b = hash(ix, iy + 1) * (1 - u) + hash(ix + 1, iy + 1) * u;
  return (a * (1 - v) + b * v) * 2 - 1;
};
export const noise = (x: number, y: number) => (field(x * .022, y * .022) + .5 * field(x * .057 + 31, y * .057) + .25 * field(x * .14, y * .14 + 82)) / 1.75;
