import { basinDimensions, calderaState, formationProgress, smooth, terrain, waterFraction, type Settings } from './model.ts';
import { fractureRecess, refineSectionPerimeter, supportRelief, supportSeparation } from './supportGeometry3d.ts';

export type XYZ = [number, number, number];
export type LakeView = 'section' | 'landscape';
export type Buffers = { positions: Float32Array; indices: number[]; uvs: Float32Array; depths?: Float32Array; normals?: Float32Array; samples?: Float32Array; exposedStart?: number; domain?: 'host' | 'mush'; source?: Float32Array; sourceNormals?: Float32Array; affineNormals?: boolean; contacts?: Float64Array; blockIds?: Int16Array; cutaway?: boolean; supportLayer?: number };
export const SCALE = .025;
export const EXTENT = 378 * SCALE;
export const worldY = (y: number) => (118 - y) * SCALE;
export const BOTTOM = worldY(255);
export const LAYERS = 11;
export const ANGLES = 128;
export const RINGS = 72;
export const WATER_RINGS = 20;
export const SECTION_SEGMENTS = 192;
export const PISTON_EDGE = .82, PISTON_UNITS = 4, MUSH_FLOOR = -3.15;
/** Display units, not a measured reservoir depth or a magma-volume solver. */
export const PISTON_TRAVEL = 5.3;
export const pistonDrop = (frame: LakeFrame) => PISTON_TRAVEL * frame.subsidence;
export const pistonBase = (x: number, z = 0) => 2.74 + .20 * Math.sin(x * 1.16 + z * .65 + .4) + .10 * Math.sin(x * 2.7 - z * .95 - .3) + .045 * Math.sin(x * 5.4 + z);
export const mushFloor = (x: number, z = 0) => MUSH_FLOOR + .065 * Math.sin(x * 2.1 + z * 1.3) + .035 * Math.sin(x * 4.9 - z * 3.1);
export const pistonRadius = (angle: number) => basinDimensions('caldera').radius * SCALE * planform(angle) * PISTON_EDGE;
export const seed = (i: number) => (Math.sin(i * 127.1 + 311.7) * 43758.5453 % 1 + 1) % 1;
const dimensionsByKind = { caldera: basinDimensions('caldera'), crater: basinDimensions('crater') };

/** Fixed irregular partitions of this teaching reconstruction, not a claim
 * that real calderas split into a particular number of blocks. */
export const COLLAPSE_BLOCKS = [
  { x: -.25, z: -.10, start: .015, end: .84, travel: 5.30, tx: -.012, tz: .015 },
  { x: -2.4, z: -.25, start: .13, end: .98, travel: 5.23, tx: -.023, tz: -.012 },
  { x: 2.2, z: .25, start: .055, end: .91, travel: 5.27, tx: .021, tz: .014 },
  { x: -1.15, z: -2.4, start: .22, end: 1, travel: 5.24, tx: .016, tz: -.025 },
  { x: 1.7, z: -2.15, start: .09, end: .96, travel: 5.30, tx: -.019, tz: .021 },
  { x: -1.5, z: 2.25, start: .17, end: .95, travel: 5.25, tx: -.018, tz: -.014 },
  { x: 1.45, z: 2.2, start: .26, end: 1, travel: 5.26, tx: .017, tz: -.022 },
] as const;
type XZ = [number, number];
function clipPolygon(poly: XZ[], nx: number, nz: number, bound: number): XZ[] {
  const result: XZ[] = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length], da = nx * a[0] + nz * a[1] - bound, db = nx * b[0] + nz * b[1] - bound;
    if (da <= 1e-9) result.push(a);
    if ((da < 0) !== (db < 0)) { const t = da / (da - db); result.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]); }
  }
  return result.filter((point, i) => !i || Math.hypot(point[0] - result[i - 1][0], point[1] - result[i - 1][1]) > 1e-7);
}
let blockPolygons: XZ[][] | undefined;
export function blockPolygon(id: number, half = false): XZ[] {
  if (!blockPolygons) blockPolygons = COLLAPSE_BLOCKS.map((site, id) => {
    let poly: XZ[] = Array.from({ length: ANGLES }, (_, j) => { const a = j / ANGLES * Math.PI * 2, r = pistonRadius(a); return [Math.cos(a) * r, Math.sin(a) * r]; });
    COLLAPSE_BLOCKS.forEach((other, j) => { if (j !== id) poly = clipPolygon(poly, other.x - site.x, other.z - site.z, (other.x ** 2 + other.z ** 2 - site.x ** 2 - site.z ** 2) / 2); });
    const bent: XZ[] = [];
    for (let i = 0; i < poly.length; i++) {
      const p = poly[i], q = poly[(i + 1) % poly.length], reverse = p[0] > q[0] || p[0] === q[0] && p[1] > q[1];
      const a = reverse ? q : p, b = reverse ? p : q, length = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const outer = Math.abs(Math.hypot(...p) - pistonRadius(Math.atan2(p[1], p[0]))) < .01 && Math.abs(Math.hypot(...q) - pistonRadius(Math.atan2(q[1], q[0]))) < .01;
      const divisions = outer ? 1 : Math.max(3, Math.ceil(length / .32));
      const phase = seed(Math.round((a[0] + b[0]) * 313 + (a[1] + b[1]) * 727)) * Math.PI;
      for (let j = 0; j < divisions; j++) {
        const t = reverse ? 1 - j / divisions : j / divisions, rough = outer ? 0 : Math.sin(Math.PI * t) * Math.sin(Math.PI * 3 * t + phase) * .055;
        bent.push([a[0] + (b[0] - a[0]) * t - (b[1] - a[1]) / length * rough, a[1] + (b[1] - a[1]) * t + (b[0] - a[0]) / length * rough]);
      }
    }
    return bent;
  });
  const poly = blockPolygons[id]; return half ? clipPolygon(poly, 0, 1, 0) : poly;
}
function pointInPolygon(x: number, z: number, poly: XZ[]) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i], b = poly[j]; if ((a[1] > z) !== (b[1] > z) && x < (b[0] - a[0]) * (z - a[1]) / (b[1] - a[1]) + a[0]) inside = !inside;
  }
  return inside;
}
export function blockAt(x: number, z: number) {
  let nearest = 0, distance = Infinity, second = Infinity;
  for (let id = 0; id < COLLAPSE_BLOCKS.length; id++) {
    const block = COLLAPSE_BLOCKS[id], d = (x - block.x) ** 2 + (z - block.z) ** 2;
    if (d < distance) { second = distance; nearest = id; distance = d; } else if (d < second) second = d;
  }
  if (Math.hypot(x, z) >= pistonRadius(Math.atan2(z, x)) - .002 || Math.sqrt(second) - Math.sqrt(distance) > .12) return nearest;
  for (let id = 0; id < COLLAPSE_BLOCKS.length; id++) if (pointInPolygon(x, z, blockPolygon(id))) return id;
  return nearest;
}
// Only the current bounded scalar state is retained. Vertices consume these
// coefficients directly instead of allocating a motion object per vertex.
let motionState = NaN;
const motionCoefficients = new Float64Array(COLLAPSE_BLOCKS.length * 4), failures = new Float64Array(6);
function prepareMotion(frame: LakeFrame) {
  const state = frame.kind === 'caldera' ? frame.subsidence : 0;
  if (state === motionState) return;
  motionState = state;
  for (let id = 0; id < COLLAPSE_BLOCKS.length; id++) {
    const block = COLLAPSE_BLOCKS[id], t = (state - block.start) / (block.end - block.start), at = id * 4;
    // Three bounded slips with intervening rests replace continuous elevator
    // travel. Their timing is illustrative; all still consume subsidence.
    const phase = .23 * smooth(0, .19, t) + .47 * smooth(.31, .56, t) + .30 * smooth(.70, 1, t);
    const inclination = phase + .8 * Math.sin(Math.PI * phase);
    motionCoefficients[at] = phase; motionCoefficients[at + 1] = block.travel * phase;
    motionCoefficients[at + 2] = block.tx * inclination; motionCoefficients[at + 3] = block.tz * inclination;
  }
  for (let id = 0; id < WALL_SITES.length; id++) failures[id] = smooth(WALL_SITES[id].start, Math.min(.995, WALL_SITES[id].start + .17), state);
}
export function blockMotion(id: number, frame: LakeFrame) {
  prepareMotion(frame); const at = id * 4;
  return { phase: motionCoefficients[at], drop: motionCoefficients[at + 1], tx: motionCoefficients[at + 2], tz: motionCoefficients[at + 3] };
}
/** A small affine inclination preserves finite layer thickness and volume.
 * This bounded teaching field is not a rigid-body or rock-fracture solver. */
