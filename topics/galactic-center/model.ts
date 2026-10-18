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

/** Wind capture begins as a broad, dilute outflow. Only the cone aimed toward
 * the black hole is bent into a focused wake; most of the wind is not accreted. */
export function windCaptureParcel(index: number, time: number) {
    const seed = seedValue(index + 3141);
    const captured = seedValue(index + 9173) < .24;
    const age = (seed + time * .075) % 1;
    if (!captured) return { x: DONOR_X, y: 0, z: 0, heat: 0, alpha: 0 };
    const cone = (seedValue(index + 12031) - .5) * .72;
    const startX = DONOR_X + donorRadius('wind') * Math.cos(cone);
    const startY = donorRadius('wind') * Math.sin(cone);
    const join = .58;
    if (age < join) {
        const u = age / join;
        const x = bezier(u, startX, DONOR_X + 2.35, HOLE_X - 2.05, HOLE_X - .96);
        const y = bezier(u, startY, startY * 1.7, -.82 + cone * .5, 0);
        // Focus into the same disk-entry point and spread used by the spiral.
        // This is positional continuity of teaching parcels, not a flow solver.
        const blendU = Math.max(0, Math.min(1, (u - .7) / .3));
        const blend = blendU * blendU * (3 - 2 * blendU);
        const spread = .10 + .34 * Math.sin(Math.PI * u);
        const width = spread * (1 - blend);
        return { x: x + (seedValue(index + 451) - .5) * width, y: y + (seedValue(index + 1771) - .5) * width,
            z: (seedValue(index + 7711) - .5) * (spread * 1.4 * (1 - blend) + .08 * blend), heat: u * .24,
            alpha: Math.min(1, age * 18, (1 - age) * 24) * (.62 + .04 * blend) };
    }
    const u = (age - join) / (1 - join), radius = .96 * (1 - u) + .09 * u;
    const theta = Math.PI - u * Math.PI * 6.4;
    return { x: HOLE_X + radius * Math.cos(theta), y: radius * Math.sin(theta),
        z: (seedValue(index + 7711) - .5) * .08, heat: .24 + .76 * u,
        alpha: Math.min(1, (1 - age) * 24) * .66 };
}
