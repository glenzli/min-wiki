/** Topic-owned teaching state. No rendering, clock, or live ephemeris is implied. */
export type View = 'shapes' | 'comet' | 'belts';
export type Specimen = 'carbon' | 'silicate' | 'metal' | 'ceres';
export type Reservoir = 'main' | 'kuiper' | 'dust' | 'oort';
export interface SmallBodiesState {
  view: View;
  specimen: Specimen;
  light: number;
  cometPhase: number;
  exposedIce: boolean;
  cometLens: 'orbit' | 'nucleus';
  reservoir: Reservoir;
  earthPhase: number;
  labels: boolean;
}
export const TAU = Math.PI * 2;
export const COMET_ORBIT = Object.freeze({ aAU: 3.2, eccentricity: .72 });
/** Independently enlarged teaching markers, not physical radii or a common diameter scale. */
export const DISPLAY_RADII = Object.freeze({
  cometSun: .34, nucleus: .13, earth: .065, earthHalo: .12,
  mainSun: .22, kuiperSun: 1.6, dustSun: .24, oortSun: .4,
});
export const DEFAULT_STATE: Readonly<SmallBodiesState> = Object.freeze({
  view: 'shapes', specimen: 'carbon', light: 35, cometPhase: 0,
  exposedIce: true, cometLens: 'orbit', reservoir: 'main', earthPhase: .3, labels: true,
});
export const clamp = (value: number, low = 0, high = 1) => Math.min(high, Math.max(low, value));
const finite = (value: string | null, fallback: number, low = 0, high = 1) => {
  const number = value === null ? NaN : Number(value);
  return Number.isFinite(number) ? clamp(number, low, high) : fallback;
};
export function parseState(search: string): SmallBodiesState {
  const q = new URLSearchParams(search);
  const select = <T extends string>(key: string, choices: readonly T[], fallback: T): T => {
    const raw = q.get(key); return choices.includes(raw as T) ? raw as T : fallback;
  };
  return {
    view: select('view', ['shapes', 'comet', 'belts'], DEFAULT_STATE.view),
    specimen: select('sample', ['carbon', 'silicate', 'metal', 'ceres'], DEFAULT_STATE.specimen),
    light: finite(q.get('light'), DEFAULT_STATE.light, -150, 150),
    cometPhase: finite(q.get('orbit'), DEFAULT_STATE.cometPhase),
    exposedIce: q.get('ice') !== '0',
    cometLens: select('lens', ['orbit', 'nucleus'], DEFAULT_STATE.cometLens),
    reservoir: select('region', ['main', 'kuiper', 'dust', 'oort'], DEFAULT_STATE.reservoir),
    earthPhase: finite(q.get('earth'), DEFAULT_STATE.earthPhase),
    labels: q.get('labels') !== '0',
  };
}
export function writeState(url: URL, state: SmallBodiesState): URL {
  const next = new URL(url);
  const q = next.searchParams;
  q.set('view', state.view); q.set('sample', state.specimen); q.set('region', state.reservoir);
  q.set('light', String(state.light)); q.set('orbit', state.cometPhase.toFixed(4));
  q.set('ice', state.exposedIce ? '1' : '0'); q.set('earth', state.earthPhase.toFixed(4));
  q.set('lens', state.cometLens); q.set('labels', state.labels ? '1' : '0');
  return next;
}
export interface PlanarPoint { x: number; z: number }
export function solveKepler(mean: number, eccentricity: number): number {
  let eccentric = mean;
  for (let i = 0; i < 12; i++) eccentric -= (eccentric - eccentricity * Math.sin(eccentric) - mean) / (1 - eccentricity * Math.cos(eccentric));
  return eccentric;
}
/** Uniform phase is elapsed orbital time. Start at aphelion, pass perihelion halfway. */
export function cometFrame(phase: number, exposedIce = true) {
  const { aAU: a, eccentricity: e } = COMET_ORBIT;
  const mean = Math.PI + clamp(phase) * TAU;
  const eccentric = solveKepler(mean, e);
  const b = a * Math.sqrt(1 - e * e);
  const x = a * (Math.cos(eccentric) - e), z = b * Math.sin(eccentric);
  const rAU = Math.hypot(x, z);
  const vx = -a * Math.sin(eccentric), vz = b * Math.cos(eccentric), v = Math.hypot(vx, vz);
  // Qualitative response, not a thermal or volatile-loss solution and not a universal threshold.
  const activity = exposedIce ? Math.pow(clamp(1 - rAU / 4.3), 1.25) : 0;
  return {
    x, z, rAU, sunlightAtEarth: 1 / (rAU * rAU), activity,
    antiSun: { x: x / rAU, z: z / rAU }, tangent: { x: vx / v, z: vz / v },
    approaching: clamp(phase) < .5, perihelionAU: a * (1 - e), aphelionAU: a * (1 + e),
  };
}
/** Tail curves encode direction only; these are not computed particle trajectories. */
export function tailPoint(frame: ReturnType<typeof cometFrame>, fraction: number, kind: 'ion' | 'dust'): PlanarPoint {
  const u = clamp(fraction), length = frame.activity * (kind === 'ion' ? 3.5 : 2.8);
  const radial = length * (kind === 'ion' ? u : .82 * u);
  const lag = kind === 'dust' ? length * .55 * u * u : 0;
  return { x: frame.x + frame.antiSun.x * radial - frame.tangent.x * lag,
    z: frame.z + frame.antiSun.z * radial - frame.tangent.z * lag };
}
export function earthFrame(phase: number) {
  const angle = clamp(phase) * TAU;
  const rStream = COMET_ORBIT.aAU * (1 - COMET_ORBIT.eccentricity ** 2)
    / (1 + COMET_ORBIT.eccentricity * Math.cos(angle));
  // The visible stream has an enlarged teaching width; no meteor count/date is predicted.
  return { x: Math.cos(angle), z: Math.sin(angle), inStream: Math.abs(rStream - 1) < .075, streamGapAU: Math.abs(rStream - 1) };
}
export function random01(seed: number): number {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x);
}
export const RESERVOIR_COUNTS = Object.freeze({ main: 170, kuiper: 260, dust: 760, oort: 420 });
/** Reproducible representative points; never a measured catalogue or real number density. */
export function reservoirPoints(region: Reservoir): Float32Array {
  const count = RESERVOIR_COUNTS[region], points = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const u = random01(i + 5), v = random01(i + 1700), w = random01(i + 3400);
    if (region === 'oort') {
      const r = 5 + 6 * Math.cbrt(w), y = 2 * v - 1, flat = Math.sqrt(1 - y * y);
      points.set([r * flat * Math.cos(u * TAU), r * y, r * flat * Math.sin(u * TAU)], i * 3);
    } else {
      const inner = region === 'main' ? 2.1 : region === 'kuiper' ? 30 : .45;
      const outer = region === 'main' ? 3.3 : region === 'kuiper' ? 50 : 4.4;
      const r = inner + (outer - inner) * v;
      const thickness = region === 'main' ? .08 : region === 'kuiper' ? .12 : .06;
      points.set([r * Math.cos(u * TAU), (w - .5) * r * thickness * 2, r * Math.sin(u * TAU)], i * 3);
    }
  }
  return points;
}
/** Stable radial relief; the craters and surface are original illustrative geometry. */
export function specimenRadius(x: number, y: number, z: number, specimen: Specimen): number {
  const smooth = specimen === 'ceres';
  const relief = .45 * Math.sin(x * 9 + z * 3) * Math.sin(y * 7 - z * 5)
    + .26 * Math.cos(x * 19 - y * 11) * Math.sin(z * 17 + y * 7)
    + .14 * Math.sin(x * 41 + z * 35) * Math.cos(y * 29 - x * 16);
  const crater = (cx: number, cy: number, cz: number, size: number) => {
    const d = Math.hypot(x - cx, y - cy, z - cz) / size;
    return -.07 * Math.exp(-d * d * 3) + .018 * Math.exp(-((d - 1) ** 2) * 30);
  };
  const craters = crater(.55, .55, .63, .22) + crater(-.45, .7, .51, .29)
    + crater(.2, -.3, .93, .35) + crater(-.88, -.14, .45, .2);
  return 1 + relief * (smooth ? .009 : .09) + craters * (smooth ? .55 : 1);
}
/** Stable broad lobes and fine relief; spectral class does not prescribe one real body's shape. */
export function specimenPoint(x: number, y: number, z: number, specimen: Specimen) {
  const shape = specimen === 'carbon' ? [1.19, .78, .96] : specimen === 'silicate' ? [1.23, .9, .82]
    : specimen === 'metal' ? [1.15, .86, .94] : [1, .93, 1];
  const broad = specimen === 'ceres' ? 1 : 1 + .13 * Math.sin(x * 2.8 + y * 2.1) * Math.cos(z * 3.6 - x * .8)
    + .045 * Math.sin(y * 4 - x) * Math.cos(z * 2 + x * 2);
  const radius = specimenRadius(x, y, z, specimen) * broad;
  return { x: x * radius * shape[0], y: y * radius * shape[1], z: z * radius * shape[2] };
}
