import { clamp, fragmentState, islandAccretion, islandSurfaceY, pillowState, SEA_FLOOR, SEA_LEVEL, submarineState, type Environment, type Supply } from './model.ts';
import { islandDepositWeight, islandVentSite } from './islandGrowth.ts';
import { plumeParcel } from './scene.ts';

export type XYZ = [number, number, number];
export const SCALE = .02;
export const WATER_Y = (SEA_FLOOR - SEA_LEVEL) * SCALE;
export const RADIUS = 9.6;
export const RINGS = 32;
export const SECTORS = 80;
export const seed = (i: number, salt = 0) => {
  let n = Math.imul(i + 17, 0x45d9f3b) ^ Math.imul(salt + 31, 0x27d4eb2d);
  n = Math.imul(n ^ n >>> 16, 0x45d9f3b);
  return ((n ^ n >>> 16) >>> 0) / 4294967296;
};
export const worldY = (y: number) => (SEA_FLOOR - y) * SCALE;
/** Same fixed topology, with more radial samples around the local outlet. */
const meshRadius = (ring: number) => RADIUS * Math.pow(ring / RINGS, 1.45);

/** A quenched extrusion with a feeding neck, a broken lip and irregular crust.
 * The smooth unit-sphere input retains closed topology; these are illustrative
 * lobes, not a reconstruction of a particular lava flow or a cooling solver. */
export function pillowShape([x, y, z]: XYZ, variant: number): XYZ {
  const phase = seed(variant, 302) * Math.PI * 2;
  const radial = Math.max(0, 1 - x * x), angle = Math.atan2(z, y);
  const neck = .76 + .24 * clamp((x + .86) / .73);
  const nose = 1 + .16 * Math.exp(-(((x - .37) / .42) ** 2));
  const asymmetry = 1 + .11 * Math.sin(z * 3.4 + y * 2.6 + phase) + .055 * Math.sin(x * 6.3 - z * 4.2 + phase);
  const lipX = .29 + seed(variant, 306) * .28 + .09 * Math.sin(angle * 3 + phase);
  const lip = .085 * Math.exp(-(((x - lipX) / .075) ** 2)) * clamp((y + .25) * 1.5);
  const joint = .075 * Math.exp(-(((z + .12 * Math.sin(x * 4.7 + phase)) / .075) ** 2))
    * clamp((y + .05) * 1.8) * clamp((x + .35) * 1.4);
  const crust = radial * .045 * Math.sin(x * 11.3 + z * 7.1 + phase) * Math.sin(y * 9.7 - z * 8.3 + phase);
  const shell = neck * nose * asymmetry + lip - joint + crust;
  return [x * (1.17 + seed(variant, 303) * .24) + radial * .055 * Math.sin(z * 4 + phase),
    y * shell * (.56 + seed(variant, 304) * .12) + radial * .045 * Math.sin(x * 3.3 + phase),
    z * shell * (.76 + seed(variant, 305) * .17) + radial * .09 * Math.sin(x * 3.8 + phase)];
}

/** Radial teaching reconstruction. Its exposed x axis retains the authored profile.
 * Off-axis relief is stable illustrative geometry, not measured bathymetry. */
export function rockRelief(x: number, z: number) {
  const r = Math.hypot(x, z), a = Math.atan2(z, x);
  return Math.sin(a) ** 2 * Math.min(1, r * 2) * (
    .10 * Math.sin(a * 11 + r * 2.4) + .055 * Math.sin(a * 23 - r * 3.1)
    + .025 * Math.sin(x * 19 + z * 13)) * Math.min(1, r) * Math.max(0, 1 - r / RADIUS);
}

type Profiles = { left: number[][]; right: number[][]; erosion: number[] };
let profiles: Profiles | undefined;
/** Immutable samples, prepared once. The runtime combines the model's deposit growths;
 * it does not allocate a fresh accretion history for every mesh vertex. */
