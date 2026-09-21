import { leafRGB, mix, pigmentsAt, rgb, smooth, scaleCamera, SCALE_ENTRIES, leafSectionAt, LEAF_SECTION, cellEdge, VACUOLE, vacuolePoint, epidermisBoundary } from './model.ts';
import type { LeafKind, Pigments, ScaleEntry } from './model.ts';
import { t } from './i18n.ts';
import { leafLifeAt, leafPoint } from './lifecycle.ts';

type Point = [number, number];
export class LeafScene {
  private academic = false;
  private showLabels = true;
  private epidermalCells: Path2D[] = [];
  private epidermalCenters: Point[] = [];
  private epidermalPlate = document.createElement('canvas');
  private epidermalKey = '';
  private plastidPlate = document.createElement('canvas');
  private plastidKey = '';
  private bladeGeometry?: { outline: Path2D; veins: Path2D[]; mesh: Path2D; grain: Path2D };
  private ctx: CanvasRenderingContext2D;
  private observer: ResizeObserver;
  private width = 1;
  private height = 1;
  private scale = 1;
  private disposed = false;
  private frame = 0;
  private position = 0;
  private labelsVisible = true;
  private labels: Array<{ text: string; x: number; y: number; anchor?: Point; width: number; matrix: DOMMatrix }> = [];
  private organellePoint: Point = [Math.cos(-Math.PI/4)*146, Math.sin(-Math.PI/4)*110];
  private organelleAngle = Math.PI/4;
  private vacuolePath = new Path2D();
  private surfacePath = new Path2D();
  private season = 0;
  private age = .34;
  private lifeDirty = true;
  private waterProgress = 0;
  private waterVisible = false;
  private kind: LeafKind = 'yellow';
  private time = 0;
  private previous = 0;
  private rendered = 0;
  private visible = true;
  private motion = true;
  private intersection: IntersectionObserver;
  private reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  constructor(private canvas: HTMLCanvasElement, private hotspot: HTMLElement) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas unavailable');
    this.ctx = ctx;
    for (let i=0;i<=96;i++) {
      const point=vacuolePoint(i/96*Math.PI*2);
      if(i) this.vacuolePath.lineTo(...point); else this.vacuolePath.moveTo(...point);
    }
    this.vacuolePath.closePath();
    epidermisBoundary.forEach(([x,y],i)=>i?this.surfacePath.lineTo(x,y):this.surfacePath.moveTo(x,y));
    this.surfacePath.closePath();
    this.buildEpidermis();
    this.observer = new ResizeObserver(() => this.resize());
    this.observer.observe(canvas);
    this.resize();
    this.intersection = new IntersectionObserver(entries => { this.visible = entries[0].isIntersecting; this.wake(); });
    this.intersection.observe(canvas);
    document.addEventListener('visibilitychange', this.wake);
    this.wake();
  }
  setAcademic(academic: boolean) { if(this.academic !== academic){this.academic = academic;this.render();} }
  setLabels(enabled: boolean) { this.showLabels = enabled; this.render(); }
  setMotion(enabled: boolean) { this.motion = enabled; this.wake(); }
  setLife(age: number, waterVisible = false, waterProgress = 0) {
    this.lifeDirty ||= age !== this.age || waterVisible !== this.waterVisible || waterProgress !== this.waterProgress;
    this.age = age; this.waterVisible = waterVisible; this.waterProgress = waterProgress;
  }
  private wake = () => {
    if (!this.disposed && !document.hidden && this.visible && !this.frame) { this.previous = performance.now(); this.frame = requestAnimationFrame(this.animate); }
  };
  set(position: number, season: number, kind: LeafKind) {
    if (!this.lifeDirty && position === this.position && season === this.season && kind === this.kind) return;
    this.lifeDirty = false;
    this.position = Math.max(0, Math.min(3, position));
    this.season = season;
    this.kind = kind;
    this.render();
    this.wake();
  }
  private animate = (now: number) => {
    this.frame = 0;
    if (this.disposed || document.hidden || !this.visible) return;
    if (now - this.rendered < 32) { this.frame = requestAnimationFrame(this.animate); return; }
    this.rendered = now;
    const delta = Math.min((now - this.previous) / 1000, .05); this.previous = now;
    const life = leafLifeAt(this.age), active = this.motion && !this.reducedMotion && life.growth > .9 && life.fall === 0;
    if (active) this.time += delta;
    this.render();
    if (active) this.frame = requestAnimationFrame(this.animate);
  };
  private resize() {
    this.width = this.canvas.clientWidth;
    this.height = this.canvas.clientHeight;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(this.width * dpr);
    this.canvas.height = Math.round(this.height * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.scale = Math.min((this.width - 24) / 470, (this.height - 175) / 470);
    this.render();
  }
  private destination() {
    return this.kind === 'red' ? { x: VACUOLE.x, y: VACUOLE.y, size: .8, angle: 0 } : { x: this.organellePoint[0], y: this.organellePoint[1], size: 18/210, angle: this.organelleAngle };
  }
  private render() {
    const c = this.ctx;
    c.clearRect(0, 0, this.width, this.height);
    c.fillStyle = '#edf1df'; c.fillRect(0, 0, this.width, this.height);
    const backdrop = c.createRadialGradient(this.width*.42, this.height*.4, 12, this.width*.5, this.height*.5, this.width*.7);
    backdrop.addColorStop(0, '#fbf9e9'); backdrop.addColorStop(.55, '#e8eed9'); backdrop.addColorStop(1, '#cbd8ba');
    c.fillStyle = backdrop; c.fillRect(0, 0, this.width, this.height);
    const destination = this.destination(), originalCamera = scaleCamera(this.position, destination), life = leafLifeAt(this.age);
    const tracked = leafPoint(originalCamera.x, originalCamera.y, this.age), follow = smooth(0, 1, this.position);
    const camera = { ...originalCamera, x: originalCamera.x * (1 - follow) + tracked.x * follow, y: originalCamera.y * (1 - follow) + tracked.y * follow, angle: originalCamera.angle + life.rotation * follow, magnification: originalCamera.magnification / (1 - follow + life.size * follow) };
    const entries: ScaleEntry[] = [...SCALE_ENTRIES, destination];
    const section = leafSectionAt(this.position), patch = entries[0];
    this.labels = [];
    c.save(); c.translate(this.width / 2, this.height * .54); c.scale(this.scale * camera.magnification, this.scale * camera.magnification); c.rotate(-camera.angle); c.translate(-camera.x, -camera.y);
    if (this.position < 1.1) {
      c.save(); c.globalAlpha *= 1 - smooth(.25, 1.1, this.position);
      const bark = c.createLinearGradient(0, 222, 0, 276); bark.addColorStop(0, '#ae9270'); bark.addColorStop(.4, '#81684d'); bark.addColorStop(1, '#524d39');
      c.beginPath(); c.moveTo(-310, 295); c.bezierCurveTo(-155, 267, 76, 242, 314, 224); c.lineWidth = 25; c.lineCap = 'round'; c.strokeStyle = bark; c.stroke();
      for (let i = 0; i < 17; i++) { const x = -285 + i * 35, y = 263 - x * .106; c.beginPath(); c.moveTo(x, y); c.lineTo(x + 18, y - 2); c.strokeStyle = i % 2 ? '#b8a18770' : '#3d443350'; c.lineWidth = 1.5; c.stroke(); }
      if (life.separation > 0) { c.beginPath(); c.ellipse(19, 251, 7, 3.5, -.1, 0, Math.PI * 2); c.fillStyle = '#d0ba8d'; c.globalAlpha *= life.separation; c.fill(); }
      c.restore();
    }
    // The blade, its cutaway anchors and every nested compartment share one
    // lifetime transform. The branch stays put when the same leaf detaches.
    c.translate(19 + life.x, 246 + life.y); c.rotate(life.rotation); c.scale(life.size * life.unfold, life.size); c.translate(-19, -246);
    // Every detail stays at the same location in one nested world. Reversing the
    // slider reverses the same camera, rather than starting another dissolve.
    const drawNested = (depth: number) => {
      this.labelsVisible = Math.abs(this.position - depth) < .14;
      c.save();
      if (depth === 0) {
        c.globalAlpha *= section.bladeOpacity;
        // Turn the whole surface, then de-emphasize the surrounding leaf while
        // retaining the exact same sampled surface. No hole is punched in it.
        c.transform(...section.surfaceTransform);
        if (section.contextOpacity < 1) {
          const sample = new Path2D(); sample.addPath(this.surfacePath,new DOMMatrix([patch.size,0,0,patch.size,patch.x,patch.y]));
          const outside = new Path2D(); outside.rect(-1000,-1000,2000,2000); outside.addPath(sample);
          if (section.contextOpacity > 0) {
            c.save();c.clip(outside,'evenodd');c.globalAlpha*=section.contextOpacity;
            this.leaf(pigmentsAt(this.season,this.kind));c.restore();
          }
          c.clip(sample);
        }
      }
      const p=pigmentsAt(this.season,this.kind);
      if (depth===0 && section.bladeOpacity>0) {
        this.leaf(p);
        c.save();c.translate(patch.x,patch.y);c.scale(patch.size,patch.size);
        c.clip(this.surfacePath);c.globalAlpha*=section.textureOpacity;
        c.translate(0,-110);this.epidermis(p);c.restore();
      } else if(depth===1) this.tissue(p);
      c.restore();
      // Tissue owns the actual selected cell. Further scales change only the
      // camera, not the cell renderer or a second overlaid vacuole image.
      if (depth===1) return;
      // Reveal existing anatomy only as the camera approaches it. The mask opens
      // over a fixed child; the cells themselves never grow, split, or slide.
      const reveal = depth === 0 ? section.sectionScale : smooth(depth - .04, depth + .54, this.position);
      if (reveal === 0) return;
      const entry = entries[depth];
      c.save(); c.translate(entry.x, entry.y); c.rotate(entry.angle ?? 0); c.scale(entry.size, entry.size);
      if(depth === 0) {
        // This face is perpendicular to the leaf surface, not pasted on it.
        // Both meet at y=LEAF_SECTION.top for every camera angle.
        const [ca,,sa] = section.surfaceTransform;
        // The left depth face closes the volume between the sampled upper
        // surface and its front section, instead of looking like a folded card.
        c.save();c.transform(sa,ca*section.surfaceScale,0,section.sectionScale,
          ca*LEAF_SECTION.left,-sa*section.surfaceScale*LEAF_SECTION.left);
        const side=c.createLinearGradient(0,LEAF_SECTION.top,0,LEAF_SECTION.bottom);
        side.addColorStop(0,'#b5c38e');side.addColorStop(.25,'#9dac78');side.addColorStop(1,'#b8c494');
        c.fillStyle=side;c.fillRect(-185,LEAF_SECTION.top,185,LEAF_SECTION.bottom-LEAF_SECTION.top);
        c.fillStyle='#c8d4a7';c.fillRect(-185,-153,185,8);
        c.fillStyle='#c0cca0';c.fillRect(-185,112,185,23);
        c.strokeStyle='#768d6155';c.lineWidth=1;
        for(const y of [-112,10,112]) {c.beginPath();c.moveTo(-185,y);c.lineTo(0,y);c.stroke();}
        c.restore();
        c.save(); c.transform(...section.sectionTransform);
        c.beginPath(); c.rect(LEAF_SECTION.left,LEAF_SECTION.top,
          LEAF_SECTION.right-LEAF_SECTION.left,LEAF_SECTION.bottom-LEAF_SECTION.top); c.clip();
        drawNested(1);
        c.restore();
        c.restore(); return;
      }
    };
    drawNested(0);
    if (this.waterVisible && this.position < .2) this.waterOnLeaf(life.transport);
    c.restore();
    // Labels belong to the currently visited scale and are not trapped inside a
    // tiny parent clipping mask. Anatomy remains fixed beneath these overlays.
    for (const label of this.labels) {
      c.save(); c.setTransform(label.matrix); this.drawLabel(label.text, label.x, label.y, label.anchor, label.width); c.restore();
    }
    const onSurface=Math.abs(this.position-.5)<.08;
    const depth = onSurface ? 0 : Math.min(2, Math.round(this.position));
    let x = 0, y = 0, size = 1;
    for (let i = 0; i <= depth; i++) { x += entries[i].x * size; y += entries[i].y * size; size *= entries[i].size; }
    if(onSurface)y-=110*entries[0].size;
    const sample = leafPoint(x, y, this.age);
    this.hotspot.style.left = `${this.width / 2 + ((sample.x-camera.x)*Math.cos(camera.angle)+(sample.y-camera.y)*Math.sin(camera.angle))*this.scale*camera.magnification}px`;
    this.hotspot.style.top = `${this.height*.54 + (-(sample.x-camera.x)*Math.sin(camera.angle)+(sample.y-camera.y)*Math.cos(camera.angle))*this.scale*camera.magnification}px`;
    this.hotspot.hidden = life.growth < .9 || life.fall > 0 || this.position > 2.15 || (!onSurface && Math.abs(this.position - Math.round(this.position)) > .12);
    this.canvas.dataset.scale = this.position.toFixed(4);
    this.canvas.dataset.camera = `${camera.x.toFixed(6)},${camera.y.toFixed(6)},${camera.magnification.toFixed(6)}`;
    this.canvas.dataset.leafAge = this.age.toFixed(4);
    this.canvas.dataset.leafIdentity = 'branch-leaf-01';
    this.canvas.dataset.sectionAngle = section.angle.toFixed(6);
    this.canvas.dataset.anatomyRenderer = 'continuous-canvas';
  }
  private waterOnLeaf(active: number) {
    const c = this.ctx, p = this.waterProgress;
    c.save(); c.globalAlpha *= active;
    c.beginPath(); c.moveTo(19, 245); c.quadraticCurveTo(22, 113, 9, 8); c.quadraticCurveTo(17, -4, 35, -12);
    c.strokeStyle = '#388b9c75'; c.lineWidth = 3; c.setLineDash([3, 6]); c.stroke(); c.setLineDash([]);
    // The selected water cohort appears here only when the root-to-leaf model
    // reaches its leaf stage. Hollow markers distinguish vapour from liquid.
    const u = Math.max(0, Math.min(1, (p - .61) / .39));
    if (p >= .61) {
      const evaporation = smooth(.5, .72, u), x = u < .55 ? 19 + 16 * u / .55 : 35 + 64 * (u - .55) / .45;
      const y = u < .55 ? 245 - 257 * u / .55 : -12 - 105 * (u - .55) / .45;
      c.beginPath(); c.arc(x, y, 7, 0, Math.PI * 2); c.fillStyle = `rgba(45,151,181,${1 - evaporation})`; c.fill(); c.strokeStyle = '#2c8fa7'; c.lineWidth = 2; c.stroke();
    }
    c.restore();
  }
  private ellipse(x: number, y: number, rx: number, ry: number, color: string | CanvasGradient, stroke?: string) {
    const c = this.ctx; c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); c.fillStyle = color; c.fill();
    if (stroke) { c.strokeStyle = stroke; c.lineWidth = 1.5; c.stroke(); }
  }
  private label(text: string, x: number, y: number, anchor?: Point, width = 170) {
    if (!this.showLabels) return;
    if (!this.academic && ([t('细胞核'),t('细胞壁'),t('下表皮'),t('叶绿体包膜'),t('液泡膜')].includes(text) || this.labels.length >= 3)) return;
    if (this.labelsVisible) this.labels.push({ text, x, y, anchor, width, matrix: this.ctx.getTransform() });
  }
  private drawLabel(text: string, x: number, y: number, anchor?: Point, width = 170) {
    const c = this.ctx;
    if (anchor) { c.beginPath(); c.moveTo(...anchor); c.lineTo(x, y - 5); c.strokeStyle = '#71876b'; c.lineWidth = 1; c.stroke(); this.ellipse(...anchor, 2, 2, '#698365'); }
    const fontSize = Math.max(12, 11 / this.scale), lineHeight = Math.ceil(fontSize * 1.25);
    c.font = `${fontSize}px -apple-system, BlinkMacSystemFont, sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle';
    const words = text.includes(' ') ? text.split(' ') : [...text]; let line = ''; const lines: string[] = [];
    for (const word of words) { const next = line + (line && text.includes(' ') ? ' ' : '') + word; if (c.measureText(next).width > width && line) { lines.push(line); line = word; } else line = next; }
    if (line) lines.push(line);
    const box = Math.min(width, Math.max(...lines.map(l => c.measureText(l).width))) + 14;
    c.fillStyle = '#f8faedeb'; c.fillRect(x - box / 2, y - fontSize * .75, box, lines.length * lineHeight + 3);
    c.fillStyle = '#39543b'; lines.forEach((l, i) => c.fillText(l, x, y + i * lineHeight));
  }
  private leaf(p: Pigments) {
    const c = this.ctx;
    c.save(); c.rotate(-.15);
    // Fixed blade coordinates preserve the petiole attachment and tissue anchor.
    // Cache the fine geometry: neither the venation nor grain changes each frame.
    const center = (t: number) => 7 * Math.sin(Math.PI * t) - 3 * t;
    const edge = (t: number, side: -1|1): Point => {
      const envelope = Math.pow(Math.max(0, Math.sin(Math.PI*t)), 1.08) * (.78 + .32*t);
      const teeth = 1 + .012 * Math.sin(t*Math.PI*62 + side*.6) + .005*Math.sin(t*Math.PI*110);
      const asymmetry = side < 0 ? .95 + .025*Math.sin(t*9) : 1.03 + .02*Math.cos(t*11);
      return [center(t) + side*146*envelope*teeth*asymmetry, -204 + 368*t];
    };
    if (!this.bladeGeometry) {
      const outline = new Path2D(); outline.moveTo(...edge(0, 1));
      for (let i=1;i<=256;i++) outline.lineTo(...edge(i/256,1));
      for (let i=255;i>=0;i--) outline.lineTo(...edge(i/256,-1));
      outline.closePath();
      const veins: Path2D[] = [], mesh = new Path2D(), grain = new Path2D();
      for (const side of [-1,1] as const) {
        for (let row=0;row<10;row++) {
          const t = .95-row*.086 + (side < 0 ? -.018 : 0);
          const start: Point = [center(t), -204+368*t];
          const end = edge(Math.max(.018,t-.19), side);
          const control: Point = [start[0]+(end[0]-start[0])*.66, start[1]-23];
          const at = (u: number): Point => [
            (1-u)**2*start[0]+2*(1-u)*u*control[0]+u*u*end[0],
            (1-u)**2*start[1]+2*(1-u)*u*control[1]+u*u*end[1],
          ];
          const vein = new Path2D(); vein.moveTo(...start); vein.quadraticCurveTo(...control,...end); veins.push(vein);
          // Fine cross-veins meet the next curved side vein, never cross the midrib.
          if (row < 9) for (let j=1;j<=8;j++) {
            const u = j/10, a = at(u);
            const nextT = t-.086, nextEnd = edge(Math.max(.018,nextT-.19),side);
            const nextStart: Point = [center(nextT),-204+368*nextT];
            const v = Math.min(.96,u+.035*Math.sin(row*3+j));
            const b: Point = [
              (1-v)**2*nextStart[0]+2*(1-v)*v*(nextStart[0]+(nextEnd[0]-nextStart[0])*.66)+v*v*nextEnd[0],
              (1-v)**2*nextStart[1]+2*(1-v)*v*(nextStart[1]-23)+v*v*nextEnd[1],
            ];
            mesh.moveTo(...a); mesh.bezierCurveTo(a[0]+side*4,a[1]-7,b[0]-side*3,b[1]+7,...b);
          }
        }
      }
      // Tiny irregular grain, not a visible pattern of large circles.
      for (let i=0;i<2400;i++) {
        const x=Math.sin(i*17.23)*151, y=Math.cos(i*9.41)*204;
        grain.moveTo(x,y); grain.lineTo(x+.35+(i%5)*.12,y-.25);
      }
      this.bladeGeometry = { outline, veins, mesh, grain };
    }
    const { outline: shape, veins, mesh, grain } = this.bladeGeometry;
    const color = mix(leafRGB(p), [125, 84, 48], leafLifeAt(this.age).browning * .76);
    const grad = c.createLinearGradient(-130,-80,145,90);
    grad.addColorStop(0,rgb(mix(color,[209,230,111],.3)));
    grad.addColorStop(.48,rgb(mix(color,[169,196,89],.06)));
    grad.addColorStop(.7,rgb(color));
    grad.addColorStop(1,rgb(mix(color,[31,57,29],.26)));
    c.shadowColor = '#294a3428'; c.shadowBlur = 17; c.shadowOffsetY = 10;
    c.fillStyle=grad; c.fill(shape); c.shadowColor='transparent';
    c.save(); c.clip(shape);
    for (let i = 0; i < 45; i++) {
      const x = Math.sin(i * 7.31) * 155, y = Math.cos(i * 3.79) * 195;
      const radius=18+i%6*7, patch=c.createRadialGradient(x,y,0,x,y,radius);
      patch.addColorStop(0,rgb(mix(color,i%2 ? [252,216,93] : [24,65,29],.65),.16));
      patch.addColorStop(1,rgb(color,0)); c.fillStyle=patch;
      c.fillRect(x-radius,y-radius,radius*2,radius*2);
    }
    c.lineCap='round';
    // Fine veins only: repeated bright/dark ridges made the blade look quilted.
    for (const vein of veins) {
      c.strokeStyle=rgb(mix(color,[237,229,147],.48),.56); c.lineWidth=.85; c.stroke(vein);
    }
    c.strokeStyle=rgb(mix(color,[225,229,157],.5),.2); c.lineWidth=.4; c.stroke(mesh);
    c.strokeStyle='#f1f2c421'; c.lineWidth=.6; c.stroke(grain);
    const shine=c.createRadialGradient(-55,-110,5,-20,-50,195);
    shine.addColorStop(0,'#f9ffcd25');shine.addColorStop(.65,'#ffffdf00');shine.addColorStop(1,'#153b2415');c.fillStyle=shine;c.fill(shape);
    c.restore();
    // A tapered midrib grows directly out of the same petiole, not a straight wire.
    c.beginPath(); c.moveTo(-5.6,165); c.bezierCurveTo(2,77,6,-97,0,-204);
    c.bezierCurveTo(12,-95,8,78,-.4,165); c.closePath();
    const rib=c.createLinearGradient(-5,0,8,0);
    rib.addColorStop(0,rgb(mix(color,[81,101,43],.6)));
    rib.addColorStop(.5,rgb(mix(color,[244,231,146],.8)));
    rib.addColorStop(1,rgb(mix(color,[169,175,88],.7))); c.fillStyle=rib;c.fill();
    c.beginPath();c.moveTo(-3,164);c.bezierCurveTo(-2,195,-1,225,-18,246);
    c.lineWidth=5.5;c.strokeStyle=rgb(mix(color,[101,98,48],.55));c.stroke();
    c.beginPath();c.moveTo(-4,165);c.bezierCurveTo(-3,196,-2,224,-19,244);
    c.lineWidth=1.4;c.strokeStyle=rgb(mix(color,[225,220,140],.7));c.stroke();
    c.lineWidth = .8; c.strokeStyle = rgb(mix(color,[57,77,30],.5),.55); c.stroke(shape);
    c.save();c.clip(shape);c.lineWidth=2.4;c.strokeStyle=rgb(mix(color,[227,223,132],.6),.32);c.stroke(shape);c.restore();
    c.restore();
    this.label(t('叶脉'), -145, 142, [-16, 107], 75);
    this.label(t('叶片'), 147, -125, [94, -86], 75);
  }
  private plastid(x: number, y: number, rx: number, p: Pigments, angle = 0) {
    // Miniatures consume the same cutaway as the selected chloroplast. The
    // envelope and membrane stacks do not change style when the camera arrives.
    // Cache only static miniature detail, rather than rebuilding every stack
    // for every organelle on every animation frame.
    const c=this.ctx,key=[p.chlorophyll,p.carotenoids,this.season].map(v=>v.toFixed(3)).join(':');
    if(key!==this.plastidKey) {
      const plate=this.plastidPlate;plate.width=432;plate.height=232;
      const saved=this.labelsVisible;
      try {this.ctx=plate.getContext('2d')!;this.ctx.translate(216,116);this.labelsVisible=false;this.chloroplast(p,true);}
      finally {this.ctx=c;this.labelsVisible=saved;}
      this.plastidKey=key;
    }
    c.save();c.translate(x,y);c.rotate(angle);c.scale(rx/210,rx/210);
    c.drawImage(this.plastidPlate,-216,-116);
    c.restore();
  }
  // Fixed per-cell variation: growth contours, not frame-to-frame noise.
  private cellEdge(a: number, rx: number, ry: number, seed: number, power = 1): Point {
    return cellEdge(a,rx,ry,seed,power);
  }
  private cellOutline(x: number, y: number, rx: number, ry: number, seed: number, power = 1) {
    const c = this.ctx; c.beginPath();
    for (let i = 0; i <= 96; i++) {
      const [dx, dy] = this.cellEdge(i / 96 * Math.PI * 2, rx, ry, seed, power);
      const xx = x + dx, yy = y + dy;
      if (i === 0) c.moveTo(xx, yy); else c.lineTo(xx, yy);
    }
    c.closePath();
  }
  private peripheralPlastids(x: number, y: number, rx: number, ry: number, seed: number, count: number, size: number, p: Pigments, power = 1) {
    for (let j = 0; j < count; j++) {
      const a = j / count * Math.PI * 2 + .08 * Math.sin(seed + j * 2.3) + .015 * Math.sin(this.time * .25 + j);
      const [dx, dy] = this.cellEdge(a, rx, ry, seed, power);
      const before = this.cellEdge(a - .025, rx, ry, seed, power), after = this.cellEdge(a + .025, rx, ry, seed, power);
      this.plastid(x + dx * .77, y + dy * .77, size*(.9+.1*Math.sin(seed+j*1.7)), p, Math.atan2(after[1] - before[1], after[0] - before[0]));
    }
  }
  private buildEpidermis() {
    const sites: Point[] = [];
    for(let row=0;row<10;row++) for(let col=0;col<14;col++) {
      const n=row*14+col;
      sites.push([-250+(col+.5)*500/14+Math.sin(n*17.2)*9,-180+(row+.5)*360/10+Math.cos(n*11.7)*9]);
    }
    for(const [sx,sy] of sites) {
      let polygon: Point[]=[[-250,-180],[250,-180],[250,180],[-250,180]];
      for(const [tx,ty] of sites) {
        if(sx===tx&&sy===ty)continue;
        const nx=tx-sx,ny=ty-sy,d=(tx*tx+ty*ty-sx*sx-sy*sy)/2;
        const clipped: Point[]=[];
        for(let i=0;i<polygon.length;i++) {
          const a=polygon[i],b=polygon[(i+1)%polygon.length],da=a[0]*nx+a[1]*ny-d,db=b[0]*nx+b[1]*ny-d;
          if(da<=0)clipped.push(a);
          if((da<=0)!==(db<=0)){const u=da/(da-db);clipped.push([a[0]+(b[0]-a[0])*u,a[1]+(b[1]-a[1])*u]);}
        }
        polygon=clipped;
        if(!polygon.length)break;
      }
      if(polygon.length){
        const path=new Path2D();path.moveTo(...polygon[0]);
        for(let i=0;i<polygon.length;i++) {
          const a=polygon[i],b=polygon[(i+1)%polygon.length],dx=b[0]-a[0],dy=b[1]-a[1],length=Math.hypot(dx,dy);
          const mx=(a[0]+b[0])/2,my=(a[1]+b[1])/2;
          // Canonical edge direction gives both neighbours the same curved wall.
          const sign=a[0]<b[0]||(a[0]===b[0]&&a[1]<b[1])?1:-1;
          const wave=Math.min(3,length*.1)*Math.sin(mx*.07+my*.05)*sign;
          path.quadraticCurveTo(mx-dy/length*wave,my+dx/length*wave,...b);
        }
        path.closePath();this.epidermalCells.push(path);this.epidermalCenters.push([sx,sy]);
      }
    }
  }
  private epidermis(p: Pigments) {
    const key=Object.values(p).map(v=>v.toFixed(2)).join(':');
    if(key!==this.epidermalKey){
      this.epidermalKey=key;
      const plate=this.epidermalPlate;plate.width=1000;plate.height=720;
      const c=plate.getContext('2d')!,base=leafRGB(p);c.scale(2,2);c.translate(250,180);
      this.epidermalCells.forEach((path,i)=>{
        c.fillStyle=rgb(mix(base,[239,242,210],.78+(Math.sin(i*3.1)+1)*.04));c.fill(path);
        c.strokeStyle='#fafbe5';c.lineWidth=2.4;c.stroke(path);
        c.strokeStyle='#8b9f7288';c.lineWidth=.85;c.stroke(path);
        const [x,y]=this.epidermalCenters[i];
        c.save();c.clip(path);c.beginPath();c.ellipse(x+5,y-3,3.5,2.5,.4,0,Math.PI*2);c.fillStyle='#9b9e7f35';c.fill();c.restore();
      });
    }
    this.ctx.drawImage(this.epidermalPlate,-250,-180,500,360);
  }

  private tissue(p: Pigments) {
    const c = this.ctx;
    c.save();c.globalAlpha*=1-smooth(1.18,1.92,this.position);
    const body=c.createLinearGradient(0,-145,0,134);body.addColorStop(0,'#e2ead0');body.addColorStop(1,'#f3f3e4');
    c.fillStyle=body;c.fillRect(-217,-145,434,280);
    c.fillStyle = '#c6d8a3'; c.fillRect(-217, -153, 434, 8);
    for (let i = 0; i < 10; i++) {
      c.fillStyle = '#f0f2de'; c.strokeStyle = '#91ab82'; c.lineWidth = 1.1;
      this.cellOutline(-195 + i * 43, -127 + Math.sin(i * 1.9), 19.5, 13, i * 1.8, .7); c.fill(); c.stroke();
      this.cellOutline(-195 + i * 43, 123 + Math.cos(i * 1.5), 19.5, 10.5, i * 2.1 + 4, .7); c.fill(); c.stroke();
    }
    for (let i = 0; i < 8; i++) {
      const x = -207 + i * 53, cy = -49 + Math.sin(i * 2.1) * 3, rx = 21.5 + Math.sin(i * 1.7), ry = 54 + Math.cos(i * 2.7) * 4;
      const cellFill=c.createLinearGradient(x,-108,x+48,9);cellFill.addColorStop(0,'#dce8c3');cellFill.addColorStop(1,'#e9efd6'); c.fillStyle = cellFill; c.strokeStyle = '#90aa78';
      this.cellOutline(x + 24, cy, rx, ry, i * 2.3, .72); c.fill(); c.stroke();
      this.cellOutline(x + 24, cy, rx * .52, ry * .64, i * 2.3, .72); c.fillStyle = rgb(mix([241,247,231],[224,150,177],p.anthocyanins)); c.fill();
      // Organelles follow the cell's contour within the cytoplasm, outside the liquid compartment.
      this.peripheralPlastids(x + 24, cy, rx, ry, i * 2.3, 6, 5.2, p, .72);
    }
    for (let row = 0; row < 2; row++) for (let i = 0; i < 6; i++) {
      if (row===0 && i===3) continue; // Draw the tracked cell once, below.
      const x = -181 + i * 70 + (row % 2 ? 15 : 0) + Math.sin(i * 2.7 + row) * 5, y = 40 + row * 43 + Math.cos(i * 1.8 + row) * 4;
      const rx = 25 + Math.sin(i * 2 + row) * 3, ry = 17 + Math.cos(i + row) * 2, seed = i * 2.2 + row * 4;
      this.cellOutline(x, y, rx, ry, seed); c.fillStyle = '#e5ecd0'; c.strokeStyle = '#90aa78'; c.fill(); c.stroke();
      this.cellOutline(x, y, rx * .5, ry * .48, seed); c.fillStyle = rgb(mix([241,247,231],[224,150,177],p.anthocyanins)); c.fill();
      this.peripheralPlastids(x, y, rx, ry, seed, 4, 3.8, p);
    }
    // Air-space tracers remain outside the cells; motion is deliberately magnified.
    for(let i=0;i<24;i++){const x=-190+(i*43%380), y=17+((i*29+this.time*4)%85); if (Math.abs(Math.sin(x*.045))>.65) this.ellipse(x,y,1.5,1.5,'#eef9dcaa');}
    this.label(t('上表皮'), -125, -180, [-125, -132], 100);
    this.label(t('叶肉细胞'), 133, -181, [133, -62], 120);
    this.label(t('细胞间隙'), 80, 161, [68, 64], 125);
    this.label(t('下表皮'), -139, 161, [-139, 123], 100);
    c.restore();
    const entry=SCALE_ENTRIES[1], saved=this.labelsVisible;
    c.save();c.translate(entry.x,entry.y);c.scale(entry.size,entry.size);
    this.labelsVisible=Math.abs(this.position-2)<.14;
    this.cell(p);
    c.restore();this.labelsVisible=saved;
  }
  private cell(p: Pigments) {
    const c = this.ctx;
    c.save();
    if(this.kind==='yellow')c.globalAlpha*=1-smooth(2.15,2.8,this.position);
    this.cellOutline(0,-2,171,134,1.4,.85);
    const cytoplasm=c.createLinearGradient(-60,-130,70,130);
    cytoplasm.addColorStop(0,'#e5eed2');cytoplasm.addColorStop(1,'#dce8ca');
    c.fillStyle=cytoplasm;c.fill();c.lineWidth=5;c.strokeStyle='#c4d3ad';c.stroke();
    c.lineWidth=1.1;c.strokeStyle='#809c70';c.stroke();
    this.cellOutline(0,-2,166,129,1.4,.85);c.strokeStyle='#f7f9ed';c.lineWidth=1.3;c.stroke();
    this.vacuole(p);
    for (let i=0;i<16;i++) {
      if(i===6||i===14)continue;
      const a=i*Math.PI*2/16+.035*Math.sin(i*2.7);
      const [dx,dy]=this.cellEdge(a,171,134,1.4,.85);
      const before=this.cellEdge(a-.02,171,134,1.4,.85),after=this.cellEdge(a+.02,171,134,1.4,.85);
      this.plastid(dx*.84,-2+dy*.84,15.5+1.5*Math.sin(i*1.9),p,Math.atan2(after[1]-before[1],after[0]-before[0]));
    }
    for (let i=0;i<48;i++) {
      const a=i*2.399, r=.75+(i%5)*.017;
      const [x,y]=this.cellEdge(a,171,134,1.4,.85);
      if(Math.hypot(x*r+113,y*r-74)>26) this.ellipse(x*r,y*r-2,.65+i%2*.25,.65,'#6c95602b');
    }
    this.cellOutline(-113,72,22,19,.7);c.fillStyle='#e2dcea';c.fill();c.strokeStyle='#a396b3';c.lineWidth=1;c.stroke();
    c.save();c.clip();
    c.strokeStyle='#a99ab970';c.lineWidth=.65;
    for(let i=0;i<3;i++) {
      c.beginPath();
      for(let j=0;j<=40;j++) {const a=j/40*Math.PI*2,x=-113+Math.cos(a)*(11+Math.sin(a*3+i)*4),y=72+Math.sin(a*2+i)*10;j?c.lineTo(x,y):c.moveTo(x,y);}c.stroke();
    }
    this.ellipse(-119,68,5.5,4.7,'#b09bbd');this.ellipse(-120,67,2.6,2,'#c9b8d1');c.restore();
    this.label(t('液泡'), 5, 0, undefined, 100);
    this.label(t('细胞壁'), -137, -175, [-159, -118], 90);
    this.label(t('叶绿体'), 130, -175, [104, -78], 105);
    this.label(t('细胞核'), -118, 170, [-113, 74], 100);
    this.label(this.kind === 'red' && this.season > .4 ? t('花青素积累在液泡中') : t('叶绿素藏在叶绿体里'), 68, 170, [56, this.kind === 'red' && this.season > .4 ? 58 : 103], 180);
    if(this.kind==='red' && this.position>2.86) {
      const saved=this.labelsVisible;this.labelsVisible=true;
      this.label(t('液泡膜'),-75,-107,[-93,-47],90);
      this.label(t('水溶性的花青素'),75,-103,[55,-42],135);
      this.label(t('叶绿体在液泡外'),76,128,[105,81],145);
      this.labelsVisible=saved;
    }
    c.restore();
    c.save();c.translate(...this.organellePoint);c.rotate(this.organelleAngle);c.scale(18/210,18/210);
    const saved=this.labelsVisible;this.labelsVisible=this.kind==='yellow'&&this.position>2.86;
    this.chloroplast(p);this.labelsVisible=saved;c.restore();
  }
  private vacuole(p: Pigments) {
    const c = this.ctx;
    const fill=c.createLinearGradient(-50,-85,70,95);
    fill.addColorStop(0,rgb(mix([247,251,239],[242,183,202],p.anthocyanins)));
    fill.addColorStop(1,rgb(mix([236,246,232],[219,139,171],p.anthocyanins)));
    c.save();c.clip(this.vacuolePath);c.fillStyle=fill;c.fill(this.vacuolePath);
    // Stable, distributed solute symbols. Concentration changes throughout the
    // liquid; neither the pigment field nor a reveal mask expands from a centre.
    for(let i=0;i<160;i++) {
      const a=i*2.399963, r=Math.sqrt((i+.5)/160)*.94;
      const [x,y]=vacuolePoint(a,r);
      const visible=smooth(((i*37)%163)/163-.08,((i*37)%163)/163+.08,p.anthocyanins);
      this.ellipse(x+Math.sin(this.time*.24+i)*.65,y+Math.cos(this.time*.19+i*2)*.5,.6+i%3*.15,.6,`rgba(135,49,88,${visible*.27})`);
    }
    c.restore();c.strokeStyle=rgb(mix([139,169,125],[169,104,138],p.anthocyanins),.75);
    c.lineWidth=1.1;c.stroke(this.vacuolePath);
  }
  private chloroplast(p: Pigments, miniature = false) {
    const c = this.ctx;
    const base = leafRGB({ ...p, anthocyanins: 0 });
    const fill = c.createLinearGradient(0, -100, 0, 100); fill.addColorStop(0, rgb(mix(base, [239, 248, 212], .67))); fill.addColorStop(1, rgb(mix(base, [218, 235, 184], .59)));
    this.ellipse(0, 0, 210, 210*.52, fill, '#789359');
    if(!miniature)for(let i=0;i<72;i++){const a=i*2.399,r=Math.sqrt((i+.5)/72);this.ellipse(Math.cos(a)*r*195,Math.sin(a)*r*97,.8+i%3*.3,.8,'#678c422d');}
    this.ellipse(120,58,26,12,'#f7f3dfcc','#bac58988');
    c.strokeStyle='#719d5f88';c.lineWidth=1;c.beginPath();for(let i=0;i<=50;i++){const a=i/50*Math.PI*2,x=-117+Math.cos(a)*(17+Math.sin(a*3)*5),y=65+Math.sin(a)*10;i?c.lineTo(x,y):c.moveTo(x,y);}c.stroke();
    c.lineWidth = 1; c.strokeStyle = '#8dac6366'; c.beginPath(); c.ellipse(0, 0, 200, 102, 0, 0, Math.PI * 2); c.stroke();
    const membrane = rgb(mix([88, 138, 78], [194, 168, 79], this.season));
    for (let i = 0; i < 5; i++) {
      const x = -144 + i * 70, y = Math.sin(i * 1.7) * 13;
      if (i < 4) { c.strokeStyle = membrane; c.lineWidth = 3; c.beginPath(); c.moveTo(x, y + 13); c.bezierCurveTo(x + 30, y + 22, x + 48, y - 18, x + 70, Math.sin((i + 1) * 1.7) * 13); c.stroke(); }
      c.save(); c.globalAlpha *= 1 - .2 * smooth(.65, 1, this.season);
      for (let j = 0; j < 6; j++) {
        // Flat membrane sections, not glossy piles of 3D disks.
        const width=49+Math.sin(i*2.1+j*.7)*3, yy=y+29-j*11;
        c.beginPath();c.roundRect(x-width/2,yy-3.5,width,7,3.5);
        c.fillStyle=membrane;c.fill();c.strokeStyle='#779853';c.lineWidth=.8;c.stroke();
        c.beginPath();c.moveTo(x-width/2+4,yy-1);c.lineTo(x+width/2-4,yy-1);c.strokeStyle='#edf1c477';c.lineWidth=.8;c.stroke();
        if(!miniature)for (let k = 0; k < 6; k++) {
          const threshold = ((i * 37 + j * 13 + k * 19) % 97) / 97;
          const alpha = smooth(threshold - .09, threshold + .09, p.chlorophyll);
          this.ellipse(x - 20 + k * 8, yy, 1.7, 1.7, `rgba(33,108,45,${alpha})`);
        }
        if(!miniature)this.ellipse(x - 13 + (j % 3) * 13, yy+1.3, 1.8, 1.8, `rgba(237,170,27,${.4 + p.carotenoids * .8})`);
      }
      c.restore();
    }
    // Light/energy markers end at pigment-bearing membranes; pigments remain bound there.
    if(!miniature && this.season<.94) for(let i=0;i<5;i++){
      const u=(this.time*.28+i*.2)%1, x=-144+i*70, targetY=Math.sin(i*1.7)*13-24;
      const y=-105+(targetY+105)*u;
      const glow=c.createRadialGradient(x,y,0,x,y,9);glow.addColorStop(0,i%2?'#fff4a9cc':'#a7d9ffbb');glow.addColorStop(1,'#fffbd000');
      c.save();c.globalAlpha=(1-u)*p.chlorophyll;this.ellipse(x,y,9,9,glow);c.restore();
    }
    if(miniature)return;
    this.label(t('叶绿体包膜'), -129, -148, [-172, -66], 135);
    this.label(t('类囊体膜'), 110, -148, [76, -32], 125);
    this.ellipse(-184, 150, 4, 4, '#2f803e'); this.label(t('叶绿素'), -128, 150, undefined, 90);
    this.ellipse(5, 150, 4, 4, '#dca526'); this.label(t('类胡萝卜素'), 88, 150, undefined, 155);
    if (this.kind === 'red' && this.season > .4) this.label(t('红色花青素在液泡，不在这里'), 0, 180, undefined, 360);
  }
  dispose() { this.disposed = true; cancelAnimationFrame(this.frame); this.observer.disconnect(); this.intersection.disconnect(); document.removeEventListener('visibilitychange', this.wake); }
}
