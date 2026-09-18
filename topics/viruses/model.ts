export type Host = 'compatible' | 'mismatch' | 'defended';
export type View = 'whole' | 'attachment' | 'inside';
export const PHAGE_SCALE = .6;
export type Point = { x: number; y: number };
export type Camera = { x: number; y: number; width: number; height: number };
const clamp = (n: number) => Math.max(0, Math.min(1, n));
export const mix = (a: number, b: number, t: number) => a + (b - a) * t;
export function ramp(a: number, b: number, value: number): number {
  const t = clamp((value - a) / (b - a));
  return t * t * (3 - 2 * t);
}
export const hostLimit = (host: Host) => host === 'mismatch' ? 1 : host === 'defended' ? 2 : 5;
export function clampProgress(value: number, host: Host): number {
  return Math.max(0, Math.min(hostLimit(host), Number.isFinite(value) ? value : 0));
}
const interpolate = (a: Point, b: Point, t: number): Point => ({ x: mix(a.x, b.x, t), y: mix(a.y, b.y, t) });

function lengths(points: Point[]): number[] {
  return points.reduce<number[]>((out, point, i) => {
    out.push(i ? out[i - 1]! + Math.hypot(point.x - points[i - 1]!.x, point.y - points[i - 1]!.y) : 0);
    return out;
  }, []);
}
function atLength(points: Point[], cumulative: number[], distance: number): Point {
  const end = cumulative[cumulative.length - 1]!;
  const target = Math.max(0, Math.min(end, distance));
  const index = Math.max(1, cumulative.findIndex(length => length >= target));
  return interpolate(points[index - 1]!, points[index]!, (target - cumulative[index - 1]!) / (cumulative[index]! - cumulative[index - 1]! || 1));
}
function resample(points: Point[], count = 96): Point[] {
  const cumulative = lengths(points), total = cumulative[cumulative.length - 1]!;
  return Array.from({ length: count }, (_, i) => atLength(points, cumulative, total * i / (count - 1)));
}
export function packedGenome(): Point[] {
  return Array.from({ length: 96 }, (_, i) => {
    const u = i / 95;
    return { x: 25 * Math.sin(u * Math.PI * 6.8), y: -42 + 82 * u };
  });
}
function world(point: Point, origin: Point, scale: number, angle: number): Point {
  const a = angle * Math.PI / 180;
  return { x: origin.x + scale * (point.x * Math.cos(a) - point.y * Math.sin(a)), y: origin.y + scale * (point.x * Math.sin(a) + point.y * Math.cos(a)) };
}

/** One fixed-length strand travels along a coil–tube–cytoplasm path.
 * The head does not disappear or exchange opacity with an unrelated DNA icon. */
function enteringGenome(phage: Point, entry: number): Point[] {
  const source = [...packedGenome().map(p => ({ x: p.x * PHAGE_SCALE + phage.x, y: p.y * PHAGE_SCALE + phage.y })), { x: phage.x, y: phage.y + 50 * PHAGE_SCALE }];
  const sourceLengths = lengths(source), amount = sourceLengths[sourceLengths.length - 1]!;
  const channelEnd = { x: 480, y: 325 };
  const destination = Array.from({ length: 160 }, (_, i) => {
    const u = i / 159;
    return { x: 480 + 74 * Math.sin(u * Math.PI * 7), y: 325 + u * 128 };
  });
  const path = [...source, channelEnd, ...destination.slice(1)], cumulative = lengths(path);
  const travel = amount + Math.hypot(channelEnd.x - phage.x, channelEnd.y - phage.y - 50 * PHAGE_SCALE);
  return Array.from({ length: 96 }, (_, i) => atLength(path, cumulative, entry * travel + amount * i / 95));
}

