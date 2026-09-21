export interface ChapterState { progress: number; scenario: string; planet: 'rocky' | 'gas'; part: string; }
export interface ViewOptions { view: 'overview' | 'close' | 'top' | 'free'; guides: boolean; annotations: boolean; orbit: boolean; sound: boolean; playing: boolean; }
export interface ChapterScene {
  draw(state: ChapterState, options: ViewOptions): void;
  status(): 'ready' | 'loading' | 'error';
  retry(state: ChapterState): void;
  readout?(state: ChapterState, academic: boolean): string;
  dispose(): void;
}
export interface ChapterCopy { title: string; body: string; prompt: string; formula: string; terms: string; caution: string; note: string; }
export interface ChapterDefinition {
  title: string; intro: string; scale: string; learningId: string;
  choices: { key: 'scenario' | 'planet' | 'part'; label: string; options: { value: string; label: string }[] }[];
  create(host: HTMLElement, state: ChapterState): ChapterScene;
  change?(state: ChapterState, key: 'scenario' | 'planet' | 'part', value: string): void;
  duration(state: ChapterState): number;
  steps(state: ChapterState): { label: string; progress: number }[];
  describe(state: ChapterState, academic: boolean): ChapterCopy;
}
export function createCanvas(host: HTMLElement) {
  const canvas = document.createElement('canvas');
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', host.getAttribute('aria-label') ?? '');
  host.append(canvas);
  return canvas;
}
export function releaseCanvas(host: HTMLElement) {
  // dispose() releases Three resources; explicitly retire the context as chapters
  // can be switched many times without unloading the document.
  host.querySelectorAll('canvas').forEach(canvas => canvas.getContext('webgl2')?.getExtension('WEBGL_lose_context')?.loseContext());
  host.replaceChildren();
}
