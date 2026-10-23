import type { Resident } from './model.ts';
import type { GuidePortraitScene } from './portraitScene.ts';

type Scene = Pick<GuidePortraitScene, 'set' | 'reset' | 'dispose'>;
type Load = () => Promise<{ GuidePortraitScene: new (canvas: HTMLCanvasElement, failed: () => void) => Scene }>;
type Words = { loading: string; failed: string; canvas: string };
/** Owns lazy import, latest selection, retry and document lifecycle together. */
export class GuidePortraitViewport {
  private scene?: Scene;
  private canvas?: HTMLCanvasElement;
  private latest?: [Resident, Resident, boolean];
  private generation = 0;
  private loading = false;
  private failed = false;
  private disposed = false;
  constructor(private host: HTMLElement, private fallback: HTMLElement, private status: HTMLElement,
    private retry: HTMLButtonElement, private words: Words,
    private load: Load = () => import('./portraitScene.ts')) {
    retry.onclick = () => { this.failed = false; void this.ensure(); };
  }
  set(item: Resident, partner: Resident, energy: boolean) {
    if (this.disposed) return;
    this.latest = [item, partner, energy];
    if (this.scene) { try { this.scene.set(...this.latest); } catch { this.fail(); } }
    else if (!this.failed) void this.ensure();
  }
  reset() { this.scene?.reset(); }
  private async ensure() {
    if (this.disposed || this.loading || this.scene) return;
    const generation = ++this.generation; this.loading = true;
    this.host.dataset.renderState = 'loading'; this.status.textContent = this.words.loading; this.retry.hidden = true;
    try {
      const { GuidePortraitScene } = await this.load();
      if (this.disposed || generation !== this.generation) return;
      const canvas = document.createElement('canvas'); canvas.tabIndex = 0; canvas.setAttribute('role', 'img'); canvas.setAttribute('aria-label', this.words.canvas);
      this.canvas = canvas; this.host.prepend(canvas);
      this.scene = new GuidePortraitScene(canvas, () => this.fail());
      if (this.latest) this.scene.set(...this.latest);
      this.fallback.hidden = true; this.status.textContent = ''; this.host.dataset.renderState = 'ready';
    } catch { if (!this.disposed && generation === this.generation) this.fail(); }
    finally { if (generation === this.generation) this.loading = false; }
  }
  private fail() {
    if (this.disposed) return;
    this.scene?.dispose(); this.scene = undefined; this.canvas?.remove(); this.canvas = undefined;
    this.failed = true; this.fallback.hidden = false; this.status.textContent = this.words.failed;
    this.retry.hidden = false; this.host.dataset.renderState = 'fallback';
  }
  dispose() {
    if (this.disposed) return; this.disposed = true; ++this.generation;
    this.scene?.dispose(); this.scene = undefined; this.canvas?.remove(); this.canvas = undefined;
    this.retry.onclick = null;
  }
}
