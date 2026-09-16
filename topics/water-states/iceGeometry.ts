import { clamp } from './model.ts';

/** A directional-growth illustration, not a thermal/phase-field solver.
 * Fixed nuclei compete through arrival time. Their persistent territories meet
 * at grain boundaries; a single arrival-time contour advances through them.
 * Coordinates are a material section, measured down from the moving top.
 */
export const ICE_WIDTH = 300;
export const ICE_HEIGHT = 164 * 1.09;
export type IcePoint = { x: number; z: number };
export type Grain = { id: number; seed: number; speed: number; lateral: number; tilt: number; bend: number };
export const ICE_GRAINS: readonly Grain[] = [
  [16, .990, 1.6, .035, .8], [44, 1.035, 1.4, -.022, -.6],
  [79, .985, 1.9, .015, 1.1], [111, 1.018, 1.6, -.026, -.7],
  [145, 1.000, 1.45, .022, .5], [184, .973, 1.8, .012, -.9],
  [219, 1.035, 1.55, -.024, .7], [253, .987, 1.7, .017, -.6],
  [286, 1.010, 1.4, -.010, .4],
].map(([seed, speed, lateral, tilt, bend], id) => ({ id, seed: seed!, speed: speed!, lateral: lateral!, tilt: tilt!, bend: bend! }));

export function grainAxis(grain: Grain, z: number): number {
  return grain.seed + grain.tilt * z + grain.bend * Math.sin(z / 47);
}
export function arrivalTime(grain: Grain, x: number, z: number): number {
  const across = (x - grainAxis(grain, z)) / grain.lateral;
  // Rounded kinetic front: avoids drawing perfect sawteeth or snowflakes.
  return z / grain.speed + Math.hypot(across, 4.5) - 4.5;
}
export function grainAt(x: number, z: number): number {
  let owner = 0, first = Infinity;
  for (const grain of ICE_GRAINS) {
    const arrival = arrivalTime(grain, x, z);
    if (arrival < first) { first = arrival; owner = grain.id; }
  }
  return owner;
}
/** Adjacent arrival fields are equal here. Parameters keep the boundaries
 * ordered throughout this bounded section; the tests check that contract. */
export function grainBoundary(index: number, z: number): number {
  if (index === 0) return 0;
  if (index === ICE_GRAINS.length) return ICE_WIDTH;
  const a = ICE_GRAINS[index - 1]!, b = ICE_GRAINS[index]!;
  let left = grainAxis(a, z), right = grainAxis(b, z);
  for (let i = 0; i < 36; i++) {
    const x = (left + right) / 2;
    if (arrivalTime(a, x, z) < arrivalTime(b, x, z)) left = x; else right = x;
  }
  return (left + right) / 2;
}
export function grainPolygon(index: number): IcePoint[] {
  const depths = Array.from({ length: 61 }, (_, i) => ICE_HEIGHT * i / 60);
  return [...depths.map(z => ({ x: grainBoundary(index, z), z })),
    ...[...depths].reverse().map(z => ({ x: grainBoundary(index + 1, z), z }))];
}

const COLUMNS = 151;
const ROWS = 181;
// Immutable lookup: only interpolate this field as progress changes. No new
// seeds, re-randomized cracks or grain swapping during a scrub/reversal.
const field = Array.from({ length: COLUMNS }, (_, column) => {
  const x = column * ICE_WIDTH / (COLUMNS - 1);
  return Float64Array.from({ length: ROWS }, (_, row) => {
    const z = row * ICE_HEIGHT / (ROWS - 1);
    return Math.min(...ICE_GRAINS.map(grain => arrivalTime(grain, x, z)));
  });
});
const maxTime = Math.max(...field.map(column => column[ROWS - 1]!));
function depthAt(column: Float64Array, time: number, maximum: number): number {
  if (time <= column[0]!) return 0;
  if (time >= column[ROWS - 1]!) return maximum;
  let lo = 0, hi = ROWS - 1;
  while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (column[mid]! <= time) lo = mid; else hi = mid; }
  const portion = (time - column[lo]!) / (column[hi]! - column[lo]!);
  return Math.min(maximum, ICE_HEIGHT * (lo + portion) / (ROWS - 1));
}
export function sectionArea(front: readonly IcePoint[]): number {
  let area = 0;
  for (let i = 1; i < front.length; i++) area += (front[i]!.x - front[i-1]!.x) * (front[i]!.z + front[i-1]!.z) / 2;
  return area;
}
export function iceSection(iceFraction: number) {
  const fraction = clamp(iceFraction);
  const depth = 164 * (1 - fraction) + ICE_HEIGHT * fraction;
  const wantedArea = ICE_WIDTH * ICE_HEIGHT * fraction;
  let low = 0, high = maxTime;
  // Preserve the existing volume/expansion contract while allowing a faceted,
  // non-flat front. This maps qualitative arrival time to the requested area.
  for (let i = 0; i < 24; i++) {
    const time = (low + high) / 2;
    let sum = 0;
    for (let x = 0; x < COLUMNS; x++) sum += depthAt(field[x]!, time, depth) * (x === 0 || x === COLUMNS - 1 ? .5 : 1);
    if (sum * ICE_WIDTH / (COLUMNS - 1) < wantedArea) low = time; else high = time;
  }
  const time = fraction === 0 ? 0 : fraction === 1 ? maxTime : (low + high) / 2;
  const front = field.map((column, i) => ({ x: i * ICE_WIDTH / (COLUMNS - 1), z: depthAt(column, time, depth) }));
  return { fraction, depth, time, front, area: sectionArea(front) };
}

/** Fixed trapped-air inclusions: separate from crystal grains and molecules. */
function randomSequence(seed: number) {
  let value = seed >>> 0;
  return () => { value = (Math.imul(value, 1664525) + 1013904223) >>> 0; return value / 4294967296; };
}
const random = randomSequence(73109);
export const ICE_BUBBLES = Array.from({ length: 64 }, (_, id) => ({
  id, x: 12 + random() * 276, z: 19 + Math.sqrt(random()) * 151,
  radius: .45 + random() * 1.15, stretch: 1.2 + random() * 2.0,
}));
