/** Qualitative volcanic hot-spring circulation, not measured depths, rates,
 * temperatures, residence times, chemistry or a pressure/boiling solver.
 * NPS: https://www.nps.gov/yell/learn/nature/hydrothermal-systems.htm
 * NPS: https://www.nps.gov/yell/learn/nature/hot-springs.htm
 * USGS: https://www.usgs.gov/geology-and-ecology-of-national-parks/hydrology-hot-springs-national-park
 * The last example also documents non-volcanic geothermal heating. */
export interface HydrothermalSettings { supply: number; connected: boolean }
export type HydrothermalView = 'section' | 'landscape';
export type HydrothermalPoint = [number, number, number];
export const DEFAULT_HYDROTHERMAL_SETTINGS: HydrothermalSettings = { supply: .75, connected: true };
export const HYDROTHERMAL_SAMPLES = 72;
export const HOT_ROCK = { x: -.4, y: -2.9, z: -.9, rx: 2.2, ry: .95, rz: 1.8 } as const;
export const POOL = { x: 2.82, z: .12, rx: 1.22, rz: .86, bottom: .10, rim: .72, maxDepth: .47 } as const;
export const unit = (n: number) => Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 0;
export const ramp = (a: number, b: number, n: number) => { const u = unit((n - a) / (b - a)); return u * u * (3 - 2 * u); };
export const hydroSeed = (id: number) => { const n = Math.sin(id * 127.1 + 311.7) * 43758.5453; return n - Math.floor(n); };
export function normalizeHydrothermalSettings(settings: HydrothermalSettings): HydrothermalSettings {
  return { supply: unit(settings.supply), connected: settings.connected === true };
}
export function hydrothermalFrame(progress: number, input: HydrothermalSettings = DEFAULT_HYDROTHERMAL_SETTINGS) {
  const p = unit(progress), settings = normalizeHydrothermalSettings(input), front = ramp(.04, .90, p);
  const wetFront = settings.connected ? front : Math.min(.655, front);
  const recharge = settings.supply * ramp(.08, .28, wetFront);
  const heating = settings.supply * ramp(.42, .66, wetFront);
  const ascent = settings.connected ? settings.supply * ramp(.66, .94, wetFront) : 0;
  const discharge = settings.connected ? settings.supply * ramp(.94, 1, wetFront) : 0;
  // A bounded display balance gives a low-input contrast, not a universal
  // threshold for natural springs. Detail motion never enters this balance.
  const pool = unit((discharge - .12) / .70) * ramp(.78, 1, p);
  const stage: 0 | 1 | 2 | 3 = wetFront < .42 ? 0 : wetFront < .66 ? 1 : wetFront < .94 ? 2 : 3;
  const reason = settings.supply <= .12 ? 'low-supply' : !settings.connected ? 'disconnected' : 'none';
  return { p, settings, front, wetFront, recharge, heating, ascent, discharge, pool, stage,
    limited: reason !== 'none', reason, waterLevel: POOL.bottom + POOL.maxDepth * pool,
    relativeHeat: ramp(.42, .66, wetFront), hotRock: 1 };
}
export type HydrothermalFrame = ReturnType<typeof hydrothermalFrame>;
export function hydrothermalReadout(progress: number, settings: HydrothermalSettings) {
  const frame = hydrothermalFrame(progress, settings);
  return { value: `${Math.round(frame.pool * 100)}%`, stage: frame.stage, limited: frame.limited, reason: frame.reason };
}
export const HYDROTHERMAL_ROUTE = [
  { t: 0, point: [-4.7, 3.8, .06] }, { t: .10, point: [-4.4, 1.5, .06] },
  { t: .22, point: [-4.05, .1, .06] }, { t: .34, point: [-3, -.55, .06] },
  { t: .42, point: [-2, -1.18, .06] }, { t: .53, point: [-.65, -1.35, .06] },
  { t: .64, point: [.65, -1.16, .06] }, { t: .72, point: [1.22, -.75, .06] },
  { t: .82, point: [1.95, -.24, .06] }, { t: .91, point: [2.45, .02, .06] },
  { t: 1, point: [2.82, .14, .06] },
] as const;
export function hydrothermalRoute(t: number): HydrothermalPoint {
  const q = unit(t), i = Math.max(0, HYDROTHERMAL_ROUTE.findIndex((node, j) => j < HYDROTHERMAL_ROUTE.length - 1 && q >= node.t && q <= HYDROTHERMAL_ROUTE[j + 1].t));
  const a = HYDROTHERMAL_ROUTE[i], b = HYDROTHERMAL_ROUTE[i + 1], f = unit((q - a.t) / (b.t - a.t));
  return a.point.map((value, axis) => value + (b.point[axis] - value) * f) as HydrothermalPoint;
}
export function hotRockDistance(x: number, y: number, z: number) {
  return Math.hypot((x - HOT_ROCK.x) / HOT_ROCK.rx, (y - HOT_ROCK.y) / HOT_ROCK.ry, (z - HOT_ROCK.z) / HOT_ROCK.rz) - 1;
}
export function poolOutline(angle: number) { return 1 + .055 * Math.sin(angle * 3 + .6) + .025 * Math.cos(angle * 5 - .4); }
export function poolCoordinate(x: number, z: number) {
  const xx = (x - POOL.x) / POOL.rx, zz = (z - POOL.z) / POOL.rz;
  return Math.hypot(xx, zz) / poolOutline(Math.atan2(zz, xx));
}
export function hydrothermalTerrain(x: number, z: number) {
  const r = poolCoordinate(x, z);
  if (r < 1) return POOL.bottom + (POOL.rim - POOL.bottom) * r ** 4;
  const natural = .58 + 1.05 * Math.exp(-(((x + 3.6) / 2.8) ** 2 + (z / 3.6) ** 2))
    + .075 * Math.sin(x * 1.1 + z * .7) * Math.cos(z * 1.3 - x * .5);
  return POOL.rim + (natural - POOL.rim) * ramp(1, 1.8, r);
}
export function poolShore(angle: number, frame: HydrothermalFrame): HydrothermalPoint {
  const radius = frame.pool > 0 ? ((frame.waterLevel - POOL.bottom) / (POOL.rim - POOL.bottom)) ** .25 * poolOutline(angle) : 0;
  return [POOL.x + Math.cos(angle) * POOL.rx * radius, frame.waterLevel, POOL.z + Math.sin(angle) * POOL.rz * radius];
}
/** Fixed tracer identities illustrate a supplied route. A phase wrap replaces
 * a presentation tracer at the input; it is not recirculation of the same
 * molecule, an extra water source, or a second scientific timeline. */
export function hydrothermalSample(id: number, frame: HydrothermalFrame, detailPhase = 0) {
  const phase = Number.isFinite(detailPhase) ? detailPhase : 0, t = ((hydroSeed(id + 73) + phase) % 1 + 1) % 1;
  const position = hydrothermalRoute(t), before = hydrothermalRoute(t - .002), after = hydrothermalRoute(t + .002);
  const width = .015 + hydroSeed(id + 511) * .022;
  position[2] += (hydroSeed(id + 171) - .5) * .045;
  const heat = ramp(.42, .66, t) * (1 - .16 * ramp(.82, 1, t));
  return { id, source: 'precipitation' as const, phase: 'liquid' as const, t, position,
    direction: after.map((value, axis) => value - before[axis]) as HydrothermalPoint,
    visible: hydroSeed(id + 971) < frame.settings.supply && t <= frame.wetFront,
    heat, width, rising: t > .66 };
}
