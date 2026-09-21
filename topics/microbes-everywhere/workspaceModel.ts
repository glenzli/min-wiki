import { partNames, type Part } from '../bacteria/model';
import { clampProgress, hostLimit, type Host, type View } from '../viruses/model';
import type { Habitat } from './scene';
export const chapters = ['environment', 'bacteria', 'viruses'] as const;
export type Chapter = typeof chapters[number];
export type Resources = 'ready' | 'limited';
export type Process = 'structure' | 'division';
export interface WorkspaceState {
  chapter: Chapter; habitat: Habitat; resources: Resources; closer: boolean;
  part: Part; process: Process; host: Host; view: View;
  bacteria: Record<Resources, { division: number; exchange: number }>;
  viruses: Record<Host, number>;
}
const choice = <T extends string>(value: string | null, valid: readonly T[], fallback: T): T => valid.includes(value as T) ? value as T : fallback;
const unit = (value: string | null, max = 1) => Math.min(max, Math.max(0, Number.isFinite(Number(value)) ? Number(value) : 0));
/** Resource-limited is a qualitative contrast, never a shared rate for real species. */
export const divisionLimit = (resources: Resources): number => resources === 'ready' ? 1 : .18;
export function readWorkspace(search: string): WorkspaceState {
  const q = new URLSearchParams(search);
  const resources = choice(q.get('resources'), ['ready', 'limited'], 'ready');
  const host = choice(q.get('host'), ['compatible', 'mismatch', 'defended'], 'compatible');
  const result: WorkspaceState = {
    chapter: choice(q.get('chapter'), chapters, 'environment'),
    habitat: choice(q.get('habitat') ?? q.get('place'), ['soil', 'water', 'skin', 'air'], 'soil'),
    resources, host, view: choice(q.get('view'), ['whole', 'attachment', 'inside'], 'whole'),
    closer: q.get('close') === '1', part: choice(q.get('part'), partNames, 'membrane'),
    process: choice(q.get('process'), ['structure', 'division'], 'structure'),
    bacteria: { ready: { division: 0, exchange: 0 }, limited: { division: 0, exchange: 0 } },
    viruses: { compatible: 0, mismatch: 0, defended: 0 },
  };
  result.bacteria[resources] = { division: unit(q.get('bp'), divisionLimit(resources)), exchange: unit(q.get('exchange')) };
  result.viruses[host] = clampProgress(unit(q.get('p'), 5), host);
  return result;
}
export function writeWorkspace(state: WorkspaceState, search = ''): string {
  const q = new URLSearchParams(search);
  for (const key of ['chapter', 'habitat', 'resources', 'part', 'process', 'host', 'view'] as const) q.set(key, state[key]);
  q.set('close', state.closer ? '1' : '0');
  q.set('bp', state.bacteria[state.resources].division.toFixed(3));
  q.set('exchange', state.bacteria[state.resources].exchange.toFixed(3));
  q.set('p', state.viruses[state.host].toFixed(3));
  return q.toString();
}
export function microbialHref(chapter: Chapter, search = '', base = '/', hash = ''): string {
  const q = new URLSearchParams(search);
  q.set('chapter', chapter);
  return `${base.endsWith('/') ? base : `${base}/`}topics/microbes-everywhere/?${q}${hash}`;
}
export function currentProgress(state: WorkspaceState): number {
  if (state.chapter === 'viruses') return state.viruses[state.host];
  return state.bacteria[state.resources][state.process === 'division' ? 'division' : 'exchange'];
}
export function currentLimit(state: WorkspaceState): number {
  if (state.chapter === 'viruses') return hostLimit(state.host);
  return state.process === 'division' ? divisionLimit(state.resources) : 1;
}
export function seekWorkspace(state: WorkspaceState, value: number): void {
  const position = Math.min(currentLimit(state), Math.max(0, Number.isFinite(value) ? value : 0));
  if (state.chapter === 'viruses') state.viruses[state.host] = position;
  else state.bacteria[state.resources][state.process === 'division' ? 'division' : 'exchange'] = position;
}
/** One finite controller drives the currently admitted process; no offscreen clocks. */
export class WorkspaceClock {
  playing = false;
  visible = true;
  ready = false;
  disposed = false;
  start(state: WorkspaceState): void {
    if (this.disposed || !this.visible || !this.ready || state.chapter === 'environment' || (state.chapter === 'bacteria' && state.process === 'structure' && state.part !== 'membrane')) return;
    if (currentProgress(state) >= currentLimit(state)) seekWorkspace(state, 0);
    this.playing = true;
  }
  pause(): void { this.playing = false; }
  tick(state: WorkspaceState, seconds: number): boolean {
    if (!this.playing || !this.visible || !this.ready || this.disposed) return false;
    const duration = state.chapter === 'viruses' ? 18 : state.process === 'division' ? 12 : 6.5;
    // Virus uses 0..5, other processes 0..1. Limit does not speed up blocked cases.
    seekWorkspace(state, currentProgress(state) + Math.max(0, Math.min(.1, seconds)) * (state.chapter === 'viruses' ? 5 : 1) / duration);
    if (currentProgress(state) >= currentLimit(state)) this.pause();
    return true;
  }
  hide(): void { this.visible = false; this.pause(); }
  dispose(): void { this.disposed = true; this.pause(); }
}