function preparedProfiles(): Profiles {
  if (profiles) return profiles;
  const left: number[][] = [], right: number[][] = [];
  for (let unit = 0; unit < 24; unit++) {
    const l: number[] = [], r: number[] = [];
    for (let ring = 0; ring <= RINGS; ring++) {
      const distance = ring / RINGS * RADIUS / SCALE;
      for (const [side, values] of [[-1, l], [1, r]] as const) {
        const x = 500 + side * distance;
        values.push((islandSurfaceY(x, .80, 'sustained', unit - 1, false) - islandSurfaceY(x, .80, 'sustained', unit, false)) * SCALE);
      }
    }
    left.push(l); right.push(r);
  }
  const erosion = Array.from({ length: RINGS + 1 }, (_, ring) => {
    const x = 500 + ring / RINGS * RADIUS / SCALE;
    return (islandSurfaceY(x, 1, 'sustained', Infinity, true) - islandSurfaceY(x, 1, 'sustained', Infinity, false)) * SCALE;
  });
  return profiles = { left, right, erosion };
}

export type OceanGeometryFrame = ReturnType<typeof oceanGeometryFrame>;
export function oceanGeometryFrame(progress: number, environment: Environment, supply: Supply) {
  const p = clamp(progress), state = submarineState(p, environment, supply);
  const history = islandAccretion(p, supply);
  const table = preparedProfiles();
  const contacts = [Array.from({ length: RINGS + 1 }, () => [0, 0])];
  if (environment === 'island') {
    for (const unit of history.units) {
      const prior = contacts[contacts.length - 1];
      contacts.push(prior.map(([left, right], ring) => [left + table.left[unit.index][ring] * unit.growth, right + table.right[unit.index][ring] * unit.growth]));
    }
    // Erosion removes exposed material; it never opens gaps between buried units.
    const top = contacts[contacts.length - 1];
    for (const contact of contacts) for (let ring = 0; ring <= RINGS; ring++) {
      for (let side = 0; side < 2; side++) contact[ring][side] = Math.min(contact[ring][side], Math.max(0, top[ring][side] - table.erosion[ring] * history.erosion));
    }
  }
  return { p, environment, supply, state, history, contacts };
}

function profileAt(frame: OceanGeometryFrame, radius: number, cosine: number, contact: number) {
  const row = frame.contacts[Math.max(0, Math.min(frame.contacts.length - 1, contact))];
  const q = Math.min(RINGS, Math.max(0, radius / RADIUS * RINGS));
  const a = Math.floor(q), b = Math.min(RINGS, a + 1), t = q - a, side = (cosine + 1) / 2;
  const l = row[a][0] * (1 - t) + row[b][0] * t, r = row[a][1] * (1 - t) + row[b][1] * t;
  return l * (1 - side) + r * side;
}

const LATTICE_SIZE = 1 + RINGS * SECTORS;
const SECTION_BLEND = .25;
const throatFloor = (x: number, z: number) => Math.exp(-((x / .68) ** 8) - (((z - .70) / .45) ** 8));
type IslandTemplates = { thickness: Float64Array[]; erosion: Float64Array; radius: Float64Array; cosine: Float64Array; offAxis: Float64Array; relief: Float64Array };
let islandTemplates: IslandTemplates | undefined;
/** Static per-unit spatial weights are sampled once, on the existing mesh grid.
 * At most 24 x 2,561 thicknesses and five scalar fields are retained (~581 KiB).
 * No expensive morphology field is evaluated in the per-frame vertex loop. */
