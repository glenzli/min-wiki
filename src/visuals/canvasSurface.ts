/** Content-free Canvas sizing and drawing primitives. Topic owners supply state and time. */
export class CanvasSurface {
  readonly context: CanvasRenderingContext2D;
  private observer: ResizeObserver;
  private redraw?: () => void;
  width = 1;
  height = 1;
  scale = 1;
  constructor(readonly canvas: HTMLCanvasElement) {
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas 2D unavailable');
    this.context = context;
    this.observer = new ResizeObserver(() => { this.resize(); this.redraw?.(); });
    this.observer.observe(canvas);
    this.resize();
  }
  onResize(redraw: () => void) { this.redraw = redraw; }
  private resize() {
    this.width = this.canvas.clientWidth;
    this.height = this.canvas.clientHeight;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(this.width * dpr);
    this.canvas.height = Math.round(this.height * dpr);
    this.context.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.scale = Math.min((this.width - 22) / 740, (this.height - 90) / 430);
  }
  begin(top: string, bottom: string) {
    const c = this.context;
    c.clearRect(0, 0, this.width, this.height);
    const gradient = c.createLinearGradient(0, 0, 0, this.height);
    gradient.addColorStop(0, top); gradient.addColorStop(1, bottom);
    c.fillStyle = gradient; c.fillRect(0, 0, this.width, this.height);
    c.save(); c.translate(this.width / 2, this.height * .54); c.scale(this.scale, this.scale);
    return c;
  }
  end() { this.context.restore(); }
  ellipse(x: number, y: number, rx: number, ry: number, fill: string | CanvasGradient, stroke?: string) {
    const c = this.context; c.beginPath(); c.ellipse(x, y, Math.max(.01, rx), Math.max(.01, ry), 0, 0, Math.PI * 2); c.fillStyle = fill; c.fill();
    if (stroke) { c.strokeStyle = stroke; c.lineWidth = 1.4; c.stroke(); }
  }
  path(points: [number, number][], fill?: string | CanvasGradient, stroke?: string, width = 2) {
    const c = this.context; c.beginPath(); points.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y));
    if (fill) { c.closePath(); c.fillStyle = fill; c.fill(); }
    if (stroke) { c.strokeStyle = stroke; c.lineWidth = width; c.lineJoin = 'round'; c.lineCap = 'round'; c.stroke(); }
  }
  arrow(x: number, y: number, xx: number, yy: number, color: string, width = 3) {
    const angle = Math.atan2(yy - y, xx - x), r = 9;
    this.path([[x, y], [xx, yy]], undefined, color, width);
    this.path([[xx - Math.cos(angle - .5) * r, yy - Math.sin(angle - .5) * r], [xx, yy], [xx - Math.cos(angle + .5) * r, yy - Math.sin(angle + .5) * r]], undefined, color, width);
  }
  label(text: string, x: number, y: number, options: {width?: number; color?: string; background?: string; anchor?: [number, number]} = {}) {
    const c = this.context, font = Math.max(13, 12 / this.scale), lineHeight = font * 1.2, maxWidth = options.width ?? 210;
    c.font = `${font}px -apple-system,BlinkMacSystemFont,sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle';
    const wordMode = /[A-Za-z]/.test(text) || text.includes(' ');
    const words = wordMode ? text.split(' ') : [...text], lines: string[] = []; let line = '';
    for (const word of words) {
      const next = line + (line && wordMode ? ' ' : '') + word;
      if (line && c.measureText(next).width > maxWidth) { lines.push(line); line = word; } else line = next;
    }
    if (line) lines.push(line);
    if (options.anchor) { this.path([options.anchor, [x, y]], undefined, options.color ?? '#bbd0d8', 1); this.ellipse(...options.anchor, 2, 2, options.color ?? '#bbd0d8'); }
    const w = Math.max(...lines.map(s => c.measureText(s).width)) + 12;
    c.fillStyle = options.background ?? '#112331dc'; c.fillRect(x - w / 2, y - font * .75, w, lineHeight * lines.length + 3);
    c.fillStyle = options.color ?? '#e8f0ee'; lines.forEach((s, i) => c.fillText(s, x, y + i * lineHeight));
  }
  dispose() { this.observer.disconnect(); this.redraw = undefined; }
}