export function blockOffset(id: number, x: number, z: number, frame: LakeFrame) {
  prepareMotion(frame); const at = id * 4, block = COLLAPSE_BLOCKS[id];
  return -motionCoefficients[at + 1] + motionCoefficients[at + 2] * (x - block.x) + motionCoefficients[at + 3] * (z - block.z);
}
export function roofOffset(x: number, z: number, frame: LakeFrame) {
  const r = Math.hypot(x, z), rim = pistonRadius(Math.atan2(z, x)), scale = r > rim - .006 ? (rim - .006) / r : 1;
  return blockOffset(blockAt(x * scale, z * scale), x, z, frame);
}
export const WALL_SITES = [
  { angle: -3.06, start: .19, width: .16, depth: .53 }, { angle: -2.52, start: .31, width: .215, depth: .44 },
  { angle: -1.94, start: .40, width: .225, depth: .62 }, { angle: -1.25, start: .57, width: .215, depth: .49 },
  { angle: -.61, start: .71, width: .18, depth: .58 }, { angle: -.07, start: .80, width: .16, depth: .51 },
] as const;
const angleDistance = (a: number, b: number) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
export function wallFailure(id: number, frame: LakeFrame) {
  prepareMotion(frame); return failures[id];
}
export function wallScar(x: number, z: number, frame: LakeFrame) {
  const a = Math.atan2(z, x), u = Math.hypot(x, z) / (frame.radius * planform(a));
  return WALL_SITES.reduce((sum, site, id) => sum + site.depth * wallFailure(id, frame) * Math.exp(-((angleDistance(a, site.angle) / site.width) ** 4)) * Math.exp(-(((u - .932) / .05) ** 4)), 0);
}
export function lakeFrame(progress: number, settings: Settings) {
  const p = Math.min(1, Math.max(0, progress));
  const dimensions = dimensionsByKind[settings.basin];
  const fraction = waterFraction(p, settings);
  return {
    p, kind: settings.basin, settings: { ...settings },
    formation: formationProgress(p, settings.basin),
    withdrawal: settings.basin === 'caldera' ? calderaState(p).withdrawal : 0,
    fracture: settings.basin === 'caldera' ? calderaState(p).fracture : 0,
    subsidence: settings.basin === 'caldera' ? calderaState(p).subsidence : 0,
    radius: dimensions.radius * SCALE, fraction,
    waterLevel: worldY(dimensions.floor - dimensions.maxDepth * fraction),
  };
}
export type LakeFrame = ReturnType<typeof lakeFrame>;

/** Stable illustrative planform, shared by terrain, shore, faults and both cameras.
 * It is not a map or a measured bathymetric reconstruction. */
export function planform(angle: number) {
  return 1 + .047 * Math.cos(angle * 3 + .8) + .028 * Math.sin(angle * 5 - .6) + .016 * Math.cos(angle * 7 + 1.4);
}
function baseSurfaceHeight(x: number, z: number, progress: number, kind: Settings['basin']) {
  const r = Math.hypot(x, z), angle = Math.atan2(z, x);
  const profileRadius = r / planform(angle) / SCALE;
  const u = profileRadius / dimensionsByKind[kind].radius;
  // Relief tends to zero at the floor: even a small positive water depth has a
  // connected wet region, while the exposed walls retain fixed rocky detail.
  const amplitude = .052 * Math.min(1, u ** 6) + .21 * smooth(1.06, 1.6, u);
  const relief = amplitude * (.55 * Math.sin(x * 6.3 + z * 4.1) + .3 * Math.sin(x * 13 - z * 7.6) + .15 * Math.cos(z * 20 + x * 9))
    + .13 * smooth(1.12, 1.8, u) * Math.sin(x * .82 + z * .65) * Math.cos(z * 1.3 - x * .44);
  return worldY(terrain(profileRadius, progress, kind)) + relief;
}

const SURFACE_STRIDE = 22;
/** Immutable spatial terms belong to retained vertex buffers. The only
 * changing inputs are seven block motions and six source-region failures. */
function surfaceBasis(samples: Float32Array, stride: number, zAt: number) {
  const basis = new Float64Array(samples.length / stride * SURFACE_STRIDE), radius = dimensionsByKind.caldera.radius * SCALE;
  for (let i = 0, at = 0; i < samples.length; i += stride, at += SURFACE_STRIDE) {
    const x = samples[i], z = samples[i + zAt], a = Math.atan2(z, x), r = Math.hypot(x, z), u = r / (radius * planform(a));
    const rim = pistonRadius(a), scale = r > rim - .006 ? (rim - .006) / r : 1;
    basis[at] = baseSurfaceHeight(x, z, 0, 'caldera'); basis[at + 1] = u; basis[at + 2] = blockAt(x * scale, z * scale);
    basis[at + 3] = .12 * Math.exp(-(((u - .92) / .045) ** 2)) * smooth(.86, .89, u) * (1 - smooth(.98, 1.01, u)) * (.35 + .65 * Math.max(0, Math.cos(a * 3 + .8)) ** 3);
    const retreatBand = smooth(.835, .86, u) * (1 - smooth(.955, .995, u));
    const scarBand = Math.exp(-(((u - .932) / .05) ** 4));
    const talusBand = Math.exp(-(((u - .895) / .06) ** 2)) + .23 * Math.exp(-(((u - .78) / .10) ** 2));
    for (let id = 0; id < WALL_SITES.length; id++) {
      const site = WALL_SITES[id], delta = angleDistance(a, site.angle);
      basis[at + 4 + id] = .045 * Math.exp(-((delta / site.width) ** 4)) * retreatBand;
      basis[at + 10 + id] = site.depth * Math.exp(-((delta / site.width) ** 4)) * scarBand;
      basis[at + 16 + id] = site.depth * 2.6 * Math.exp(-((delta / (site.width * 1.42)) ** 2)) * talusBand;
    }
  }
  return basis;
}
function basisHeight(basis: Float64Array, at: number, x: number, z: number, frame: LakeFrame) {
  if (frame.subsidence === 0) return basis[at];
  let retreat = 0, scar = 0, talus = 0;
  for (let id = 0; id < WALL_SITES.length; id++) {
    const failed = failures[id]; retreat += basis[at + 4 + id] * failed; scar += basis[at + 10 + id] * failed; talus += basis[at + 16 + id] * failed;
  }
  const roof = 1 - smooth(PISTON_EDGE, .985, basis[at + 1] - retreat), id = basis[at + 2], block = COLLAPSE_BLOCKS[id], motion = id * 4;
  const offset = -motionCoefficients[motion + 1] + motionCoefficients[motion + 2] * (x - block.x) + motionCoefficients[motion + 3] * (z - block.z);
  return basis[at] + offset * roof + basis[at + 3] * frame.subsidence - scar + talus;
}
const retainedSurfaceTerms = new WeakMap<Float32Array, Float64Array>();
let sharedHostBasis: Float64Array | undefined, sharedHostHeight: Float64Array | undefined, sharedHostState = NaN;
function hostSurface(samples: Float32Array, frame: LakeFrame) {
  if (!sharedHostBasis || sharedHostBasis.length / SURFACE_STRIDE !== samples.length / 4) {
    sharedHostBasis = surfaceBasis(samples, 4, 1); sharedHostHeight = new Float64Array(samples.length / 4); sharedHostState = NaN;
  }
  if (sharedHostState !== frame.subsidence) {
    prepareMotion(frame); sharedHostState = frame.subsidence;
    for (let i = 0, at = 0; i < samples.length; i += 4, at += SURFACE_STRIDE) sharedHostHeight![i / 4] = basisHeight(sharedHostBasis, at, samples[i], samples[i + 1], frame);
  }
  return sharedHostHeight!;
}

