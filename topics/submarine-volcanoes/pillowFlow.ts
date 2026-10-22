import { clamp, pillowState, ramp, submarineState } from './model.ts';
import { oceanGeometryFrame, pillowPose, seed, surfaceHeight, type OceanGeometryFrame, type SolidBuffers, type XYZ } from './geometry3d.ts';

export const PILLOW_FLOW_ROWS = 64;
export const PILLOW_FLOW_SIDES = 20;
const ROUTE_STEPS = 80;
type Route = { source: [number, number]; points: [number, number][]; length: number };
const routes = new Map<number, Route>();
const inverseSmooth = (g: number) => .5 - Math.sin(Math.asin(1 - 2 * clamp(g)) / 3);

/** Fourteen finite emplacement paths. Their sites/supply remain the original
 * pillow history; the path follows the selected ground, not a projectile arc. */
function pillowRoute(index: number): Route {
  const cached = routes.get(index); if (cached) return cached;
  const born = .06 + index * .043, ground = oceanGeometryFrame(born + .09, 'deep', 'sustained');
  const pose = pillowPose(ground, index), outward = -pose.heading;
  const back = .12 + pose.radius * .14;
  const source: [number, number] = [pose.center[0] - Math.cos(outward) * back, pose.center[2] - Math.sin(outward) * back];
  const points: [number, number][] = [source], length = 1.18 + seed(index, 891) * .72;
  const step = length / ROUTE_STEPS;
  let heading = outward;
  for (let i = 1; i <= ROUTE_STEPS; i++) {
    const [x, z] = points[i - 1], e = .035;
    const gx = (surfaceHeight(ground, x + e, z) - surfaceHeight(ground, x - e, z)) / (2 * e);
    const gz = (surfaceHeight(ground, x, z + e) - surfaceHeight(ground, x, z - e)) / (2 * e);
    const downhill = Math.atan2(-gz, -gx), slope = Math.hypot(gx, gz);
    const mix = clamp(slope * 1.5) * .42;
    const preferred = Math.atan2(Math.sin(heading) * (1 - mix) + Math.sin(downhill) * mix,
      Math.cos(heading) * (1 - mix) + Math.cos(downhill) * mix) + .038 * Math.sin(i * .23 + index);
    let best = preferred, score = -Infinity;
    // Nearby directions preserve a connected tongue while avoiding an uphill
    // hop across the cleft or rough shoulder. Flat ground can spread laterally.
    const here = surfaceHeight(ground, x, z);
    for (const angle of [preferred, preferred - .35, preferred + .35, outward, outward - .6, outward + .6, downhill]) {
      if (Math.cos(angle - outward) < .35) continue;
      const drop = here - surfaceHeight(ground, x + Math.cos(angle) * step, z + Math.sin(angle) * step);
      const turn = Math.atan2(Math.sin(angle - preferred), Math.cos(angle - preferred));
      const value = drop * 4 - turn * turn * .001;
      if (value > score) { score = value; best = angle; }
    }
    heading = best; points.push([x + Math.cos(heading) * step, z + Math.sin(heading) * step]);
  }
  const route = { source, points, length }; routes.set(index, route); return route;
}

function sample(route: Route, distance: number): [number, number] {
  const q = clamp(distance / route.length) * ROUTE_STEPS, a = Math.min(ROUTE_STEPS - 1, Math.floor(q)), t = q - a;
  return route.points[a].map((n, axis) => n * (1 - t) + route.points[a + 1][axis] * t) as [number, number];
}

/** Static clearance for the old illustrative rock dressing. It is prepared
 * for every finite route, so background props never appear/disappear as a
 * front approaches and cannot cut through the newly represented lava body. */
