import { partNames, type Part } from '../bacteria/model';
import { clampProgress, hostLimit, type Host, type View } from '../viruses/model';
import type { Habitat } from './scene';
import {virusKinds,healthCases,careMethods,bacterialForms,type VirusKind,type HealthCase,type CareMethod,type BacterialForm,type Entry} from './healthModel';
export const chapters = ['environment', 'bacteria', 'viruses', 'infection', 'immunity', 'care'] as const;
export type Chapter = typeof chapters[number];
export type Resources = 'ready' | 'limited';
export type Process = 'structure' | 'division' | 'exchange';
export interface WorkspaceState {
  chapter: Chapter; habitat: Habitat; resources: Resources; closer: boolean;
  part: Part; process: Process; host: Host; view: View;
  bacteria: Record<Resources, { division: number; exchange: number }>;
  viruses: Record<Host, number>;
  virus:VirusKind; virusProcess:'structure'|'cycle'; form:BacterialForm; cutaway:boolean; flat:boolean;
  healthCase:HealthCase; entry:Entry; memory:boolean; care:CareMethod; resistant:boolean; healthClose:boolean;
  healthProgress:Record<string,number>;
}
const choice = <T extends string>(value: string | null, valid: readonly T[], fallback: T): T => valid.includes(value as T) ? value as T : fallback;
const unit = (value: string | null, max = 1) => Math.min(max, Math.max(0, Number.isFinite(Number(value)) ? Number(value) : 0));
/** Resource-limited is a qualitative contrast, never a shared rate for real species. */
export const divisionLimit = (resources: Resources): number => resources === 'ready' ? 1 : .18;
export function readWorkspace(search: string): WorkspaceState {
  const q = new URLSearchParams(search);
  const resources = choice(q.get('resources'), ['ready', 'limited'], 'ready');
  const host = choice(q.get('host'), ['compatible', 'mismatch', 'defended'], 'compatible');
  const healthProgress:Record<string,number>={};
  for(const virus of virusKinds)healthProgress[`virus:${virus}`]=0;
  for(const c of healthCases)for(const entry of ['entered','blocked']){healthProgress[`infection:${c}:${entry}`]=0;for(const memory of [false,true])healthProgress[`immunity:${c}:${entry}:${memory}`]=0;}
  for(const method of careMethods)for(const c of healthCases)for(const resistant of [false,true])healthProgress[`care:${method}:${c}:${resistant}`]=0;
  const result: WorkspaceState = {
    chapter: choice(q.get('chapter'), chapters, 'environment'),
    habitat: choice(q.get('habitat') ?? q.get('place'), ['soil', 'water', 'skin', 'air'], 'soil'),
    resources, host, view: choice(q.get('view'), ['whole', 'attachment', 'inside'], 'whole'),
    closer: q.get('close') === '1', part: choice(q.get('part'), partNames, 'membrane'),
    process: choice(q.get('process'), ['structure', 'division','exchange'], 'structure'),
    virus:choice(q.get('virus'),virusKinds,q.has('host')||q.has('view')||q.has('p')?'phage':'influenza'),
    virusProcess:choice(q.get('virus-process'),['structure','cycle'],q.has('host')||q.has('view')||q.has('p')?'cycle':'structure'),
    form:choice(q.get('form'),bacterialForms,'rod'),cutaway:q.get('cutaway')!=='0',flat:q.get('flat')==='1',
    healthCase:choice(q.get('case'),healthCases,'airway'),entry:choice(q.get('entry'),['entered','blocked'],'entered'),
    healthClose:q.get('detail')!=='overview',memory:q.get('memory')==='1',care:choice(q.get('care'),careMethods,'wash'),resistant:q.get('resistant')==='1',healthProgress,
    bacteria: { ready: { division: 0, exchange: 0 }, limited: { division: 0, exchange: 0 } },
    viruses: { compatible: 0, mismatch: 0, defended: 0 },
  };
  result.bacteria[resources] = { division: unit(q.get('bp'), divisionLimit(resources)), exchange: unit(q.get('exchange')) };
  result.viruses[host] = clampProgress(unit(q.get('p'), 5), host);
  if(result.chapter==='viruses'&&result.virus!=='phage'||['infection','immunity','care'].includes(result.chapter))result.healthProgress[healthKey(result)]=unit(q.get('hp'));
  return result;
}
export function writeWorkspace(state: WorkspaceState, search = ''): string {
  const q = new URLSearchParams(search);
  for (const key of ['chapter', 'habitat', 'resources', 'part', 'process', 'host', 'view'] as const) q.set(key, state[key]);
  q.set('flat',state.flat?'1':'0');q.set('virus',state.virus);q.set('virus-process',state.virusProcess);q.set('form',state.form);q.set('cutaway',state.cutaway?'1':'0');q.set('case',state.healthCase);q.set('entry',state.entry);q.set('memory',state.memory?'1':'0');q.set('care',state.care);q.set('resistant',state.resistant?'1':'0');
  q.set('detail',state.healthClose?'close':'overview');q.set('hp',(state.healthProgress[healthKey(state)]??0).toFixed(4));
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
export function healthKey(state:WorkspaceState):string {
 if(state.chapter==='viruses')return `virus:${state.virus}`;
 if(state.chapter==='infection')return `infection:${state.healthCase}:${state.entry}`;
 if(state.chapter==='immunity')return `immunity:${state.healthCase}:${state.entry}:${state.entry==='entered'&&state.memory}`;
 return `care:${state.care}:${state.healthCase}:${state.care==='antibiotic'&&state.resistant}`;
}
const isHealth=(s:WorkspaceState)=>['infection','immunity','care'].includes(s.chapter)||s.chapter==='viruses'&&s.virus!=='phage';
export function currentProgress(state: WorkspaceState): number {
  if(isHealth(state))return state.healthProgress[healthKey(state)]??0;
  if (state.chapter === 'viruses') return state.viruses[state.host];
  return state.bacteria[state.resources][state.process === 'division' ? 'division' : 'exchange'];
}
export function currentLimit(state: WorkspaceState): number {
  if(isHealth(state))return 1;
  if (state.chapter === 'viruses') return hostLimit(state.host);
  return state.process === 'division' ? divisionLimit(state.resources) : 1;
}
export function seekWorkspace(state: WorkspaceState, value: number): void {
  const position = Math.min(currentLimit(state), Math.max(0, Number.isFinite(value) ? value : 0));
  if(isHealth(state))state.healthProgress[healthKey(state)]=position;
  else if (state.chapter === 'viruses') state.viruses[state.host] = position;
  else state.bacteria[state.resources][state.process === 'division' ? 'division' : 'exchange'] = position;
}
export function canPlayWorkspace(s:WorkspaceState):boolean {return s.chapter==='bacteria'?s.process!=='structure':s.chapter==='viruses'?s.virusProcess==='cycle':s.chapter!=='environment';}
/** One finite controller drives the currently admitted process; no offscreen clocks. */
export class WorkspaceClock {
  playing = false;
  visible = true;
  ready = false;
  disposed = false;
  start(state: WorkspaceState): void {
    if (this.disposed || !this.visible || !this.ready || !canPlayWorkspace(state)) return;
    if (currentProgress(state) >= currentLimit(state)) seekWorkspace(state, 0);
    this.playing = true;
  }
  pause(): void { this.playing = false; }
  tick(state: WorkspaceState, seconds: number): boolean {
    if (!this.playing || !this.visible || !this.ready || this.disposed) return false;
    const duration = isHealth(state) ? 20 : state.chapter === 'viruses' ? 18 : state.process === 'division' ? 12 : 6.5;
    // Virus uses 0..5, other processes 0..1. Limit does not speed up blocked cases.
    seekWorkspace(state, currentProgress(state) + Math.max(0, Math.min(.1, seconds)) * (state.chapter === 'viruses' && state.virus==='phage' ? 5 : 1) / duration);
    if (currentProgress(state) >= currentLimit(state)) this.pause();
    return true;
  }
  hide(): void { this.visible = false; this.pause(); }
  dispose(): void { this.disposed = true; this.pause(); }
}
