import { clamp, ramp, type AccretionUnit } from './model.ts';
import { islandFlowBearing } from './islandGrowth.ts';
import { depositBuffers, islandVentOrigin, oceanGeometryFrame, oceanParcels, RADIUS, RINGS, SCALE, SECTORS, seed, surfaceHeight, updateDeposit, WATER_Y, type OceanGeometryFrame, type PlumeVolume, type SolidBuffers, type XYZ } from './geometry3d.ts';

export const FLOW_SEGMENTS = 96;
export const FLOW_SIDES = 24;
export const COASTAL_PIECES = 50;
export type LavaEntry = { point: XYZ; distance: number; strength: number; seaward: [number, number] };
type Route = { source: XYZ; points: XYZ[]; slopes: number[]; fragments: XYZ[]; ground: Float32Array; length: number; bearing: number;
  branch?: { parent: number; distance: number; ground: Float32Array }; crossing?: Omit<LavaEntry, 'strength'> };
export type IslandFlow = { unit: AccretionUnit; route: Route; points: XYZ[]; fragments: XYZ[]; slopes: number[]; widths: number[]; heights: number[]; quench: number[]; arrivals: number[]; front: number; heat: number; feed: number; stage: number; entry?: LavaEntry };
export const APRON_ROWS = 8;
export const APRON_COLUMNS = 12;

/** One route per completed deposit and supply branch, not a growing frame cache.
 * Its emplacement surface stays fixed; subsequent deposits can bury it. */
const retained = new Map<string, Route>();
const headings = new Map<string, number>();
let terrain: SolidBuffers | undefined;
const groundFrames = new WeakMap<OceanGeometryFrame, Float32Array>();

/** Only the rendered top-contact heights are retained (2,561 floats per
 * completed route). Frames and their whole 24-contact lattices are not kept. */
function groundHeights(frame: OceanGeometryFrame) {
  let heights = groundFrames.get(frame);
  if (!heights) {
    terrain ??= depositBuffers();
    const positions = new Float32Array(terrain.positions), count = positions.length / 6;
    updateDeposit(positions, frame, frame.history.units.length - 1);
    heights = Float32Array.from({ length: count }, (_, i) => positions[i * 3 + 1]);
    groundFrames.set(frame, heights);
  }
  return heights;
}

/** Interpolate the very same two triangles of a radial deposit cell. A
 * cross-slope tangent plane would leave a wide body's banks suspended over
 * curved rock; an analytic envelope can also disagree with drawn triangles. */
function triangleGround(heights: Float32Array, x: number, z: number) {
  terrain ??= depositBuffers();
  const radius = Math.hypot(x, z), step = Math.PI * 2 / SECTORS;
  if (radius >= RADIUS) return 0;
  const angle = (Math.atan2(z, x) + Math.PI * 2) % (Math.PI * 2), sector = Math.min(SECTORS - 1, Math.floor(angle / step));
  const radial = radius * Math.cos(angle - (sector + .5) * step) / Math.cos(step / 2);
  const ring = Math.min(RINGS - 1, Math.floor(Math.pow(radial / RADIUS, 1 / 1.45) * RINGS));
  const vertex = (r: number, s: number) => r === 0 ? 0 : 1 + (r - 1) * SECTORS + s % SECTORS;
  const sample = (a: number, b: number, c: number) => {
    const p = terrain!.positions, ax = p[a * 3], az = p[a * 3 + 2], bx = p[b * 3], bz = p[b * 3 + 2], cx = p[c * 3], cz = p[c * 3 + 2];
    const d = (bz - cz) * (ax - cx) + (cx - bx) * (az - cz);
    const u = ((bz - cz) * (x - cx) + (cx - bx) * (z - cz)) / d;
    const v = ((cz - az) * (x - cx) + (ax - cx) * (z - cz)) / d;
    return { inside: u >= -1e-6 && v >= -1e-6 && u + v <= 1.000001, height: u * heights[a] + v * heights[b] + (1 - u - v) * heights[c] };
  };
  const a = vertex(ring, sector), b = vertex(ring, sector + 1), c = vertex(ring + 1, sector + 1), d = vertex(ring + 1, sector);
  if (ring === 0) return sample(0, c, d).height;
  const first = sample(a, b, c);
  return first.inside ? first.height : sample(a, c, d).height;
}

