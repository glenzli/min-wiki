import { clamp, smooth, orbitAt, randomSource, SCENARIOS, MU, HORIZON_RADIUS } from './encounter.ts';

export const STAR_RADIUS = 2.5;
export const DISRUPTION_START = 0.18;
export const CORE_RELEASE_END = 0.46;

export const DISRUPTION_END = 1.2;

// Slow encounter, then smoothly compress the much longer return of bound gas.
// This clock never switches position curves or resets a parcel's velocity.
export function disruptionTime(progress: number, scenario = 'tidal') {
  const { pericenter, extent, orbitEnd } = SCENARIOS[scenario];
  const physicalDuration = 2 * Math.sqrt(2 * pericenter ** 3 / MU)
    * (extent + extent ** 3 / 3) / orbitEnd;
  const later = Math.max(0, Math.min(1, progress) - 0.48);
  return physicalDuration * (Math.min(1, progress) + 9 * later * later
    + Math.max(0, progress - 1) * 10.36);
}

export function cohesiveFraction(progress: number, detachAt: number) {
  return 1 - smooth(detachAt - 0.055, detachAt, progress);
}

/**
 * One Lagrangian parcel population from spherical star to stripped streams.
 * A diminishing elastic support approximates the intact star's cohesion.
 * Central gravity stretches released gas differentially; no affine flattening,
 * shell/particle swap, assigned disk radius, or interpolation into a ring.
 * Radial/vertical damping later approximates dissipation, not hydrodynamics.
 */
export class StellarDisruption {
  scenario!: string;
  count!: number;
  frames!: number;
  start!: number;
  end!: number;
  positions!: Float32Array<ArrayBuffer>;
  initial!: Float32Array<ArrayBuffer>;
  detachAt!: Float32Array<ArrayBuffer>;
  bound!: Uint8Array<ArrayBuffer>;
  absorbedAt!: Float32Array<ArrayBuffer>;
  variation!: Float32Array<ArrayBuffer>;
  focus!: Float32Array<ArrayBuffer>;
  schedule!: { progress: number; dt: number; star: ReturnType<typeof orbitAt>; }[][];

  constructor({ count = 12000, frames = 750, seed = 1947, scenario = 'tidal' } = {}) {
    if (!SCENARIOS[scenario]?.disrupted) throw new Error('Expected a disruption scenario');
    this.scenario = scenario;
    this.count = count;
    this.frames = frames;
    this.start = DISRUPTION_START;
    this.end = DISRUPTION_END;
    this.positions = new Float32Array(count * frames * 3);
    this.initial = new Float32Array(count * 3);
    this.detachAt = new Float32Array(count);
    this.bound = new Uint8Array(count);
    this.absorbedAt = new Float32Array(count).fill(2);
    this.variation = new Float32Array(count);
    this.focus = new Float32Array(frames * 3);
    this.schedule = Array.from({ length: frames - 1 }, (_, f) => {
      const p = this.start + f / (frames - 1) * (this.end - this.start);
      const next = this.start + (f + 1) / (frames - 1) * (this.end - this.start);
      const elapsed = disruptionTime(next, scenario) - disruptionTime(p, scenario);
      const steps = Math.ceil(elapsed / 0.04);
      return Array.from({ length: steps }, (_, step) => {
        const progress = p + (next - p) * (step + 0.5) / steps;
        return { progress, dt: elapsed / steps, star: orbitAt(progress, scenario) };
      });
    });
    const random = randomSource(seed);
    const initialStar = orbitAt(this.start, scenario);

    // Balanced, stratified spherical shells keep the photosphere smooth while
    // preserving central density. Each sample stays the same gas parcel forever.
    for (let i = 0; i < count; i++) {
      const radius = STAR_RADIUS * Math.pow((i + 0.5) / count, 0.46);
      const azimuth = i * 2.399963229728653 + (random() - 0.5) * 0.3;
      const height = random() * 2 - 1;
      const radial = radius * Math.sqrt(1 - height * height);
      const x = Math.cos(azimuth) * radial;
      const y = Math.sin(azimuth) * radial;
      const z = height * radius;
      this.initial.set([x, y, z], i * 3);
      const shell = radius / STAR_RADIUS;
      this.detachAt[i] = 0.315 + 0.13 * (1 - shell ** 1.6) + random() * 0.012;
      this.variation[i] = random();
      this.integrateParcel(i, initialStar);
    }
    this.computeFocus();
  }