export function surfaceHeight(x: number, z: number, frame: LakeFrame) {
  if (frame.kind !== 'caldera') return baseSurfaceHeight(x, z, frame.p, frame.kind);
  const source = baseSurfaceHeight(x, z, 0, frame.kind);
  if (frame.subsidence === 0) return source;
  const angle = Math.atan2(z, x), u = Math.hypot(x, z) / (frame.radius * planform(angle));
  prepareMotion(frame);
  const retreatBand = smooth(.835, .86, u) * (1 - smooth(.955, .995, u)), scarBand = Math.exp(-(((u - .932) / .05) ** 4));
  const talusBand = Math.exp(-(((u - .895) / .06) ** 2)) + .23 * Math.exp(-(((u - .78) / .10) ** 2));
  let retreat = 0, scar = 0, talus = 0;
  for (let id = 0; id < WALL_SITES.length; id++) {
    if (failures[id] === 0) continue;
    const site = WALL_SITES[id], delta = angleDistance(angle, site.angle), fresh = Math.exp(-((delta / site.width) ** 4)) * failures[id];
    retreat += .045 * fresh * retreatBand; scar += site.depth * fresh * scarBand;
    talus += site.depth * 2.6 * failures[id] * Math.exp(-((delta / (site.width * 1.42)) ** 2)) * talusBand;
  }
  // The central roof is the same finite solid in every frame. Its summit is
  // translated, never interpolated into a second bowl-shaped object.
  const roof = 1 - smooth(PISTON_EDGE, .985, u - retreat);
  const base = source + (roof > 0 ? roofOffset(x, z, frame) * roof : 0);
  const radial = Math.exp(-(((u - .92) / .045) ** 2)) * smooth(.86, .89, u) * (1 - smooth(.98, 1.01, u));
  return base + .12 * frame.subsidence * radial * (.35 + .65 * Math.max(0, Math.cos(angle * 3 + .8)) ** 3) - scar + talus;
}

export function surfaceBuffers(frame: LakeFrame): Buffers {
  const positions = new Float32Array((RINGS + 1) * (ANGLES + 1) * 3);
  const uvs = new Float32Array((RINGS + 1) * (ANGLES + 1) * 2), indices: number[] = [];
  for (let ring = 0; ring <= RINGS; ring++) for (let j = 0; j <= ANGLES; j++) {
    const angle = j / ANGLES * Math.PI * 2, inner = frame.kind === 'caldera' ? pistonRadius(angle) : 0, r = inner + (EXTENT - inner) * (ring / RINGS) ** 1.2;
    const index = ring * (ANGLES + 1) + j;
    positions[index * 3] = Math.cos(angle) * r; positions[index * 3 + 2] = Math.sin(angle) * r;
    uvs[index * 2] = .5 + positions[index * 3] / (EXTENT * 2); uvs[index * 2 + 1] = .5 + positions[index * 3 + 2] / (EXTENT * 2);
    if (ring < RINGS && j < ANGLES) {
      const next = index + ANGLES + 1;
      indices.push(index, index + 1, next, index + 1, next + 1, next);
    }
  }
  updateSurface(positions, frame);
  return { positions, indices, uvs };
}
export function updateSurface(positions: Float32Array, frame: LakeFrame) {
  if (frame.kind !== 'caldera') { for (let i = 0; i < positions.length; i += 3) positions[i + 1] = surfaceHeight(positions[i], positions[i + 2], frame); return; }
  let basis = retainedSurfaceTerms.get(positions);
  if (!basis) { basis = surfaceBasis(positions, 3, 2); retainedSurfaceTerms.set(positions, basis); }
  prepareMotion(frame);
  for (let i = 0, at = 0; i < positions.length; i += 3, at += SURFACE_STRIDE) positions[i + 1] = basisHeight(basis, at, positions[i], positions[i + 2], frame);
}

/** Closed outer side of the same piece of ground. */
export function skirtBuffers(frame: LakeFrame): Buffers {
  const positions = new Float32Array((ANGLES + 1) * 2 * 3), uvs = new Float32Array((ANGLES + 1) * 4), indices: number[] = [];
  for (let i = 0; i <= ANGLES; i++) {
    const a = i / ANGLES * Math.PI * 2, x = Math.cos(a) * EXTENT, z = Math.sin(a) * EXTENT;
    positions.set([x, surfaceHeight(x, z, frame), z, x, BOTTOM, z], i * 6);
    uvs.set([i / ANGLES * 4, 1, i / ANGLES * 4, 0], i * 4);
    if (i < ANGLES) { const k = i * 2; indices.push(k, k + 2, k + 1, k + 2, k + 3, k + 1); }
  }
  return { positions, uvs, indices };
}

/** Exterior continuation of this height field, with no cylinder side or floor
 * underneath it. The near ring exactly shares the existing terrain boundary. */
export function landscapeBuffers(frame: LakeFrame): Buffers {
  const rings = 32, positions = new Float32Array((rings + 1) * (ANGLES + 1) * 3);
  const uvs = new Float32Array((rings + 1) * (ANGLES + 1) * 2), indices: number[] = [];
  for (let ring = 0; ring <= rings; ring++) for (let i = 0; i <= ANGLES; i++) {
    const a = i / ANGLES * Math.PI * 2, r = EXTENT + (ring / rings) ** 1.65 * 90;
    const index = ring * (ANGLES + 1) + i, x = Math.cos(a) * r, z = Math.sin(a) * r;
    positions.set([x, surfaceHeight(x, z, frame), z], index * 3); uvs.set([.5 + x / (EXTENT * 2), .5 + z / (EXTENT * 2)], index * 2);
    if (ring < rings && i < ANGLES) { const next = index + ANGLES + 1; indices.push(index, index + 1, next, index + 1, next + 1, next); }
  }
  return { positions, uvs, indices };
}

/** The geological stack has nested constructional units above the basement.
 * A fault-bounded roof block is displaced; outer-wall slump is a separate band.
 * Geometry is illustrative and does not add a pressure or fracture solver. */
const DEPOSIT_CONTACTS = [1, .86, .71, .56, .42, .29, .18, .08];
const BASEMENT_CONTACTS = [-.74, -1.64, -2.51];
export const SOLID_ACROSS = 96, SOLID_DEPTH = 12, CUT_ROWS = 6;
/** The terrain already draws the shared outer roof. Upper/lower contact faces
 * remain in the closed data but are internal surfaces, so the GPU draws only
 * the exposed cut and outer wall. Coarse internal interpolation must never
 * override the finer terrain at steep caldera walls. */
export const SECTION_EXPOSED_START = SOLID_ACROSS * SOLID_DEPTH * 12;
function sourceHorizon(unit: number, x: number, z: number, kind: Settings['basin']) {
  const original = baseSurfaceHeight(x, z, 0, kind);
  if (unit <= 0) return original;
  if (unit >= LAYERS) return BOTTOM;
  if (unit < DEPOSIT_CONTACTS.length) {
    const g = DEPOSIT_CONTACTS[unit], relief = Math.max(0, original + .28);
    const variation = Math.min(.15, relief * .022) * (.7 * Math.sin(x * 1.4 + z * .9 + unit * .51) + .3 * Math.sin(z * 3.7 - x * 2.1 + unit * .4));
    return -.28 + relief * g + variation * Math.sin(g * Math.PI);
  }
  return BASEMENT_CONTACTS[unit - DEPOSIT_CONTACTS.length]
    + .045 * Math.sin(x * .84 + z * .65 + unit) + .035 * Math.sin(x * 2.3 - z * 1.7);
}
/** Material coordinates of the tracked, finite roof rock. These never depend
 * on progress; moving the whole mesh retains layer thickness and texture. */
export function pistonContact(unit: number, x: number, z = 0) {
  return Math.max(pistonBase(x, z), unit >= PISTON_UNITS ? pistonBase(x, z) : sourceHorizon(unit, x, z, 'caldera'));
}
export function horizon(unit: number, x: number, frame: LakeFrame, z = 0): number {
  const top = surfaceHeight(x, z, frame);
  if (unit <= 0) return top;
  if (unit >= LAYERS) return BOTTOM;
  if (frame.kind === 'caldera' && Math.hypot(x, z) <= pistonRadius(Math.atan2(z, x))) {
    return unit <= PISTON_UNITS ? pistonContact(unit, x, z) + roofOffset(x, z, frame) : mushFloor(x, z);
  }
  return Math.max(BOTTOM, Math.min(top, sourceHorizon(unit, x, z, frame.kind)));
}

export function cutRelief(x: number, _y: number) {
  const edge = Math.max(0, Math.sin((x / EXTENT + 1) * Math.PI / 2));
  // One common observation surface crosses roof, support and outer host. Its
  // source depth is independent of layer thickness, so separately capped
  // strata cannot create an initial vertical join. Failure adds its own cut.
  return (.036 + .012 * Math.sin(x * 2.1 + .4) + .006 * Math.sin(x * 6.3)) * edge;
}
/** Valid normals are recomputed after every deformation, including newly
 * exposed units. Zero-area pinches use +Z rather than propagating zero normals. */
