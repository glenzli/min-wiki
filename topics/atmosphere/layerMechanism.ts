import type content from './content.json';
import { layerStops } from './model.ts';

type Copy = typeof content.zh.mechanisms;
type Layers = typeof content.zh.layers;
export interface MechanismFrame { layer: number; step: number; progress: number }

const esc = (value: string) => value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);
const STEP_MS = 2800;

/** Narration and the main Canvas share one clock. This component owns only
 * readable copy and controls; scene.ts draws each mechanism at its altitude. */
export class LayerMechanism {
  private layer: number | null = null;
  private step = 0;
  private progress = 0;
  private playing = false;
  private started = false;
  private frame = 0;
  private last = 0;
  private readonly reduced = matchMedia('(prefers-reduced-motion: reduce)');
  private readonly click = (event: Event) => {
    const button = (event.target as Element).closest<HTMLButtonElement>('button[data-mechanism-step],button[data-mechanism-play]');
    if (!button || !this.root.contains(button)) return;
    if (button.dataset.mechanismStep !== undefined) {
      this.pause(); this.started = true; this.step = Number(button.dataset.mechanismStep); this.progress = .8;
      this.project(); this.onFrame();
    } else if (this.playing) this.pause();
    else this.play();
  };
  private readonly visibility = () => {
    if (document.hidden) this.cancel();
    else if (this.playing) this.schedule();
  };
  private readonly pageHide = () => this.cancel();
  private readonly pageShow = () => { if (this.playing) this.schedule(); };

  constructor(private root: HTMLElement, private copy: Copy, private layers: Layers, private onFrame: () => void) {
    this.root.addEventListener('click', this.click);
    document.addEventListener('visibilitychange', this.visibility);
    window.addEventListener('pagehide', this.pageHide);
    window.addEventListener('pageshow', this.pageShow);
  }

  current(): MechanismFrame | null {
    return this.layer === null ? null : { layer: this.layer, step: this.step, progress: this.progress };
  }

  show(layer: number | null, autoplay = true) {
    if (layer === this.layer) {
      if (autoplay && !this.started && !this.reduced.matches) this.play();
      return;
    }
    this.cancel(); this.playing = false; this.started = false; this.layer = layer; this.root.hidden = layer === null;
    if (layer === null) { this.onFrame(); return; }
    this.step = 0; this.progress = 0;
    const item = this.copy.layers[layer]!;
    this.root.innerHTML = `<div class="mechanism-head"><div><p class="mechanism-eyebrow">${esc(this.copy.eyebrow)} · ${esc(this.layers[layer]!.name)} · ${layerStops[layer]} km</p><h3>${esc(item.question)}</h3></div></div>
      <p class="mechanism-lead">${esc(item.lead)}</p>
      <div class="mechanism-story"><strong data-mechanism-title></strong><p data-mechanism-body aria-live="polite"></p></div>
      <div class="mechanism-controls"><div class="mechanism-steps">${item.steps.map((step, i) => `<button type="button" data-mechanism-step="${i}" aria-pressed="false"><b>${i + 1}</b><span>${esc(step.title)}</span><i aria-hidden="true"></i></button>`).join('')}</div><button type="button" data-mechanism-play></button></div>
      <details class="mechanism-boundary"><summary>${esc(this.copy.boundaryLabel)}</summary><p>${esc(this.copy.scale)} ${esc(item.boundary)}</p><a href="${esc(item.sourceUrl)}" target="_blank" rel="noopener noreferrer">${esc(this.copy.source)}</a></details>`;
    this.project(); this.onFrame();
    if (autoplay && !this.reduced.matches) this.play();
  }

  private project() {
    if (this.layer === null) return;
    const item = this.copy.layers[this.layer]!;
    this.root.dataset.step = String(this.step);
    this.root.dataset.playing = String(this.playing);
    this.root.querySelector<HTMLElement>('[data-mechanism-title]')!.textContent = `${this.step + 1}. ${item.steps[this.step]!.title}`;
    this.root.querySelector<HTMLElement>('[data-mechanism-body]')!.textContent = item.steps[this.step]!.body;
    this.root.querySelectorAll<HTMLButtonElement>('[data-mechanism-step]').forEach((button, i) => button.setAttribute('aria-pressed', String(i === this.step)));
    this.root.querySelector<HTMLButtonElement>('[data-mechanism-play]')!.textContent = this.playing ? this.copy.pause : this.step === 2 && this.progress === 1 ? this.copy.replay : this.copy.play;
    this.progressBar();
  }

  private progressBar() {
    this.root.querySelectorAll<HTMLElement>('.mechanism-steps i').forEach((bar, i) => {
      bar.style.setProperty('--fill', `${100 * (i < this.step ? 1 : i === this.step ? this.progress : 0)}%`);
    });
  }

  private readonly tick = (now: number) => {
    this.frame = 0;
    if (!this.playing || document.hidden || this.layer === null) return;
    const delta = Math.min(80, now - this.last); this.last = now;
    this.progress += delta / STEP_MS;
    if (this.progress >= 1) {
      if (this.step === 2) { this.progress = 1; this.playing = false; this.project(); this.onFrame(); return; }
      this.step++; this.progress = 0; this.project();
    } else this.progressBar();
    this.onFrame(); this.frame = requestAnimationFrame(this.tick);
  };
  private schedule() { this.cancel(); if (!this.playing || document.hidden) return; this.last = performance.now(); this.frame = requestAnimationFrame(this.tick); }
  private cancel() { if (this.frame) cancelAnimationFrame(this.frame); this.frame = 0; }
  private play() {
    if (this.layer === null) return;
    if (this.step === 2 && this.progress === 1) { this.step = 0; this.progress = 0; }
    this.started = true; this.playing = true; this.project(); this.schedule(); this.onFrame();
  }
  private pause() { this.playing = false; this.cancel(); this.project(); }
  dispose() {
    this.cancel(); this.root.removeEventListener('click', this.click);
    document.removeEventListener('visibilitychange', this.visibility);
    window.removeEventListener('pagehide', this.pageHide);
    window.removeEventListener('pageshow', this.pageShow);
  }
}
