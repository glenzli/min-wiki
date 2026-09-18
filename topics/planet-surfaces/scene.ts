import { CanvasSurface } from '../../src/visuals/canvasSurface.ts';
import { animateValue } from '../../src/visuals/transition.ts';
import { noise, clamp, type World, type View } from './model.ts';
import { palette, seed } from './surfacePainter.ts';
import { INTERIORS, interiorAt } from './interior.ts';
import type { PlanetView3D } from './scene3d.ts';
import type { Angle } from './camera.ts';
type Point = [number, number];
const makeCanvas = (width: number, height: number) => { const c = document.createElement('canvas'); c.width = width; c.height = height; return c; };
const hasPixels = (image?: ImageData): image is ImageData => {
  if (!image || !Number.isInteger(image.width) || !Number.isInteger(image.height) || image.width <= 0 || image.height <= 0 || image.width > 2048 || image.height > 1024 || image.data.length !== image.width * image.height * 4) return false;
  for (let i = 3; i < image.data.length; i += 4) if (image.data[i] !== 0) return true;
  return false;
};

/** Topic-owned illustrative textures. No texture is presented as a measured surface map. */
export class TopicScene {
  private s: CanvasSurface;
  private three?: PlanetView3D;
  private disposed = false;
  onInteraction?: () => void;
  onCameraChange?: (yaw: number, elevation: number) => void;
  get interactive() { return !!this.three; }
  setAngle(angle: Angle) { this.three?.setAngle(angle); }
  startTour() { this.three?.startTour(); }
  private world?: World;
  private view: View = 'landscape';
  private progress = 0;
  private phase = 0;
  private landscapes = new Map<string, HTMLCanvasElement>();
  private worker?: Worker;
  private pendingWorld = '';
  private generation = 0;
  private failures = new Set<string>();
  private onPrepared?: () => void;
  private previewGlobes = new Map<string, HTMLCanvasElement>();
  private textures = new Map<string, ImageData>();
  private globeCanvas = makeCanvas(560, 560);
  private globePixels = this.globeCanvas.getContext('2d')!.createImageData(560, 560);
  private globeKey = '';
  private cancelTransition = () => {};
  constructor(canvas: HTMLCanvasElement) {
    this.s = new CanvasSurface(canvas);
    if (canvas.parentElement) {
      void import('./scene3d.ts').then(({ PlanetView3D }) => {
        if (this.disposed) return;
        const target = document.createElement('canvas'); target.id = 'scene-3d'; target.className = 'scene-3d'; target.tabIndex = 0;
        target.setAttribute('role', 'img'); target.setAttribute('aria-label', canvas.getAttribute('aria-label') ?? ''); canvas.parentElement!.append(target);
        try {
          const view = new PlanetView3D(target); this.three = view;
          view.onInteraction = () => this.onInteraction?.();
          view.onCameraChange = (yaw, elevation) => this.onCameraChange?.(yaw, elevation);
          view.onFailure = () => { view.dispose(); this.three = undefined; canvas.style.visibility = ''; canvas.removeAttribute('aria-hidden'); if (this.world) this.draw(this.world, this.view, this.progress, this.phase); this.onPrepared?.(); };
          canvas.style.visibility = 'hidden'; canvas.setAttribute('aria-hidden', 'true');
          if (this.world) { const texture = this.textures.get(this.world.id); if (texture) view.setTexture(this.world, texture); view.draw(this.world, this.view, this.progress, this.phase); }
          this.onPrepared?.();
        } catch { this.three?.dispose(); this.three = undefined; target.remove(); canvas.style.visibility = ''; canvas.removeAttribute('aria-hidden'); this.onPrepared?.(); }
      }).catch(() => this.onPrepared?.());
    }
    this.s.onResize(() => { this.cancelTransition(); if (this.world) this.draw(this.world, this.view, this.progress, this.phase); });
  }
  onPreparationChange(callback: () => void) { this.onPrepared = callback; }
  get preparing() { return !this.three && !!this.world && this.pendingWorld === this.world.id; }
  get failed() { return !!this.world && this.failures.has(this.world.id); }
  private prepare(world: World) {
    if ((this.landscapes.has(world.id) && this.textures.has(world.id)) || this.pendingWorld === world.id || this.failures.has(world.id)) return;
    this.worker?.terminate();
    this.pendingWorld = world.id; const generation = ++this.generation;
    try {
      const worker = new Worker(new URL('./surfaceWorker.ts', import.meta.url), { type: 'module' });
      this.worker = worker;
      worker.onmessage = (event: MessageEvent<{ id: string; landscape?: ImageData; texture?: ImageData; error?: boolean }>) => {
        const result = event.data;
        if (generation !== this.generation) return;
        this.pendingWorld = ''; worker.terminate(); this.worker = undefined;
        if (result.error || result.id !== world.id || !hasPixels(result.landscape) || !hasPixels(result.texture)) this.failures.add(world.id);
        else {
          try {
            const landscape = makeCanvas(result.landscape.width, result.landscape.height);
            landscape.getContext('2d')!.putImageData(result.landscape, 0, 0);
            this.landscapes.set(world.id, landscape); this.textures.set(world.id, result.texture); this.three?.setTexture(world, result.texture); this.globeKey = '';
          } catch { this.failures.add(world.id); }
        }
        if (this.world) { if (this.failed) this.draw(this.world, this.view, this.progress, this.phase); else this.transition(this.world, this.view, this.progress, this.phase); }
        this.onPrepared?.();
      };
      worker.onerror = () => { if (generation !== this.generation) return; this.pendingWorld = ''; this.failures.add(world.id); worker.terminate(); this.worker = undefined; if (this.world) this.draw(this.world, this.view, this.progress, this.phase); this.onPrepared?.(); };
      worker.postMessage(world);
    } catch { this.pendingWorld = ''; this.failures.add(world.id); this.onPrepared?.(); }
  }
  private preview(world: World) {
    const cached = this.previewGlobes.get(world.id); if (cached) return cached;
    const canvas = makeCanvas(560, 560), c = canvas.getContext('2d')!;
    const shade = c.createRadialGradient(185, 180, 30, 285, 290, 274);
    shade.addColorStop(0, world.color); shade.addColorStop(.7, '#324044'); shade.addColorStop(1, '#111921');
    c.fillStyle = shade; c.beginPath(); c.arc(280, 280, 267, 0, Math.PI * 2); c.fill();
    this.previewGlobes.set(world.id, canvas); return canvas;
  }
  transition(world: World, view: View, progress: number, phase: number) {
    this.cancelTransition();
    if (this.three) { this.draw(world, view, progress, phase); return; }
    const previous = makeCanvas(this.s.canvas.width, this.s.canvas.height);
    previous.getContext('2d')!.drawImage(this.s.canvas, 0, 0);
    this.world = world; this.view = view; this.progress = progress; this.phase = phase;
    this.cancelTransition = animateValue({ from: 0, to: 1, duration: 650, onUpdate: value => {
      this.draw(world, view, progress, phase);
      const c = this.s.context;
      c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 1 - value;
      c.drawImage(previous, 0, 0, this.s.canvas.width, this.s.canvas.height); c.restore();
    } });
  }
  stopTransition() { this.cancelTransition(); this.three?.stopTransition(); }
  private globe(world: World, phase: number) {
    const key = world.id + ':' + phase.toFixed(3); if (key === this.globeKey) return this.globeCanvas;
    const texture = this.textures.get(world.id);
    if (!texture) { this.prepare(world); return this.preview(world); }
    const data = this.globePixels, size = 560, r = 267;
    const rotation = .28 + phase * .038, molten = world.id === 'cancri';
    data.data.fill(0);
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const nx = (x - size / 2) / r, ny = (y - size / 2) / r, d = nx * nx + ny * ny;
      if (d > 1) continue;
      const z = Math.sqrt(1 - d), lon = Math.atan2(nx, z) + rotation + 1.05, lat = Math.asin(ny);
      const tx = ((lon / (Math.PI * 2) % 1 + 1) % 1) * texture.width | 0;
      const ty = clamp((lat / Math.PI + .5) * texture.height, 0, texture.height - 1) | 0;
      const source = (ty * texture.width + tx) * 4, target = (y * size + x) * 4;
      const lighting = .08 + .92 * Math.max(0, -nx * .58 - ny * .3 + z * .76);
      for (let k = 0; k < 3; k++) data.data[target + k] = texture.data[source + k] * (molten ? .61 + lighting * .39 : lighting);
      data.data[target + 3] = 255 * clamp((1 - Math.sqrt(d)) * r);
    }
    this.globeCanvas.getContext('2d')!.putImageData(data, 0, 0); this.globeKey = key; return this.globeCanvas;
  }
  draw(world: World, view: View, progress: number, phase = 0) {
    this.world = world; this.view = view; this.progress = progress; this.phase = phase;
    this.prepare(world);
    if (this.three) { this.three.draw(world, view, progress, phase); return; }
    const s = this.s, c = s.begin(...(view === 'globe' ? ['#060b13', '#111b25'] as [string, string] : palette[world.id].sky));
    if (view === 'globe') {
      for (let i = 0; i < 70; i++) s.ellipse((seed(i + 320) - .5) * 1700, (seed(i + 810) - .5) * 570, .45 + seed(i) * .6, .45 + seed(i) * .6, '#d1dfdc58');
      if (world.id !== 'mercury') {
        const glow = c.createRadialGradient(0, -5, 188, 0, -5, 224);
        glow.addColorStop(0, world.color + '18'); glow.addColorStop(.68, world.color + '28'); glow.addColorStop(1, world.color + '00');
        s.ellipse(0, -5, 230, 230, glow);
      }
      c.drawImage(this.globe(world, phase), -220, -225, 440, 440);
    } else if (view === 'section') this.section(world, progress, phase);
    else {
      c.save();
      const width = Math.max(850, s.width / s.scale), height = Math.max(510, s.height / s.scale);
      const pan = Math.sin(phase * .055) * width * .014;
      const landscape = this.landscapes.get(world.id);
      if (landscape) c.drawImage(landscape, -width * .525 + pan, -height * .54, width * 1.05, height);
      else this.fallback(world);
      c.restore();
    }
    s.end();
  }
  private fallback(world: World) {
    // Bounded teaching silhouette if workers or OffscreenCanvas are unavailable.
    const s = this.s;
    for (let layer = 0; layer < 4; layer++) {
      const points: Point[] = Array.from({ length: 50 }, (_, i) => { const x = -1000 + i * 42; return [x, 25 + layer * 40 + noise(x * .45, layer * 48) * (world.surface ? 22 : 12)]; });
      const color = !world.surface ? (world.id === 'neptune' ? '#7baebaae' : '#a99279ab') : world.liquid === 'silicate-melt' ? '#c56726' : world.liquid === 'hydrocarbon' ? '#484736' : world.liquid === 'water' ? '#346f80' : '#756a5b';
      s.path([...points, [1100, 1000], [-1100, 1000]], color, '#eedcc322', 1);
    }
  }
  private section(world: World, progress: number, _phase: number) {
    const s = this.s, c = s.context, profile = INTERIORS[world.id], active = interiorAt(world.id, progress);
    c.fillStyle = '#0b1621'; c.fillRect(-2000, -2000, 4000, 4000);
    for (const layer of profile.layers) {
      s.ellipse(0, 0, layer.outer * 205, layer.outer * 205, layer.color);
      if (layer.id === active.id) { c.save(); c.globalAlpha = .12; s.ellipse(0, 0, layer.outer * 205, layer.outer * 205, '#fff8ce'); c.restore(); }
    }
    const radius = (1 - clamp(progress)) * 205, a = Math.PI * .72, x = Math.cos(a) * radius, y = -Math.sin(a) * radius;
    s.path([[Math.cos(a) * 220, -Math.sin(a) * 220], [0, 0]], undefined, '#f7eacb99', 1.4);
    s.ellipse(x, y, 7, 7, '#fff6be', '#fffaf1');
  }
  dispose() { this.disposed = true; this.three?.dispose(); this.three = undefined; this.cancelTransition(); this.generation++; this.pendingWorld = ''; this.worker?.terminate(); this.worker = undefined; this.onPrepared = undefined; this.s.dispose(); this.landscapes.forEach(image => { image.width = 0; image.height = 0; }); this.landscapes.clear(); this.textures.clear(); this.previewGlobes.clear(); }
}
