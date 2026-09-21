export const CASES = ['shield', 'composite', 'scoria', 'submarine', 'lake'] as const;
export type VolcanoCase = typeof CASES[number];
export type Landform = 'shield' | 'composite' | 'scoria';
export type Chapter = 'landscape' | 'eruption' | 'life';
export type View = 'landscape' | 'section' | 'vent' | 'plume' | 'storage';
export type Aftermath = 'green' | 'eroded';
export const bounded = (n: number) => Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : 0;
const ramp = (p: number, a: number, b: number) => { const u = bounded((p - a) / (b - a)); return u * u * (3 - 2 * u); };
export function caseFromSearch(search: string): VolcanoCase {
  const value = new URLSearchParams(search).get('case');
  return CASES.includes(value as VolcanoCase) ? value as VolcanoCase : 'scoria';
}
export function legacyDestination(search: string, volcano: 'submarine' | 'lake', base = '/') {
  const params = new URLSearchParams(search);
  params.set('case', volcano);
  return `${base.replace(/\/$/, '')}/topics/volcano-eruption/?${params}`;
}
export function landState(progress: number, aftermath: Aftermath = 'green') {
  const p = bounded(progress);
  const deposits = Array.from({ length: 18 }, (_, i) => ({ index: i, growth: ramp(p, .06 + i * .028, .11 + i * .028) }));
  return { p, deposits, growth: deposits.reduce((sum, d) => sum + d.growth, 0) / 18,
    activity: ramp(p, .03, .12) * (1 - ramp(p, .54, .68)), cooling: ramp(p, .59, .74),
    vegetation: aftermath === 'green' ? ramp(p, .76, 1) : 0,
    erosion: aftermath === 'eroded' ? ramp(p, .76, 1) : 0,
    stage: p < .20 ? 0 : p < .61 ? 1 : p < .78 ? 2 : 3 };
}
export function landSurface(x: number, kind: Landform, growth: number, erosion = 0) {
  const g = bounded(growth), dx = Math.abs(x - 500);
  const width = (kind === 'shield' ? 420 : kind === 'composite' ? 280 : 260) * (.22 + .78 * Math.sqrt(g));
  const height = (kind === 'shield' ? 124 : kind === 'composite' ? 270 : 190) * g;
  const u = dx / width;
  let relief = kind === 'shield' ? height * Math.max(0, (Math.exp(-u * u * 2.6) - Math.exp(-2.6)) / (1 - Math.exp(-2.6))) : height * Math.pow(Math.max(0, 1 - u), kind === 'scoria' ? .96 : 1.12);
  if (kind === 'scoria' && dx < width * .24) {
    const rim = height * Math.pow(.76, .96);
    relief = rim - 25 * g * (1 - (dx / (width * .24)) ** 2);
  } else if (kind === 'composite' && dx < width * .11) {
    relief = height * Math.pow(.89, 1.12) - 17 * g * (1 - (dx / (width * .11)) ** 2);
  } else if (kind === 'shield') {
    relief -= 13 * g * Math.exp(-((dx / (width * .13)) ** 4));
  }
  relief = Math.max(0, relief);
  const wear = bounded(erosion) * relief * (.10 + .07 * Math.sin(x * .055) ** 2);
  return 426 - relief + wear;
}
export function landCamera(view: View, kind: Landform, progress: number): [number, number, number, number] {
  if (view === 'vent') return [340, landSurface(500, kind, landState(progress).growth) - 110, 320, 213.333];
  return [0, 0, 1000, 666.667];
}
