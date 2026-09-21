import { smooth } from './model.ts';
export const LIFE_STOPS = [0, .34, .7, 1] as const;
export type LeafView = 'life' | 'inside' | 'water';
const bounded = (x: number) => Number.isFinite(x) ? Math.max(0, Math.min(1, x)) : 0;
/** Representative deciduous broadleaf. These are teaching stages, not days or rates. */
export function leafLifeAt(value: number) {
  const age = bounded(value), growth = smooth(0, .28, age), senescence = smooth(.46, .86, age);
  const separation = smooth(.77, .87, age), fall = smooth(.87, 1, age);
  return {
    age, growth, senescence, separation, fall,
    stage: age < .22 ? 'bud' : age < .48 ? 'mature' : age < .87 ? 'senescent' : 'fallen',
    size: .13 + .87 * growth, unfold: .22 + .78 * growth,
    rotation: fall * .9, x: -185 * fall, y: 40 * fall,
    browning: smooth(.85, 1, age),
    // Observation excludes active transport before expansion and after detachment.
    transport: growth * (1 - separation),
    recovery: smooth(.47, .81, age),
  } as const;
}
export function leafPoint(x: number, y: number, age: number) {
  const state = leafLifeAt(age), dx = (x - 19) * state.size * state.unfold, dy = (y - 246) * state.size;
  return { x: 19 + state.x + dx * Math.cos(state.rotation) - dy * Math.sin(state.rotation), y: 246 + state.y + dx * Math.sin(state.rotation) + dy * Math.cos(state.rotation) };
}
export function readLeafRoute(search: string) {
  const p = new URLSearchParams(search), view = p.get('view');
  return { view: (view === 'inside' || view === 'water' ? view : 'life') as LeafView, age: p.has('age') ? bounded(Number(p.get('age'))) : .34 };
}
export function legacyWaterURL(href: string, base: string) {
  const url = new URL(href); url.pathname = `${base.replace(/\/$/, '')}/topics/leaf-colors/`;
  url.searchParams.set('view', 'water'); return url;
}
