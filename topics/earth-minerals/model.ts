import { parseCamera } from './geometry.ts';
export const VIEWS = ['structure', 'growth', 'evidence', 'resources'] as const;
export type View = typeof VIEWS[number];
export const ENVIRONMENTS = ['melt', 'hydrothermal', 'evaporation'] as const;
export type Environment = typeof ENVIRONMENTS[number];
export const EVIDENCE = ['hardness', 'streak', 'cleavage', 'luster', 'density'] as const;
export type Evidence = typeof EVIDENCE[number];
export const SPECIMENS = ['quartz', 'calcite', 'gypsum', 'halite', 'pyrite', 'hematite'] as const;
export type Specimen = typeof SPECIMENS[number];

export interface Mineral {
  id: Specimen;
  formula: string;
  hardness: readonly [number, number];
  density: number;
  streak: 'white' | 'dark' | 'red';
  cleavage: 'none' | 'oblique' | 'sheet' | 'cube';
  luster: 'glassy' | 'pearly' | 'metallic';
  color: string;
}
// Typical hand-specimen values; not a universal classifier. Sources: sources.md M1–M6.
export const MINERALS: readonly Mineral[] = [
  { id: 'quartz', formula: 'SiO₂', hardness: [7, 7], density: 2.65, streak: 'white', cleavage: 'none', luster: 'glassy', color: '#b5cace' },
  { id: 'calcite', formula: 'CaCO₃', hardness: [3, 3], density: 2.71, streak: 'white', cleavage: 'oblique', luster: 'glassy', color: '#e7d7b6' },
  { id: 'gypsum', formula: 'CaSO₄·2H₂O', hardness: [1.5, 2], density: 2.32, streak: 'white', cleavage: 'sheet', luster: 'pearly', color: '#d5d3c2' },
  { id: 'halite', formula: 'NaCl', hardness: [2, 2.5], density: 2.17, streak: 'white', cleavage: 'cube', luster: 'glassy', color: '#d3c2bc' },
  { id: 'pyrite', formula: 'FeS₂', hardness: [6, 6.5], density: 5.02, streak: 'dark', cleavage: 'none', luster: 'metallic', color: '#bc9746' },
  { id: 'hematite', formula: 'Fe₂O₃', hardness: [5, 6], density: 5.26, streak: 'red', cleavage: 'none', luster: 'metallic', color: '#776a66' },
];
export const mineralById = (id: Specimen): Mineral => MINERALS.find(m => m.id === id)!;
export const OCCURRENCES = ['vein', 'geode', 'pocket', 'grain'] as const;
export type Occurrence = typeof OCCURRENCES[number];
export interface MineralState {
  occurrence: Occurrence; exposure: number; finish: 'natural' | 'cut';
  representation: 'carbon' | 'quartz'; camera: string;
  view: View; shear: number; environment: Environment; rate: number; supply: number;
  progress: number; specimen: Specimen; evidence: Evidence[];
  grade: number; recovery: number; price: number; cost: number;
}
export const DEFAULT_STATE: MineralState = {
  occurrence: 'vein', exposure: 100, finish: 'natural', representation: 'carbon', camera: '', view: 'structure', shear: 0, environment: 'hydrothermal', rate: 30, supply: 70,
  progress: 0, specimen: 'quartz', evidence: [], grade: 1, recovery: 80, price: 8, cost: 90,
};
function option<T extends string>(value: unknown, choices: readonly T[], fallback: T): T {
  return typeof value === 'string' && choices.includes(value as T) ? value as T : fallback;
}
function numeric(value: unknown, min: number, max: number, fallback: number): number {
  if (typeof value !== 'string' || !/^(?:0|[1-9]\d*)(?:\.\d+)?$/.test(value)) return fallback;
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : fallback;
}
export function parseState(input: Record<string, string>): MineralState {
  const d = DEFAULT_STATE;
  return {
    occurrence: option(input.occurrence, OCCURRENCES, d.occurrence), exposure: numeric(input.exposure, 0, 100, d.exposure), finish: option(input.finish, ['natural', 'cut'], d.finish),
    representation: option(input.representation, ['carbon', 'quartz'], d.representation),
    camera: parseCamera(input.camera) ? JSON.stringify(parseCamera(input.camera)) : '',
    view: option(input.view, VIEWS, d.view), shear: numeric(input.shear, 0, 100, d.shear),
    environment: option(input.environment, ENVIRONMENTS, d.environment),
    rate: numeric(input.rate, 0, 100, d.rate), supply: numeric(input.supply, 0, 100, d.supply),
    progress: numeric(input.progress, 0, 100, d.progress), specimen: option(input.specimen, SPECIMENS, d.specimen),
    evidence: EVIDENCE.filter(key => typeof input.evidence === 'string' && input.evidence.split(',').includes(key)),
    grade: numeric(input.grade, 0.1, 5, d.grade), recovery: numeric(input.recovery, 20, 95, d.recovery),
    price: numeric(input.price, 2, 20, d.price), cost: numeric(input.cost, 20, 300, d.cost),
  };
}
export function serializeState(s: MineralState): Record<string, string> {
  return Object.fromEntries(Object.entries(s).map(([key, value]) => [key, Array.isArray(value) ? value.join(',') : String(value)]));
}
const clamp = (x: number, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const smooth = (x: number) => { const y = clamp(x); return y * y * (3 - 2 * y); };
export interface GrowthSnapshot {
  crystal: number; fluid: number; glass: number; count: number; size: number;
  capacity: number; supplied: number; waterFraction: number; condition: 'waiting' | 'growing' | 'quenched' | 'undersaturated';
  advance: number;
}
/** Deterministic, reversible teaching budget. Units and time are uncalibrated. */
export function growthAt(state: Pick<MineralState, 'environment' | 'rate' | 'supply' | 'progress'>): GrowthSnapshot {
  const t = clamp(state.progress / 100), r = clamp(state.rate / 100);
  const supplied = 25 + clamp(state.supply / 100) * 75;
  const waterFraction = state.environment === 'evaporation' ? 1 - 0.8 * t : 1;
  let crystal = 0, glass = 0, capacity = 100, count = 0;
  if (state.environment === 'melt') {
    const advance = smooth((t - 0.18) / 0.82);
    const quench = smooth((r - 0.75) / 0.25);
    const solid = 100 * advance;
    glass = solid * quench * 0.96;
    crystal = solid - glass;
    count = crystal > 0.01 ? Math.round(3 + 20 * r) : 0;
    return { crystal, glass, fluid: 100 - solid, count, size: count ? Math.sqrt(crystal / count) : 0, capacity: 100 * (1 - t), supplied: 100, waterFraction: 1, condition: quench > 0.5 && t > 0.5 ? 'quenched' : crystal > 0.01 ? 'growing' : 'waiting', advance };
  }
  // A representative solute: cooling lowers its capacity, evaporation removes water.
  // Real solubility trends differ by mineral, pressure, fluid chemistry and gases.
  capacity = state.environment === 'hydrothermal' ? 100 - 70 * t : 100 * waterFraction;
  const excess = Math.max(0, supplied - capacity);
  const onset = state.environment === 'hydrothermal' ? (100 - supplied) / 70 : (100 - supplied) / 80;
  const elapsed = clamp(t - onset);
  const adjustment = elapsed <= 0 ? 0 : 1 - Math.exp(-elapsed * (10 - 7 * r));
  crystal = excess * adjustment;
  count = crystal > 0.01 ? Math.round(2 + 15 * r + Math.max(0, supplied / capacity - 1) * 2) : 0;
  return { crystal, glass, fluid: supplied - crystal, count, size: count ? Math.sqrt(crystal / count) : 0, capacity, supplied, waterFraction, condition: supplied <= capacity ? 'undersaturated' : crystal > 0.01 ? 'growing' : 'waiting', advance: smooth(t) };
}

/** Stable authored specimen identities, in the local coordinates of its matrix.
 * This is a representative quartz habit, not a crystal-lattice or measured sample. */
export const QUARTZ_CLUSTER = [
  { id: 'A', base: [-0.17, 0.13, 0] as const, radius: 0.62, height: 3.55, tilt: -0.06 },
  { id: 'B', base: [0.8, 0.13, 0.25] as const, radius: 0.37, height: 2.5, tilt: -0.25 },
  { id: 'C', base: [-0.85, 0.13, -0.05] as const, radius: 0.4, height: 2.15, tilt: 0.25 },
  { id: 'D', base: [0.27, 0.13, -0.72] as const, radius: 0.29, height: 2.7, tilt: 0.16 },
  { id: 'E', base: [-0.48, 0.13, 0.6] as const, radius: 0.23, height: 1.65, tilt: -0.22 },
] as const;

/** Presentation driven by the budget, without a second growth history.
 * Five representative crystals share the same advancement. Their count, habits
 * and shape interpolation are authored; they do not stand for predicted nuclei.
 * Only the hot-solution branch uses this quartz example. */
export function quartzGrowthAt(state: Pick<MineralState, 'environment' | 'rate' | 'supply' | 'progress'>) {
  const budget = growthAt(state);
  const enabled = state.environment === 'hydrothermal';
  // 70 is the greatest possible precipitated share in this chosen solution
  // budget (100 supplied minus 30 capacity), not a measured quartz yield.
  const share = enabled ? clamp(budget.crystal / 70) : 0;
  const radiusScale = Math.pow(share, 0.28), heightScale = Math.pow(share, 0.44);
  return {
    enabled, share, budget,
    crystals: QUARTZ_CLUSTER.map(crystal => ({
      id: crystal.id, base: crystal.base,
      visible: share > 0.00001, radiusScale, heightScale,
    })),
  };
}
export function compatible(candidate: Mineral, observed: Mineral, test: Evidence): boolean {
  if (test === 'hardness') return candidate.hardness[0] <= observed.hardness[1] && candidate.hardness[1] >= observed.hardness[0];
  if (test === 'density') return Math.abs(candidate.density - observed.density) <= 0.32;
  return candidate[test] === observed[test];
}
export function evidenceResult(specimen: Specimen, tests: readonly Evidence[]) {
  const observed = mineralById(specimen);
  return MINERALS.map(candidate => ({ mineral: candidate, contradictions: tests.filter(test => !compatible(candidate, observed, test)) }));
}
/** Ideal separation from 1 tonne of treated feed; tokens are fictional currency. */
export function oreBudget(s: Pick<MineralState, 'grade' | 'recovery' | 'price' | 'cost'>) {
  const metalInFeed = 1000 * s.grade / 100;
  const recovered = metalInFeed * s.recovery / 100;
  const unrecovered = metalInFeed - recovered;
  const revenue = recovered * s.price;
  return { feed: 1000, metalInFeed, recovered, unrecovered, residue: 1000 - recovered, revenue, balance: revenue - s.cost, cost: s.cost };
}
export function graphiteOffset(shear: number, layer: number): number { return clamp(shear / 100) * 34 * (layer - 1); }

/** A display mask, not a mass-removal or preparation simulation. */
export function exposureAt(exposure: number) { const opened = clamp(exposure / 100); return { opened, surroundOpacity: (1 - opened) * 0.62, anchor: [-0.17, -1.12, 0] as const, crystalScale: 1 }; }

/** Attachment points on an illustrative cavity wall; each crystal points inward. */
export function cavityLining(count: number, cx: number, cy: number, rx: number, ry: number) {
  return Array.from({ length: count }, (_, i) => {
    const angle = i / count * Math.PI * 2;
    const dx = rx * Math.cos(angle), dy = ry * Math.sin(angle);
    return { x: cx + dx, y: cy + dy, rotation: Math.atan2(dy, dx) * 180 / Math.PI - 90 };
  });
}
