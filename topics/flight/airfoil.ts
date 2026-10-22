/** One cambered teaching section shared by the marked 3D wing and its 2D close-up. */
export function airfoilPoint(fraction: number, upper: boolean): readonly [number, number] {
  const x = Math.max(0, Math.min(1, fraction));
  const m = .035, p = .4, thickness = .13;
  const camber = x < p ? m / (p * p) * (2 * p * x - x * x) : m / ((1 - p) ** 2) * (1 - 2 * p + 2 * p * x - x * x);
  const slope = x < p ? 2 * m / (p * p) * (p - x) : 2 * m / ((1 - p) ** 2) * (p - x);
  const half = 5 * thickness * (.2969 * Math.sqrt(x) - .1260 * x - .3516 * x * x + .2843 * x ** 3 - .1036 * x ** 4);
  const theta = Math.atan(slope), side = upper ? 1 : -1;
  return [x - side * half * Math.sin(theta), camber + side * half * Math.cos(theta)];
}
export function airfoilContour(samples = 32): (readonly [number, number])[] {
  return Array.from({ length: samples + 1 }, (_, i) => airfoilPoint((1 - Math.cos(i / samples * Math.PI)) / 2, true))
    .concat(Array.from({ length: samples - 1 }, (_, i) => airfoilPoint((1 + Math.cos((i + 1) / samples * Math.PI)) / 2, false)));
}