const inverseSmooth = (g: number) => .5 - Math.sin(Math.asin(1 - 2 * clamp(g)) / 3);

/** Both front remapping and deposit growth are smooth ramps. Inverting both
 * gives each fixed surface station its own arrival, rather than darkening a
 * whole underwater ribbon at once. Core heat remains the original unit heat. */
export function islandFlowSurfaceAge(progress: number, unit: AccretionUnit, distance: number, length: number) {
  const growth = inverseSmooth((distance / length - .025) / .975) * .94;
  const arrival = unit.start + inverseSmooth(growth) * (unit.end - unit.start);
  return { arrival, crust: ramp(progress, arrival + .0006, arrival + .012) };
}

function routePoint(route: Route, distance: number): XYZ {
  const q = clamp(distance / route.length) * FLOW_SEGMENTS, i = Math.min(FLOW_SEGMENTS - 1, Math.floor(q)), t = q - i;
  return route.points[i].map((v, axis) => v * (1 - t) + route.points[i + 1][axis] * t) as XYZ;
}

/** Four of the original underwater supplies open shorter lateral lobes. They
 * remain finite geological episodes, not recurring ambient-detail emissions. */
const sideBreakouts = new Map([[1, -.86], [4, .94], [8, -.96], [11, .88]]);
export const islandPrimarySupply = (index: number) => sideBreakouts.has(index) ? index - 1 : index;

/** Freeze the initial heading against the terrain present when this supply
 * begins. New deposits may choose a lower neighbouring flank; an already
 * advancing flow never sweeps around in response to the display clock. */
export function islandRouteBearing(frame: OceanGeometryFrame, index: number): number {
  if (index === 0 || index >= 14) return islandFlowBearing(index);
  const key = `${frame.supply}:${index}`, cached = headings.get(key);
  if (cached !== undefined) return cached;
  const turn = sideBreakouts.get(index);
  let bearing: number;
  if (turn !== undefined) bearing = islandRouteBearing(frame, index - 1) + turn;
  else {
    let previous = index - 1;
    while (sideBreakouts.has(previous)) previous--;
    const prior = islandRouteBearing(frame, previous), unit = frame.history.units[index];
    const birth = oceanGeometryFrame(unit.start, 'island', frame.supply), source = islandVentOrigin(birth);
    let minimum = Infinity; bearing = prior;
    for (let choice = -4; choice <= 4; choice++) {
      const offset = choice * .28, angle = prior + offset, dx = Math.cos(angle), dz = Math.sin(angle);
      let cost = .028 * offset * offset;
      for (const [distance, weight] of [[.40, .44], [.85, .34], [1.45, .22]]) {
        cost += weight * (surfaceHeight(birth, source[0] + dx * distance, source[2] + dz * distance) - source[1]);
      }
      if (cost < minimum) { minimum = cost; bearing = angle; }
    }
  }
  headings.set(key, bearing); return bearing;
}

function suppliedRoute(frame: OceanGeometryFrame, unit: AccretionUnit): Route {
  if (unit.growth < 1) return traceRoute(frame, unit);
  const key = `${frame.supply}:${unit.index}`;
  let route = retained.get(key);
  if (!route) {
    route = traceRoute(oceanGeometryFrame(unit.end, 'island', frame.supply), unit);
    retained.set(key, route);
  }
  return route;
}

/** Erosion removes the retained skin with its supporting rock. Later positive
 * deposition may bury it, but cannot hoist an old trail onto the new surface. */
export function retainedSurfaceHeight(frame: OceanGeometryFrame, x: number, z: number, emplaced: number, thickness = 0, clearance = .018) {
  return Math.min(emplaced, surfaceHeight(frame, x, z) + clearance) + thickness;
}

/** A bounded surface-following teaching channel. Small lateral choices follow
 * lower nearby rock; this does not solve pressure, viscosity or channel erosion. */
