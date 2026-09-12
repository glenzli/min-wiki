/** Circular binary in normalized units. Material paths illustrate transfer, not hydrodynamics. */
export type Scenario = 'detached' | 'overflow' | 'wind';
export const SEPARATION = 4.8;
export const DONOR_MASS = 16;
export const BLACK_HOLE_MASS = 9;
export const DONOR_X = -SEPARATION * BLACK_HOLE_MASS / (DONOR_MASS + BLACK_HOLE_MASS);
export const HOLE_X = SEPARATION * DONOR_MASS / (DONOR_MASS + BLACK_HOLE_MASS);
export function rocheLobe(massRatio: number) {
    const q = Math.cbrt(massRatio);
    return .49 * q * q / (.6 * q * q + Math.log1p(q));
}
export const DONOR_LOBE = SEPARATION * rocheLobe(DONOR_MASS / BLACK_HOLE_MASS);
export function rotate(x: number, y: number, angle: number) { return { x: x * Math.cos(angle) - y * Math.sin(angle), y: x * Math.sin(angle) + y * Math.cos(angle) }; }
export function binaryAt(turn: number) {
    const a = turn * Math.PI * 2;
    return { star: rotate(DONOR_X, 0, a), hole: rotate(HOLE_X, 0, a) };
}
export function donorRadius(scenario: Scenario) { return scenario === 'detached' ? .95 : scenario === 'wind' ? 1.42 : DONOR_LOBE; }
export function seedValue(i: number) { return ((Math.sin(i * 78.233 + 12.9898) * 43758.5453) % 1 + 1) % 1; }
export function bezier(u: number, a: number, b: number, c: number, d: number) { const v = 1 - u; return v * v * v * a + 3 * v * v * u * b + 3 * v * u * u * c + u * u * u * d; }
/** One continuous centerline: donor surface -> curved stream -> tangential disk entry -> inner boundary. */
export function transferPath(age: number, scenario: Scenario) {
    const join = .4, start = DONOR_X + donorRadius(scenario) * 1.1, entry = HOLE_X - .9;
    if (age < join) {
        const u = Math.max(0, age) / join;
        return { x: bezier(u, start, .9, entry, -.9 + HOLE_X), y: bezier(u, 0, -.12, -.72, 0), heat: u * .35 };
    }
    const u = (age - join) / (1 - join), radius = .9 * (1 - u) + .075 * u, theta = Math.PI - u * Math.PI * 7;
    return { x: HOLE_X + radius * Math.cos(theta), y: radius * Math.sin(theta), heat: .35 + .65 * u };
}
export function streamParcel(index: number, time: number, scenario: Scenario) {
    const seed = seedValue(index), age = (seed + time * .10) % 1, p = transferPath(age, scenario);
    const spread = age < .4 ? .065 + .09 * age : .065;
    const offset = (seedValue(index + 9301) - .5) * spread;
    return { ...p, x: p.x + offset, y: p.y + (seedValue(index + 19281) - .5) * spread, z: (seedValue(index + 7351) - .5) * spread, alpha: Math.min(1, age * 24, (1 - age) * 30) };
}
