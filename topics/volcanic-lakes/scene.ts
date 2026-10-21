import { CanvasScene } from './canvasScene.ts';
import { Lake3DScene } from './scene3d.ts';
import type { Settings } from './model.ts';
import type { LakeView } from './geometry3d.ts';

/** Keeps one scientific frame through GPU failure/retry. Changing rendering
 * context needs a fresh canvas; experiment state and view remain here. */
export class TopicScene {
  private scene!: Lake3DScene | CanvasScene;
  private canvas: HTMLCanvasElement;
  private p = 0;
  private settings: Settings = { basin: 'caldera', supply: .75, leak: 'low' };
  private view: LakeView = 'section';
  private disposed = false;
  constructor(canvas: HTMLCanvasElement) { this.canvas = canvas; this.mount3D(); }
  private replacement() {
    const candidate = this.canvas.cloneNode(false) as HTMLCanvasElement;
    candidate.removeAttribute('data-renderer'); candidate.style.touchAction = ''; return candidate;
  }
  private notify() { this.canvas.dispatchEvent(new CustomEvent('volcano-renderer', { bubbles: true, detail: this.is3D ? 'webgl' : 'canvas' })); }
  private mount3D() {
    const candidate = this.replacement(); let gpu: Lake3DScene | undefined;
    try {
      gpu = new Lake3DScene(candidate); this.scene = gpu;
      this.canvas.replaceWith(candidate); this.canvas = candidate;
      candidate.addEventListener('webglcontextlost', this.contextLost);
      gpu.setView(this.view); gpu.draw(this.p, this.settings); this.notify();
    } catch (error) {
      candidate.removeEventListener('webglcontextlost', this.contextLost); gpu?.dispose();
      console.warn('Volcanic-lake 3D unavailable; using the geological Canvas illustration.', error);
      this.mountFallback();
    }
  }
  private mountFallback() {
    const candidate = this.replacement(); candidate.dataset.renderer = 'canvas';
    this.canvas.replaceWith(candidate); this.canvas = candidate;
    const fallback = new CanvasScene(candidate); this.scene = fallback;
    fallback.setView(this.view); fallback.draw(this.p, this.settings); this.notify();
  }
  private contextLost = (event: Event) => {
    event.preventDefault(); if (this.disposed) return;
    this.canvas.removeEventListener('webglcontextlost', this.contextLost);
    this.scene.dispose(); this.mountFallback();
  };
  get is3D() { return this.scene instanceof Lake3DScene; }
  setView(view: LakeView) { if (this.disposed) return; this.view = view; this.scene.setView(view); }
  draw(progress: number, settings: Settings, _view?: string) {
    if (this.disposed) return;
    this.p = progress; this.settings = { ...settings }; this.scene.draw(progress, this.settings);
  }
  resetCamera() { if (this.scene instanceof Lake3DScene && !this.disposed) this.scene.resetCamera(); }
  stopMotion() { this.scene.stopMotion(); }
  retry3D() {
    if (this.disposed || this.is3D) return;
    this.scene.dispose(); this.mount3D();
  }
  dispose() {
    if (this.disposed) return;
    this.disposed = true; this.canvas.removeEventListener('webglcontextlost', this.contextLost); this.scene.dispose();
  }
}
