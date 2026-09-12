export type Planet = 'rocky' | 'gas';
export type Route = 'safe' | 'grazing' | 'deep';
export const DENSITY = { rocky: 5.514, gas: 1.326 };
export const PERICENTER = { safe: 2.5, grazing: 1.25, deep: .52 };
export const FRAMES = 641;
export const PARTICLES = 2400;
export const CAPTURE_RADIUS = .095;
export function tidalRadius(planet: Planet) { return Math.cbrt(DENSITY.rocky / DENSITY[planet]); }
export function centerAt(time: number, q: number) {
    // Barker equation for a parabolic encounter with G M = 1; t = 0 at closest approach.
    const b = time / Math.sqrt(2 * q * q * q);
    const d = 2 * Math.sinh(Math.asinh(1.5 * b) / 3);
    const dd = 1 / (Math.sqrt(2 * q * q * q) * (1 + d * d));
    return { x: q * (1 - d * d), y: 2 * q * d, vx: -2 * q * d * dd, vy: 2 * q * dd, r: q * (1 + d * d) };
}
export interface Encounter {
    positions: Float32Array;
    states: Uint8Array;
    colors: Float32Array;
    released: Uint16Array;
    captured: Uint16Array;
    emission: Float32Array;
}
function random(i: number) { return ((Math.sin(i * 78.233 + 12.9898) * 43758.5453) % 1 + 1) % 1; }
export function buildEncounter(planet: Planet, route: Route, count = PARTICLES): Encounter {
    const positions = new Float32Array(FRAMES * count * 3), states = new Uint8Array(FRAMES * count), colors = new Float32Array(count * 3), released = new Uint16Array(FRAMES), captured = new Uint16Array(FRAMES);
    const emission = new Float32Array(FRAMES * count), outward = new Uint8Array(count), returned = new Uint8Array(count);
    const x = new Float64Array(count), y = new Float64Array(count), z = new Float64Array(count), vx = new Float64Array(count), vy = new Float64Array(count), vz = new Float64Array(count), ox = new Float64Array(count), oy = new Float64Array(count), oz = new Float64Array(count), threshold = new Float64Array(count), status = new Uint8Array(count);
    const q = PERICENTER[route], rt = tidalRadius(planet), radius = planet === 'rocky' ? .34 : .50;
    for (let i = 0; i < count; i++) {
        const cos = 1 - 2 * (i + .5) / count, phi = i * 2.399963229728653, r = Math.cbrt(.18 + .82 * random(i));
        ox[i] = radius * r * Math.sqrt(1 - cos * cos) * Math.cos(phi);
        oy[i] = radius * r * Math.sqrt(1 - cos * cos) * Math.sin(phi);
        oz[i] = radius * r * cos;
        threshold[i] = rt * (.72 + .28 * r);
        let rgb: number[];
        if (planet === 'gas') {
            const band = Math.sin(cos * 30 + Math.sin(phi * 2) * .8);
            rgb = band > .2 ? [.88, .65, .42] : band < -.5 ? [.57, .32, .19] : [.97, .85, .67];
        }
        else {
            const land = Math.sin(phi * 2.4 + cos * 4) + Math.cos(phi * 5 - cos * 7) * .5;
            rgb = Math.abs(cos) > .88 ? [.87, .95, 1] : land > .55 ? [.19, .62, .47] : [.1, .43, .8];
        }
        colors.set(rgb, i * 3);
    }
    const dt = 32 / (FRAMES - 1), sub = 4, step = dt / sub;
    for (let f = 0; f < FRAMES; f++) {
        const time = -12 + f * dt, center = centerAt(time, q);
        let nr = 0, nc = 0;
        for (let i = 0; i < count; i++) {
            if (status[i] === 0) {
                x[i] = center.x + ox[i];
                y[i] = center.y + oy[i];
                z[i] = oz[i];
                vx[i] = center.vx;
                vy[i] = center.vy;
                vz[i] = 0;
                if (center.r < threshold[i])
                    status[i] = 1;
            }
            else if (status[i] === 1 && f > 0) {
                for (let s = 0; s < sub; s++) {
                    const r = Math.hypot(x[i], y[i], z[i]);
                    if (r < CAPTURE_RADIUS) {
                        status[i] = 2;
                        break;
                    }
                    const acc = 1 / (r * r * r);
                    vx[i] -= x[i] * acc * step * .5;
                    vy[i] -= y[i] * acc * step * .5;
                    vz[i] -= z[i] * acc * step * .5;
                    x[i] += vx[i] * step;
                    y[i] += vy[i] * step;
                    z[i] += vz[i] * step;
                    const r2 = Math.hypot(x[i], y[i], z[i]);
                    if (r2 < CAPTURE_RADIUS) {
                        status[i] = 2;
                        break;
                    }
                    const acc2 = 1 / (r2 * r2 * r2);
                    vx[i] -= x[i] * acc2 * step * .5;
                    vy[i] -= y[i] * acc2 * step * .5;
                    vz[i] -= z[i] * acc2 * step * .5;
                    // Dissipation proxy in the inner debris: pedagogical, not a fluid/collision calculation.
                    const damping = r2 < .8 ? Math.exp(-.055 * step) : 1;
                    vx[i] *= damping;
                    vy[i] *= damping;
                    vz[i] *= damping;
                }
            }
            if (status[i] > 0)
                nr++;
            if (status[i] === 2)
                nc++;
            const k = (f * count + i) * 3;
            positions[k] = x[i];
            positions[k + 1] = y[i];
            positions[k + 2] = z[i];
            states[f * count + i] = status[i];
            if (status[i] === 1) {
                const r = Math.hypot(x[i], y[i], z[i]);
                const speed2 = vx[i] ** 2 + vy[i] ** 2 + vz[i] ** 2;
                const radial = (x[i] * vx[i] + y[i] * vy[i] + z[i] * vz[i]) / r;
                if (radial > .02) outward[i] = 1;
                if (outward[i] && radial < -.02) returned[i] = 1;
                const energy = speed2 / 2 - 1 / r;
                // Display proxy, not a temperature: only surviving bound debris
                // that has actually turned back can contribute lensed emission.
                if (returned[i] && energy < 0) {
                    const orbital = 1 - radial ** 2 / Math.max(1e-8, speed2);
                    const near = Math.max(0, 1 - r / 1.2);
                    emission[f * count + i] = near * near * orbital * Math.min(1, -energy * 3)
                        * Math.exp(-(z[i] ** 2) / .04);
                }
            }
        }
        released[f] = nr;
        captured[f] = nc;
    }
    return { positions, states, colors, released, captured, emission };
}
