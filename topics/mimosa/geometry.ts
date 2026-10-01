import { response, type TouchSettings } from './model.ts';

export type PlantPoint = [number, number];
export const PINNA_ANGLES = [-2.95, -2.12, -1.37, -.52] as const;
export const PINNA_LENGTHS = [223, 257, 245, 213] as const;
export { OBSERVED_PAIR } from './model.ts';

/** A qualitative planar projection, not an elastic-tissue or three-dimensional solver. */
export function plantPose(progress: number, settings: TouchSettings) {
  const primary: PlantPoint = [40, 110];
  const petiole: PlantPoint = [-48, -68];
  const rotation = -.45 * response(progress, settings).droop;
  return { primary, petiole, rotation };
}

/** Coordinates relative to the pinna junction; the whole compound leaf shares one joint. */
export function compoundPoint(point: PlantPoint, pose: ReturnType<typeof plantPose>): PlantPoint {
  const x = pose.petiole[0] + point[0], y = pose.petiole[1] + point[1];
  const c = Math.cos(pose.rotation), s = Math.sin(pose.rotation);
  return [pose.primary[0] + x * c - y * s, pose.primary[1] + x * s + y * c];
}

export function leafletBase(pinna: number, pair: number): PlantPoint {
  const length = PINNA_LENGTHS[pinna], x = 25 + pair * (length - 33) / 12;
  return [x, Math.sin(x / length * Math.PI) * (-3 + pinna * 2)];
}

export function pinnaPoint(point: PlantPoint, pinna: number, pose: ReturnType<typeof plantPose>): PlantPoint {
  const a = PINNA_ANGLES[pinna];
  return compoundPoint([point[0] * Math.cos(a) - point[1] * Math.sin(a), point[0] * Math.sin(a) + point[1] * Math.cos(a)], pose);
}
