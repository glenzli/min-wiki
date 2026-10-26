import content from './galacticContent.json';
import { galacticCases, turnGalacticView, type GalacticState } from './galacticModel.ts';
import { GalacticScene } from './galacticScene.ts';

const make = <K extends keyof HTMLElementTagNameMap>(tag: K, value = '', className = '') => { const node = document.createElement(tag); node.textContent = value; node.className = className; return node; };

/** Owns selection, manual camera gestures, bounded drawing and retry for the galaxy chapter. */
export class GalacticStudy {
  readonly childTarget = make('p');
  readonly copy = make('article', '', 'galactic-copy');
  private words: typeof content.ui.en;
  private state: GalacticState;
  private scene?: GalacticScene;
  private stage = make('div', '', 'galactic-stage');
  private title = make('h2');
  private choices = make('select');
  private yaw = make('input');
  private pitch = make('input');
  private yawLabel?: HTMLLabelElement;
  private pitchLabel?: HTMLLabelElement;
  private layers = make('div', '', 'galactic-layers');
  private failure = make('div', '', 'galactic-fallback');
  private coordinate = make('p', '', 'galactic-coordinate');
  private status = make('span', '', 'galactic-render-status');
  private source = make('a');
  private active = false;
  private frame = 0;
  private disposed = false;
  private renderedCase = '';
  private drag?: { id: number; x: number; y: number };
  constructor(private root: HTMLElement, private language: string, initial: GalacticState, private changed: (state: GalacticState, checkpoint: boolean) => void, onward: () => void) {
    this.copy.dataset.readerSupport='';
    this.state = { ...initial }; this.words = language === 'en' ? content.ui.en : content.ui.zh; const w = this.words;
    const text = (value: { zh: string; en: string }) => language === 'en' ? value.en : value.zh;
    const heading = make('div', '', 'galactic-heading'), choices = make('div', '', 'galactic-choices'); this.title.textContent = w.heading;
    this.choices.setAttribute('aria-label', w.choose);
    for (const selected of galacticCases) { const option = make('option', text(content.cases[selected].name)); option.value = selected; this.choices.append(option); }
    this.choices.onchange = () => { this.cancelDraw(); this.state.selected = this.choices.value as GalacticState['selected']; this.sync(true); };
    choices.append(this.choices); heading.append(this.title, choices); root.append(heading);
    this.stage.tabIndex = 0; this.stage.setAttribute('role', 'group'); this.stage.setAttribute('aria-label', w.heading); this.stage.setAttribute('aria-describedby', 'galactic-gesture-hint');
    const hint = make('p', w.drag, 'galactic-hint'); hint.id = 'galactic-gesture-hint'; this.stage.append(this.status); root.append(this.stage);
    const presets = make('nav', '', 'galactic-presets'); presets.setAttribute('aria-label', w.pitch);
    for (const [name, value] of [[w.face, 0], [w.edge, Math.PI / 2], [w.oblique, .92]] as const) { const button = make('button', name); button.dataset.pitch = String(value); button.onclick = () => { this.state.pitch = value; this.sync(true); }; presets.append(button); }
    const sliders = make('div', '', 'galactic-sliders');
    for (const [input, name, min, max] of [[this.yaw, w.yaw, -Math.PI, Math.PI], [this.pitch, w.pitch, 0, Math.PI / 2]] as const) {
      input.type = 'range'; input.min = String(min); input.max = String(max); input.step = '.005'; input.setAttribute('aria-label', name); const label = make('label', name); label.append(input); sliders.append(label);
      if (input === this.pitch) this.pitchLabel = label; else this.yawLabel = label;
      input.oninput = () => { this.state.yaw = Number(this.yaw.value); this.state.pitch = Number(this.pitch.value); this.sync(false); };
      input.onchange = () => this.changed({ ...this.state }, true);
    }
    for (const part of ['disk', 'bulge', 'halo', 'guides'] as const) { const button = make('button', w[part]); button.dataset.part = part; button.onclick = () => { this.state[part] = !this.state[part]; this.sync(true); }; this.layers.append(button); }
    this.source.textContent = w.source; this.source.target = '_blank'; this.source.rel = 'noreferrer'; const next = make('button', w.onward); next.onclick = onward;
    const options = make('details', '', 'galactic-options'), optionBody = make('div', '', 'galactic-option-body'); optionBody.append(sliders, this.layers, this.coordinate); options.append(make('summary', w.options), optionBody);
    const tools = make('div', '', 'galactic-tools'); tools.append(presets, options);
    const summary = make('p', w.shortBoundary, 'galactic-boundary'); this.copy.append(this.childTarget, this.source, next);
    const retry = make('button', w.retry); retry.onclick = () => this.scene?.retry(); this.failure.append(make('p', w.fallback), retry); this.failure.hidden = true;
    root.append(tools, hint, summary, this.failure, this.copy);
    this.stage.addEventListener('pointerdown', this.pointerDown); this.stage.addEventListener('pointermove', this.pointerMove); this.stage.addEventListener('pointerup', this.pointerEnd); this.stage.addEventListener('pointercancel', this.pointerEnd); this.stage.addEventListener('lostpointercapture', this.pointerEnd); this.stage.addEventListener('keydown', this.keyDown);
    this.sync(false);
  }
  private pointerDown = (event: PointerEvent) => { if (!this.active || event.button !== 0) return; this.drag = { id: event.pointerId, x: event.clientX, y: event.clientY }; this.stage.setPointerCapture(event.pointerId); };
  private pointerMove = (event: PointerEvent) => {
    if (!this.drag || this.drag.id !== event.pointerId) return;
    const dx = (event.clientX - this.drag.x) * .008, dy = (event.clientY - this.drag.y) * .008; this.drag.x = event.clientX; this.drag.y = event.clientY;
    this.state = turnGalacticView(this.state, dx, dy); this.sync(false);
  };
  private pointerEnd = (event: PointerEvent) => { if (this.drag?.id !== event.pointerId) return; this.drag = undefined; if (this.stage.hasPointerCapture(event.pointerId)) this.stage.releasePointerCapture(event.pointerId); this.changed({ ...this.state }, true); };
  private keyDown = (event: KeyboardEvent) => { const steps: Record<string, [number, number]> = { ArrowLeft: [-.1, 0], ArrowRight: [.1, 0], ArrowUp: [0, -.1], ArrowDown: [0, .1] }; const step = steps[event.key]; if (!step || !this.active) return; event.preventDefault(); this.state = turnGalacticView(this.state, ...step); this.sync(true); };
  private cancelDraw() { cancelAnimationFrame(this.frame); this.frame = 0; }
  private render() { if (!this.active || this.disposed || document.hidden) return; if (!this.scene) this.scene = new GalacticScene(this.stage, this.words, failed => { this.failure.hidden = !failed; this.status.textContent = `${this.words.status}: ${failed ? this.words.canvas : this.words.gpu}`; }); this.scene.setActive(true); this.scene.draw(this.state); }
  private schedule() { if (this.frame || !this.active || document.hidden || this.disposed) return; this.frame = requestAnimationFrame(() => { this.frame = 0; this.render(); }); }
  private sync(checkpoint: boolean) {
    const selected = content.cases[this.state.selected], text = (v: { zh: string; en: string }) => this.language === 'en' ? v.en : v.zh;
    if (this.renderedCase !== this.state.selected) { this.renderedCase = this.state.selected; this.title.textContent = text(selected.name); this.childTarget.textContent = text(selected.child); this.source.href = selected.sources[0]!.url; this.stage.setAttribute('aria-label', `${text(selected.name)}. ${text(selected.child)}`); }
    this.choices.value = this.state.selected; this.yaw.value = String(this.state.yaw); this.pitch.value = String(this.state.pitch);
    const diskCase = this.state.selected === 'milky-way' || this.state.selected === 'spiral';
    this.layers.hidden = !diskCase;
    const yawLabel = diskCase ? this.words.yaw : this.words.turn, pitchLabel = diskCase ? this.words.pitch : this.words.elevation;
    if (this.yawLabel?.firstChild) this.yawLabel.firstChild.textContent = yawLabel;
    if (this.pitchLabel?.firstChild) this.pitchLabel.firstChild.textContent = pitchLabel;
    this.yaw.setAttribute('aria-label', yawLabel); this.pitch.setAttribute('aria-label', pitchLabel);
    this.root.querySelector('.galactic-presets')?.setAttribute('aria-label', pitchLabel);
    this.coordinate.textContent = this.state.guides && (this.state.selected === 'milky-way' || this.state.selected === 'spiral') ? this.words.coordinate : this.words.normalized;
    this.coordinate.hidden = !this.state.guides || !diskCase;
    this.root.querySelectorAll<HTMLButtonElement>('[data-pitch]').forEach(b => { const value = Number(b.dataset.pitch); b.setAttribute('aria-pressed', String(Math.abs(value - this.state.pitch) < .01)); b.textContent = value === 0 ? diskCase ? this.words.face : this.words.viewA : value === Math.PI / 2 ? diskCase ? this.words.edge : this.words.viewB : this.words.oblique; });
    this.layers.querySelectorAll<HTMLButtonElement>('[data-part]').forEach(button => { const part = button.dataset.part as 'disk' | 'bulge' | 'halo' | 'guides'; button.setAttribute('aria-pressed', String(this.state[part])); button.hidden = part !== 'guides' && this.state.selected !== 'milky-way' && this.state.selected !== 'spiral'; });
    this.changed({ ...this.state }, checkpoint); this.schedule();
  }
  show(active: boolean, state: GalacticState) { this.state = { ...state }; this.active = active; this.root.hidden = !active; if (!active) { this.cancelDraw(); this.drag = undefined; this.scene?.setActive(false); return; } this.sync(false); }
  pause() { this.cancelDraw(); this.drag = undefined; this.scene?.setActive(false); }
  dispose() { if (this.disposed) return; this.disposed = true; this.pause(); this.scene?.dispose(); this.stage.removeEventListener('pointerdown', this.pointerDown); this.stage.removeEventListener('pointermove', this.pointerMove); this.stage.removeEventListener('pointerup', this.pointerEnd); this.stage.removeEventListener('pointercancel', this.pointerEnd); this.stage.removeEventListener('lostpointercapture', this.pointerEnd); this.stage.removeEventListener('keydown', this.keyDown); }
}
