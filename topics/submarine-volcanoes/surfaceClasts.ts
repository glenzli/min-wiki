import { islandAccretion, ramp } from './model.ts';
import { islandFlowBearing, islandVentSite } from './islandGrowth.ts';
import { seed, surfaceHeight, type OceanGeometryFrame, type XYZ } from './geometry3d.ts';

export const ISLAND_CLASTS = 160;
const SITES = islandAccretion(.8).units.map(unit => islandVentSite(islandAccretion(unit.end)));

/** Sparse angular facies belong to a particular deposit. They can emerge within
 * that layer, be buried by later rock and be truncated by erosion; they never
 * ride up onto every new surface. This is surface texture, not a clast solver. */
export function islandClast(frame: OceanGeometryFrame, index: number) {
  const unitIndex = 14 + index % 10, unit = frame.history.units[unitIndex];
  const [cx, cz] = SITES[unitIndex], heading = islandFlowBearing(unitIndex);
  const angle = heading + (seed(index, 811) - .5) * (unitIndex < 19 ? 4.6 : 1.4);
  const radius = .48 + seed(index, 813) ** .65 * (unitIndex < 19 ? 2.15 : 2.9);
  const x = cx + Math.cos(angle) * radius, z = cz + Math.sin(angle) * radius;
  const size = .019 + seed(index, 815) ** 3 * .062;
  const growth = unit ? ramp(unit.growth, .08, .70) : 0;
  const base = surfaceHeight(frame, x, z, unitIndex + 1);
  const top = surfaceHeight(frame, x, z);
  // Conservative bound includes tilted corners. Depth occlusion buries the
  // actual solid before its instance can be culled, avoiding a visible pop.
  const buried = top >= base + size * 1.2;
  const visible = frame.environment === 'island' && growth > 0 && !buried;
  return { unit: unitIndex, visible, buried,
    position: [x, base - size * (.36 - .12 * growth), z] as XYZ,
    dimensions: [size * (1.3 + seed(index, 817) * .7), size * .43 * growth, size * (.6 + seed(index, 819) * .4)] as XYZ,
    rotation: [(seed(index, 821) - .5) * .45, angle + seed(index, 823), (seed(index, 825) - .5) * .5] as XYZ };
}
