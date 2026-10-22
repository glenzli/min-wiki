import { RADIUS, surfaceHeight, WATER_Y, type OceanGeometryFrame } from './geometry3d.ts';

export const COASTLINE_SAMPLES = 160;
export const COASTLINE_SURF_LIFT = .006;
const RADIAL_STEPS = 96;
const ROOT_STEPS = 18;
const directions = new Float64Array(COASTLINE_SAMPLES * 2);
for (let i = 0; i < COASTLINE_SAMPLES; i++) {
  const angle = i / COASTLINE_SAMPLES * Math.PI * 2;
  directions[i * 2] = Math.cos(angle); directions[i * 2 + 1] = Math.sin(angle);
}

export type CoastlinePoint = { active: boolean; x: number; y: number; z: number; radius: number; width: number };
export type CoastlineSample = { active: boolean; exposure: number; points: CoastlinePoint[] };

/** One retained set of angular slots; the GPU owner reuses it through seeks. */
export function createCoastlineSample(): CoastlineSample {
  return { active: false, exposure: 0, points: Array.from({ length: COASTLINE_SAMPLES }, () =>
    ({ active: false, x: 0, y: WATER_Y, z: 0, radius: 0, width: .05 })) };
}

/** Outermost land-to-water crossing on each ray, including off-axis relief.
 * The bounded radial search admits a submerged center and separate shoulders;
 * it does not infer a circular shore from the authored section's summit flag.
 * Width and sampling density are illustrative, not a coastal-wave solver. */
export function sampleCoastline(frame: OceanGeometryFrame, target = createCoastlineSample()): CoastlineSample {
  target.active = false; target.exposure = 0;
  for (const point of target.points) {
    point.active = false; point.x = point.z = point.radius = 0; point.y = WATER_Y; point.width = .05;
  }
  if (frame.environment !== 'island' || frame.supply !== 'sustained') return target;

  let activeCount = 0;
  for (let i = 0; i < COASTLINE_SAMPLES; i++) {
    const dx = directions[i * 2], dz = directions[i * 2 + 1];
    let outer = RADIUS;
    for (let step = RADIAL_STEPS - 1; step >= 0; step--) {
      const radius = RADIUS * step / RADIAL_STEPS;
      if (surfaceHeight(frame, dx * radius, dz * radius) <= WATER_Y) { outer = radius; continue; }
      let inner = radius;
      for (let root = 0; root < ROOT_STEPS; root++) {
        const mid = (inner + outer) / 2;
        if (surfaceHeight(frame, dx * mid, dz * mid) > WATER_Y) inner = mid; else outer = mid;
      }
      const point = target.points[i];
      // Use the water side of the bracket so the thin ribbon starts seaward.
      point.active = target.active = true; activeCount++; point.radius = outer;
      point.x = dx * outer; point.z = dz * outer;
      const variation = .5 + .31 * Math.sin(point.x * 4.7 + point.z * 6.1) + .19 * Math.sin(point.z * 12.7 - point.x * 5.2);
      point.width = .05 + .08 * Math.min(1, Math.max(0, variation));
      break;
    }
  }
  target.exposure = activeCount / COASTLINE_SAMPLES;
  return target;
}
