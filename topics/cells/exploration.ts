import { clamp } from './model.ts';

export const CHAPTERS = ['structure', 'energy', 'work'] as const;
export type Chapter = typeof CHAPTERS[number];
export const SPECIALISMS = ['barrier', 'muscle', 'neuron', 'oxygen', 'defence', 'repair'] as const;
export type Specialism = typeof SPECIALISMS[number];
export function readCellRoute(search: string) {
  const params = new URLSearchParams(search);
  const chapter = params.get('chapter'), example = params.get('case');
  return {
    chapter: CHAPTERS.includes(chapter as Chapter) ? chapter as Chapter : 'structure' as Chapter,
    example: SPECIALISMS.includes(example as Specialism) ? example as Specialism : 'barrier' as Specialism,
  };
}
export function legacyCellURL(href: string, base: string, source: 'body-cells' | 'blood-cells') {
  const url = new URL(href), candidate = url.searchParams.get('case') ?? url.searchParams.get('kind');
  const choices = source === 'body-cells' ? SPECIALISMS.slice(0, 3) : SPECIALISMS.slice(3);
  url.pathname = `${base.replace(/\/$/, '')}/topics/cells/`;
  url.searchParams.set('chapter', 'work');
  url.searchParams.set('case', choices.includes(candidate as Specialism) ? candidate! : choices[0]!);
  url.searchParams.delete('kind');
  return url;
}
export function createWorkState() {
  return Object.fromEntries(SPECIALISMS.map(key => [key, { progress: 0, zoom: 0 }])) as Record<Specialism, { progress: number; zoom: number }>;
}
export function workPhase(kind: Specialism, progress: number) {
  const p = clamp(progress);
  return kind === 'neuron' ? p < .18 ? 0 : p < .8 ? 1 : 2 : kind === 'defence' ? p < .16 ? 0 : p < .77 ? 1 : 2 : p < .26 ? 0 : p < .72 ? 1 : 2;
}