function traceRoute(frame: OceanGeometryFrame, unit: AccretionUnit): Route {
  const side = sideBreakouts.has(unit.index), parent = side ? suppliedRoute(frame, frame.history.units[unit.index - 1]) : undefined;
  const branch = parent ? { parent: unit.index - 1, distance: parent.length * .26, ground: parent.ground } : undefined;
  const source = parent ? routePoint(parent, branch!.distance) : islandVentOrigin(frame);
  const bearing = islandRouteBearing(frame, unit.index);
  const ground = groundHeights(frame);
  const dx = Math.cos(bearing), dz = Math.sin(bearing), length = Math.min(RADIUS * .88, unit.width * SCALE * .94) * (side ? .47 : 1);
  const points: XYZ[] = [], slopes: number[] = [], bend = (seed(unit.index, 811) - .5) * .32;
  let lateral = 0;
  for (let i = 0; i <= FLOW_SEGMENTS; i++) {
    const q = i / FLOW_SEGMENTS, distance = length * q;
    const base = bend * q * q + Math.sin(q * 5.2 + unit.index) * .045 * q;
    if (i > 1) {
      const x = source[0] + dx * distance - dz * (base + lateral), z = source[2] + dz * distance + dx * (base + lateral);
      const sideSlope = (surfaceHeight(frame, x - dz * .04, z + dx * .04) - surfaceHeight(frame, x + dz * .04, z - dx * .04)) / .08;
      // Continuous steering avoids a path jumping between discrete low samples
      // when a tiny progress change makes two candidates exchange rank.
      lateral -= .027 * Math.tanh(sideSlope * .8 + lateral * .30);
    }
    const x = source[0] + dx * distance - dz * (base + lateral), z = source[2] + dz * distance + dx * (base + lateral);
    const current = surfaceHeight(frame, x, z), neck = branch ? 1 - ramp(distance, .08, .42) : 0;
    const supporting = branch ? current * (1 - neck) + Math.min(current, triangleGround(branch.ground, x, z)) * neck : current;
    points.push([x, supporting + .018, z]);
    slopes.push((surfaceHeight(frame, x - dz * .08, z + dx * .08) - surfaceHeight(frame, x + dz * .08, z - dx * .08)) / .16);
  }
  const route: Route = { source, points, slopes, fragments: [], ground, length, bearing, branch };
  // Emergence alone is insufficient: the flow must cross the actual sea plane.
  if (points[0][1] > WATER_Y + .015) {
    const index = points.findIndex((p, i) => i > 0 && p[1] <= WATER_Y && points[i - 1][1] > WATER_Y);
    if (index > 0) {
      let a = (index - 1) / FLOW_SEGMENTS * length, b = index / FLOW_SEGMENTS * length;
      for (let i = 0; i < 15; i++) {
        const m = (a + b) / 2, p = routePoint(route, m);
        if (surfaceHeight(frame, p[0], p[2]) + .018 > WATER_Y) a = m; else b = m;
      }
      const distance = (a + b) / 2, p = routePoint(route, distance);
      const before = routePoint(route, Math.max(0, distance - .03)), after = routePoint(route, distance + .03);
      const span = Math.hypot(after[0] - before[0], after[2] - before[2]) || 1;
      route.crossing = { point: [p[0], WATER_Y, p[2]], distance, seaward: [(after[0] - before[0]) / span, (after[2] - before[2]) / span] };
      route.fragments = Array.from({ length: 10 }, (_, piece) => {
        const p = routePoint(route, distance + .055 + piece * .057), index = (unit.index - 19) * 10 + piece;
        const side = (seed(index, 823) - .5) * .27, x = p[0] - dz * side, z = p[2] + dx * side;
        return [x, surfaceHeight(frame, x, z) + .018, z];
      });
    }
  }
  return route;
}

