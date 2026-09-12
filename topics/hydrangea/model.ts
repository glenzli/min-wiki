/** A bounded causal illustration, not a cultivar color or soil-treatment predictor. */
export interface GardenConditions { ph: number; aluminum: number; cultivar: 'pigmented' | 'white' }
export const clamp = (n: number) => Math.max(0, Math.min(1, Number.isFinite(n) ? n : 0));
export function availableAluminum(conditions: GardenConditions): number {
  const ph = Number.isFinite(conditions.ph) ? conditions.ph : 6;
  return clamp(conditions.aluminum) / (1 + Math.exp((ph - 5.85) * 3.4));
}
export function flowerOutcome(conditions: GardenConditions) {
  const available = availableAluminum(conditions);
  const blue = conditions.cultivar === 'white' ? 0 : clamp(available * 1.42);
  return { available, blue, hue: conditions.cultivar === 'white' ? 55 : 335 - 114 * blue, saturation: conditions.cultivar === 'white' ? 12 : 51,
    lightness: conditions.cultivar === 'white' ? 92 : 67,
    color: conditions.cultivar === 'white' ? 'white' : blue > .64 ? 'blue' : blue > .22 ? 'purple' : 'pink' };
}
export function newBloom(conditions: GardenConditions): GardenConditions { return { ...conditions }; }
export function bloomState(progress: number, planted: GardenConditions) {
  const p = clamp(progress), result = flowerOutcome(planted);
  const maturity = clamp((p - .22) / .68);
  // Hue lives on a circle. A numeric 95→335 interpolation would incorrectly
  // pass through blue even when no aluminum is available for blue coloration.
  const hueArc = ((result.hue - 95 + 540) % 360) - 180;
  return { ...result, maturity, stage: p < .2 ? 0 : p < .46 ? 1 : p < .76 ? 2 : 3,
    hue: (95 + hueArc * maturity + 360) % 360, lightness: 72 + (result.lightness - 72) * maturity };
}
