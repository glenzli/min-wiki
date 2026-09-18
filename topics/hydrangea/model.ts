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

const smooth = (value: number) => { const x = clamp(value); return x * x * (3 - 2 * x); };
/** Fraction of a drawn complex assembled; smooth symbol motion, not a measured reaction rate. */
export function complexBinding(progress: number, planted: GardenConditions, index: number): number {
  const state = bloomState(progress, planted);
  return smooth((state.blue * state.maturity - index / 13) * 13);
}
/** Root-to-sepal teaching route; unchanged when scrubbing backward and forward. */
export function aluminumRoute(progress: number, index: number): { x: number; y: number } {
  const u = clamp((progress - .04 - index * .013) / .5);
  const origin = { x: -210 + index * 37, y: 155 + Math.sin(index * 1.7) * 22 };
  const nodes = [origin, {x: 0, y: 87}, {x: 0, y: -93}, {x: 108 + Math.cos(index * 2.4) * 20, y: -113 + Math.sin(index * 2.4) * 20}];
  const segment = Math.min(2, Math.floor(u * 3)), local = smooth(u * 3 - segment), a = nodes[segment]!, b = nodes[segment + 1]!;
  return {x: a.x + (b.x - a.x) * local, y: a.y + (b.y - a.y) * local};
}
