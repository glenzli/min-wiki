/** Authored, finite causal trajectories; not a stochastic ant-colony optimiser. */
export const chapters = ['body', 'forage', 'trails', 'nest'] as const;
export const conditions = ['intact', 'faded', 'blocked'] as const;
export const parts = ['antennae', 'legs', 'mandibles', 'waist', 'shell'] as const;
export type Chapter = typeof chapters[number];
export type Condition = typeof conditions[number];
export type Part = typeof parts[number];
export type Point = { x: number; y: number };
export const clamp = (n: number, lo = 0, hi = 1): number => Number.isFinite(n) ? Math.max(lo, Math.min(hi, n)) : lo;
const p = (x: number, y: number): Point => ({ x, y });
export const nest = p(120, 270), food = p(840, 225), junction = p(420, 238);
export const direct = [nest, p(220, 275), p(320, 253), junction, p(560, 220), p(690, 214), food];
export const beforeGap = direct.slice(0, 4), afterGap = direct.slice(3);
export const bypass = [junction, p(427, 172), p(473, 111), p(561, 96), p(642, 124), p(693, 181), food];
export const detour = [...beforeGap, ...bypass.slice(1)];
const discovery = [nest, p(214, 230), p(240, 178), p(310, 164), p(358, 194), p(397, 278), p(482, 290), p(555, 255), p(608, 290), p(716, 273), food];
const care = [nest, p(146, 311), p(137, 365), p(169, 395), p(181, 437), p(200, 437)];
const reverse = (route: Point[]): Point[] => [...route].reverse();
const search = (offset = 0): Point[] => [junction, p(447, 214 - offset), p(430, 192 - offset), p(397, 208 - offset), p(404, 248), p(436, 265), p(456, 242), junction];

