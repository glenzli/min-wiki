import { clamp, ramp, type AccretionUnit } from './model.ts';
import { islandFlowBearing } from './islandGrowth.ts';
import { islandVentOrigin, oceanGeometryFrame, oceanParcels, RADIUS, SCALE, seed, surfaceHeight, WATER_Y, type OceanGeometryFrame, type PlumeVolume, type XYZ } from './geometry3d.ts';

export const FLOW_SEGMENTS = 96;
export const COASTAL_PIECES = 50;
export type LavaEntry = { point: XYZ; distance: number; strength: number; seaward: [number, number] };
type Route = { source: XYZ; points: XYZ[]; slopes: number[]; fragments: XYZ[]; length: number; crossing?: Omit<LavaEntry, 'strength'> };
export type IslandFlow = { unit: AccretionUnit; route: Route; points: XYZ[]; fragments: XYZ[]; slopes: number[]; widths: number[]; quench: number[]; front: number; heat: number; entry?: LavaEntry };
export const APRON_ROWS = 8;
export const APRON_COLUMNS = 12;

/** One route per completed deposit and supply branch, not a growing frame cache.
 * Its emplacement surface stays fixed; subsequent deposits can bury it. */
const retained = new Map<string, Route>();

function routePoint(route: Route, distance: number): XYZ {
  const q = clamp(distance / route.length) * FLOW_SEGMENTS, i = Math.min(FLOW_SEGMENTS - 1, Math.floor(q)), t = q - i;
  return route.points[i].map((v, axis) => v * (1 - t) + route.points[i + 1][axis] * t) as XYZ;
}

/** Erosion removes the retained skin with its supporting rock. Later positive
 * deposition may bury it, but cannot hoist an old trail onto the new surface. */
export function retainedSurfaceHeight(frame: OceanGeometryFrame, x: number, z: number, emplaced: number, thickness = 0, clearance = .018) {
  return Math.min(emplaced, surfaceHeight(frame, x, z) + clearance) + thickness;
}

/** A bounded surface-following teaching channel. Small lateral choices follow
 * lower nearby rock; this does not solve pressure, viscosity or channel erosion. */
function traceRoute(frame: OceanGeometryFrame, unit: AccretionUnit): Route {
  const source = islandVentOrigin(frame), bearing = islandFlowBearing(unit.index);
  const dx = Math.cos(bearing), dz = Math.sin(bearing), length = Math.min(RADIUS * .88, unit.width * SCALE * .94);
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
    points.push([x, surfaceHeight(frame, x, z) + .018, z]);
    slopes.push((surfaceHeight(frame, x - dz * .08, z + dx * .08) - surfaceHeight(frame, x + dz * .08, z - dx * .08)) / .16);
  }
  const route: Route = { source, points, slopes, fragments: [], length };
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
    let route: Route;
    if (unit.growth === 1) {
      const key = `${frame.supply}:${unit.index}`;
      route = retained.get(key)!;
      if (!route) { route = traceRoute(oceanGeometryFrame(unit.end, 'island', frame.supply), unit); retained.set(key, route); }
    } else route = traceRoute(frame, unit);
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
    const widths = points.map((_, i) => {
      const q = i / FLOW_SEGMENTS;
      return (.087 + seed(unit.index, 819) * .046) * Math.pow(Math.max(.006, Math.sin(q * Math.PI)), .27)
        * (1 + .22 * Math.sin(q * 12 + unit.index) + .10 * Math.sin(q * 27 - unit.index));
    });
    const quench = points.map((p, i) => ramp(WATER_Y - p[1], -.03, .08) * (.45 + .55 * ramp(1 - i / FLOW_SEGMENTS, 0, .16)));
    const crossing = route.crossing;
    const strength = crossing ? heat * ramp(front, crossing.distance, crossing.distance + .20) : 0;
    const entry = crossing && strength > .001 ? { ...crossing, strength } : undefined;
    return { unit, route, points, fragments, slopes, widths, quench, front, heat, entry };
  });
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
