/** Original hypothetical valley coordinates. None of these distances are measured metres. */
export const LAND_BOUNDS = { halfWidth: 4.6, halfLength: 5.8, base: -.34 } as const;
export const clamp = (value: number, min = 0, max = 1) => Math.max(min, Math.min(max, value));
export const lerp = (a: number, b: number, amount: number) => a + (b - a) * amount;
export function smooth(a: number, b: number, value: number): number {
  const t = clamp((value - a) / (b - a)); return t * t * (3 - 2 * t);
}
function hash(x: number, z: number): number {
  const n = Math.sin(x * 127.1 + z * 311.7 + 37.3) * 43758.5453123; return n - Math.floor(n);
}
export function noise2(x: number, z: number): number {
  const ix = Math.floor(x), iz = Math.floor(z), fx = smooth(0, 1, x - ix), fz = smooth(0, 1, z - iz);
  return lerp(lerp(hash(ix, iz), hash(ix + 1, iz), fx), lerp(hash(ix, iz + 1), hash(ix + 1, iz + 1), fx), fz);
}
export function valleyCenter(z: number): number { return Math.sin(z * .56) * .24 - Math.cos(z * .91) * .11; }
export function valleyWidth(z: number): number { return 1.02 + Math.exp(-Math.pow((z + 3.2) / 1.15, 2)) * .34 - smooth(-.6, 3.8, z) * .12; }
export function valleyBed(z: number): number {
  return .16 + (5.8 - z) * .115 + Math.exp(-Math.pow((z + 1.0) / .95, 2)) * .1;
}
const peaks = [
  [-3.05, -4.5, 3.2, 2.05, 2.5], [2.85, -4.5, 3.6, 2.2, 2.7],
  [-3.1, -1.45, 2.95, 2.2, 2.65], [3.2, -.55, 2.65, 2.0, 2.8],
  [-3.15, 1.65, 2.25, 2.0, 2.55], [3.25, 2.65, 1.7, 2.0, 2.7],
  [-3.3, 4.65, .92, 1.9, 2.1], [3.25, 4.9, .68, 2.0, 2.2],
] as const;

export function terrainHeight(x: number, z: number): number {
  const center = valleyCenter(z), distance = Math.abs(x - center), width = valleyWidth(z);
  const flank = smooth(width * .69, width * 1.65, distance);
  const warp = (noise2(x * .7 + 23, z * .7 - 11) - .5) * .19;
  let summits = .2;
  for (const [index, [px, pz, height, sx, sz]] of peaks.entries()) {
    const dx = (x - px + warp) / sx, dz = (z - pz) / sz, angle = index * .41 + .22;
    const rx = dx * Math.cos(angle) + dz * Math.sin(angle), rz = dz * Math.cos(angle) - dx * Math.sin(angle);
    const r = Math.max(Math.abs(rx) * .93, Math.abs(rz) * .92, Math.abs(rx * .62 + rz * .65));
    summits = Math.max(summits, height * Math.pow(Math.max(0, 1 - r), .8));
  }
  const crest = (x < 0 ? -1 : 1) * (3.12 + (noise2(z * .6 + 17, 4) - .5) * .36);
  const backbone = (.7 + (5.8 - z) * .105 + noise2(z * .75, x < 0 ? 7 : 19) * .3) * Math.exp(-Math.abs(x - crest) * .86);
  summits = Math.max(summits, backbone);
  const ridge = 1 - Math.abs(noise2(x * 2.8, z * 2.1) * 2 - 1);
  const small = noise2(x * 9.1 + 9, z * 6.7 - 2) - .5;
  const fractured = 1 - Math.abs(noise2(x * 5.9 + 11, z * 4.7) * 2 - 1);
  const crags = (ridge * .42 + fractured * .14 + small * .09 - .23) * flank * (.4 + summits * .25);
  const headwall = (1 - smooth(-5.75, -4.35, z)) * Math.max(0, 1 - distance / 3.5) * 1.35;
  let height = valleyBed(z) + .045 * Math.pow(distance / Math.max(width, .1), 2) + flank * (.2 + summits) + headwall + crags;
  // The relief meets its own short cut edge. There is no floating sheet over a separate slab.
  const edge = smooth(4.58, 3.9, Math.abs(x)) * smooth(5.79, 5.2, Math.abs(z));
  height = lerp(.04, height, edge);
  return height;
}

export interface IceShape { mass: number; fraction: number; start: number; end: number; length: number; thickness: number }
export function iceShape(mass: number): IceShape {
  const safe = clamp(Number.isFinite(mass) ? mass : 0, 0, 180), fraction = safe / 180;
  const start = -4.85, end = -1.8 + Math.pow(fraction, .3) * 6.2;
  return { mass: safe, fraction, start, end, length: end - start, thickness: .085 + Math.pow(fraction, .5) * .54 };
}

export function glacierPoint(shape: IceShape, u: number, v: number): { x: number; y: number; z: number; bed: number } {
  const z = lerp(shape.start, shape.end, u) - v * v * smooth(.83, 1, u) * .13;
  const head = .24 + .76 * smooth(0, .14, u);
  const snout = 1 - smooth(.77, 1, u) * .32;
  const width = valleyWidth(z) * (.83 + Math.sqrt(shape.fraction) * .29) * head * snout;
  const x = valleyCenter(z) + v * width;
  const bed = terrainHeight(x, z);
  const dome = Math.pow(Math.max(0, 1 - v * v), .64);
  const longitudinal = (.68 + .32 * Math.sin(u * Math.PI * .82)) * smooth(0, .07, u) * (1 - smooth(.82, 1, u) * .38);
  const ripple = (noise2(x * 10 + 4, z * 12) - .5) * .018 * dome;
  const surface = valleyBed(z) + dome * shape.thickness * longitudinal + .025 + ripple;
  return { x, y: Math.max(bed + .012, surface), z, bed };
}