export function updateNormals(data: Buffers) {
  const normals = data.normals ??= new Float32Array(data.positions.length); normals.fill(0);
  const p = data.positions;
  for (let i = 0; i < data.indices.length; i += 3) {
    const a = data.indices[i] * 3, b = data.indices[i + 1] * 3, c = data.indices[i + 2] * 3;
    const ux = p[b] - p[a], uy = p[b + 1] - p[a + 1], uz = p[b + 2] - p[a + 2];
    const vx = p[c] - p[a], vy = p[c + 1] - p[a + 1], vz = p[c + 2] - p[a + 2];
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    normals[a] += nx; normals[a + 1] += ny; normals[a + 2] += nz;
    normals[b] += nx; normals[b + 1] += ny; normals[b + 2] += nz;
    normals[c] += nx; normals[c + 1] += ny; normals[c + 2] += nz;
  }
  for (let i = 0; i < normals.length; i += 3) {
    const length = Math.hypot(normals[i], normals[i + 1], normals[i + 2]);
    if (length > 1e-9) { normals[i] /= length; normals[i + 1] /= length; normals[i + 2] /= length; }
    else { normals[i] = 0; normals[i + 1] = 0; normals[i + 2] = 1; }
  }
}
function outward(data: Buffers) {
  let volume = 0; const p = data.positions;
  for (let i = 0; i < data.indices.length; i += 3) {
    const a = data.indices[i] * 3, b = data.indices[i + 1] * 3, c = data.indices[i + 2] * 3;
    volume += p[a] * (p[b + 1] * p[c + 2] - p[b + 2] * p[c + 1]) + p[a + 1] * (p[b + 2] * p[c] - p[b] * p[c + 2]) + p[a + 2] * (p[b] * p[c + 1] - p[b + 1] * p[c]);
  }
  if (volume < 0) for (let i = 0; i < data.indices.length; i += 3) [data.indices[i + 1], data.indices[i + 2]] = [data.indices[i + 2], data.indices[i + 1]];
  updateNormals(data);
}
/** Closed half-disc units: upper/lower contacts, rough subdivided front, outer
 * wall and finite depth. This replaces the old two-row painted cross section. */
export function sectionBuffers(unit: number, frame: LakeFrame): Buffers {
  if (frame.kind === 'caldera') return hostBuffers(unit, frame);
  const row = SOLID_DEPTH + 1, plane = (SOLID_ACROSS + 1) * row;
  const frontRow = CUT_ROWS + 1, face = (SOLID_ACROSS + 1) * frontRow;
  const positions = new Float32Array((plane * 2 + face * 2) * 3);
  const uvs = new Float32Array(positions.length / 3 * 2), indices: number[] = [];
  const quad = (a: number, b: number, c: number, d: number) => indices.push(a, b, d, b, c, d);
  for (let i = 0; i < SOLID_ACROSS; i++) for (let j = 0; j < SOLID_DEPTH; j++) {
    const a = i * row + j, b = (i + 1) * row + j;
    quad(a, b, b + 1, a + 1); quad(a + plane, a + 1 + plane, b + 1 + plane, b + plane);
  }
  for (let i = 0; i < SOLID_ACROSS; i++) for (let j = 0; j < CUT_ROWS; j++) {
    const a = plane * 2 + i * frontRow + j, b = a + frontRow;
    quad(a, a + 1, b + 1, b); quad(a + face, b + face, b + 1 + face, a + 1 + face);
  }
  const data = { positions, uvs, indices }; updateSection(data, unit, frame); outward(data); return data;
}
export function updateSection(data: Buffers, unit: number, frame: LakeFrame) {
  if (data.domain === 'host') { updateHost(data, unit, frame); return; }
  const row = SOLID_DEPTH + 1, plane = (SOLID_ACROSS + 1) * row;
  const faceRow = CUT_ROWS + 1, face = (SOLID_ACROSS + 1) * faceRow;
  const put = (index: number, x: number, y: number, z: number) => {
    data.positions[index * 3] = x; data.positions[index * 3 + 1] = y; data.positions[index * 3 + 2] = z;
    data.uvs[index * 2] = x * 1.7; data.uvs[index * 2 + 1] = y * 1.7;
  };
  for (let i = 0; i <= SOLID_ACROSS; i++) {
    const x = -EXTENT + i / SOLID_ACROSS * EXTENT * 2, back = -Math.sqrt(Math.max(0, EXTENT ** 2 - x ** 2));
    for (let side = 0; side < 2; side++) for (let j = 0; j <= SOLID_DEPTH; j++) {
      const z = back * j / SOLID_DEPTH, y = horizon(unit + side, x, frame, z);
      const depth = z + (j === SOLID_DEPTH ? 0 : cutRelief(x, y) * Math.exp(-j / SOLID_DEPTH * 18));
      put(side * plane + i * row + j, x, y, depth);
    }
    const upper = horizon(unit, x, frame), lower = horizon(unit + 1, x, frame);
    const backUpper = horizon(unit, x, frame, back), backLower = horizon(unit + 1, x, frame, back);
    for (let j = 0; j <= CUT_ROWS; j++) {
      const u = j / CUT_ROWS;
      const y = upper + (lower - upper) * u;
      put(plane * 2 + i * faceRow + j, x, y, cutRelief(x, y));
      put(plane * 2 + face + i * faceRow + j, x, backUpper + (backLower - backUpper) * u, back);
    }
  }
  updateNormals(data);
}

/** The shore is the intersection of a horizontal plane with the very same bed.
 * No fixed blue disk or independently enlarged ellipse is involved. */
