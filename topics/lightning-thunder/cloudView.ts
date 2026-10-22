import { cloudFrame, iceCrystalSegments, GRAUPEL_CONTACT_RADIUS, type CloudFrame } from './cloudModel.ts';
import type { Settings } from './model.ts';
import type { CloudScene } from './cloudScene.ts';
import { t } from './i18n.ts';

const NS = 'http://www.w3.org/2000/svg';
/** Lazy 3D, a same-state SVG fallback, and retry share one cancellation boundary. */
export class CloudView {
  private scene?: CloudScene;
  private current: CloudFrame = cloudFrame(0);
  private generation = 0;
  private pending = false;
  private failed = false;
  private disposed = false;
  private active = false;
  private readonly groups = new Map<string, { group: SVGGElement; sign: SVGTextElement }>();
  constructor(private canvas: HTMLCanvasElement, private readonly fallback: SVGSVGElement,
    private readonly status: HTMLElement, private readonly retry: HTMLButtonElement, private readonly orbit: HTMLButtonElement) {
    const objects = fallback.querySelector('#cloud-particles')!;
    for (const particle of this.current.particles) {
      const group = document.createElementNS(NS, 'g');
      if (particle.kind === 'ice') {
        const path = document.createElementNS(NS, 'path');
        const parts = iceCrystalSegments.map(({ start, end }) => `M${start[0]} ${start[1]}L${end[0]} ${end[1]}`);
        path.setAttribute('d', parts.join('')); path.setAttribute('stroke', '#def0f6'); path.setAttribute('stroke-width', '.022'); group.append(path);
      } else {
        const circle = document.createElementNS(NS, 'circle'); circle.setAttribute('r', String(particle.kind === 'graupel' ? GRAUPEL_CONTACT_RADIUS : particle.size));
        circle.setAttribute('fill', particle.kind === 'graupel' ? 'url(#graupel-light)' : '#b4dce7');
        circle.setAttribute('stroke', particle.kind === 'graupel' ? '#eef3e2' : '#d2edf4');
        circle.setAttribute('stroke-width', particle.kind === 'graupel' ? '.012' : '.005'); group.append(circle);
      }
      const sign = document.createElementNS(NS, 'text'); sign.setAttribute('x', '.29'); sign.setAttribute('y', '-.24');
      sign.setAttribute('fill', particle.kind === 'ice' ? '#ffdda0' : '#beebff'); sign.setAttribute('font-size', '.27');
      sign.setAttribute('stroke', '#142737'); sign.setAttribute('stroke-width', '.025'); sign.setAttribute('paint-order', 'stroke');
      sign.textContent = particle.kind === 'ice' ? '+' : '−'; group.append(sign); objects.append(group); this.groups.set(particle.id, { group, sign });
    }
    retry.addEventListener('click', this.retryScene); orbit.addEventListener('click', this.resetOrbit);
  }
  setActive(active: boolean) {
    this.active = active;
    if (active && !this.scene && !this.pending && !this.failed) void this.prepare();
  }
  draw(progress: number, settings: Settings) {
    this.current = cloudFrame(progress, settings.charging);
    if (!this.active || this.disposed) return;
    for (const particle of this.current.particles) {
      const [x, y, z] = particle.position, entry = this.groups.get(particle.id)!;
      // One affine projection keeps the contact extents consistent with both particle centers.
      entry.group.setAttribute('transform', `translate(${450 + x * 89 + z * 15},${287 - y * 65 + z * 6}) scale(89,65)`);
      entry.sign.toggleAttribute('hidden', particle.charge === 0);
    }
    this.fallback.querySelector<SVGEllipseElement>('#cloud-positive')!.style.opacity = String(this.current.separation * .13);
    this.fallback.querySelector<SVGEllipseElement>('#cloud-negative')!.style.opacity = String(this.current.separation * .15);
    this.scene?.draw(this.current);
  }
  private async prepare() {
    const version = ++this.generation; this.pending = true;
    this.status.textContent = t('正在准备云内三维；下方示意仍可观察。'); this.retry.hidden = true;
    try {
      const { CloudScene } = await import('./cloudScene.ts');
      if (this.disposed || version !== this.generation) return;
      const scene = new CloudScene(this.canvas, this.current, this.onFailure);
      if (this.disposed || version !== this.generation) { scene.dispose(); return; }
      this.scene = scene; this.canvas.hidden = false; this.fallback.toggleAttribute('hidden', true); this.orbit.hidden = false;
      this.status.textContent = t('拖动转动 · 方向键也可操作');
      if (this.active) scene.draw(this.current);
    } catch {
      if (this.disposed || version !== this.generation) return;
      this.onFailure();
    } finally { if (version === this.generation) this.pending = false; }
  }
  private onFailure = () => {
    if (this.disposed) return;
    this.failed = true; const previous = this.scene; this.scene = undefined; previous?.dispose();
    this.canvas.hidden = true; this.fallback.removeAttribute('hidden'); this.orbit.hidden = true; this.retry.hidden = false;
    this.status.textContent = t('三维暂不可用，已保留同一状态的平面示意。');
  };
  private retryScene = () => {
    if (this.pending || this.disposed) return;
    // A lost WebGL context belongs to its old canvas. A retry gets a fresh owner.
    const next = this.canvas.cloneNode(false) as HTMLCanvasElement;
    this.canvas.replaceWith(next); this.canvas = next;
    this.failed = false; void this.prepare();
  };
  private resetOrbit = () => this.scene?.resetOrbit();
  dispose() {
    this.disposed = true; this.generation++; this.scene?.dispose(); this.scene = undefined;
    this.retry.removeEventListener('click', this.retryScene); this.orbit.removeEventListener('click', this.resetOrbit);
    this.groups.clear();
  }
}
