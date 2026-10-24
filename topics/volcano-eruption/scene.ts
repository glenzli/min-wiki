import { Eruption3DScene } from './eruption3d.ts';
import { CanvasScene } from './canvasScene.ts';
import type { ObservationView, Settings } from './model.ts';

/** The facade retains the last scientific frame through GPU loss and retry.
 * A fresh canvas is required when changing between WebGL and Canvas2D. */
export class TopicScene {
  private scene!: Eruption3DScene | CanvasScene;
  private canvas: HTMLCanvasElement;
  private p = .08;
  private settings: Settings = { vents: 1, gas: .8, viscosity: .2 };
  private view: ObservationView = 'overview';
  private cutaway = true;
  private detailEnabled = true;
  private disposed = false;
  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas; this.mount3D();
  }
  private replacement() {
    const candidate = this.canvas.cloneNode(false) as HTMLCanvasElement;
    candidate.removeAttribute('style'); candidate.removeAttribute('data-renderer'); return candidate;
  }
  private mount3D() {
    const candidate = this.replacement();
    let gpu: Eruption3DScene | undefined;
    try {
      gpu = new Eruption3DScene(candidate);
      this.scene = gpu; this.canvas.replaceWith(candidate); this.canvas = candidate;
      candidate.addEventListener('webglcontextlost', this.contextLost);
      gpu.setDetailMotion(this.detailEnabled);
      this.setView(this.view, this.settings.vents, this.cutaway); this.draw(this.p, this.settings);
    } catch (error) {
      candidate.removeEventListener('webglcontextlost', this.contextLost); gpu?.dispose();
      console.warn('Volcano 3D unavailable; using the geological Canvas illustration.', error);
      this.mountFallback();
    }
  }
  private mountFallback() {
    const candidate = this.replacement(); candidate.dataset.renderer = 'canvas';
    this.canvas.replaceWith(candidate); this.canvas = candidate;
    this.scene = new CanvasScene(candidate); this.setView(this.view, this.settings.vents, this.cutaway); this.draw(this.p, this.settings);
    candidate.dataset.detailMotion = 'unavailable'; candidate.dataset.detailEnabled = String(this.detailEnabled); candidate.dataset.detailPhase = '0.000000';
    this.canvas.dispatchEvent(new CustomEvent('volcano-renderer', { bubbles: true, detail: 'canvas' }));
  }
  private contextLost = (event: Event) => {
    event.preventDefault(); if (this.disposed) return;
    this.canvas.removeEventListener('webglcontextlost', this.contextLost);
    this.scene.dispose(); this.mountFallback();
  };
  get is3D() { return this.scene instanceof Eruption3DScene; }
  retry3D() {
    if (this.disposed || this.is3D) return;
    this.scene.dispose(); this.mount3D();
  }
  setView(view: ObservationView, vents = this.settings.vents, cutaway = view === 'overview' || view === 'storage') {
    this.view = view; this.cutaway = cutaway;
    if (this.scene instanceof Eruption3DScene) this.scene.setView(view, cutaway);
    else this.scene.setView(view === 'exterior' ? 'overview' : view, vents);
  }
  draw(progress: number, settings: Settings) { this.p = progress; this.settings = settings; this.scene.draw(progress, settings); }
  resetCamera() { if (this.scene instanceof Eruption3DScene) this.scene.resetCamera(); }
  setDetailMotion(enabled: boolean) {
    this.detailEnabled = enabled;
    if (this.scene instanceof Eruption3DScene) this.scene.setDetailMotion(enabled);
    else this.canvas.dataset.detailEnabled = String(enabled);
  }
  resetDetailPhase() {
    if (this.scene instanceof Eruption3DScene) this.scene.resetDetailPhase();
    else this.canvas.dataset.detailPhase = '0.000000';
  }
  stopMotion() { this.scene.stopMotion(); }
  dispose() {
    if (this.disposed) return;
    this.disposed = true; this.canvas.removeEventListener('webglcontextlost', this.contextLost); this.scene.dispose();
  }
}