export function pillowFlowCorridor(x: number, z: number, margin = .3) {
  for (let index = 0; index < 14; index++) {
    const route = pillowRoute(index);
    for (let i = 1; i < route.points.length; i++) {
      const a = route.points[i-1], b = route.points[i], dx = b[0]-a[0], dz = b[1]-a[1];
      const t = clamp(((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz));
      if ((x-a[0]-t*dx)**2+(z-a[1]-t*dz)**2 < margin*margin) return true;
    }
  }
  return false;
}

/** A point cools after the advancing front reaches it. The outside can quench
 * while the independently supplied core remains hot. These compressed ages are
 * an illustrative ordering, not a heat-transfer or viscosity measurement. */
export function pillowSurfaceAge(progress: number, index: number, distance: number, length: number) {
  const born = .06 + index * .043;
  const reachedGrowth = clamp((distance - .035) / (length - .035));
  const arrival = born + inverseSmooth(reachedGrowth) * .09;
  return { arrival, crust: ramp(progress, arrival + .002, arrival + .047) };
}

export function pillowFlow(frame: OceanGeometryFrame, index: number) {
  index = Number.isFinite(index) ? Math.max(0, Math.min(13, Math.floor(index))) : 0;
  const state = pillowState(frame.p, index), route = pillowRoute(index), born = .06 + index * .043;
  const p = Math.min(frame.p, born + .09);
  const support = p === frame.p ? frame : { ...frame, p, state: submarineState(p, 'deep', frame.supply) };
  const front = .035 + (route.length - .035) * state.growth;
  // A low tongue spreads onto the flank. It must not read as a chain of
  // inflated boulders; its feed can reopen thin skin while its margins quench.
  const feed = ramp(state.growth, .005, .09) * (1 - ramp(state.growth, .90, 1));
  const width = .205 + seed(index, 893) * .055, height = .115 + seed(index, 895) * .035;
  const rows = Array.from({ length: PILLOW_FLOW_ROWS + 1 }, (_, row) => {
    const distance = front * row / PILLOW_FLOW_ROWS, point = sample(route, distance);
    const before = sample(route, Math.max(0, distance - .025)), after = sample(route, Math.min(route.length, distance + .025));
    const dx = after[0] - before[0], dz = after[1] - before[1], norm = Math.hypot(dx, dz) || 1;
    const noseLength = Math.min(.27, front * .42), nose = ramp(distance, front - noseLength, front);
    const cap = Math.sqrt(Math.max(.0016, 1 - nose * nose));
    const neck = .36 + .64 * ramp(distance, 0, .26);
    const pressure = 1 + .065 * Math.sin(distance * 8 + index * 1.7) + .035 * Math.sin(distance * 19 - index);
    const age = pillowSurfaceAge(frame.p, index, distance, route.length);
    return { center: [point[0], surfaceHeight(support, point[0], point[1]), point[1]] as XYZ,
      across: [-dz / norm, dx / norm] as [number, number], distance,
      width: width * neck * cap * pressure, height: height * (.58 + .42 * neck) * cap,
      arrival: age.arrival, crust: age.crust };
  });
  const source = rows[0].center;
  const heading = Math.atan2(rows[1].center[2] - source[2], rows[1].center[0] - source[0]);
  const pitch = Math.atan2(rows[1].center[1] - source[1], Math.hypot(rows[1].center[0] - source[0], rows[1].center[2] - source[2]));
  return { index, ...state, feed, support, rows, source, front: rows.at(-1)!.center, length: route.length, distance: front, heading, pitch };
}
export type PillowFlow = ReturnType<typeof pillowFlow>;

/** Closed, finite terrain-contacting flow envelope. Only geological draws
 * update these buffers; the separate periodic phase moves surface folds. */
export function pillowFlowBuffers(): SolidBuffers & { crust: Float32Array; distance: Float32Array } {
  const ringCount = (PILLOW_FLOW_ROWS + 1) * PILLOW_FLOW_SIDES, count = ringCount + 2, indices: number[] = [];
  for (let row = 0; row < PILLOW_FLOW_ROWS; row++) for (let side = 0; side < PILLOW_FLOW_SIDES; side++) {
    const a = row * PILLOW_FLOW_SIDES + side, b = row * PILLOW_FLOW_SIDES + (side + 1) % PILLOW_FLOW_SIDES;
    const d = a + PILLOW_FLOW_SIDES, c = b + PILLOW_FLOW_SIDES;
    indices.push(a, d, c, a, c, b);
  }
  for (let side = 0; side < PILLOW_FLOW_SIDES; side++) {
    const next = (side + 1) % PILLOW_FLOW_SIDES, last = PILLOW_FLOW_ROWS * PILLOW_FLOW_SIDES;
    indices.push(ringCount, side, next, ringCount + 1, last + next, last + side);
  }
  return { positions: new Float32Array(count * 3), uvs: new Float32Array(count * 2), indices,
    crust: new Float32Array(count), distance: new Float32Array(count) };
}

export function updatePillowFlow(data: ReturnType<typeof pillowFlowBuffers>, flow: PillowFlow, geometry = true) {
  const { positions, uvs, crust, distance } = data;
  for (let row = 0; row <= PILLOW_FLOW_ROWS; row++) {
    const station = flow.rows[row];
    for (let side = 0; side < PILLOW_FLOW_SIDES; side++) {
      const angle = side / PILLOW_FLOW_SIDES * Math.PI * 2, lateral = Math.cos(angle) * station.width;
      const x = station.center[0] + station.across[0] * lateral, z = station.center[2] + station.across[1] * lateral;
      const top = (1 + Math.sin(angle)) / 2;
      const i = row * PILLOW_FLOW_SIDES + side;
      if (geometry) {
        positions.set([x, surfaceHeight(flow.support, x, z) - .016 + top * station.height, z], i * 3);
        uvs.set([side / PILLOW_FLOW_SIDES, station.distance / flow.length], i * 2); distance[i] = station.distance;
      }
      crust[i] = clamp(station.crust + (1 - top) * .20);
    }
  }
  const ringCount = (PILLOW_FLOW_ROWS + 1) * PILLOW_FLOW_SIDES;
  for (let cap = 0; cap < 2; cap++) {
    const station = flow.rows[cap ? PILLOW_FLOW_ROWS : 0], i = ringCount + cap;
    if (geometry) {
      positions.set([station.center[0], station.center[1] - .016 + station.height / 2, station.center[2]], i * 3);
      uvs.set([.25, station.distance / flow.length], i * 2); distance[i] = station.distance;
    }
    crust[i] = station.crust;
  }
}
