import { seed } from './magmaGeometry.ts';
import { lavaBranches, lavaRibbon, ROCK_RADIUS, surfaceHeight, type XYZ } from './eruptionGeometry.ts';
import { smooth } from './model.ts';
import type { Landform } from './projectModel.ts';

/** An older, fictional setting for the single land-eruption projection. These
 * display distances select an uncluttered composition, not ecological ages,
 * surveyed geography, a hazard footprint or a safe separation from an eruption. */
export const ENVIRONMENT_LIMITS = Object.freeze({
  trees: 420, treeVariants: 5, groundSectors: 224, groundRings: 46,
  outerRadius: 60, roadSegments: 144, geometryBytes: 3 * 1024 * 1024,
  instanceBytes: 80 * 1024, drawCalls: 28, materials: 14, triangles: 650000,
});
export const TREE_RADIUS_RATIO = .62;
export const TREE_MIN_RADIUS = 7.15;

export interface EnvironmentBuffers { positions: number[]; uvs: number[]; indices: number[] }
export interface ColouredEnvironmentBuffers extends EnvironmentBuffers { colours: number[] }
export interface TreeSite { id: number; patch: number; position: XYZ; height: number; radius: number; yaw: number; variant: number; tone: number }
export interface BuildingSite {
  position: XYZ; width: number; depth: number; height: number; yaw: number;
  foundationBottom: number; foundationTop: number;
}
export interface EnvironmentLayout {
  kind: Landform; trees: TreeSite[]; road: XYZ[]; buildings: BuildingSite[];
  monitor: XYZ; pad: { x: number; z: number; width: number; depth: number; yaw: number };
}

const variantSeed = (kind: Landform) => kind === 'shield' ? 1700 : kind === 'composite' ? 2900 : 4300;
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
function noise(x: number, z: number) {
  const ix = Math.floor(x), iz = Math.floor(z), u = smooth(0, 1, x - ix), v = smooth(0, 1, z - iz);
  return mix(mix(seed(ix * 127 + iz * 271 + 701), seed((ix + 1) * 127 + iz * 271 + 701), u),
    mix(seed(ix * 127 + (iz + 1) * 271 + 701), seed((ix + 1) * 127 + (iz + 1) * 271 + 701), u), v);
}

/** Continue the exact radial roof before introducing low older foothills. The
 * zero-slope blend at ROCK_RADIUS preserves contact and the incoming tangent,
 * including the shield's non-flat edge. The far rim meets the existing -.09
 * background floor; section clipping removes its front with the same plane. */
export function environmentGroundHeight(x: number, z: number, kind: Landform) {
  const r = Math.hypot(x, z);
  if (r <= ROCK_RADIUS) return surfaceHeight(x, z, kind);
  const hills = [
    [-20, -15, 10, 6, 1.05], [-5, -25, 11, 7, 1.35], [14, -23, 10, 8, 1.15],
    [27, -7, 8, 12, .9], [22, 17, 10, 7, .7], [-19, 21, 12, 8, .8], [-29, 0, 8, 12, .9],
  ];
  let relief = 0;
  for (const [cx, cz, sx, sz, height] of hills) {
    relief += height * Math.exp(-(((x - cx) / sx) ** 2 + ((z - cz) / sz) ** 2) * 1.7);
  }
  const plain = -.04 + .075 * (noise(x * .36, z * .36) - .5);
  const oldGround = plain + relief * smooth(11, 18, r) * (.86 + .14 * noise(x * .7, z * .7));
  const joined = mix(surfaceHeight(x, z, kind), oldGround, smooth(ROCK_RADIUS, ROCK_RADIUS + 3, r));
  return mix(joined, -.09, smooth(44, ENVIRONMENT_LIMITS.outerRadius, r));
}

interface WoodlandPatch { x: number; z: number; rx: number; rz: number; yaw: number }
function woodlandPatches(kind: Landform): WoodlandPatch[] {
  const originals = [
    [-6.5, -7.4, 2.8, 2.1], [-10.4, -2.5, 2.8, 3.4], [-8.4, 6.4, 3.2, 2.3],
    [-2.2, 10.4, 3.1, 2.3], [6.5, 8.6, 3.1, 2.3], [11.2, 2.8, 2.7, 3.1],
    [6.4, -8.9, 3.2, 2.5], [.2, -12.1, 3.9, 2.5], [-12.3, -9.7, 3.1, 2.2],
  ];
  const salt = variantSeed(kind);
  return originals.map(([x, z, rx, rz], i) => ({ x: x + (seed(salt + i * 13) - .5) * .7,
    z: z + (seed(salt + i * 13 + 1) - .5) * .7, rx, rz, yaw: (seed(salt + i * 13 + 2) - .5) * 1.3 }));
}

