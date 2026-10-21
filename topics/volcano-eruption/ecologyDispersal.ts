import { seed } from './magmaGeometry.ts';
import { smooth } from './model.ts';
import { bounded } from './projectModel.ts';

export type DispersalPoint = [number, number, number];
export type DispersalSurface = (x: number, z: number) => number;

/** A sparse visual sample of the existing 100 ecological site identities.
 * Arrival thresholds are unchanged. Only a short final approach is shown,
 * rather than drawing the entire seed-supply interval as a shower overhead.
 * Coordinates use the land scenes' display world units, not measured metres.
 * This is bounded illustrative transport, not a wind or species model. */
export function seedDispersal(index: number, ecologyProgress: number, target: DispersalPoint, surface?: DispersalSurface) {
  const p = bounded(ecologyProgress);
  const arrivalStart = .28 + seed(index + 21) * .15;
  const arrivalEnd = .56 + seed(index + 21) * .15;
  const arrival = smooth(arrivalStart, arrivalEnd, p);
  const approachStart = arrivalEnd - (.011 + seed(index + 1021) * .009);
  const hideAt = arrivalEnd + .004 + seed(index + 2044) * .006;
  const u = smooth(approachStart, arrivalEnd, p), remaining = 1 - u;
  const direction = .20 + (seed(index + 3491) - .5) * .62;
  const dx = Math.cos(direction), dz = Math.sin(direction);
  const travel = .25 + seed(index + 1431) * .37;
  const bend = Math.sin(u * Math.PI) * (seed(index + 2741) - .5) * .058
    + Math.sin(u * Math.PI * 2) * u * remaining * .018;
  const x = target[0] - dx * travel * remaining - dz * bend;
  const z = target[2] - dz * travel * remaining + dx * bend;
  const drifting = seed(index + 4322) > .48;
  const clearance = drifting
    ? remaining * (.022 + seed(index + 6211) * .036) * (.72 + .28 * Math.sin(u * Math.PI + seed(index + 7713)))
    : remaining * (.002 + Math.sin(u * Math.PI * (2 + seed(index + 7211))) ** 2 * .011);
  const ground = surface ? target[1] + surface(x, z) - surface(target[0], target[2]) : target[1];
  const settled = p >= arrivalEnd;
  const position: DispersalPoint = settled ? [...target] : [x, ground + clearance, z];
  const opacity = smooth(approachStart, approachStart + .002, p) * (1 - smooth(hideAt - .003, hideAt, p));
  return { index, arrival, arrivalStart, arrivalEnd, settled, position, opacity,
    visible: index % 4 === 0 && p > approachStart && p < hideAt,
    size: .003 + seed(index + 5391) * .0025,
    angle: Math.atan2(dx, dz), route: drifting ? 'drift' as const : 'near-ground' as const };
}

/** SVG has no depth buffer. Test its oblique sightline against the same land
 * height sampler so a seed in the bowl cannot draw through the near rim.
 * WebGL consumers use their normal terrain depth test instead. */
export function seedHiddenByTerrain(position: DispersalPoint, surface: DispersalSurface, towardEye: DispersalPoint, reach = 12) {
  const norm = Math.hypot(...towardEye) || 1;
  for (let i = 1; i <= 64; i++) {
    const distance = i / 64 * reach;
    const x = position[0] + towardEye[0] / norm * distance;
    const y = position[1] + towardEye[1] / norm * distance;
    const z = position[2] + towardEye[2] / norm * distance;
    if (surface(x, z) > y + .0004) return true;
  }
  return false;
}