export function shoreRadius(angle: number, frame: LakeFrame) {
  if (frame.fraction <= 0) return 0;
  let lo = 0, hi = frame.radius * planform(angle);
  for (let i = 0; i < 23; i++) {
    const mid = (lo + hi) / 2;
    if (surfaceHeight(Math.cos(angle) * mid, Math.sin(angle) * mid, frame) < frame.waterLevel) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}
export function shoreline(frame: LakeFrame): XYZ[] {
  return Array.from({ length: ANGLES + 1 }, (_, i) => {
    const a = i / ANGLES * Math.PI * 2, r = shoreRadius(a, frame);
    return [Math.cos(a) * r, frame.waterLevel, Math.sin(a) * r];
  });
}
export function waterBuffers(frame: LakeFrame): Buffers {
  const positions = new Float32Array((WATER_RINGS + 1) * (ANGLES + 1) * 3), depths = new Float32Array((WATER_RINGS + 1) * (ANGLES + 1));
  const uvs = new Float32Array(depths.length * 2), indices: number[] = [];
  for (let ring = 0; ring <= WATER_RINGS; ring++) for (let j = 0; j <= ANGLES; j++) {
    const k = ring * (ANGLES + 1) + j;
    uvs.set([j / ANGLES, ring / WATER_RINGS], k * 2);
    if (ring < WATER_RINGS && j < ANGLES) { const next = k + ANGLES + 1; indices.push(k, k + 1, next, k + 1, next + 1, next); }
  }
  updateWater(positions, depths, frame);
  return { positions, depths, uvs, indices };
}
/** Local XY coordinates match Reflector's plane. Rotation -π/2 maps them to XZ. */
export function updateWater(positions: Float32Array, depths: Float32Array, frame: LakeFrame, edge = shoreline(frame)) {
  for (let ring = 0; ring <= WATER_RINGS; ring++) for (let j = 0; j <= ANGLES; j++) {
    const index = ring * (ANGLES + 1) + j, u = ring / WATER_RINGS;
    const x = edge[j][0] * u, z = edge[j][2] * u;
    positions[index * 3] = x; positions[index * 3 + 1] = -z; positions[index * 3 + 2] = 0;
    depths[index] = Math.max(0, frame.waterLevel - surfaceHeight(x, z, frame));
  }
}

/** Vertical water section shows the stored volume above the submerged bed. */
export function waterSectionBuffers(frame: LakeFrame): Buffers {
  const positions = new Float32Array((SECTION_SEGMENTS + 1) * 6), uvs = new Float32Array((SECTION_SEGMENTS + 1) * 4);
  const depths = new Float32Array((SECTION_SEGMENTS + 1) * 2), indices: number[] = [];
  for (let i = 0; i <= SECTION_SEGMENTS; i++) {
    uvs.set([i / SECTION_SEGMENTS, 0, i / SECTION_SEGMENTS, 1], i * 4);
    if (i < SECTION_SEGMENTS) { const k = i * 2; indices.push(k, k + 1, k + 2, k + 2, k + 1, k + 3); }
  }
  updateWaterSection(positions, depths, frame);
  return { positions, depths, uvs, indices };
}
export function updateWaterSection(positions: Float32Array, depths: Float32Array, frame: LakeFrame, edge?: XYZ[]) {
  const left = edge ? edge[ANGLES / 2][0] : -shoreRadius(Math.PI, frame), right = edge ? edge[0][0] : shoreRadius(0, frame);
  for (let i = 0; i <= SECTION_SEGMENTS; i++) {
    const x = left + (right - left) * i / SECTION_SEGMENTS;
    const bed = Math.min(frame.waterLevel, surfaceHeight(x, 0, frame));
    positions[i * 6] = x; positions[i * 6 + 1] = frame.waterLevel; positions[i * 6 + 2] = .025;
    positions[i * 6 + 3] = x; positions[i * 6 + 4] = bed; positions[i * 6 + 5] = .025;
    depths[i * 2] = 0; depths[i * 2 + 1] = frame.waterLevel - bed;
  }
}

export function faultPath(side: -1 | 1, frame: LakeFrame): XYZ[] {
  const radius = frame.radius * planform(side > 0 ? 0 : Math.PI), x = side * radius * .82;
  const top = baseSurfaceHeight(x, 0, 0, 'caldera') + .025;
  const base = pistonBase(x) + roofOffset(x, 0, frame) - .10;
  return Array.from({ length: 7 }, (_, i) => {
    const u = i / 6, xx = x + side * Math.sin(i * 2.1) * .018 * frame.fracture;
    const y = top + (base - top) * u;
    return [xx, y, cutRelief(xx, y) + .035 - faultCutDepth(xx, y, frame)];
  });
}

/** The cut removes a little extra foreground material along the actual
 * ring-fault contact so the viewer can see a lip, sidewall and recessed floor.
 * It changes this observation surface, never the whole-lake rock footprint. */
export function faultCutDepth(x: number, y: number, frame: LakeFrame) {
  if (frame.kind !== 'caldera' || frame.fracture === 0) return 0;
  const side = x < 0 ? -1 : 1, edge = side * pistonRadius(side < 0 ? Math.PI : 0);
  if (Math.abs(x - edge) > .24) return 0;
  const upper = baseSurfaceHeight(edge, 0, 0, 'caldera'), lower = pistonBase(edge) + roofOffset(edge, 0, frame);
  return fractureRecess(x - edge, y, upper, lower, frame.fracture);
}
export function withdrawalPath(frame: LakeFrame): XYZ[] {
  return [[2.8, -2.68, 0], [3.75, -2.62, 0], [5.15, -2.15, 0], [6.5, -1.74, 0], [8.7, -1.55, 0]];
}

function samplePath(points: XYZ[], t: number): XYZ {
  const at = Math.max(0, Math.min(1, t)) * (points.length - 1), i = Math.min(points.length - 2, Math.floor(at)), f = at - i;
  return points[i].map((value, axis) => value + (points[i + 1][axis] - value) * f) as XYZ;
}
/** Finite, wrinkled intrusive sheet. Its retained volume is shown through the
 * removed foreground host, rather than projected as a painted pipe or line. */
export function intrusionBuffers(frame: LakeFrame): Buffers {
  const segments = 72, sides = 8, points = withdrawalPath(frame), p: number[] = [], uv: number[] = [], indices: number[] = [];
  for (let i = 0; i <= segments; i++) {
    const u = i / segments, center = samplePath(points, u), a = samplePath(points, Math.max(0, u - .002)), b = samplePath(points, Math.min(1, u + .002));
    const length = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, nx = -(b[1] - a[1]) / length, ny = (b[0] - a[0]) / length;
    for (let j = 0; j < sides; j++) {
      const angle = (j + .5) / sides * Math.PI * 2, z = Math.sin(angle) * (Math.sin(angle) > 0 ? .065 : .69 - u * .25);
      const edge = Math.sign(Math.cos(angle)) * (.125 - u * .073) * (.76 + seed(i + j * 71) * .43);
      const fold = Math.sin(u * 19 + z * 5.3) * .065 * Math.sin(Math.PI * u);
      p.push(center[0] + nx * (edge + fold), center[1] + ny * (edge + fold), center[2] + z); uv.push(u * 5, j / sides);
      if (i < segments) { const a = i * sides + j, b = i * sides + (j + 1) % sides; indices.push(a, b, a + sides, b, b + sides, a + sides); }
    }
  }
  for (const end of [0, segments]) {
    const center = p.length / 3, base = end * sides, point = [0, 0, 0];
    for (let j = 0; j < sides; j++) for (let axis = 0; axis < 3; axis++) point[axis] += p[(base + j) * 3 + axis] / sides;
    p.push(...point); uv.push(end / segments, .5);
    for (let j = 0; j < sides; j++) indices.push(center, ...(end === 0 ? [base + (j + 1) % sides, base + j] : [base + j, base + (j + 1) % sides]));
  }
  const data = { positions: new Float32Array(p), uvs: new Float32Array(uv), indices }; outward(data); return data;
}

/** A finite broken-rock floor behind the recessed fault lips. It does not
 * continue through the basement or replace the reservoir with an empty cave. */
export function faultBuffers(side: -1 | 1, frame: LakeFrame): Buffers {
  const segments = 48, sides = 6, positions = new Float32Array(((segments + 1) * sides + 2) * 3), uvs = new Float32Array(positions.length / 3 * 2), indices: number[] = [];
  for (let i = 0; i < segments; i++) for (let j = 0; j < sides; j++) {
    const a = i * sides + j, b = i * sides + (j + 1) % sides; indices.push(a, b, a + sides, b, b + sides, a + sides);
  }
  for (const end of [0, segments]) {
    const center = (segments + 1) * sides + (end === 0 ? 0 : 1), base = end * sides;
    for (let j = 0; j < sides; j++) indices.push(center, ...(end === 0 ? [base + (j + 1) % sides, base + j] : [base + j, base + (j + 1) % sides]));
  }
  const data = { positions, uvs, indices }; updateFault(data, side, frame); outward(data); return data;
}
export function updateFault(data: Buffers, side: -1 | 1, frame: LakeFrame) {
  const segments = 48, sides = 6, path = faultPath(side, frame), section = [[-1, 1], [1, 1], [1.15, .45], [.8, -1], [-.8, -1], [-1.15, .45]];
  for (let i = 0; i <= segments; i++) {
    const u = i / segments, point = samplePath(path, u);
    const width = (.024 + frame.fracture * .026 + frame.subsidence * .085) * (.74 + seed(i + 381) * .5);
    for (let j = 0; j < sides; j++) {
      const x = point[0] + section[j][0] * width, sourceY = point[1] + Math.sin(i * 2.3 + j) * width * .14;
      const front = cutRelief(x, sourceY) + .032 - faultCutDepth(x, sourceY, frame), z = front - (1 - section[j][1]) * .82;
      const y = Math.min(sourceY, surfaceHeight(x, z, frame) - .025);
      data.positions.set([x, y, z], (i * sides + j) * 3); data.uvs.set([x * 3, y * 3], (i * sides + j) * 2);
    }
  }
  for (const end of [0, segments]) {
    const center = (segments + 1) * sides + (end === 0 ? 0 : 1), base = end * sides, p = [0, 0, 0];
    for (let j = 0; j < sides; j++) for (let axis = 0; axis < 3; axis++) p[axis] += data.positions[(base + j) * 3 + axis] / sides;
    p[1] = Math.min(p[1], surfaceHeight(p[0], p[2], frame) - .025);
    data.positions.set(p, center * 3); data.uvs.set([0, end / segments], center * 2);
  }
  updateNormals(data);
}

/** A closed half-annulus/disk with one retained material-coordinate template.
 * Fine terrain owns the exposed roof. Internal contact grids remain closed
 * data but cannot replace it with coarse triangles (the previous rim fix). */
const BODY_ANGLES = 96, BODY_RADIAL = 18, BODY_ROWS = 6;
function bodyBuffers(inner: (a: number) => number, outer: (a: number) => number,
  upper: (x: number, z: number) => number, lower: (x: number, z: number) => number,
  relief: (x: number, y: number, z: number, t: number) => number): Buffers {
  const samples: number[] = [], indices: number[] = [], radial = BODY_RADIAL + 1;
  const put = (a: number, r: number, t: number) => {
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    samples.push(x, Math.abs(z) < 1e-8 ? 0 : z, t, Math.abs(z) < 1e-8 ? 1 : 0); return samples.length / 4 - 1;
  };
  const quad = (a: number, b: number, c: number, d: number) => indices.push(a, b, d, b, c, d);
  const plane = (BODY_ANGLES + 1) * radial;
  for (let side = 0; side < 2; side++) for (let i = 0; i <= BODY_ANGLES; i++) {
    const a = Math.PI + i / BODY_ANGLES * Math.PI, lo = inner(a), hi = outer(a);
    for (let j = 0; j <= BODY_RADIAL; j++) put(a, lo + (hi - lo) * j / BODY_RADIAL, side);
  }
  for (let i = 0; i < BODY_ANGLES; i++) for (let j = 0; j < BODY_RADIAL; j++) {
    const a = i * radial + j, b = a + radial;
    quad(a, b, b + 1, a + 1); quad(a + plane, a + 1 + plane, b + 1 + plane, b + plane);
  }
  const exposedStart = indices.length;
  // Inner, outer, left cut, right cut; every perimeter has finite depth.
  for (let edge = 0; edge < 4; edge++) {
    const count = edge < 2 ? BODY_ANGLES : BODY_RADIAL, base = samples.length / 4;
    for (let i = 0; i <= count; i++) {
      const a = edge < 2 ? Math.PI + i / count * Math.PI : edge === 2 ? Math.PI : Math.PI * 2;
      const r = edge < 2 ? (edge === 0 ? inner(a) : outer(a)) : inner(a) + (outer(a) - inner(a)) * i / count;
      for (let j = 0; j <= BODY_ROWS; j++) put(a, r, j / BODY_ROWS);
    }
    for (let i = 0; i < count; i++) for (let j = 0; j < BODY_ROWS; j++) {
      const a = base + i * (BODY_ROWS + 1) + j, b = a + BODY_ROWS + 1;
      if (edge === 0 || edge === 3) quad(a, a + 1, b + 1, b); else quad(a, b, b + 1, a + 1);
    }
  }
  const data: Buffers = { positions: new Float32Array(samples.length / 4 * 3), uvs: new Float32Array(samples.length / 2), indices, samples: new Float32Array(samples), exposedStart };
  updateBody(data, upper, lower, relief); outward(data); return data;
}
function updateBody(data: Buffers, upper: (x: number, z: number) => number,
  lower: (x: number, z: number) => number, relief: (x: number, y: number, z: number, t: number) => number) {
  const samples = data.samples!;
  for (let i = 0; i < samples.length; i += 4) {
    const x = samples[i], z = samples[i + 1], t = samples[i + 2];
    const top = upper(x, z), bottom = lower(x, z), y = top + (bottom - top) * t, index = i / 4;
    data.positions[index * 3] = x; data.positions[index * 3 + 1] = y; data.positions[index * 3 + 2] = z + (samples[i + 3] ? relief(x, y, z, t) : 0);
    data.uvs[index * 2] = x * 1.7; data.uvs[index * 2 + 1] = y * 1.7;
  }
  updateNormals(data);
}
const coreRelief = cutRelief;
function hostBuffers(unit: number, frame: LakeFrame) {
  const contact = (k: number, x: number, z: number) => Math.max(BOTTOM, Math.min(surfaceHeight(x, z, frame), sourceHorizon(k, x, z, 'caldera')));
  const data = bodyBuffers(pistonRadius, () => EXTENT,
    (x, z) => contact(unit, x, z), (x, z) => contact(unit + 1, x, z),
    cutRelief);
  data.domain = 'host'; updateHost(data, unit, frame); return data;
}
function updateHost(data: Buffers, unit: number, frame: LakeFrame) {
  const samples = data.samples!, heights = hostSurface(samples, frame);
  if (!data.contacts) {
    data.contacts = new Float64Array(samples.length / 2);
    for (let i = 0; i < samples.length; i += 4) {
      data.contacts[i / 2] = sourceHorizon(unit, samples[i], samples[i + 1], 'caldera');
      data.contacts[i / 2 + 1] = sourceHorizon(unit + 1, samples[i], samples[i + 1], 'caldera');
    }
  }
  for (let i = 0; i < samples.length; i += 4) {
    const at = i / 4, x = samples[i], z = samples[i + 1], top = Math.max(BOTTOM, Math.min(heights[at], data.contacts[at * 2]));
    const bottom = Math.max(BOTTOM, Math.min(heights[at], data.contacts[at * 2 + 1])), y = top + (bottom - top) * samples[i + 2];
    data.positions[at * 3] = x; data.positions[at * 3 + 1] = y;
    const observedY = data.positions[at * 3 + 1];
    data.positions[at * 3 + 2] = z + (samples[i + 3] ? cutRelief(x, observedY) - faultCutDepth(x, observedY, frame) : 0);
    data.uvs[at * 2] = x * 1.7; data.uvs[at * 2 + 1] = y * 1.7;
  }
  updateNormals(data);
}
/** The central host is explicitly absent above this basement. Piston and mush
 * occupy that domain with shared contacts; there is no intact rock painted
 * behind the reservoir and no open, black chamber. */
export function basementBuffers(): Buffers {
  return bodyBuffers(() => 0, pistonRadius, mushFloor, () => BOTTOM, coreRelief);
}
function prunePinchedTriangles(data: Buffers) {
  const p = data.positions, key = (id: number) => [...p.slice(id * 3, id * 3 + 3)].map(value => Math.round(value * 1e5)).join(',');
  const groups = new Map<string, number[]>();
  for (let i = 0; i < data.indices.length; i += 3) {
    const t = data.indices.slice(i, i + 3), [a, b, c] = t.map(id => id * 3);
    const ux = p[b] - p[a], uy = p[b + 1] - p[a + 1], uz = p[b + 2] - p[a + 2], vx = p[c] - p[a], vy = p[c + 1] - p[a + 1], vz = p[c + 2] - p[a + 2];
    if (Math.hypot(uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx) < 1e-10) continue;
    const hash = t.map(key).sort().join('|'), prior = groups.get(hash); if (prior) prior.push(...t); else groups.set(hash, t);
  }
  data.indices = [...groups.values()].filter(triangle => triangle.length === 3).flat();
}
/** Closed irregular fault-block units with a separately capped teaching cut.
 * Each block owns stable source vertices; no grid of rectangular slices. */
function polygonBody(poly: XZ[], upper: (x: number, z: number) => number, lower: (x: number, z: number) => number, id: number): Buffers {
  if (poly.length < 3) return { positions: new Float32Array(), uvs: new Float32Array(), indices: [], samples: new Float32Array(), source: new Float32Array(), blockIds: new Int16Array() };
  poly = refineSectionPerimeter(poly);
  const samples: number[] = [], indices: number[] = [], rings = 5, rows = 6, n = poly.length;
  const center = poly.reduce((sum, point) => [sum[0] + point[0] / n, sum[1] + point[1] / n] as XZ, [0, 0] as XZ);
  const put = (x: number, z: number, t: number) => { samples.push(x, Math.abs(z) < 1e-7 ? 0 : z, t, Math.abs(z) < 1e-7 ? 1 : 0); return samples.length / 4 - 1; };
  const capVertices = 1 + rings * n;
  for (let side = 0; side < 2; side++) {
    const base = samples.length / 4; put(...center, side);
    for (let ring = 1; ring <= rings; ring++) for (const point of poly) put(center[0] + (point[0] - center[0]) * ring / rings, center[1] + (point[1] - center[1]) * ring / rings, side);
    for (let j = 0; j < n; j++) indices.push(base, base + 1 + j, base + 1 + (j + 1) % n);
    for (let ring = 1; ring < rings; ring++) for (let j = 0; j < n; j++) {
      const a = base + 1 + (ring - 1) * n + j, b = base + 1 + (ring - 1) * n + (j + 1) % n;
      indices.push(a, a + n, b, b, a + n, b + n);
    }
    if (side === 1) for (let k = indices.length - (n * 3 + (rings - 1) * n * 6); k < indices.length; k += 3) [indices[k + 1], indices[k + 2]] = [indices[k + 2], indices[k + 1]];
  }
  for (let j = 0; j < n; j++) {
    const a = poly[j], b = poly[(j + 1) % n], base = samples.length / 4;
    for (const point of [a, b]) for (let row = 0; row <= rows; row++) put(...point, row / rows);
    for (let row = 0; row < rows; row++) { const i = base + row; indices.push(i, i + 1, i + rows + 1, i + 1, i + rows + 2, i + rows + 1); }
  }
  const data: Buffers = { positions: new Float32Array(samples.length / 4 * 3), uvs: new Float32Array(samples.length / 2), samples: new Float32Array(samples), indices, blockIds: new Int16Array(samples.length / 4).fill(id) };
  updateBody(data, upper, lower, coreRelief); prunePinchedTriangles(data); outward(data); data.source = data.positions.slice(); data.sourceNormals = data.normals!.slice(); return data;
}
function combineBodies(parts: Buffers[]): Buffers {
  const count = parts.reduce((sum, part) => sum + part.positions.length / 3, 0), indices: number[] = [];
  const data: Buffers = { positions: new Float32Array(count * 3), uvs: new Float32Array(count * 2), normals: new Float32Array(count * 3), samples: new Float32Array(count * 4), blockIds: new Int16Array(count), indices };
  let at = 0;
  for (const part of parts) { data.positions.set(part.positions, at * 3); data.uvs.set(part.uvs, at * 2); data.normals!.set(part.normals ?? [], at * 3); data.samples!.set(part.samples!, at * 4); data.blockIds!.set(part.blockIds!, at); indices.push(...part.indices.map(i => i + at)); at += part.positions.length / 3; }
  data.source = data.positions.slice(); data.sourceNormals = data.normals!.slice(); return data;
}
export function blockBuffers(unit: number, id: number, half = true): Buffers {
  const data = polygonBody(blockPolygon(id, half), (x, z) => pistonContact(unit, x, z), (x, z) => pistonContact(unit + 1, x, z), id);
  data.cutaway = half; return data;
}
export function pistonBuffers(unit: number): Buffers {
  return combineBodies(COLLAPSE_BLOCKS.map((_, id) => blockBuffers(unit, id)));
}
export function updateBlocks(data: Buffers, frame: LakeFrame) {
  const source = data.source!; if (!source.length) return;
  const sourceNormals = data.sourceNormals ??= data.normals!.slice(), normals = data.normals!; prepareMotion(frame);
  if (data.affineNormals === undefined) {
    data.affineNormals = true;
    for (let i = 0; i < source.length; i += 3) if (Math.abs(source[i + 2] - data.samples![i / 3 * 4 + 1]) > 1e-7) { data.affineNormals = false; break; }
  }
  for (let i = 0; i < source.length; i += 3) {
    const id = data.blockIds![i / 3], block = COLLAPSE_BLOCKS[id], at = id * 4, x = data.samples![i / 3 * 4], z = data.samples![i / 3 * 4 + 1];
    const tx = motionCoefficients[at + 2], tz = motionCoefficients[at + 3];
    data.positions[i] = source[i]; data.positions[i + 1] = source[i + 1] - motionCoefficients[at + 1] + tx * (x - block.x) + tz * (z - block.z);
    data.positions[i + 2] = source[i + 2] - (data.cutaway && data.samples![i / 3 * 4 + 3] ? faultCutDepth(x, data.positions[i + 1], frame) : 0);
    if (data.affineNormals) {
      const nx = sourceNormals[i] - tx * sourceNormals[i + 1], ny = sourceNormals[i + 1], nz = sourceNormals[i + 2] - tz * sourceNormals[i + 1], length = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
      normals[i] = nx / length; normals[i + 1] = ny / length; normals[i + 2] = nz / length;
    }
  }
  // The rough cut uses material-space z rather than displaced face relief;
  // retain its numerical normals instead of treating that face as affine.
  if (!data.affineNormals || data.cutaway) updateNormals(data);
}
/** Fracture-only frames change the observation cut without translating the
 * rock or recomputing terrain/contact fields. Repeated input stays gated by
 * the renderer, and a later geology update rewrites this same bounded buffer. */
export function updateFaultCut(data: Buffers, frame: LakeFrame) {
  const samples = data.samples;
  if (!samples || !(data.cutaway || data.domain === 'host')) return;
  for (let i = 0; i < samples.length; i += 4) {
    if (!samples[i + 3]) continue;
    const x = samples[i], at = i / 4 * 3, y = data.positions[at + 1];
    const original = data.source ? data.source[at + 2] : cutRelief(x, y);
    data.positions[at + 2] = original - faultCutDepth(x, y, frame);
  }
  updateNormals(data);
}
export function storageDistance(x: number, y: number, z: number, frame?: LakeFrame) {
  const upper = supportContact(x, z, frame), lower = mushFloor(x, z);
  return Math.max(Math.hypot(x, z) - pistonRadius(Math.atan2(z, x)), y - upper, lower - y);
}
/** Local openings retain finite depth and end against support material. The
 * support remainder follows the same block contacts everywhere else. */
export function supportContact(x: number, z: number, frame?: LakeFrame) {
  if (!frame || frame.kind !== 'caldera') return pistonBase(x, z);
  const id = blockAt(x, z), motion = blockMotion(id, frame);
  return pistonBase(x, z) + blockOffset(id, x, z, frame) - supportSeparation(supportRelief(x, z), frame.withdrawal, motion.phase);
}
/** Adjacent support regions retain crystalline framework and residual melt.
 * Three enlarged local separations close as their own roof blocks settle. */
export function storageCellBuffers(id: number, frame: LakeFrame): Buffers {
  const data = polygonBody(blockPolygon(id, true), pistonBase, mushFloor, id); updateStorage(data, frame); return data;
}
export function storageBuffers(frame = lakeFrame(0, { basin: 'caldera', supply: .75, leak: 'low' })): Buffers {
  const data = combineBodies(COLLAPSE_BLOCKS.map((_, id) => storageCellBuffers(id, frame))); data.domain = 'mush'; return data;
}
/** The support below the finite roof retains the very same source contacts as
 * the outer host. Clipping splits a source stratum at the roof base without
 * replacing it with a separately colored rectangular reservoir wall. */
export function supportLayerContact(unit: number, x: number, z = 0) {
  return Math.max(mushFloor(x, z), Math.min(pistonBase(x, z), sourceHorizon(unit, x, z, 'caldera')));
}
function compactBody(data: Buffers) {
  const used = [...new Set(data.indices)].sort((a, b) => a - b), remap = new Int32Array(data.positions.length / 3).fill(-1);
  used.forEach((old, index) => { remap[old] = index; });
  const pick = (source: Float32Array | undefined, stride: number) => {
    if (!source) return undefined;
    const target = new Float32Array(used.length * stride);
    used.forEach((old, index) => { for (let j = 0; j < stride; j++) target[index * stride + j] = source[old * stride + j]; });
    return target;
  };
  data.positions = pick(data.positions, 3)!; data.uvs = pick(data.uvs, 2)!; data.normals = pick(data.normals, 3);
  data.samples = pick(data.samples, 4); data.source = pick(data.source, 3); data.sourceNormals = pick(data.sourceNormals, 3);
  data.blockIds = new Int16Array(used.map(old => data.blockIds![old]));
  data.indices = data.indices.map(old => remap[old]); return data;
}
export function storageLayerBuffers(unit: number, frame: LakeFrame): Buffers {
  const parts = COLLAPSE_BLOCKS.map((_, id) => polygonBody(blockPolygon(id, true),
    (x, z) => supportLayerContact(unit, x, z), (x, z) => supportLayerContact(unit + 1, x, z), id));
  const data = compactBody(combineBodies(parts)); data.domain = 'mush'; data.supportLayer = unit;
  updateStorage(data, frame); return data;
}
export function updateStorage(data: Buffers, frame: LakeFrame) {
  const samples = data.samples!;
  if (!data.contacts) {
    data.contacts = new Float64Array(samples.length / 4 * 5);
    for (let i = 0; i < samples.length; i += 4) {
      const x = samples[i], z = samples[i + 1], upper = pistonBase(x, z), lower = mushFloor(x, z), at = i / 4 * 5;
      const weight = data.supportLayer === undefined ? 1 - samples[i + 2] : Math.max(0, Math.min(1, (data.source![i / 4 * 3 + 1] - lower) / (upper - lower)));
      data.contacts[at] = upper; data.contacts[at + 1] = lower;
      data.contacts[at + 2] = samples[i + 3] ? coreRelief(x, lower + (upper - lower) * weight) : 0;
      data.contacts[at + 3] = supportRelief(x, z);
      data.contacts[at + 4] = weight;
    }
  }
  prepareMotion(frame);
  for (let i = 0; i < samples.length; i += 4) {
    const x = samples[i], z = samples[i + 1], t = samples[i + 2], id = data.blockIds![i / 4], offset = blockOffset(id, x, z, frame);
    const contact = i / 4 * 5, gap = supportSeparation(data.contacts[contact + 3], frame.kind === 'caldera' ? frame.withdrawal : 0, motionCoefficients[id * 4]);
    const index = i / 4, at = index * 3, upper = data.contacts[contact] + offset - gap, lower = data.contacts[contact + 1], y = lower + (upper - lower) * data.contacts[contact + 4];
    data.positions[at] = x; data.positions[at + 1] = y; data.positions[at + 2] = z + data.contacts[contact + 2];
    if (data.supportLayer === undefined) { data.uvs[index * 2] = x * 1.7; data.uvs[index * 2 + 1] = y * 1.7; }
  }
  updateNormals(data);
}
/** Talus is a second material on top of the tracked rock, not deformation of
 * the source block. The same site failures drive scars, clasts and deposits. */
export function depositBuffers(frame: LakeFrame, half = true): Buffers {
  const data = combineBodies(COLLAPSE_BLOCKS.map((_, id) => polygonBody(blockPolygon(id, half), (x, z) => pistonContact(0, x, z) + .1, (x, z) => pistonContact(0, x, z), id)));
  data.depths = new Float32Array(data.positions.length / 3); updateDeposit(data, frame); return data;
}
export function updateDeposit(data: Buffers, frame: LakeFrame) {
  if (!data.contacts) {
    data.contacts = new Float64Array(data.samples!.length / 4 * 8);
    for (let i = 0; i < data.samples!.length; i += 4) {
      const x = data.samples![i], z = data.samples![i + 1], at = i / 4 * 8, a = Math.atan2(z, x), u = Math.hypot(x, z) / (frame.radius * planform(a));
      data.contacts[at] = pistonContact(0, x, z); data.contacts[at + 1] = data.samples![i + 3] ? coreRelief(x, data.contacts[at]) : 0;
      for (let id = 0; id < WALL_SITES.length; id++) {
        const site = WALL_SITES[id]; data.contacts[at + 2 + id] = site.depth * 2.6 * Math.exp(-((angleDistance(a, site.angle) / (site.width * 1.42)) ** 2)) * (Math.exp(-(((u - .895) / .06) ** 2)) + .23 * Math.exp(-(((u - .78) / .10) ** 2)));
      }
    }
  }
  prepareMotion(frame);
  for (let i = 0; i < data.samples!.length; i += 4) {
    const x = data.samples![i], z = data.samples![i + 1], t = data.samples![i + 2], id = data.blockIds![i / 4];
    const at = i / 4 * 8; let talus = 0; for (let site = 0; site < WALL_SITES.length; site++) talus += data.contacts[at + 2 + site] * failures[site];
    const base = data.contacts[at] + blockOffset(id, x, z, frame), y = base + talus * (1 - t), position = i / 4 * 3;
    data.positions[position] = x; data.positions[position + 1] = y; data.positions[position + 2] = z + data.contacts[at + 1]; data.depths![i / 4] = talus * (1 - t);
  }
  updateNormals(data);
}
/** Original material traces and their displaced copies share vertices. */
export function pistonTrace(unit: number, frame: LakeFrame, original = false): XYZ[] {
  const left = pistonRadius(Math.PI), right = pistonRadius(0), drop = original ? 0 : pistonDrop(frame);
  return Array.from({ length: 97 }, (_, i) => {
    const x = -left + (left + right) * i / 96, source = pistonContact(unit, x);
    return [x, source + (original ? 0 : roofOffset(x, 0, frame)), coreRelief(x, source) + .022];
  });
}
export function pistonTracks(frame: LakeFrame): XYZ[] {
  return [-.53, .46].flatMap(fraction => {
    const x = fraction * frame.radius, y = pistonContact(2, x), z = coreRelief(x, y) + .04;
    return [[x, y, z], [x, y + roofOffset(x, 0, frame), z]] as XYZ[];
  });
}

/** Camera fitting uses the actual stage aspect. These are framing samples, not
 * model bounds or additional geology. User orbiting disables automatic refit. */
export function cameraPose(frame: LakeFrame, view: LakeView, aspect: number) {
  const section = view === 'section';
  // One geological reference frame keeps the former roof in view throughout
  // piston descent. Refitting to only the lowered surface hides its origin.
  const framingFrame = section && frame.kind === 'caldera' ? lakeFrame(0, frame.settings) : frame;
  const radius = section ? EXTENT : Math.min(EXTENT, frame.radius * 1.65);
  const direction: XYZ = section ? [.08, .22, 1] : [.15, aspect > 1.8 ? .38 : .72, 1];
  const length = Math.hypot(...direction); direction.forEach((_, i) => direction[i] /= length);
  const right: XYZ = [direction[2], 0, -direction[0]], rightLength = Math.hypot(...right); right.forEach((_, i) => right[i] /= rightLength);
  const up: XYZ = [direction[1] * right[2], direction[2] * right[0] - direction[0] * right[2], -direction[1] * right[0]];
  const points: XYZ[] = [];
  for (let ring = 0; ring <= 6; ring++) for (let i = 0; i <= 64; i++) {
    const a = i / 64 * Math.PI * (section ? 1 : 2) + (section ? Math.PI : 0), r = radius * ring / 6;
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    points.push([x, surfaceHeight(x, z, framingFrame), z]);
    if (section && ring === 6) points.push([x, BOTTOM, z]);
  }
  const minY = Math.min(...points.map(point => point[1])), maxY = Math.max(...points.map(point => point[1]));
  const target: XYZ = [0, section ? (minY + maxY) * .5 + frame.radius * .09 : (minY + maxY) * .5, section ? -frame.radius * .1 : 0];
  const tanY = Math.tan(37 / 180 * Math.PI / 2), tanX = tanY * Math.max(.2, aspect);
  let distance = 2;
  const dot = (a: XYZ, b: XYZ) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  for (const point of points) {
    const delta: XYZ = [point[0] - target[0], point[1] - target[1], point[2] - target[2]], z = dot(delta, direction);
    distance = Math.max(distance, z + Math.abs(dot(delta, right)) / (tanX * .86), z + Math.abs(dot(delta, up)) / (tanY * .86));
  }
  return { target, position: target.map((value, i) => value + direction[i] * distance) as XYZ, distance, points };
}

/** Source-linked blocks and graded talus. Before release, each clast is
 * embedded in its assigned wall scar; no material is spawned over the basin. */
export const WALL_CLASTS = 192;
type WallSource = { siteId: number; rank: number; angle: number; radius: number; position: XYZ; size: number; start: number };
const retainedWallSources: (WallSource | undefined)[] = new Array(WALL_CLASTS);
export function clastSource(i: number, frame: LakeFrame) {
  if (frame.kind === 'caldera' && retainedWallSources[i]) return retainedWallSources[i]!;
  const siteId = Math.floor(i / 32), rank = i % 32, site = WALL_SITES[siteId];
  const angle = site.angle + (seed(i + 742) - .5) * site.width * 1.3, u = .915 + seed(i + 29) * .045;
  const r = frame.radius * planform(angle) * u, x = Math.cos(angle) * r, z = Math.sin(angle) * r;
  const size = rank < 4 ? .14 + seed(i + 19) * .12 : rank < 12 ? .055 + seed(i + 19) * .07 : .022 + seed(i + 19) * .04;
  const start = site.start + seed(i + 41) * .045;
  // Each fragment releases later than its site's initial failure. Sample its
  // own release contact, including the same wall motion and existing debris.
  const sourceFrame = { ...frame, subsidence: start }, y = surfaceHeight(x, z, sourceFrame);
  const source = { siteId, rank, angle, radius: r, position: [x, y, z] as XYZ, size, start };
  if (frame.kind === 'caldera') retainedWallSources[i] = source;
  return source;
}
export function boulderPose(i: number, frame: LakeFrame) {
  if (i < WALL_CLASTS && frame.kind === 'caldera') {
    const source = clastSource(i, frame), travel = smooth(source.start, Math.min(1, source.start + .14), frame.subsidence);
    const reach = seed(i + 89), targetU = source.rank === 0 ? .72 + reach * .06 : source.rank < 4 ? .81 + reach * .055 : source.rank < 12 ? .77 + reach * .09 : .74 + reach * .12;
    const target = frame.radius * planform(source.angle) * targetU, r = source.radius + (target - source.radius) * travel;
    const angle = source.angle + .026 * Math.sin(Math.PI * travel) * (seed(i + 123) - .5);
    const x = Math.cos(angle) * r, z = Math.sin(angle) * r, bed = surfaceHeight(x, z, frame), startY = source.position[1] - source.size * .7;
    const support = bed + source.size * (.45 - 1.15 * (1 - smooth(0, .16, travel)));
    const roll = .06 * (.4 + seed(i + 173)) * Math.sin(Math.PI * travel) ** 2;
    const y = travel === 0 ? bed - source.size * .7 : Math.max(support, startY + (bed + source.size * .45 - startY) * smooth(0, .78, travel)) + roll;
    return { position: [x, y, z] as XYZ, size: source.size, angle: source.angle + travel * (seed(i + 90) - .5) * 5.5, source: source.siteId, travel };
  }
  const talus = i < 160, angle = seed(i + 742) * Math.PI * 2;
  const r = talus ? frame.radius * planform(angle) * (.70 + seed(i + 89) * .23) : frame.radius * 1.14 + seed(i + 433) * Math.max(.1, EXTENT - frame.radius * 1.18);
  const x = Math.cos(angle) * r, z = Math.sin(angle) * r;
  const size = (.018 + seed(i + 19) ** 3 * .085) * (talus ? frame.formation : 1);
  return { position: [x, surfaceHeight(x, z, frame) + size * .32, z] as XYZ, size, angle, source: -1, travel: 0 };
}