/** Arc-length polyline interpolation keeps position continuous at every route junction. */
export function along(route: Point[], progress: number): Point {
  if (clamp(progress) === 0) return { ...route[0]! };
  if (clamp(progress) === 1) return { ...route.at(-1)! };
  const lengths = route.slice(1).map((v, i) => Math.hypot(v.x - route[i]!.x, v.y - route[i]!.y));
  let remaining = lengths.reduce((a, b) => a + b, 0) * clamp(progress);
  for (let i = 0; i < lengths.length; i++) {
    const length = lengths[i]!;
    if (remaining <= length || i === lengths.length - 1) {
      const a = route[i]!, b = route[i + 1]!, f = length ? remaining / length : 0;
      return p(a.x + (b.x - a.x) * f, a.y + (b.y - a.y) * f);
    }
    remaining -= length;
  }
  return route[0]!;
}
type Leg = { start: number; end: number; route: Point[] };
const leg = (start: number, end: number, route: Point[]): Leg => ({ start, end, route });
function itinerary(id: number, condition: Condition): Leg[] {
  if (id === 0) {
    const first = [leg(0, 20, discovery), leg(22, 40, reverse(direct)), leg(44, 54, beforeGap)];
    if (condition === 'blocked') return [...first, leg(54, 66, search()), leg(66, 81, bypass), leg(83, 96, reverse(detour)), leg(96, 100, care)];
    if (condition === 'faded') return [...first, leg(54, 65, search()), leg(65, 76, afterGap), leg(78, 95, reverse(direct)), leg(95, 100, care)];
    return [...first, leg(54, 66, afterGap), leg(68, 86, reverse(direct)), leg(86, 100, care)];
  }
  const parking = p(91 - id * 14, 281 + id * 9);
  const start = 43 + id * 2, arrive = 57 + id * 2;
  const first = [leg(start, arrive, [parking, ...beforeGap])];
  if (condition === 'intact') return [...first, leg(arrive, arrive + 17, afterGap), leg(arrive + 19, arrive + 38, reverse(direct))];
  if (condition === 'faded') return [...first, leg(arrive, arrive + 13, search(id * 4)), leg(arrive + 13, 92 + id, search(id * 4)), leg(92 + id, 114 + id, afterGap)];
  return [...first, leg(arrive, arrive + 13, search(id * 4)), leg(arrive + 13, 92 + id, search(id * 4)), leg(92 + id, 115 + id, bypass)];
}
function atLegs(legs: Leg[], time: number): Point {
  let last = legs[0]!.route[0]!;
  for (const item of legs) {
    if (time < item.start) return last;
    if (time <= item.end) return along(item.route, (time - item.start) / (item.end - item.start));
    last = item.route.at(-1)!;
  }
  return last;
}
export type Worker = Point & { id: string; angle: number; walking: boolean; carrying: boolean; depositing: boolean };
export function workerAt(id: number, time: number, condition: Condition): Worker {
  const t = clamp(time, 0, 100), route = itinerary(id, condition), pos = atLegs(route, t);
  const before = atLegs(route, Math.max(0, t - .025)), after = atLegs(route, Math.min(100, t + .025));
  const walking = Math.hypot(after.x - before.x, after.y - before.y) > .001;
  const returnStart = condition === 'blocked' ? 83 : condition === 'faded' ? 78 : 68;
  const returnEnd = condition === 'blocked' ? 96 : condition === 'faded' ? 95 : 86;
  const depositing = id === 0 && ((t >= 22 && t <= 40) || (t >= returnStart && t <= returnEnd));
  return { ...pos, id: `W${id + 1}`, walking, depositing, carrying: id === 0 && ((t >= 20 && t <= 40) || (t >= returnStart - 2 && t <= 100)), angle: walking ? Math.atan2(after.y - before.y, after.x - before.x) * 180 / Math.PI : t < 43 ? 0 : 180 };
}
export type Scent = Point & { strength: number; route: 'direct' | 'detour'; depositedAt: number };
/** Each stable marker appears only after the returning worker has passed its location. */
export function scentAt(time: number, condition: Condition): Scent[] {
  const t = clamp(time, 0, 100), result: Scent[] = [];
  for (let i = 0; i <= 48; i++) {
    const s = i / 48, first = 40 - 18 * s, pt = along(direct, s);
    const second = condition === 'intact' ? 86 - 18 * s : condition === 'faded' ? 95 - 17 * s : Infinity;
    const latest = t >= second ? second : first;
    let strength = t >= latest ? Math.exp(-(t - latest) / 53) : 0;
    if (condition === 'faded' && t >= 54 && latest < 54) strength *= Math.exp(-(t - 54) / 5);
    if (condition === 'blocked' && t >= 54 && pt.x > 455 && pt.x < 585) strength = 0;
    result.push({ ...pt, strength, route: 'direct', depositedAt: latest });
  }
  for (let i = 0; i <= 55; i++) {
    const s = i / 55, depositedAt = 96 - 13 * s, pt = along(detour, s);
    result.push({ ...pt, route: 'detour', depositedAt, strength: condition === 'blocked' && t >= depositedAt ? Math.exp(-(t - depositedAt) / 53) : 0 });
  }
  return result;
}
export function eventAt(time: number, condition: Condition): string {
  if (time < 20) return 'search';
  if (time < 22) return 'found';
  if (time < 40) return 'mark';
  if (time < 44) return 'recruit';
  if (time < 54) return 'follow';
  if (condition === 'blocked') return time < 66 ? 'blocked' : time < 83 ? 'explore' : time < 96 ? 'newTrail' : 'home';
  if (condition === 'faded') return time < 65 ? 'faded' : time < 78 ? 'memory' : time < 95 ? 'reinforce' : 'home';
  return time < 68 ? 'follow' : time < 86 ? 'reinforce' : 'home';
}
export type State = { chapter: Chapter; condition: Condition; time: number; part: Part; brood: number; labels: boolean; scent: boolean };
export function readState(searchParams: string): State {
  const q = new URLSearchParams(searchParams);
  const chapter = chapters.find(v => v === q.get('chapter')) ?? 'body';
  return { chapter, condition: conditions.find(v => v === q.get('condition')) ?? 'intact', time: clamp(Number(q.get('t'))) * 100, part: parts.find(v => v === q.get('part')) ?? 'antennae', brood: clamp(Number(q.get('brood'))), labels: q.get('labels') !== '0', scent: q.get('scent') !== '0' };
}
export function writeState(state: State, original = ''): string {
  const q = new URLSearchParams(original);
  q.set('chapter', state.chapter); q.set('condition', state.condition); q.set('t', (state.time / 100).toFixed(3));
  q.set('part', state.part); q.set('brood', state.brood.toFixed(3)); q.set('labels', state.labels ? '1' : '0'); q.set('scent', state.scent ? '1' : '0');
  return q.toString();
}
export const broodStage = (progress: number): number => Math.min(3, Math.floor(clamp(progress) * 4));