  integrateParcel(i: number, initialStar: ReturnType<typeof orbitAt>) {
    const j = i * 3;
    const ox = this.initial[j], oy = this.initial[j + 1], oz = this.initial[j + 2];
    const detach = this.detachAt[i];
    let x = initialStar.x + ox, y = initialStar.y + oy, z = oz;
    let vx = initialStar.vx, vy = initialStar.vy, vz = 0;
    let classified = false, bound = false, swallowed = false;
    const acceleration = new Float64Array(3);
    let guide: ReturnType<typeof orbitAt>;

    const force = (p: number, cx: number, cy: number, cz: number, cvx: number, cvy: number, cvz: number) => {
      const r = Math.max(HORIZON_RADIUS, Math.hypot(cx, cy, cz));
      const g = -MU / (r * r * r);
      let ax = g * cx, ay = g * cy, az = g * cz;
      const support = cohesiveFraction(p, detach);
      if (support > 0) {
        const star = guide;
        const gc = -MU / star.radius ** 3;
        // Support gradually stops cancelling the local gravity gradient.
        // A stable centre persists while the outer, weakly held layers peel off.
        ax += support * (gc * star.x - ax - 1.7 * (cx - star.x - ox) - 1.2 * (cvx - star.vx));
        ay += support * (gc * star.y - ay - 1.7 * (cy - star.y - oy) - 1.2 * (cvy - star.vy));
        az += support * (-az - 1.7 * (cz - oz) - 1.2 * cvz);
      }
      if (bound) {
        // Dissipate radial motion continuously where the returning flow is dense.
        // Radial damping exerts no torque about the black hole. Weak tangential
        // drag much later illustrates inward angular-momentum transport.
        const damping = 0.55 * (0.75 + this.variation[i] * 0.5) * smooth(0.43, 0.62, p) * (1 - smooth(25, 42, r));
        const vr = (cx * cvx + cy * cvy + cz * cvz) / r;
        const inward = 0.02 * Math.sqrt(MU / r ** 3) * (0.65 + this.variation[i] * 0.7) * smooth(0.72, 0.98, p);
        ax -= damping * vr * cx / r + inward * cvx;
        ay -= damping * vr * cy / r + inward * cvy;
        az -= damping * (vr * cz / r + 0.8 * cvz) + inward * cvz;
      }
      acceleration[0] = ax;
      acceleration[1] = ay;
      acceleration[2] = az;
    };

    for (let f = 0; f < this.frames; f++) {
      const p = this.start + f / (this.frames - 1) * (this.end - this.start);
      const at = (f * this.count + i) * 3;
      this.positions[at] = x;
      this.positions[at + 1] = y;
      this.positions[at + 2] = z;
      if (f === this.frames - 1 || swallowed) continue;
      for (const step of this.schedule[f]) {
        const currentP = step.progress;
        const dt = step.dt;
        guide = step.star;
        if (!classified && currentP >= detach) {
          classified = true;
          bound = (vx * vx + vy * vy + vz * vz) / 2 - MU / Math.hypot(x, y, z) < 0;
          this.bound[i] = bound ? 1 : 0;
        }
        // Explicit midpoint integrates both position and velocity; damping is
        // evaluated at the midpoint instead of overwriting a particle position.
        force(currentP, x, y, z, vx, vy, vz);
        const mx = x + vx * dt / 2, my = y + vy * dt / 2, mz = z + vz * dt / 2;
        const mvx = vx + acceleration[0] * dt / 2;
        const mvy = vy + acceleration[1] * dt / 2;
        const mvz = vz + acceleration[2] * dt / 2;
        force(currentP, mx, my, mz, mvx, mvy, mvz);
        x += mvx * dt; y += mvy * dt; z += mvz * dt;
        vx += acceleration[0] * dt; vy += acceleration[1] * dt; vz += acceleration[2] * dt;
        if (Math.hypot(x, y, z) < HORIZON_RADIUS) {
          this.absorbedAt[i] = currentP;
          swallowed = true;
          break;
        }
      }
    }
  }

  computeFocus() {
    // Track only the dense central layers until their support has dissolved.
    const coreCount = Math.max(1, Math.floor(this.count * 0.12));
    for (let f = 0; f < this.frames; f++) {
      let x = 0, y = 0, z = 0;
      for (let i = 0; i < coreCount; i++) {
        const at = (f * this.count + i) * 3;
        x += this.positions[at]; y += this.positions[at + 1]; z += this.positions[at + 2];
      }
      this.focus.set([x / coreCount, y / coreCount, z / coreCount], f * 3);
    }
  }

  sample(progress: number, positions: Float32Array, previous: Float32Array, state: Float32Array) {
    const star = orbitAt(progress, this.scenario);
    const frame = clamp((progress - this.start) / (this.end - this.start)) * (this.frames - 1);
    const f = Math.min(this.frames - 2, Math.floor(frame));
    const blend = frame - f;
    let remaining = 0, absorbed = 0;
    for (let i = 0; i < this.count; i++) {
      const j = i * 3;
      if (progress < this.start) {
        positions[j] = star.x + this.initial[j];
        positions[j + 1] = star.y + this.initial[j + 1];
        positions[j + 2] = this.initial[j + 2];
        previous[j] = positions[j]; previous[j + 1] = positions[j + 1]; previous[j + 2] = positions[j + 2];
      } else {
        const a = (f * this.count + i) * 3;
        const b = a + this.count * 3;
        for (let k = 0; k < 3; k++) {
          positions[j + k] = this.positions[a + k] * (1 - blend) + this.positions[b + k] * blend;
          previous[j + k] = this.positions[Math.max(0, f - 2) * this.count * 3 + j + k];
        }
      }
      const support = cohesiveFraction(progress, this.detachAt[i]);
      remaining += support;
      state[i * 2] = 1 - support;
      state[i * 2 + 1] = progress < this.absorbedAt[i] ? 1 : 0;
      absorbed += 1 - state[i * 2 + 1];
    }
    const a = f * 3, b = (f + 1) * 3;
    return {
      remaining: remaining / this.count,
      absorbed,
      x: progress < this.start ? star.x : this.focus[a] * (1 - blend) + this.focus[b] * blend,
      y: progress < this.start ? star.y : this.focus[a + 1] * (1 - blend) + this.focus[b + 1] * blend,
      z: progress < this.start ? 0 : this.focus[a + 2] * (1 - blend) + this.focus[b + 2] * blend,
    };
  }
}

// Structured-clone boundary: integration schedules stay in the worker.
export type DisruptionSnapshot = Pick<StellarDisruption,
  'scenario' | 'count' | 'frames' | 'start' | 'end' | 'positions' | 'initial' |
  'detachAt' | 'bound' | 'absorbedAt' | 'variation' | 'focus'>;
export type DisruptionResponse =
  | {scenario: string; snapshot: DisruptionSnapshot}
  | {scenario: string; error: string};
