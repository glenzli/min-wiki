import { CanvasSurface } from '../../src/visuals/canvasSurface.ts';
import { animateValue } from '../../src/visuals/transition.ts';
import { noise, clamp, markerY, SECTION, type World, type View } from './model.ts';
import { palette, seed } from './surfacePainter.ts';
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
    this.s.onResize(() => { this.cancelTransition(); if (this.world) this.draw(this.world, this.view, this.progress, this.phase); });
  }
  onPreparationChange(callback: () => void) { this.onPrepared = callback; }
  get preparing() { return !!this.world && this.pendingWorld === this.world.id; }
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
            this.landscapes.set(world.id, landscape); this.textures.set(world.id, result.texture); this.globeKey = '';
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
  stopTransition() { this.cancelTransition(); }
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
  private section(world: World, progress: number, phase: number) {
    const s = this.s, c = s.context, giant = !world.surface, molten = world.liquid === 'silicate-melt', hydrocarbon = world.liquid === 'hydrocarbon';
    const gradient = c.createLinearGradient(0, -250, 0, 250);
    if (giant) {
      gradient.addColorStop(0, world.color); gradient.addColorStop(.47, world.id === 'jupiter' ? '#8b7469' : '#608f9d'); gradient.addColorStop(1, '#233039');
    } else {
      gradient.addColorStop(0, palette[world.id].sky[0]); gradient.addColorStop(.429, palette[world.id].sky[1]);
      const top = molten ? '#ee9441' : hydrocarbon ? '#706b46' : world.liquid === 'water' ? '#4a9dae' : '#a48a70';
      const bottom = molten ? '#b53b18' : hydrocarbon ? '#302e24' : world.liquid === 'water' ? '#164d62' : '#5c4c40';
      gradient.addColorStop(.433, top); gradient.addColorStop(.789, bottom);
      gradient.addColorStop(.795, world.liquid === 'water' ? '#766c55' : hydrocarbon ? '#8e8671' : bottom); gradient.addColorStop(1, molten ? '#78321e' : '#3d3835');
    }
    c.fillStyle = gradient; c.fillRect(-2000, -2000, 4000, 4000);
    const { interface: boundary, bed } = SECTION;
    for (let line = 0; line < (giant ? 36 : 21); line++) {
      const y = giant ? -240 + line * 14 : boundary + line * 15;
      if (!giant && world.liquid !== 'none' && !molten && y < bed) continue;
      const points: Point[] = Array.from({ length: 150 }, (_, i) => { const x = -800 + i * 11; return [x, y + noise(x + (giant ? phase * 2 : 0), line * 37) * (giant ? 16 : 6)]; });
      s.path(points, undefined, line % 3 ? '#e7d9b224' : '#131b2433', giant ? 6 : 1.4);
    }
    if (world.liquid !== 'none') {
      const points: Point[] = Array.from({ length: 160 }, (_, i) => { const x = -850 + i * 11; return [x, boundary + Math.sin(x * .033 + phase * .45) * (hydrocarbon ? .45 : 1.25)]; });
      s.path(points, undefined, molten ? '#ffe2a3b0' : '#eee7c970', 2);
      if (!molten) {
        const bottom: Point[] = Array.from({ length: 160 }, (_, i) => { const x = -850 + i * 11; return [x, bed + noise(x * 1.1, 93) * 7]; });
        s.path(bottom, undefined, hydrocarbon ? '#c4b99a' : '#ad9d73', 3);
      } else {
        // Fade into an unmeasured interior; do not invent a measured magma-ocean floor.
        const fade = c.createLinearGradient(0, 135, 0, 280); fade.addColorStop(0, '#201c2100'); fade.addColorStop(1, '#201c21dd'); c.fillStyle = fade; c.fillRect(-2000, 135, 4000, 200);
      }
    }
    const y = markerY(world, progress);
    s.path([[0, SECTION.top], [0, y]], undefined, '#f1f5e570', 1.5);
    for (let i = 0; i < 6; i++) { const yy = SECTION.top + i * 69; s.path([[-13, yy], [-8, yy]], undefined, '#e9efdf66', 1); }
    const halo = c.createRadialGradient(0, y, 0, 0, y, 28); halo.addColorStop(0, '#fff6d05b'); halo.addColorStop(1, '#fff6d000'); s.ellipse(0, y, 28, 28, halo);
    s.path([[0, y - 10], [9, y], [0, y + 10], [-9, y]], '#f9eacc', '#fff9e6', 1.5);
    s.ellipse(-1.5, y - 1, 3, 3, '#766a55');
    c.drawImage(this.globe(world, 0), -357, -214, 136, 136);
  }
  dispose() { this.cancelTransition(); this.generation++; this.pendingWorld = ''; this.worker?.terminate(); this.worker = undefined; this.onPrepared = undefined; this.s.dispose(); this.landscapes.forEach(image => { image.width = 0; image.height = 0; }); this.landscapes.clear(); this.textures.clear(); this.previewGlobes.clear(); }
}
