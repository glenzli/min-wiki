// Educational scene units. Only the intact star's orbit solves the Newtonian
// parabolic two-body problem; gas circularization is an illustrative transition.
export const TAU = Math.PI * 2;
export const TIDAL_RADIUS = 15;
export const HORIZON_RADIUS = 3.6;
export const MU = 600;
export interface Scenario { duration: number; noBlackHole?: boolean; disrupted?: boolean; pericenter: number; extent: number; orbitEnd: number; }
export const SCENARIOS: Record<string, Scenario> = {
  free: { duration: 48, noBlackHole: true, pericenter: 0, extent: 0, orbitEnd: 1 },
  flyby: { pericenter: 22, extent: 1.35, duration: 48, orbitEnd: 1 },
  tidal: { pericenter: 9, extent: 2.2, duration: 120, orbitEnd: 0.8, disrupted: true },
  deep: { pericenter: 5.2, extent: 2.2, duration: 120, orbitEnd: 0.8, disrupted: true },
};
export const clamp = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v));
export function smooth(a: number, b: number, v: number) {
  const x = clamp((v - a) / (b - a));
  return x * x * (3 - 2 * x);
}

// The encounter keeps its original pace for 54 seconds. Over the next 12
// seconds the visual clock smoothly slows to one fifth, leaving a long,
// still-moving observation interval. This changes playback, not gas forces.
export function motionProgress(progress: number, scenario: string) {
  if (!SCENARIOS[scenario].disrupted) return clamp(progress);
  const seconds = clamp(progress) * SCENARIOS[scenario].duration;
  if (seconds <= 54) return seconds / 60;
  if (seconds >= 66) return 1.02 + (seconds - 66) / 300;
  const u = (seconds - 54) / 12;
  return 0.9 + (seconds - 54) / 60 - 0.16 * (u ** 3 - u ** 4 / 2);
}

export function playbackProgress(motion: number, scenario: string) {
  if (!SCENARIOS[scenario].disrupted) return clamp(motion);
  let low = 0, high = 1;
  for (let i = 0; i < 48; i++) {
    const mid = (low + high) / 2;
    if (motionProgress(mid, scenario) < motion) low = mid;
    else high = mid;
  }
  return high;
}

export function orbitAt(progress: number, scenario = 'flyby'): {x:number; y:number; z:number; vx:number; vy:number; radius:number; angle:number} {
  if (SCENARIOS[scenario].noBlackHole) {
    const initial = orbitAt(0, 'flyby');
    const { pericenter: q, extent } = SCENARIOS.flyby;
    const elapsed = clamp(progress) * 2 * Math.sqrt(2*q**3/MU) * (extent+extent**3/3);
    const x = initial.x+initial.vx*elapsed, y = initial.y+initial.vy*elapsed;
    return { ...initial, x, y, radius: Math.hypot(x,y), angle: Math.atan2(y,x) };
  }
  const { pericenter: q, extent, orbitEnd } = SCENARIOS[scenario];
  const barker = extent + extent ** 3 / 3;
  const time = (clamp(progress / orbitEnd) * 2 - 1) * barker;
  // Exact inverse of D + D^3 / 3 = time (Barker's equation).
  const d = 2 * Math.sinh(Math.asinh(1.5 * time) / 3);
  const rate = Math.sqrt(MU / (2 * q ** 3)) / (1 + d * d);
  return {
    x: 2 * q * d, y: q * (1 - d * d), z: 0,
    vx: 2 * q * rate, vy: -2 * q * d * rate,
    radius: q * (1 + d * d), angle: Math.PI / 2 - 2 * Math.atan(d),
  };
}

export class Playback {
  scenario!: string;
  progress!: number;
  speed!: number;
  playing!: boolean;

  constructor() {
    this.scenario = 'flyby';
    this.progress = 0;
    this.speed = 1;
    this.playing = false;
  }
  select(scenario: string) {
    if (!SCENARIOS[scenario]) throw new Error('Unknown encounter');
    this.scenario = scenario;
    this.progress = 0;
  }
  seek(progress: number) { this.progress = clamp(progress); }
  tick(delta: number) {
    if (!this.playing) return;
    this.seek(this.progress + Math.max(0, delta) * this.speed / SCENARIOS[this.scenario].duration);
    if (this.progress === 1) this.playing = false;
  }
}

// Seeded sampling makes rewinding and replaying exactly reproducible.
export function randomSource(seed = 1947) {
  return () => {
    seed = (Math.imul(1664525, seed) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}