function preparedIslandTemplates(): IslandTemplates {
  if (islandTemplates) return islandTemplates;
  const table = preparedProfiles(), erosion = new Float64Array(LATTICE_SIZE);
  const radii = new Float64Array(LATTICE_SIZE), cosines = new Float64Array(LATTICE_SIZE);
  const offAxis = new Float64Array(LATTICE_SIZE), relief = new Float64Array(LATTICE_SIZE);
  const units = islandAccretion(.8).units;
  const thickness = units.map(() => new Float64Array(LATTICE_SIZE));
  const floorRadius = .7 / RADIUS * RINGS, floorRing = Math.floor(floorRadius), floorT = floorRadius - floorRing;
  const floors = units.map(unit => {
    const l = table.left[unit.index], r = table.right[unit.index];
    const raw = ((l[floorRing] + r[floorRing]) * (1 - floorT) + (l[floorRing + 1] + r[floorRing + 1]) * floorT) * .5;
    return raw * islandDepositWeight(unit, 0, .7);
  });
  for (let vertex = 0; vertex < LATTICE_SIZE; vertex++) {
    const ring = vertex === 0 ? 0 : 1 + Math.floor((vertex - 1) / SECTORS);
    const angle = vertex === 0 ? 0 : (vertex - 1) % SECTORS / SECTORS * Math.PI * 2;
    const radius = meshRadius(ring), cosine = Math.cos(angle), x = radius * cosine, z = radius * Math.sin(angle);
    const meshX = Math.fround(x), meshZ = Math.fround(z);
    radii[vertex] = Math.hypot(meshX, meshZ); cosines[vertex] = radii[vertex] ? meshX / radii[vertex] : 1;
    offAxis[vertex] = 1 - Math.exp(-((meshZ / SECTION_BLEND) ** 2)); relief[vertex] = rockRelief(meshX, meshZ) * (1 - throatFloor(meshX, meshZ));
    const q = radius / RADIUS * RINGS, a = Math.floor(q), b = Math.min(RINGS, a + 1), t = q - a, side = (cosine + 1) / 2;
    erosion[vertex] = table.erosion[a] * (1 - t) + table.erosion[b] * t;
    // Each package already contains the same broad, shallow throat floor.
    // The finite episode sites migrate within it, without a moving excavation
    // deforming older deposits. A positive blend preserves layer ordering.
    const floor = throatFloor(x, z);
    for (const unit of units) {
      const l = table.left[unit.index][a] * (1 - t) + table.left[unit.index][b] * t;
      const r = table.right[unit.index][a] * (1 - t) + table.right[unit.index][b] * t;
      const shaped = (l * (1 - side) + r * side) * islandDepositWeight(unit, x, z);
      thickness[unit.index][vertex] = shaped * (1 - floor) + floors[unit.index] * floor;
    }
  }
  return islandTemplates = { thickness, erosion, radius: radii, cosine: cosines, offAxis, relief };
}

/** A live frame owns one lazy contact lattice, at most 25 x 2,561 doubles
 * and matching float mesh heights (~751 KiB). Weak keys retain no previous
 * frames or historical progress values.
 * All 25 solids and arbitrary terrain consumers share this preparation. */
type IslandLattice = { contacts: Float64Array; mesh: Float32Array };
const islandLattices = new WeakMap<OceanGeometryFrame, IslandLattice>();
function preparedIslandLattice(frame: OceanGeometryFrame): IslandLattice {
  const cached = islandLattices.get(frame);
  if (cached) return cached;
  const template = preparedIslandTemplates(), count = frame.history.units.length;
  const contacts = new Float64Array((count + 1) * LATTICE_SIZE);
  for (const unit of frame.history.units) {
    const prior = unit.index * LATTICE_SIZE, next = prior + LATTICE_SIZE, thickness = template.thickness[unit.index];
    for (let vertex = 0; vertex < LATTICE_SIZE; vertex++) contacts[next + vertex] = contacts[prior + vertex] + thickness[vertex] * unit.growth;
  }
  if (frame.history.erosion > 0) {
    const top = count * LATTICE_SIZE;
    for (let contact = 0; contact <= count; contact++) for (let vertex = 0; vertex < LATTICE_SIZE; vertex++) {
      const ceiling = Math.max(0, contacts[top + vertex] - template.erosion[vertex] * frame.history.erosion);
      const index = contact * LATTICE_SIZE + vertex;
      contacts[index] = Math.min(contacts[index], ceiling);
    }
  }
  const mesh = new Float32Array(contacts.length);
  for (let contact = 0; contact <= count; contact++) for (let vertex = 0; vertex < LATTICE_SIZE; vertex++) {
    if (template.radius[vertex] >= RADIUS) continue;
    const index = contact * LATTICE_SIZE + vertex;
    const authored = profileAt(frame, template.radius[vertex], template.cosine[vertex], contact), blend = template.offAxis[vertex];
    const height = authored * (1 - blend) + contacts[index] * blend;
    mesh[index] = Math.max(0, height + template.relief[vertex] * Math.min(1, height));
  }
  const lattice = { contacts, mesh };
  islandLattices.set(frame, lattice);
  return lattice;
}

