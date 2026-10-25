import content from './content.json';
import { parseBurgessJSON, serializeBurgessState, type BurgessState } from './burgess/model.ts';

export const VIEWS = ['community', 'fossils', 'plants', 'animal'] as const;
export const COMMUNITIES = ['microbial', 'ediacaran', 'cambrian', 'coal', 'permian', 'kpg', 'steppe'] as const;
export const LENSES = ['reconstruction', 'body', 'trace', 'chemistry', 'inference'] as const;
export const DEPOSITS = ['marine', 'river', 'peat'] as const;
export const BURIALS = ['rapid', 'exposed', 'transported'] as const;
export const SAMPLES = ['small', 'wide'] as const;
export const PLANTS = ['lycopsid', 'calamite', 'seedfern'] as const;
export type CommunityId = typeof COMMUNITIES[number];
export type Lens = typeof LENSES[number];
export type Pair = { zh: string; en: string };
export interface LifeNode {
  id: string; name: Pair; latin: string; icon: string; x: number; y: number; size: number;
  record: Pair; inference: Pair; uncertainty: Pair;
  evidence: Exclude<Lens, 'reconstruction'>[];
  after: 'present' | 'reduced' | 'lost';
}
export interface Relationship {
  from: string; to: string; type: 'energy' | 'habitat' | 'cycle' | 'pressure';
  support: Exclude<Lens, 'reconstruction'>; label: Pair; caveat: Pair;
}
export interface Community {
  id: CommunityId; title: Pair; age: Pair; afterAge: Pair; setting: Pair; question: Pair;
  mechanism: Pair; change: Pair; uncertainty: Pair; boundary: Pair;
  theme: 'sea' | 'forest' | 'steppe'; phases: boolean; refs: string[];
  nodes: LifeNode[]; links: Relationship[];
}
export const DATA = content as unknown as {
  references: Record<string, { title: string; url: string; supports: Pair }>;
  communities: Community[];
  plants: Record<typeof PLANTS[number], { title: Pair; observation: Pair; evidence: Pair; uncertainty: Pair; refs: string[] }>;
};
export interface LifeState {
  view: typeof VIEWS[number]; community: CommunityId; lens: Lens;
  focus: Partial<Record<CommunityId, string>>; phase: 0 | 1;
  deposit: typeof DEPOSITS[number]; burial: typeof BURIALS[number]; sample: typeof SAMPLES[number];
  plant: typeof PLANTS[number]; detail: 'whole' | 'surface';
  fossilProgress: number;
  animal: BurgessState;
}
const pick = <T extends string>(values: readonly T[], value: unknown, fallback: T): T =>
  typeof value === 'string' && values.includes(value as T) ? value as T : fallback;
export function communityById(id: CommunityId): Community { return DATA.communities.find(c => c.id === id)!; }
export function parseState(raw: Record<string, string> = {}): LifeState {
  const focus: LifeState['focus'] = {};
  if (typeof raw.focus === 'string' && raw.focus.length <= 3072) {
    try {
      const parsed: unknown = JSON.parse(raw.focus);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        for (const id of COMMUNITIES) {
          const candidate = (parsed as Record<string, unknown>)[id];
          if (typeof candidate === 'string' && communityById(id).nodes.some(n => n.id === candidate)) focus[id] = candidate;
        }
      }
    } catch { /* Invalid URL state falls back to explicit defaults. */ }
  }
  for (const id of COMMUNITIES) focus[id] ??= communityById(id).nodes[0].id;
  return {
    view: pick(VIEWS, raw.view, 'community'), community: pick(COMMUNITIES, raw.community, 'cambrian'),
    lens: pick(LENSES, raw.lens, 'reconstruction'), focus, phase: raw.phase === '1' ? 1 : 0,
    deposit: pick(DEPOSITS, raw.deposit, 'marine'), burial: pick(BURIALS, raw.burial, 'rapid'),
    sample: pick(SAMPLES, raw.sample, 'small'), plant: pick(PLANTS, raw.plant, 'lycopsid'),
    detail: pick(['whole', 'surface'] as const, raw.detail, 'whole'),
    fossilProgress: parseFossilProgress(raw.fossilProgress),
    animal: parseBurgessJSON(raw.animal),
  };
}
export function serializeState(s: LifeState): Record<string, string> {
  return { view: s.view, community: s.community, lens: s.lens, focus: JSON.stringify(s.focus), phase: String(s.phase),
    deposit: s.deposit, burial: s.burial, sample: s.sample, plant: s.plant, detail: s.detail, fossilProgress: String(s.fossilProgress), animal: serializeBurgessState(s.animal) };
}