function patchDistance(x: number, z: number, patch: WoodlandPatch) {
  const dx = x - patch.x, dz = z - patch.z, c = Math.cos(patch.yaw), s = Math.sin(patch.yaw);
  return Math.hypot((dx * c + dz * s) / patch.rx, (-dx * s + dz * c) / patch.rz);
}

function woodlandField(x: number, z: number, patches: WoodlandPatch[]) {
  let cover = 0;
  const edge = 1.13 + (noise(x * 1.1, z * 1.1) - .5) * .3;
  for (const patch of patches) cover = Math.max(cover, 1 - smooth(.35, edge, patchDistance(x, z, patch)));
  // Unequal clearings interrupt the groves rather than forming an annulus.
  for (const [cx, cz, radius] of [[-9, -2.1, 1.05], [-2.3, 10.9, 1.1], [6, -9.8, 1.2], [11.3, 3.3, .95]]) {
    cover *= smooth(radius * .6, radius * 1.3, Math.hypot(x - cx, z - cz));
  }
  return cover * smooth(TREE_MIN_RADIUS - .45, TREE_MIN_RADIUS + .55, Math.hypot(x, z));
}

type Corridor = { points: XYZ[]; radius: number; outerRadius: number };
let reservedRoutes: Corridor[] | undefined;
function lavaCorridors() {
  if (reservedRoutes) return reservedRoutes;
  // The longest possible supported flow uses viscosity=0, supply=strength=1
  // and no ash. The width bound independently uses viscosity=1 and the maximum
  // 1.2 relief factor in lavaRibbon. This intentionally over-reserves layout.
  reservedRoutes = [1, 3].flatMap(vents => {
    const settings = { vents, gas: 0, viscosity: 0, supply: 1, strength: 1 };
    return lavaBranches(settings).map(branch => {
      const data = lavaRibbon(1, settings, branch, 144, 2), points: XYZ[] = [];
      for (let row = 0; row <= 144; row++) points.push(data.positions.slice((row * 3 + 1) * 3, (row * 3 + 1) * 3 + 3) as XYZ);
      const radius = .58 * Math.sqrt(branch.share) * 1.2 + .18;
      return { points, radius, outerRadius: Math.max(...points.map(point => Math.hypot(point[0], point[2]))) + radius };
    });
  });
  return reservedRoutes;
}
function segmentDistance(x: number, z: number, a: XYZ, b: XYZ) {
  const dx = b[0] - a[0], dz = b[2] - a[2], length = dx * dx + dz * dz;
  const t = length ? Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[2]) * dz) / length)) : 0;
  return Math.hypot(x - a[0] - dx * t, z - a[2] - dz * t);
}
function routeDistance(x: number, z: number, route: XYZ[]) {
  let distance = Infinity;
  for (let i = 1; i < route.length; i++) distance = Math.min(distance, segmentDistance(x, z, route[i - 1], route[i]));
  return distance;
}

/** Static decorative clearance, across both supported vent layouts and all
 * normalized product settings. It neither reads the episode nor predicts a
 * real eruption. The additional bare central area reserves the upper flanks
 * and the finite representative-clast footprint. */
export function environmentClearance(x: number, z: number, radius = 0) {
  const radial = Math.hypot(x, z);
  if (radial - radius < TREE_MIN_RADIUS) return false;
  return lavaCorridors().every(corridor => radial > corridor.outerRadius + radius || routeDistance(x, z, corridor.points) > corridor.radius + radius);
}

function roadRoute(kind: Landform) {
  const controls: [number, number][] = [[-23, -12], [-16, -10], [-12, -8], [-9.7, -7], [-8.7, -6], [-7.7, -5.8]];
  const road: XYZ[] = [];
  for (let i = 0; i <= ENVIRONMENT_LIMITS.roadSegments; i++) {
    const u = i / ENVIRONMENT_LIMITS.roadSegments * (controls.length - 1), index = Math.min(controls.length - 2, Math.floor(u)), t = u - index;
    const p0 = controls[Math.max(0, index - 1)], p1 = controls[index], p2 = controls[index + 1], p3 = controls[Math.min(controls.length - 1, index + 2)];
    const values = [0, 1].map(axis => .5 * (2 * p1[axis] + (-p0[axis] + p2[axis]) * t
      + (2 * p0[axis] - 5 * p1[axis] + 4 * p2[axis] - p3[axis]) * t * t
      + (-p0[axis] + 3 * p1[axis] - 3 * p2[axis] + p3[axis]) * t * t * t));
    road.push([values[0], environmentGroundHeight(values[0], values[1], kind), values[1]]);
  }
  return road;
}