const locations: Point[] = [{ x: 305, y: 335 }, { x: 422, y: 332 }, { x: 556, y: 332 }, { x: 691, y: 335 }, { x: 379, y: 400 }, { x: 611, y: 398 }];
const destinations: Point[] = [{ x: 175, y: 164 }, { x: 312, y: 81 }, { x: 468, y: 70 }, { x: 639, y: 105 }, { x: 786, y: 155 }, { x: 817, y: 50 }];
export const offspringCount = locations.length;
function releasePoint(origin: Point, target: Point, index: number, progress: number): Point {
  // Every child first travels through the already-open breach; none crosses
  // an intact membrane or jumps from an interior icon to an exterior icon.
  const gather = { x: 450 + index * 23, y: 360 };
  const outside = { x: gather.x, y: 155 };
  if (progress < .3) return interpolate(origin, gather, ramp(0, .3, progress));
  if (progress < .78) return interpolate(gather, outside, ramp(.3, .78, progress));
  return interpolate(outside, target, ramp(.78, 1, progress));
}

export function sampleCycle(value: number, host: Host) {
  const progress = clampProgress(value, host);
  const approach = ramp(0, 1, progress), contraction = host === 'mismatch' ? 0 : ramp(1, 1.32, progress);
  const phage = { x: mix(174, host === 'mismatch' ? 376 : 480, approach), y: mix(104, host === 'mismatch' ? 164 : 192, approach) + 35 * PHAGE_SCALE * contraction };
  const entry = host === 'mismatch' ? 0 : ramp(1.34, 2, progress);
  const opening = ramp(4.04, 4.3, progress);
  const offspring = locations.map((origin, id) => {
    const release = host === 'compatible' ? ramp(4.35 + id * .035, 4.8 + id * .035, progress) : 0;
    const point = releasePoint(origin, destinations[id]!, id, release);
    const angle = [-12, 15, -8, 13, -19, 21][id]! + release * [-22, -15, 5, 20, 32, 58][id]!;
    const birth = host === 'compatible' ? ramp(2.08 + id * .075, 2.78 + id * .035, progress) : 0;
    const packaging = ramp(3.1 + id * .02, 3.67 + id * .02, progress);
    const join = ramp(3.7 + id * .01, 4, progress);
    const portal = world({ x: 0, y: 51 }, origin, PHAGE_SCALE, angle);
    const loose = resample(Array.from({ length: 96 }, (_, i) => {
      const u = i / 95;
      return { x: portal.x + 33 * Math.sin(u * Math.PI * 5), y: portal.y + 28 * u };
    }));
    const packed = resample([{ x: 0, y: 51 }, ...packedGenome().reverse()]).map(p => world(p, point, PHAGE_SCALE, angle));
    const along = (path: Point[], u: number) => {
      const index = clamp(u) * 95, i = Math.min(94, Math.floor(index));
      return interpolate(path[i]!, path[i + 1]!, index - i);
    };
    const genome = Array.from({ length: 96 }, (_, i) => i / 95 > packaging
      ? along(loose, i / 95 - packaging) : along(packed, packaging - i / 95));
    return { id, ...point, angle, birth, packaging, join, release, genome, loose };

  });
  const template = enteringGenome(phage, entry);
  const gather = host === 'compatible' ? ramp(2.85, 3.08, progress) : 0;
  const genome = template.map((p, i) => interpolate(p, offspring[0]!.genome[i]!, gather));
  return { progress, stage: Math.min(hostLimit(host), progress >= 4.35 ? 5 : Math.floor(progress + 1e-7)), host, phage, contraction, entry, genome, offspring, opening,
    defense: host === 'defended' ? ramp(1.82, 2, progress) : 0 };
}
export type Cycle = ReturnType<typeof sampleCycle>;

export function cameraFor(view: View, state: Cycle): Camera {
  if (view === 'attachment') return { x: state.phage.x - 120, y: state.phage.y - 45, width: 240, height: 160 };
  if (view === 'inside') return { x: 245, y: 250, width: 500, height: 1000 / 3 };
  return { x: 0, y: 0, width: 900, height: 600 };
}
export function mixCamera(a: Camera, b: Camera, progress: number): Camera {
  return { x: mix(a.x, b.x, progress), y: mix(a.y, b.y, progress), width: mix(a.width, b.width, progress), height: mix(a.height, b.height, progress) };
}