export function islandFlows(frame: OceanGeometryFrame): IslandFlow[] {
  if (frame.environment !== 'island') return [];
  return frame.history.units.filter(u => u.growth > .00001 && u.phase !== 'shallow-fragments').map(unit => {
    const route = suppliedRoute(frame, unit);
    const front = route.length * (.025 + .975 * ramp(unit.growth, 0, .94));
    const heat = Math.sin(unit.growth * Math.PI) * 1.20;
    const points = Array.from({ length: FLOW_SEGMENTS + 1 }, (_, i) => {
      const p = routePoint(route, front * i / FLOW_SEGMENTS);
      return [p[0], retainedSurfaceHeight(frame, p[0], p[2], p[1]), p[2]] as XYZ;
    });
    const fragments = route.fragments.map(p => [p[0], retainedSurfaceHeight(frame, p[0], p[2], p[1]), p[2]] as XYZ);
    const slopes = points.map((_, i) => {
      const q = front / route.length * i, a = Math.min(FLOW_SEGMENTS - 1, Math.floor(q)), t = q - a;
      return route.slopes[a] * (1 - t) + route.slopes[a + 1] * t;
    });
    const stage = unit.phase === 'lava-cap' ? 1 : 0;
    const feed = ramp(unit.growth, .002, .08) * (1 - ramp(unit.growth, .90, 1));
    const ages = points.map((_, i) => islandFlowSurfaceAge(frame.p, unit, front * i / FLOW_SEGMENTS, route.length));
    const widths = points.map((_, i) => {
      const q = i / FLOW_SEGMENTS;
      if (!stage) {
        const distance = front * q, nose = ramp(distance, front - Math.min(.32, front * .35), front);
        const cap = Math.sqrt(Math.max(.015, 1 - nose * nose)), neck = .90 + .10 * ramp(distance, 0, .34);
        const lobes = 1 + .13 * Math.sin(distance * 12 + unit.index * 1.7) + .045 * Math.sin(distance * 23 - unit.index);
        return (.225 + seed(unit.index, 819) * .03) * neck * cap * lobes * (route.branch ? .60 : 1);
      }
      return (.087 + seed(unit.index, 819) * .046) * Math.pow(Math.max(.006, Math.sin(q * Math.PI)), .27)
        * (1 + .22 * Math.sin(q * 12 + unit.index) + .10 * Math.sin(q * 27 - unit.index));
    });
    const warm = clamp(heat), heights = widths.map((width, i) => stage ? width * (.14 + warm * .62) : (() => {
      const distance = front * i / FLOW_SEGMENTS, nose = ramp(distance, front - Math.min(.32, front * .35), front);
      const cap = Math.sqrt(Math.max(.015, 1 - nose * nose));
      const live = (.132 + seed(unit.index, 821) * .034) * (route.branch ? .80 : 1) * (.86 + .14 * ramp(distance, 0, .28))
        * (1 + .065 * Math.sin(distance * 12 + unit.index * 1.7)) * cap;
      return .025 * cap + warm * (live - .025 * cap);
    })());
    const quench = points.map((p, i) => ramp(WATER_Y - p[1], -.03, .08) * (stage
      ? .45 + .55 * ramp(1 - i / FLOW_SEGMENTS, 0, .16) : ages[i].crust));
    const crossing = route.crossing;
    const strength = crossing ? heat * ramp(front, crossing.distance, crossing.distance + .20) : 0;
    const entry = crossing && strength > .001 ? { ...crossing, strength } : undefined;
    return { unit, route, points, fragments, slopes, widths, heights, quench, arrivals: ages.map(a => a.arrival), front, heat, feed, stage, entry };
  });
}

let flowFootprints: { x: number; z: number; radius: number }[] | undefined;
/** Static dressing reserves both supply histories before playback. A generous
 * path envelope includes outlet migration and the gaps between sampled points;
 * approaching lava never triggers a decorative rock's disappearance. */
export function islandFlowClearance(x: number, z: number, margin: number) {
  if (!flowFootprints) {
    flowFootprints = [];
    for (const supply of ['sustained', 'limited'] as const) {
      for (const flow of islandFlows(oceanGeometryFrame(.8, 'island', supply))) {
        for (let i = 0; i < flow.route.points.length; i += 4) {
          const point = flow.route.points[i];
          flowFootprints.push({ x: point[0], z: point[2], radius: .32 + (flow.route.branch ? .20 : flow.stage ? .17 : .31) });
        }
      }
    }
  }
  return flowFootprints.some(point => Math.hypot(x - point.x, z - point.z) < margin + point.radius);
}

