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
// Later fallback spans more physical time, continuously, without moving points
// onto a replacement orbit. Units are model units, not astronomical seconds.
export function encounterTime(progress: number, extended = true) {
    return -12 + 32 * progress + (extended ? 88 : 0) * Math.max(0, progress - .5) ** 2;
}
function smooth(a: number, b: number, x: number) {
    const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
    return t * t * (3 - 2 * t);
}
export interface Encounter {
    positions: Float32Array;
    states: Uint8Array;
    colors: Float32Array;
    released: Uint16Array;
    captured: Uint16Array;
    emission: Float32Array;
    bound: Uint8Array;
    returnedAt: Uint16Array;
}
function random(i: number) { return ((Math.sin(i * 78.233 + 12.9898) * 43758.5453) % 1 + 1) % 1; }
export function buildEncounter(planet: Planet, route: Route, count = PARTICLES): Encounter {
    const positions = new Float32Array(FRAMES * count * 3), states = new Uint8Array(FRAMES * count), colors = new Float32Array(count * 3), released = new Uint16Array(FRAMES), captured = new Uint16Array(FRAMES);
    const emission = new Float32Array(FRAMES * count), outward = new Uint8Array(count);
    const returnedAt = new Uint16Array(count).fill(65535), bound = new Uint8Array(count);
    const thermal = new Float64Array(count), support = new Float64Array(count).fill(1);
    const engaged = new Uint8Array(count), returnTime = new Float64Array(count);
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
    const initial = centerAt(encounterTime(0), q);
    for (let i = 0; i < count; i++) {
        x[i] = initial.x + ox[i]; y[i] = initial.y + oy[i]; z[i] = oz[i];
        vx[i] = initial.vx; vy[i] = initial.vy;
    }
    const acceleration = new Float64Array(3);
    for (let f = 0; f < FRAMES; f++) {
        const time = encounterTime(f / (FRAMES - 1), q < rt), center = centerAt(time, q);
        const before = encounterTime(Math.max(0, f - 1) / (FRAMES - 1), q < rt);
        const dt = time - before;
        const guideCache = new Map<number, ReturnType<typeof centerAt>[]>();
        let nr = 0, nc = 0;
        for (let i = 0; i < count; i++) {
            if (!engaged[i] && center.r > threshold[i] * 1.25) {
                x[i] = center.x + ox[i]; y[i] = center.y + oy[i]; z[i] = oz[i];
                vx[i] = center.vx; vy[i] = center.vy;
            } else if (status[i] !== 2 && f > 0) {
                engaged[i] = 1;
                // Resolve close approaches finely; distant debris needs fewer steps.
                const minR = Math.max(CAPTURE_RADIUS, Math.hypot(x[i], y[i], z[i]) - Math.hypot(vx[i], vy[i], vz[i]) * dt);
                const sub = Math.max(1, Math.ceil(dt / Math.min(.08, .035 * minR ** 1.5))), step = dt / sub;
                let guides = guideCache.get(sub);
                if (!guides) {
                    guides = Array.from({ length: sub }, (_, k) => centerAt(before + (k + .5) * step, q));
                    guideCache.set(sub, guides);
                }
                for (let k = 0; k < sub; k++) {
                    const guide = guides[k];
                    support[i] = Math.min(support[i], smooth(threshold[i], threshold[i] * 1.25, guide.r));
                    const r = Math.hypot(x[i], y[i], z[i]);
                    if (r < CAPTURE_RADIUS) { status[i] = 2; break; }
                    if (!status[i] && !support[i]) {
                        status[i] = 1;
                        bound[i] = (vx[i] ** 2 + vy[i] ** 2 + vz[i] ** 2) / 2 - 1 / r < 0 ? 1 : 0;
                    }
                    const radial = (x[i] * vx[i] + y[i] * vy[i] + z[i] * vz[i]) / r;
                    if (status[i] && radial > .01) outward[i] = 1;
                    if (bound[i] && outward[i] && radial < -.01 && returnedAt[i] === 65535) {
                        returnedAt[i] = f; returnTime[i] = before + k * step;
                    }
                    let power = 0;
                    const force = (cx: number, cy: number, cz: number, cvx: number, cvy: number, cvz: number) => {
                        const rr = Math.max(CAPTURE_RADIUS, Math.hypot(cx, cy, cz)), g = -1 / rr ** 3;
                        let ax = g * cx, ay = g * cy, az = g * cz;
                        if (support[i]) {
                            const gc = -1 / guide.r ** 3;
                            ax += support[i] * (gc * guide.x - ax - 1.7 * (cx - guide.x - ox[i]) - 1.2 * (cvx - guide.vx));
                            ay += support[i] * (gc * guide.y - ay - 1.7 * (cy - guide.y - oy[i]) - 1.2 * (cvy - guide.vy));
                            az += support[i] * (-az - 1.7 * (cz - oz[i]) - 1.2 * cvz);
                        }
                        power = 0;
                        if (returnedAt[i] !== 65535) {
                            // Return-gated radial dissipation preserves in-plane angular
                            // momentum. This is not a collision, rock or fluid solver.
                            const age = before + (k + .5) * step - returnTime[i];
                            const damping = .065 * smooth(0, 1.5, age) * (1 - smooth(1.5, 4, rr));
                            const vr = (cx * cvx + cy * cvy + cz * cvz) / rr;
                            ax -= damping * vr * cx / rr; ay -= damping * vr * cy / rr;
                            az -= damping * (vr * cz / rr + .3 * cvz);
                            power = damping * (vr * vr + .3 * cvz * cvz);
                        }
                        acceleration[0] = ax; acceleration[1] = ay; acceleration[2] = az;
                    };
                    force(x[i], y[i], z[i], vx[i], vy[i], vz[i]);
                    const mx = x[i] + vx[i] * step / 2, my = y[i] + vy[i] * step / 2, mz = z[i] + vz[i] * step / 2;
                    const mvx = vx[i] + acceleration[0] * step / 2, mvy = vy[i] + acceleration[1] * step / 2, mvz = vz[i] + acceleration[2] * step / 2;
                    force(mx, my, mz, mvx, mvy, mvz);
                    x[i] += mvx * step; y[i] += mvy * step; z[i] += mvz * step;
                    vx[i] += acceleration[0] * step; vy[i] += acceleration[1] * step; vz[i] += acceleration[2] * step;
                    thermal[i] = thermal[i] * Math.exp(-.2 * step) + power * step;
                    if (Math.hypot(x[i], y[i], z[i]) < CAPTURE_RADIUS) { status[i] = 2; break; }
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
            if (status[i] === 1 && returnedAt[i] <= f) {
                emission[f * count + i] = 1 - Math.exp(-thermal[i] * 8);
            }
        }
        released[f] = nr;
        captured[f] = nc;
    }
    return { positions, states, colors, released, captured, emission, bound, returnedAt };
}
