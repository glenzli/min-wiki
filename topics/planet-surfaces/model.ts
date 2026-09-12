export const WORLDS = [
  { id: 'mercury', kind: 'rock', color: '#afa494', surface: true, ocean: false },
  { id: 'venus', kind: 'rock', color: '#d2af71', surface: true, ocean: false },
  { id: 'earth', kind: 'rock', color: '#68a2a9', surface: true, ocean: true },
  { id: 'mars', kind: 'rock', color: '#c48057', surface: true, ocean: false },
  { id: 'jupiter', kind: 'gas', color: '#cbb198', surface: false, ocean: false },
  { id: 'neptune', kind: 'ice', color: '#82b4c3', surface: false, ocean: false },
] as const;
export type World = typeof WORLDS[number];
export type WorldId = World['id'];
export function encounter(world: World, progress: number) {
  const p = Math.max(0, Math.min(1, progress));
  if (world.ocean) return p < .38 ? 'air' : p < .78 ? 'water' : 'seabed';
  if (world.surface) return p < .62 ? 'air' : 'ground';
  return p < .42 ? 'clouds' : 'dense-fluid';
}
const hash = (x: number, y: number) => { const h = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return h - Math.floor(h); };
const field = (x: number, y: number) => {
  const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
  const a = hash(ix, iy) * (1 - u) + hash(ix + 1, iy) * u, b = hash(ix, iy + 1) * (1 - u) + hash(ix + 1, iy + 1) * u;
  return (a * (1 - v) + b * v) * 2 - 1;
};
export const noise = (x: number, y: number) => (field(x * .022, y * .022) + .5 * field(x * .057 + 31, y * .057) + .25 * field(x * .14, y * .14 + 82)) / 1.75;