/** Closed D sections have a broad ground-contacting underside, a rounded
 * advancing nose and unequal connected lobes. UV's seam is on the underside;
 * cos(2πu)>0 identifies the upper skin for the shared material. */
export function islandFlowBuffers(): SolidBuffers & { source: Float32Array; quench: Float32Array; distance: Float32Array; stage: Float32Array } {
  const ringCount = (FLOW_SEGMENTS + 1) * FLOW_SIDES, count = ringCount + 2, indices: number[] = [];
  const source = new Float32Array(count * 3), uvs = new Float32Array(count * 2);
  for (let row = 0; row <= FLOW_SEGMENTS; row++) for (let side = 0; side < FLOW_SIDES; side++) {
    const u = side / FLOW_SIDES - .5, angle = u * Math.PI * 2, index = row * FLOW_SIDES + side;
    source.set([Math.sin(angle), row / FLOW_SEGMENTS - .5, Math.cos(angle)], index * 3);
    uvs.set([u, row / FLOW_SEGMENTS], index * 2);
    if (row < FLOW_SEGMENTS) {
      const a = index, b = row * FLOW_SIDES + (side + 1) % FLOW_SIDES, c = b + FLOW_SIDES, d = a + FLOW_SIDES;
      indices.push(a, b, c, a, c, d);
    }
  }
  for (let cap = 0; cap < 2; cap++) {
    source.set([0, cap - .5, .25], (ringCount + cap) * 3); uvs.set([0, cap], (ringCount + cap) * 2);
    const row = cap * FLOW_SEGMENTS * FLOW_SIDES;
    for (let side = 0; side < FLOW_SIDES; side++) {
      const a = row + side, b = row + (side + 1) % FLOW_SIDES;
      indices.push(ringCount + cap, cap ? a : b, cap ? b : a);
    }
  }
  return { positions: new Float32Array(count * 3), indices, uvs, source, quench: new Float32Array(count), distance: new Float32Array(count), stage: new Float32Array(count) };
}

export function updateIslandFlow(data: ReturnType<typeof islandFlowBuffers>, flow: IslandFlow, frame: OceanGeometryFrame) {
  const currentGround = groundHeights(frame);
  for (let i = 0; i < data.distance.length; i++) {
    const row = Math.round((data.source[i * 3 + 1] + .5) * FLOW_SEGMENTS), p = flow.points[row];
    const before = flow.points[Math.max(0, row - 1)], after = flow.points[Math.min(FLOW_SEGMENTS, row + 1)];
    const dx = after[0] - before[0], dz = after[2] - before[2], length = Math.hypot(dx, dz) || 1;
    const across = data.source[i * 3] * flow.widths[row], top = Math.max(0, data.source[i * 3 + 2]);
    const x = p[0] - dz / length * across, z = p[2] + dx / length * across;
    const current = triangleGround(currentGround, x, z), emplaced = triangleGround(flow.route.ground, x, z);
    const neck = flow.route.branch ? 1 - ramp(flow.front * row / FLOW_SEGMENTS, .08, .42) : 0;
    const connected = flow.route.branch ? emplaced * (1 - neck) + Math.min(emplaced, triangleGround(flow.route.branch.ground, x, z)) * neck : emplaced;
    const ground = Math.min(connected, current);
    // Bury the complete lower face, including its triangle interiors. Its
    // different triangulation may bridge a small terrain crease between
    // contact vertices; the upper crown retains its .014 display offset.
    data.positions.set([x, ground - .040 + top * (flow.heights[row] + .026), z], i * 3);
    data.quench[i] = top > .01 ? clamp(flow.quench[row] + (1 - top) * .18) : 1;
    data.distance[i] = flow.front * row / FLOW_SEGMENTS; data.stage[i] = flow.stage;
  }
}

/** Fifty retained pieces belong to the five cap deposits, not an endlessly
 * recycled explosion. They depict chilled/fragmented flow on the seaward slope. */