export function buildingCorners(site: Pick<BuildingSite, 'position' | 'width' | 'depth' | 'yaw'>) {
  const c = Math.cos(site.yaw), s = Math.sin(site.yaw);
  return [-1, 1].flatMap(dx => [-1, 1].map(dz => [site.position[0] + dx * site.width / 2 * c + dz * site.depth / 2 * s,
    site.position[2] - dx * site.width / 2 * s + dz * site.depth / 2 * c] as [number, number]));
}

export function environmentLayout(kind: Landform): EnvironmentLayout {
  const road = roadRoute(kind), patches = woodlandPatches(kind), salt = variantSeed(kind);
  const buildings: BuildingSite[] = [[-7.2, -5.25, .69, .44, .23, -.14], [-8.1, -5.6, .55, .4, .19, .08]].map(([x, z, width, depth, height, yaw]) => {
    const position: XYZ = [x, environmentGroundHeight(x, z, kind), z];
    const corners = buildingCorners({ position, width, depth, yaw }).map(([px, pz]) => environmentGroundHeight(px, pz, kind));
    return { position, width, depth, height, yaw, foundationBottom: Math.min(...corners) - .025, foundationTop: Math.max(...corners) + .025 };
  });
  const monitor: XYZ = [-7.1, environmentGroundHeight(-7.1, -6.2, kind), -6.2];
  const trees: TreeSite[] = [];
  for (let attempt = 0; attempt < 1800 && trees.length < ENVIRONMENT_LIMITS.trees; attempt++) {
    const patch = attempt % patches.length, p = patches[patch], id = salt + attempt * 17;
    const a = seed(id + 1) * Math.PI * 2, r = Math.sqrt(seed(id + 2)) * 1.17;
    const dx = Math.cos(a) * r * p.rx, dz = Math.sin(a) * r * p.rz, c = Math.cos(p.yaw), s = Math.sin(p.yaw);
    const x = p.x + dx * c - dz * s, z = p.z + dx * s + dz * c;
    const density = woodlandField(x, z, patches);
    if (density < .2 + seed(id + 3) * .52) continue;
    const height = .34 + seed(id + 4) * .31 + noise(x * .8, z * .8) * .10, radius = height * TREE_RADIUS_RATIO;
    if (!environmentClearance(x, z, radius) || routeDistance(x, z, road) < radius + .3) continue;
    if (buildings.some(site => Math.hypot(x - site.position[0], z - site.position[2]) < radius + .95)
      || Math.hypot(x - monitor[0], z - monitor[2]) < radius + .65) continue;
    if (trees.some(site => Math.hypot(x - site.position[0], z - site.position[2]) < (radius + site.radius) * .57)) continue;
    trees.push({ id: attempt, patch, position: [x, environmentGroundHeight(x, z, kind), z], height, radius,
      yaw: seed(id + 5) * Math.PI * 2, variant: Math.floor(seed(id + 6) * ENVIRONMENT_LIMITS.treeVariants), tone: seed(id + 7) });
  }
  return { kind, trees, road, buildings, monitor, pad: { x: -7.6, z: -5.6, width: 2.4, depth: 1.8, yaw: -.12 } };
}

/** Vertex-attached soil colours preserve the original basalt at the join.
 * Farther older ground becomes muted earth/woodland, then atmospheric slate. */
