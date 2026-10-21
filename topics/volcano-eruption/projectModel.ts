export const CASES = ['shield', 'composite', 'scoria', 'submarine', 'lake'] as const;
export type VolcanoCase = typeof CASES[number];
export type Landform = 'shield' | 'composite' | 'scoria';
export type Chapter = 'landscape' | 'eruption' | 'life';
export type View = 'landscape' | 'exterior' | 'section' | 'vent' | 'plume' | 'storage' | 'ocean';
export type Aftermath = 'green' | 'eroded';
export const bounded = (n: number) => Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : 0;
const ramp = (p: number, a: number, b: number) => { const u = bounded((p - a) / (b - a)); return u * u * (3 - 2 * u); };
export function caseFromSearch(search: string): VolcanoCase {
  const value = new URLSearchParams(search).get('case');
  return CASES.includes(value as VolcanoCase) ? value as VolcanoCase : 'scoria';
}
/** Omuro has one continuous formation-to-grassland journey. Old chapter URLs
 * remain valid entries into that journey rather than creating parallel studies. */
export function chapterFromSearch(search: string, volcano: VolcanoCase): Chapter {
  if (volcano === 'scoria' || volcano === 'lake' || volcano === 'submarine') return 'landscape';
  const requested = new URLSearchParams(search).get('chapter');
  if (requested === 'eruption' || requested === 'life' || requested === 'landscape') return requested;
  return 'eruption';
}
export function initialProgress(volcano: VolcanoCase, chapter: Chapter, search = ''): number {
  if (volcano === 'scoria') {
    const requested = new URLSearchParams(search).get('chapter');
    if (requested === 'eruption') return .08;
    if (requested === 'life') return .66;
  }
  // Show the mature mountain first; the standard replay control starts its history.
  return chapter === 'landscape' && volcano !== 'lake' && volcano !== 'submarine' ? 1 : .08;
}
export function chapterForCase(volcano: VolcanoCase, current: Chapter): Chapter {
  return volcano === 'scoria' || volcano === 'lake' || volcano === 'submarine' ? 'landscape' : current;
}
/** Every reachable case/chapter has a 3D owner; the SVG is failure fallback. */
export function rendererForCase(volcano: VolcanoCase, chapter: Chapter) {
  if (volcano === 'lake' || volcano === 'submarine') return volcano;
  if (volcano === 'scoria') return 'omuro';
  if (chapter === 'eruption') return 'eruption';
  return 'history';
}
export function legacyDestination(search: string, volcano: 'submarine' | 'lake', base = '/') {
  const params = new URLSearchParams(search);
  params.set('case', volcano);
  return `${base.replace(/\/$/, '')}/topics/volcano-eruption/?${params}`;
}
/** One authored deposit interval, shared by accumulation and representative
 * material paths. These are normalized teaching intervals, not measured time. */
export function landDepositWindow(index: number) {
  return { birth: .06 + index * .028, end: .11 + index * .028 };
}
export function landState(progress: number, aftermath: Aftermath = 'green') {
  const p = bounded(progress);
  const deposits = Array.from({ length: 18 }, (_, i) => {
    const window = landDepositWindow(i);
    return { index: i, growth: ramp(p, window.birth, window.end) };
  });
  return { p, deposits, growth: deposits.reduce((sum, d) => sum + d.growth, 0) / 18,
    activity: ramp(p, .03, .12) * (1 - ramp(p, .54, .68)), cooling: ramp(p, .59, .74),
    vegetation: aftermath === 'green' ? ramp(p, .76, 1) : 0,
    erosion: aftermath === 'eroded' ? ramp(p, .76, 1) : 0,
    stage: p < .20 ? 0 : p < .61 ? 1 : p < .78 ? 2 : 3 };
}
/** One illustrative recharge/intrusion prelude, not a universal eruption
 * precursor, tectonic compression model, pressure inversion or measured time.
 * Uplift is exaggerated display distance; deposits retain their own clock.
 * USGS: deformation-monitoring-tracks-moving-magma-and-faults;
 * USGS: volcano-deformation-what-and-why. */
export function constructionState(progress: number) {
  const p = bounded(progress), intrusionFront = ramp(p, .004, .06);
  const supply = ramp(p, 0, .035) * (1 - ramp(p, .54, .68));
  const fracture = ramp(p, .012, .058), inflation = ramp(p, .008, .055) * (1 - ramp(p, .10, .16));
  const heat = ramp(p, 0, .03) * (1 - ramp(p, .57, .74));
  const phase = p === 0 ? 'quiet' : p < .06 ? 'intruding' : p < .61 ? 'building' : p < .74 ? 'cooling' : 'settled';
  return { intrusionFront, supply, fracture, inflation, uplift: .18 * inflation, heat, mobility: heat * supply, phase };
}
export type ConstructionState = ReturnType<typeof constructionState>;
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