function islandContactAt(frame: OceanGeometryFrame, radius: number, angle: number, contact: number) {
  const { contacts } = preparedIslandLattice(frame), offset = Math.max(0, Math.min(frame.contacts.length - 1, contact)) * LATTICE_SIZE;
  const q = Math.pow(radius / RADIUS, 1 / 1.45) * RINGS, inner = Math.floor(q), outer = Math.min(RINGS, inner + 1), radial = q - inner;
  const sector = (angle / (Math.PI * 2) + 1) % 1 * SECTORS, a = Math.floor(sector), b = (a + 1) % SECTORS, angular = sector - a;
  const at = (ring: number) => ring === 0 ? contacts[offset]
    : contacts[offset + 1 + (ring - 1) * SECTORS + a] * (1 - angular) + contacts[offset + 1 + (ring - 1) * SECTORS + b] * angular;
  return at(inner) * (1 - radial) + at(outer) * radial;
}

export function surfaceHeight(frame: OceanGeometryFrame, x: number, z: number, through = frame.contacts.length - 1) {
  const radius = Math.hypot(x, z), angle = Math.atan2(z, x);
  if (radius >= RADIUS) return 0;
  if (frame.environment === 'island') {
    const authored = profileAt(frame, radius, Math.cos(angle), through);
    // Convexly blend two ordered contact fields: the authored face is exact,
    // while every off-axis deposit retains its own unequal summit morphology.
    const offAxis = 1 - Math.exp(-((z / SECTION_BLEND) ** 2));
    const height = offAxis === 0 ? authored : authored * (1 - offAxis) + islandContactAt(frame, radius, angle, through) * offAxis;
    return Math.max(0, height + rockRelief(x, z) * (1 - throatFloor(x, z)) * Math.min(1, height));
  }
  const summit = worldY(frame.state.summit);
  if (frame.environment === 'deep') {
    const u = x * .91 - z * .42, v = x * .42 + z * .91;
    const cleft = v - .075 * Math.sin(u * 4.3);
    const split = .34 * Math.exp(-((u / .83) ** 4) - ((cleft / .14) ** 2));
    const shoulder = .14 * Math.exp(-(((u + .28) / .70) ** 4) - (((v - .27) / .23) ** 2))
      + .095 * Math.exp(-(((u - .31) / .49) ** 4) - (((v + .22) / .19) ** 2));
    const shape = summit * (1 - Math.pow(radius / RADIUS, .85));
    return Math.max(0, Math.min(summit, shape + shoulder - split) + rockRelief(x, z));
  }
  // This selected fragment-producing shallow case has a small, incomplete lip.
  // Its solid floor and open side are not a deep caldera or a depth rule.
  const u = (x + .06) / .62, v = (z - .08) / .49, rho = Math.hypot(u, v), a = Math.atan2(v, u);
  const breach = clamp((z + .02) / .63) * Math.exp(-((x / .36) ** 2));
  const lip = .18 * Math.exp(-(((rho - 1) / .24) ** 2)) * (.67 + .18 * Math.sin(a * 3) + .15 * Math.cos(a * 5)) * (1 - breach * .85);
  const pit = .45 * Math.exp(-((rho / .84) ** 4));
  const clasts = .035 * Math.sin(x * 9.7 + z * 5.1) * Math.cos(z * 12.3 - x * 4.7) * Math.exp(-((radius / 1.4) ** 4));
  const shape = summit * (1 - Math.pow(radius / RADIUS, 1.05));
  return Math.max(0, shape + lip - pit - breach * .15 * Math.exp(-((radius / 1.25) ** 4)) + clasts + rockRelief(x, z));
}