export function coastalPiece(flows: IslandFlow[], index: number) {
  const unitIndex = 19 + Math.floor(index / 10), flow = flows.find(f => f.unit.index === unitIndex), piece = index % 10;
  if (!flow?.route.crossing) return { visible: false, position: [0, 0, 0] as XYZ, scale: 0, rotation: [0, 0, 0] as XYZ };
  const distance = flow.route.crossing.distance + .055 + piece * .057;
  const growth = ramp(flow.front, distance, distance + .13), p = flow.fragments[piece];
  return { visible: growth > 0, position: p,
    scale: (.034 + seed(index, 827) * .045) * Math.cbrt(growth),
    rotation: [seed(index, 829) * 6, seed(index, 831) * 6, seed(index, 833) * 6] as XYZ };
}

/** A thin rough coastal facies belongs to each existing cap deposit. Its closed
 * renderer shows an irregular chilled toe, not a separately accumulated delta.
 * Geological growth advances it once; the material phase cannot enlarge it. */
export function coastalApronPoint(frame: OceanGeometryFrame, flow: IslandFlow, row: number, column: number, lower = false): XYZ {
  const crossing = flow.route.crossing;
  if (!crossing) return [0, 0, 0];
  const progress = ramp(flow.front, crossing.distance, crossing.distance + .60), q = row / APRON_ROWS;
  const distance = crossing.distance - .12 + q * (.16 + .67 * progress), p = routePoint(flow.route, distance);
  const along = clamp(distance / flow.route.length) * FLOW_SEGMENTS, i = Math.min(FLOW_SEGMENTS - 1, Math.floor(along)), t = along - i;
  const slope = flow.route.slopes[i] * (1 - t) + flow.route.slopes[i + 1] * t;
  const across = column / APRON_COLUMNS * 2 - 1, [dx, dz] = crossing.seaward;
  const width = (.18 + .13 * Math.sin(q * Math.PI) + .035 * Math.sin(q * 13 + flow.unit.index)) * Math.sqrt(progress);
  const lateral = across * width, x = p[0] - dz * lateral, z = p[2] + dx * lateral;
  const base = retainedSurfaceHeight(frame, x, z, p[1] + slope * lateral);
  const relief = .015 + progress * (1 - across * across) * (.026 + .025 * Math.sin(q * 17 + across * 9 + flow.unit.index) ** 2);
  return [x, base + (lower ? -.024 : relief), z];
}

/** Existing 16 optical supports retain their medium identity. Only real hot
 * coast contacts get condensed droplets above water and fine debris below it. */
export function coastalParcels(frame: OceanGeometryFrame, flows: IslandFlow[]): PlumeVolume[] {
  const parcels = oceanParcels(frame);
  // Eight connected supports depict the dominant contact. Dividing them among
  // overlapping episodes leaves separated puffs and loses the narrow source.
  const entries = flows.filter(f => f.entry).map(f => f.entry!).sort((a, b) => b.strength - a.strength).slice(0, 1);
  if (!entries.length) return parcels;
  for (let i = 0; i < 8; i++) {
    const entry = entries[i % entries.length], q = Math.floor(i / entries.length) / (8 / entries.length - 1), strength = Math.min(1, entry.strength);
    const radius = .105 + q * .26, [dx, dz] = entry.seaward, drift = q * .32 + q * q * .75;
    const crosswind = Math.sin(q * 5 + frame.p * 13) * q * .07 + q * q * .15;
    parcels[i] = { center: [entry.point[0] + dx * q * .30, WATER_Y - .04 - q * .40, entry.point[2] + dz * q * .30], radius: .065 + q * .14,
      axes: [1.25, .85, 1.08], density: strength * (1 - q * .72) * .85, medium: 'water' };
    parcels[i + 8] = { center: [entry.point[0] + dx * drift - dz * crosswind, WATER_Y + .045 + q * .95, entry.point[2] + dz * drift + dx * crosswind], radius,
      axes: [1.15, 1.2, 1], density: strength * (1 - q * .72) * 1.85, medium: 'air' };
  }
  return parcels;
}