export function environmentGroundBuffers(kind: Landform): ColouredEnvironmentBuffers {
  const positions: number[] = [], uvs: number[] = [], indices: number[] = [], colours: number[] = [];
  const patches = woodlandPatches(kind), { groundRings: rings, groundSectors: sectors, outerRadius } = ENVIRONMENT_LIMITS;
  for (let i = 0; i <= rings; i++) for (let j = 0; j <= sectors; j++) {
    const r = ROCK_RADIUS + (outerRadius - ROCK_RADIUS) * (i / rings) ** 1.7, angle = j / sectors * Math.PI * 2;
    const x = Math.cos(angle) * r, z = Math.sin(angle) * r;
    positions.push(x, environmentGroundHeight(x, z, kind), z); uvs.push(x * .24, z * .24);
    const woodland = woodlandField(x, z, patches), grit = noise(x * 2, z * 2), distant = smooth(16, 39, r);
    const rim = smooth(44, outerRadius, r);
    colours.push(mix(mix(.072 + grit * .024 - woodland * .016, .10, distant), .0343, rim),
      mix(mix(.067 + grit * .024 + woodland * .013, .116, distant), .0423, rim), mix(mix(.052 + grit * .02 - woodland * .003, .111, distant), .0467, rim),
      smooth(ROCK_RADIUS + .15, ROCK_RADIUS + 3.1, r));
    if (i < rings && j < sectors) {
      const a = i * (sectors + 1) + j, b = a + sectors + 1;
      indices.push(a, a + 1, b, a + 1, b + 1, b);
    }
  }
  return { positions, uvs, indices, colours };
}

/** Sparse soil/litter beneath the established groves. Every vertex consumes
 * the same surface, including patches crossing the original terrain edge. */
export function woodlandFloorBuffers(layout: EnvironmentLayout): ColouredEnvironmentBuffers {
  const { kind, pad } = layout;
  const positions: number[] = [], uvs: number[] = [], indices: number[] = [], colours: number[] = [];
  const patches = woodlandPatches(kind), rings = 9, sectors = 48;
  for (const patch of patches) {
    const base = positions.length / 3;
    for (let i = 0; i <= rings; i++) for (let j = 0; j <= sectors; j++) {
      const angle = j / sectors * Math.PI * 2, rough = 1 + .09 * Math.sin(angle * 7 + patch.x) + .05 * Math.cos(angle * 11 + patch.z);
      const dx = Math.cos(angle) * patch.rx * i / rings * rough, dz = Math.sin(angle) * patch.rz * i / rings * rough;
      const x = patch.x + dx * Math.cos(patch.yaw) - dz * Math.sin(patch.yaw), z = patch.z + dx * Math.sin(patch.yaw) + dz * Math.cos(patch.yaw);
      const localX = (x - pad.x) * Math.cos(pad.yaw) - (z - pad.z) * Math.sin(pad.yaw);
      const localZ = (x - pad.x) * Math.sin(pad.yaw) + (z - pad.z) * Math.cos(pad.yaw);
      const facility = Math.abs(localX) < pad.width / 2 + .1 && Math.abs(localZ) < pad.depth / 2 + .1;
      const field = woodlandField(x, z, patches), allowed = environmentClearance(x, z, .05) && !facility;
      positions.push(x, environmentGroundHeight(x, z, kind) + .005, z); uvs.push(x, z);
      const grain = noise(x * 7, z * 7);
      const verge = allowed && field > .01 ? smooth(.18, .4, routeDistance(x, z, layout.road)) : 0;
      colours.push(.07 + grain * .027, .08 + grain * .024, .046 + grain * .018, allowed ? field * verge * .65 * (1 - smooth(.7, 1, i / rings)) : 0);
      if (i < rings && j < sectors) {
        const a = base + i * (sectors + 1) + j, b = a + sectors + 1;
        indices.push(a, a + 1, b, a + 1, b + 1, b);
      }
    }
  }
  return { positions, uvs, indices, colours };
}

export function environmentRoadBuffers(layout: EnvironmentLayout, width: number, lift: number): EnvironmentBuffers {
  const positions: number[] = [], uvs: number[] = [], indices: number[] = [], across = 4;
  layout.road.forEach((point, i) => {
    const a = layout.road[Math.max(0, i - 1)], b = layout.road[Math.min(layout.road.length - 1, i + 1)];
    const length = Math.hypot(b[0] - a[0], b[2] - a[2]) || 1, nx = -(b[2] - a[2]) / length, nz = (b[0] - a[0]) / length;
    for (let j = 0; j <= across; j++) {
      const side = (j / across - .5) * width * (1 + .035 * Math.sin(i * .73));
      const x = point[0] + nx * side, z = point[2] + nz * side;
      positions.push(x, environmentGroundHeight(x, z, layout.kind) + lift, z); uvs.push(i / 10, j / across);
      if (i < layout.road.length - 1 && j < across) { const a = i * (across + 1) + j, b = a + across + 1; indices.push(a, a + 1, b, a + 1, b + 1, b); }
    }
  });
  return { positions, uvs, indices };
}
