/** Ideal 100 g pure-water sample at its melting point at ordinary pressure.
 * Only latent heat is modeled. Stop at the phase boundary; no further warming/cooling.
 */
export type HeatCondition = 'warm' | 'cold' | 'insulated';
export interface HeatSegment { initialLiquid: number; condition: HeatCondition }
export const WATER_MASS = 100;
export const FUSION_HEAT = 334; // J/g, rounded reference value
const fraction = (n: number) => Math.max(0, Math.min(1, Number.isFinite(n) ? n : 0));
export function heatState(segment: HeatSegment, progress: number) {
  const initial = fraction(segment.initialLiquid), p = fraction(progress);
  const target = segment.condition === 'warm' ? 1 : segment.condition === 'cold' ? 0 : initial;
  const liquid = initial + (target - initial) * p;
  return { liquid, ice: 1 - liquid, liquidMass: liquid * WATER_MASS,
    iceMass: (1 - liquid) * WATER_MASS, heat: (liquid - initial) * WATER_MASS * FUSION_HEAT };
}
export function changeCondition(segment: HeatSegment, progress: number, condition: HeatCondition): HeatSegment {
  return { initialLiquid: heatState(segment, progress).liquid, condition };
}