/** Progress is a teaching sequence, never elapsed geological time or a decay rate. */
export const FOSSIL_STOPS = [0, 33, 67, 100] as const;
export function parseFossilProgress(value: unknown): number {
  if (typeof value !== 'string' || !/^\d{1,3}$/.test(value)) return 0;
  return Math.min(100, Math.max(0, Number(value)));
}
export function focusedNode(s: LifeState): LifeNode {
  const c = communityById(s.community);
  return c.nodes.find(n => n.id === s.focus[s.community]) ?? c.nodes[0];
}
export function nodeStatus(s: LifeState, node: LifeNode): LifeNode['after'] {
  return communityById(s.community).phases && s.phase ? node.after : 'present';
}
export function visibleLinks(s: LifeState): Relationship[] {
  const c = communityById(s.community);
  return c.links.filter(link => [link.from, link.to].every(id => {
    const node = c.nodes.find(n => n.id === id);
    return node && nodeStatus(s, node) !== 'lost';
  }));
}
export type RemainKind = 'shell' | 'worm' | 'leaf' | 'wood' | 'bone' | 'insect';
export interface Remain { id: string; kind: RemainKind; habitat: 'marine' | 'land'; hard: boolean; rank: number; }
/** Fixed illustrative source assemblage, not a reconstructed natural species census. */
export const REMAINS: Remain[] = (['shell', 'worm', 'leaf', 'wood', 'bone', 'insect'] as const).flatMap((kind, k) =>
  [0, 1].map(i => ({ id: `${kind}-${i + 1}`, kind, habitat: k < 2 ? 'marine' : 'land',
    hard: ['shell', 'wood', 'bone'].includes(kind), rank: [5, 1, 2, 4, 4, 2][k] })));
export type Fate = 'source-gap' | 'destroyed' | 'uncollected' | 'found';
export interface FossilRecord { remain: Remain; fate: Fate; fragment: boolean; }
/** A deterministic, qualitative filter. No probability, age or preservation rate is calibrated. */
export function fossilExperiment(s: Pick<LifeState, 'deposit' | 'burial' | 'sample'>): FossilRecord[] {
  return REMAINS.map((remain, index) => {
    // Adjacent land and sea sources are held fixed; the deposit samples different source areas.
    const reaches = s.deposit === 'marine'
      ? remain.habitat === 'marine' || remain.kind === 'leaf' || remain.kind === 'wood'
      : remain.habitat === 'land';
    if (!reaches) return { remain, fate: 'source-gap', fragment: false };
    const bonus = s.deposit === 'peat' && (remain.kind === 'leaf' || remain.kind === 'wood') ? 1 : 0;
    const cutoff = s.burial === 'rapid' ? 1 : s.burial === 'transported' ? 4 : 5;
    const retained = remain.rank + bonus >= cutoff;
    if (!retained) return { remain, fate: 'destroyed', fragment: false };
    // Nested sampling: the wide search contains every item found in the small search.
    const collected = s.sample === 'wide' || index % 3 === 0;
    return { remain, fate: collected ? 'found' : 'uncollected', fragment: s.burial === 'transported' };
  });
}
export function fossilSummary(records: FossilRecord[]): Record<Fate, number> {
  return records.reduce((counts, record) => { counts[record.fate]++; return counts; },
    { 'source-gap': 0, destroyed: 0, uncollected: 0, found: 0 });
}

export interface FossilTokenFrame {
  id: string;
  column: number;
  opacity: number;
  damage: number;
  fate: Fate;
  assessed: boolean;
}
export interface FossilTimelineFrame {
  stage: 0 | 1 | 2 | 3;
  position: number;
  tokens: FossilTokenFrame[];
  arrived: number | null;
  retained: number | null;
  found: number | null;
}
const clamp01 = (value: number) => Math.max(0, Math.min(1, value));
export function fossilTimeline(records: FossilRecord[], progress: number): FossilTimelineFrame {
  const p = Number.isFinite(progress) ? Math.max(0, Math.min(100, progress)) : 0;
  const position = p <= 33 ? p / 33 : p <= 67 ? 1 + (p - 33) / 34 : 2 + (p - 67) / 33;
  const stage = (p < 33 ? 0 : p < 67 ? 1 : p < 100 ? 2 : 3) as FossilTimelineFrame['stage'];
  const tokens = records.map(({ remain, fate, fragment }): FossilTokenFrame => {
    const loss = fate === 'destroyed' ? clamp01((position - 1) / .65) : 0;
    const stop = fate === 'source-gap' ? 0 : fate === 'destroyed' ? 1.6 : fate === 'uncollected' ? 2 : 3;
    return { id: remain.id, fate, column: Math.min(position, stop), opacity: 1 - loss * .9,
      damage: loss || (fragment ? clamp01(position - 1) : 0),
      assessed: fate === 'source-gap' ? stage >= 1 : fate === 'destroyed' ? stage >= 2 : stage >= 3 };
  });
  return { stage, position, tokens,
    arrived: stage >= 1 ? records.filter(r => r.fate !== 'source-gap').length : null,
    retained: stage >= 2 ? records.filter(r => r.fate === 'found' || r.fate === 'uncollected').length : null,
    found: stage >= 3 ? records.filter(r => r.fate === 'found').length : null };
}