/** An extruded lobe follows its supporting slope instead of standing upright. */
export function pillowPitch(frame: OceanGeometryFrame, x: number, z: number, heading: number, through = frame.contacts.length - 1) {
  const dx = Math.cos(heading) * .16, dz = -Math.sin(heading) * .16;
  const rise = surfaceHeight(frame, x + dx, z + dz, through) - surfaceHeight(frame, x - dx, z - dz, through);
  return Math.max(-.65, Math.min(.65, Math.atan2(rise, .32)));
}

export type SolidBuffers = { positions: Float32Array; indices: number[]; uvs: Float32Array };
/** A closed radial deposit with shared pole/rim vertices and finite thickness.
 * Pinched contacts intentionally coincide where this particular deposit is absent. */
export function depositBuffers(): SolidBuffers {
  const count = 1 + RINGS * SECTORS;
  const positions = new Float32Array(count * 2 * 3), uvs = new Float32Array(count * 2 * 2), indices: number[] = [];
  for (let side = 0; side < 2; side++) {
    const offset = side * count;
    for (let ring = 1; ring <= RINGS; ring++) for (let angle = 0; angle < SECTORS; angle++) {
      const i = offset + 1 + (ring - 1) * SECTORS + angle, next = offset + 1 + (ring - 1) * SECTORS + (angle + 1) % SECTORS;
      const tri = ring === 1 ? [offset, next, i] : [i - SECTORS, next - SECTORS, next, i - SECTORS, next, i];
      if (side) for (let t = 0; t < tri.length; t += 3) indices.push(tri[t], tri[t + 2], tri[t + 1]); else indices.push(...tri);
      const a = angle / SECTORS * Math.PI * 2, r = meshRadius(ring);
      positions[i * 3] = Math.cos(a) * r; positions[i * 3 + 2] = Math.sin(a) * r;
      uvs[i * 2] = positions[i * 3]; uvs[i * 2 + 1] = positions[i * 3 + 2];
    }
  }
  for (let angle = 0; angle < SECTORS; angle++) {
    const a = 1 + (RINGS - 1) * SECTORS + angle, b = 1 + (RINGS - 1) * SECTORS + (angle + 1) % SECTORS;
    indices.push(a, b, b + count, a, b + count, a + count);
  }
  return { positions, uvs, indices };
}

export function updateDeposit(positions: Float32Array, frame: OceanGeometryFrame, unit: number) {
  const count = positions.length / 6;
  if (frame.environment === 'island' && unit >= 0) {
    const { mesh } = preparedIslandLattice(frame);
    for (let side = 0; side < 2; side++) {
      const contact = Math.max(0, Math.min(frame.contacts.length - 1, unit + (side ? 0 : 1))) * LATTICE_SIZE;
      for (let i = 0; i < count; i++) positions[(i + side * count) * 3 + 1] = mesh[contact + i];
    }
    return;
  }
  for (let side = 0; side < 2; side++) for (let i = 0; i < count; i++) {
    const index = (i + side * count) * 3, x = positions[index], z = positions[index + 2];
    positions[index + 1] = unit < 0 ? side ? -2.2 : frame.environment === 'island' ? 0 : surfaceHeight(frame, x, z)
      : surfaceHeight(frame, x, z, unit + (side ? 0 : 1));
  }
}

/** Exposed x/z=0 contact, cut from the same closed deposits. */
export function sectionBuffers(frame: OceanGeometryFrame, unit: number): SolidBuffers {
  const positions: number[] = [], uvs: number[] = [], indices: number[] = [];
  for (let i = 0; i <= RINGS * 2; i++) {
    const x = Math.sign(i - RINGS) * meshRadius(Math.abs(i - RINGS));
    for (let side = 0; side < 2; side++) {
      const y = unit < 0 ? side ? -2.2 : frame.environment === 'island' ? 0 : surfaceHeight(frame, x, 0)
        : surfaceHeight(frame, x, 0, unit + (side ? 0 : 1));
      positions.push(x, y, .002); uvs.push(x, y);
    }
    if (i < RINGS * 2) { const k = i * 2; indices.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
  }
  return { positions: new Float32Array(positions), uvs: new Float32Array(uvs), indices };
}

export const PILLOW_SITES: XYZ[] = [
  [-.35, .01, .38], [.42, .015, .37], [-.88, 0, .72], [.93, .01, .65], [-1.22, 0, 1.15],
  [.22, .015, .82], [-.57, .02, .92], [1.19, .01, .95], [-1.02, 0, 1.36],
  [.51, .01, 1.21], [-1.48, 0, 1.58], [1.47, 0, 1.38], [-.12, .02, .17], [.57, .025, .29],
];
// Derive each emplacement endpoint from the canonical lobe model once.
// This fixed fourteen-number cache never stores frames or accretion histories.
const PILLOW_SUPPORT_END = PILLOW_SITES.map((_, index) => {
  let a = 0, b = 1;
  for (let step = 0; step < 40; step++) { const mid = (a + b) / 2; if (pillowState(mid, index).growth === 1) b = mid; else a = mid; }
  return b;
});
export function pillowPose(frame: OceanGeometryFrame, index: number) {
  const state = pillowState(frame.p, index), site = PILLOW_SITES[index];
  const radius = .30 + seed(index, 2) * .12;
  const supportP = Math.min(frame.p, PILLOW_SUPPORT_END[index]);
  // Deep support needs only the small canonical mound state, not a fresh
  // oceanGeometryFrame or a 24-deposit history for each lobe.
  const support = frame.environment === 'deep' && supportP < frame.p
    ? { ...frame, p: supportP, state: submarineState(supportP, frame.environment, frame.supply) } : frame;
  const center: XYZ = [site[0], surfaceHeight(support, site[0], site[2]) + radius * .12 + site[1], site[2]];
  const heading = -Math.atan2(site[2], site[0]) + (seed(index, 18) - .5) * .7;
  return { ...state, radius, center, heading, pitch: pillowPitch(support, site[0], site[2], heading), skinHeat: state.coreHeat * (1 - state.crust) };
}

export function settledFragment(frame: OceanGeometryFrame, index: number) {
  const state = fragmentState(frame.p, index), x = state.x * SCALE, z = (seed(index, 44) - .5) * 2.4;
  const ground = surfaceHeight(frame, x, z);
  const source = worldY(frame.state.summit), y = Math.max(ground + .045, source - state.y * SCALE);
  return { ...state, position: [x, state.settled ? ground + .045 : y, z] as XYZ };
}

export type PlumeVolume = { center: XYZ; radius: number; axes: XYZ; density: number; medium: 'water' | 'air' };
/** Shared illustrative outlet for the feeder, extrusion, fragments and plume. */
export function islandVentOrigin(frame: OceanGeometryFrame): XYZ {
  const [x, z] = frame.environment === 'island' ? islandVentSite(frame.history) : [0, 0];
  return [x, surfaceHeight(frame, x, z) + .025, z];
}
/** The observation support emerges from the same current pile, rather than from
 * a hidden point under it. This smooth geometric anchor is not a measured vent. */
export function plumeOrigin(frame: OceanGeometryFrame): XYZ {
  if (frame.environment === 'island') return islandVentOrigin(frame);
  if (frame.environment !== 'deep') return [-.04, surfaceHeight(frame, 0, 0) + .02, .04];
  let weight = 0, x = 0, y = 0, z = 0;
  for (let i = 0; i < PILLOW_SITES.length; i++) {
    const pose = pillowPose(frame, i), w = pose.growth * pose.coreHeat * (1 - pose.crust * .35);
    const top = pose.center[1] + pose.radius * Math.cbrt(pose.growth) * .80;
    weight += w; x += pose.center[0] * w; y += top * w; z += pose.center[2] * w;
  }
  return weight > 1e-8 ? [x / weight, y / weight + .015, z / weight] : [0, surfaceHeight(frame, 0, 0) + .02, .04];
}
/** Representative finite packets from the existing projection, thickened into 3D.
 * Their density support is clipped to the named medium by the renderer. */
export function oceanParcels(frame: OceanGeometryFrame): PlumeVolume[] {
  const parcels = Array.from({ length: 16 }, (_, i): PlumeVolume => ({ center: [0, 0, 0], radius: .01, axes: [1, 1, 1], density: 0, medium: i < 8 ? 'water' : 'air' }));
  if (frame.environment !== 'island') {
    const environment = frame.environment;
    const source = plumeOrigin(frame);
    const packets = Array.from({ length: 8 }, (_, i) => plumeParcel(frame.p, i * 3, frame.state.summit, environment));
    const envelope = Math.max(...packets.map(p => p.opacity));
    const rise = clamp((frame.p - .07) / .43), span = .38 + rise * (frame.environment === 'deep' ? 1.75 : .65);
    for (let i = 0; i < 8; i++) {
      const q = i / 7, radius = .065 + Math.pow(q, 1.15) * .29;
      const curl = q * (.075 + .025 * q) * Math.sin(q * 9.4 - frame.p * 7.);
      const y = Math.min(WATER_Y - .035, source[1] + .12 + span * q);
      parcels[i] = { center: [source[0] + q * q * (.38 + rise * .30) + curl, y, source[2] + q * .10 + q * .10 * Math.cos(q * 7.1 - frame.p * 5.)], radius,
        axes: [1.02 + q * .18, i < 2 ? 2.8 : 1.65 - q * .27, .85 + seed(i, 403) * .18], density: envelope * (2.9 - q * 1.1), medium: 'water' };
    }
  }
  if (frame.environment === 'shallow') for (let i = 0; i < 8; i++) {
    const q = clamp((frame.p - (.10 + i * .055)) / .39), alpha = q <= 0 || q >= 1 ? 0 : Math.sin(q * Math.PI);
    parcels[i + 8] = { center: [q * (.4 + i * .12), WATER_Y + .09 + q * (1.3 + i * .12), -.12], radius: .15 + q * .61,
      axes: [1.05 + seed(i, 404) * .30, 1.25 + seed(i, 405) * .35, .85 + seed(i, 406) * .20], density: alpha * 1.25, medium: 'air' };
  }
  if (frame.environment === 'island' && frame.history.adding) {
    const unit = frame.history.units[frame.history.currentIndex], source = islandVentOrigin(frame);
    if (unit?.phase === 'shallow-fragments') for (let i = 0; i < 8; i++) {
      const q = clamp(unit.growth * 1.6 - i * .07), alpha = q <= 0 || q >= 1 ? 0 : Math.sin(q * Math.PI);
      const y = Math.min(WATER_Y - .03, source[1] + q * .7);
      parcels[i] = { center: [source[0] + q * .5, y, source[2]], radius: .14 + q * .36, axes: [1.15, 1.55, .9], density: alpha * 1.5, medium: 'water' };
    }
  }
  return parcels;
}

/** Geometry-derived observation framing only; it never extends the finite plume.
 * Wide stages favor the local ridge/source over the height of the thin head.
 * Narrow/portrait stages retain the previously accepted camera parameters. */
export function deepVentFraming(frame: OceanGeometryFrame, stageAspect: number) {
  const aspect = Number.isFinite(stageAspect) && stageAspect > 0 ? stageAspect : 1;
  const packets = oceanParcels(frame).filter(packet => packet.medium === 'water');
  const q = clamp((Math.max(...packets.map(packet => packet.density)) - .015) / (.23 - .015));
  const visibility = q * q * (3 - 2 * q);
  const w = clamp((aspect - 1.55) / .65), wide = w * w * (3 - 2 * w);
  const top = worldY(frame.state.summit);
  const head = Math.max(...packets.map(packet => packet.center[1] + packet.radius * packet.axes[1] * .72));
  const lift = Math.min(1.05, Math.max(0, head - top - 1.5)) * visibility;
  const retreat = 1 + visibility * (.10 + wide * .15), scale = Math.max(1, .98 / aspect);
  return { target: [0, top + .12 + lift * (1 - wide * .55), .35] as XYZ,
    offset: [1.8 * retreat * scale, 1.45 * retreat * scale, 4.5 * retreat * scale] as XYZ };
}
