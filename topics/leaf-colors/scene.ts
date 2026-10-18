import { leafRGB, mix, pigmentsAt, rgb, smooth, scaleCamera, SCALE_ENTRIES, leafSectionAt, LEAF_SECTION, cellEdge, VACUOLE, vacuolePoint, epidermisBoundary, BLADE_ANGLE, LEAF_METRIC, UNITS_PER_UM, SECTION_TURN_END, metricScaleBar } from './model.ts';
import type { LeafKind, Pigments, ScaleEntry } from './model.ts';
import { t } from './i18n.ts';
import { leafLifeAt, leafPoint } from './lifecycle.ts';
import { waterAt, BLADE_WATER_ROUTE } from '../plant-water/model.ts';
import { createLeafMotion } from './leafMotion.ts';
import { BladeArtwork } from './bladeArtwork.ts';
import { EpidermisSurface } from './epidermis.ts';

type Point = [number, number];
export class LeafScene {
  private academic = false;
  private showLabels = true;
  private surface = new EpidermisSurface();
  private upperCellEdges: number[] = [];
  private plastidPlate = document.createElement('canvas');
  private plastidKey = '';
  private bladeArt = new BladeArtwork();
  private bladeKey = '';
  private leafMotion = createLeafMotion();
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
  private motionPreference = matchMedia('(prefers-reduced-motion: reduce)');
  private reducedMotion = this.motionPreference.matches;
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
    const patch = SCALE_ENTRIES[0];
    const bladePointAt = (x: number, y = 0): Point => {
      const wx = patch.x + x * patch.size, wy = patch.y + y * patch.size;
      return [wx * Math.cos(-BLADE_ANGLE) - wy * Math.sin(-BLADE_ANGLE), wx * Math.sin(-BLADE_ANGLE) + wy * Math.cos(-BLADE_ANGLE)];
    };
    this.upperCellEdges = this.surface.seam(
      bladePointAt(LEAF_SECTION.left), bladePointAt(LEAF_SECTION.right))
      .map(u => LEAF_SECTION.left + (LEAF_SECTION.right - LEAF_SECTION.left) * u);
    this.observer = new ResizeObserver(() => this.resize());
    this.observer.observe(canvas);
    this.resize();
    this.intersection = new IntersectionObserver(entries => { this.visible = entries[0].isIntersecting; this.wake(); });
    this.intersection.observe(canvas);
    document.addEventListener('visibilitychange', this.wake);
    this.motionPreference.addEventListener('change', this.preferenceChanged);
    this.wake();
  }
  setAcademic(academic: boolean) { if(this.academic !== academic){this.academic = academic;this.render();} }
  setLabels(enabled: boolean) { this.showLabels = enabled; this.render(); }
  setMotion(enabled: boolean) { this.motion = enabled; this.wake(); }
  setLife(age: number, waterVisible = false, waterProgress = 0) {
    waterVisible &&= leafLifeAt(age).waterAvailable;
    this.lifeDirty ||= age !== this.age || waterVisible !== this.waterVisible || waterProgress !== this.waterProgress;
    this.age = age; this.waterVisible = waterVisible; this.waterProgress = waterProgress;
  }
  private wake = () => {
    if (!this.disposed && !document.hidden && this.visible && !this.frame) { this.previous = performance.now(); this.frame = requestAnimationFrame(this.animate); }
  };
  private preferenceChanged = () => { this.reducedMotion = this.motionPreference.matches; this.wake(); };
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
    const life = leafLifeAt(this.age), hasActivity = this.position > .9 || (life.recovery > .01 && life.separation < 1 && this.position < .2);
    const active = this.motion && !this.reducedMotion && hasActivity && life.growth > .9 && life.fall === 0;
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
    // Fit the whole blade and its petiole, then let the branch meet the lower
    // edge. The title and hint occupy the side corners, not a central band.
    const verticalReserve = Math.min(75, Math.max(22, this.height * .08));
    this.scale = Math.min((this.width - 24) / 470, Math.max(1, this.height - verticalReserve) / 450);
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
    const tracked = leafPoint(originalCamera.x, originalCamera.y, this.age), follow = smooth(0, .18, this.position);
    const camera = { ...originalCamera, x: originalCamera.x * (1 - follow) + tracked.x * follow, y: originalCamera.y * (1 - follow) + tracked.y * follow, angle: originalCamera.angle + life.rotation * follow, magnification: originalCamera.magnification / (1 - follow + life.size * follow) };
    // Narrow canvases need breathing room around the complete sampled cell.
    const detailBoost = .18 + .2 * smooth(420,760,this.width);
    const sceneScale = this.scale * camera.magnification * (1 + detailBoost * smooth(SECTION_TURN_END, 2, this.position));
    const frameY = this.height * (.46 + .08 * smooth(.2, 1, this.position));
    const entries: ScaleEntry[] = [...SCALE_ENTRIES, destination];
    const section = leafSectionAt(this.position), patch = entries[0];
    this.labels = [];
    c.save(); c.translate(this.width / 2, frameY); c.scale(sceneScale, sceneScale); c.rotate(-camera.angle); c.translate(-camera.x, -camera.y);
    if (this.position < 1.1) {
      c.save(); c.globalAlpha *= 1 - smooth(.25, 1.1, this.position);
      this.branch();
      if (life.separation > 0) { c.beginPath(); c.ellipse(19, 251, 7, 3.5, -.1, 0, Math.PI * 2); c.fillStyle = '#d0ba8d'; c.globalAlpha *= life.separation; c.fill(); }
      c.restore();
    }
    // The blade, its cutaway anchors and every nested compartment share one
    // lifetime transform. The branch stays put when the same leaf detaches.
    c.translate(19 + life.x, 246 + life.y); c.rotate(life.rotation); c.scale(life.size * life.unfold, life.size); c.translate(-19, -246);
    // Every detail stays at the same location in one nested world. Reversing the
    // slider reverses the same camera, rather than starting another dissolve.
    const drawNested = (depth: number) => {
      this.labelsVisible = depth === 0 ? this.position < .06 : Math.abs(this.position - depth) < .14;
      c.save();
      if (depth === 0) {
        c.globalAlpha *= section.bladeOpacity;
        // First approach a continuous epidermal sheet across the whole blade.
        // Isolate its sample only during the turn, keeping every cell registered.
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
        const cut = smooth(.48,.66,this.position) * (1-smooth(.94,1.1,this.position));
        if (cut > 0) {
          c.save(); c.translate(patch.x,patch.y); c.scale(patch.size,patch.size);
          c.globalAlpha *= cut; c.strokeStyle = '#345d486b'; c.lineWidth = .8;
          c.setLineDash([4,4]); c.stroke(this.surfacePath); c.restore();
        }
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
    // tiny parent clipping mask. Use screen units so zoom cannot enlarge the
    // typography or push a caption beyond the canvas. Anatomy stays fixed.
    const dpr = this.canvas.width / this.width;
    for (const label of this.labels) {
      const point = label.matrix.transformPoint(new DOMPoint(label.x,label.y));
      const anchor = label.anchor && label.matrix.transformPoint(new DOMPoint(...label.anchor));
      c.save();c.setTransform(dpr,0,0,dpr,0,0);
      this.drawLabel(label.text,point.x/dpr,point.y/dpr,anchor && [anchor.x/dpr,anchor.y/dpr],Math.min(label.width,this.width-32));
      c.restore();
    }
    const pixelsPerUm = sceneScale * life.size * UNITS_PER_UM;
    const bar = metricScaleBar(pixelsPerUm,this.width<600?72:100);
    const bx = this.width-24-bar.pixels, by = this.width<600?111:94;
    c.save(); c.setTransform(dpr,0,0,dpr,0,0);
    c.fillStyle='#f6f8ebee'; c.fillRect(bx-9,by-35,bar.pixels+18,48);
    c.fillStyle='#304b35'; c.font='12px -apple-system, sans-serif'; c.textAlign='center';
    c.fillText(t('示意标尺'),bx+bar.pixels/2,by-20); c.fillText(bar.label,bx+bar.pixels/2,by-5);
    c.strokeStyle='#304b35'; c.lineWidth=1.3; c.beginPath(); c.moveTo(bx,by+3); c.lineTo(bx+bar.pixels,by+3);
    c.moveTo(bx,by);c.lineTo(bx,by+6);c.moveTo(bx+bar.pixels,by);c.lineTo(bx+bar.pixels,by+6);c.stroke();c.restore();
    this.canvas.dataset.scaleBarUm=String(bar.lengthUm); this.canvas.dataset.scaleBarPixels=String(bar.pixels);
    this.canvas.dataset.modelThicknessUm=String(LEAF_METRIC.thicknessUm);
    this.canvas.dataset.pixelsPerUm=String(pixelsPerUm);
    const onSurface=Math.abs(this.position-.5)<.08;
    const depth = onSurface ? 0 : Math.min(2, Math.round(this.position));
    let x = 0, y = 0, size = 1;
    for (let i = 0; i <= depth; i++) { x += entries[i].x * size; y += entries[i].y * size; size *= entries[i].size; }
    if(onSurface)y-=110*entries[0].size;
    const sample = leafPoint(x, y, this.age);
    this.hotspot.style.left = `${this.width / 2 + ((sample.x-camera.x)*Math.cos(camera.angle)+(sample.y-camera.y)*Math.sin(camera.angle))*sceneScale}px`;
    this.hotspot.style.top = `${frameY + (-(sample.x-camera.x)*Math.sin(camera.angle)+(sample.y-camera.y)*Math.cos(camera.angle))*sceneScale}px`;
    this.hotspot.hidden = !life.microscopyAvailable || this.position > 2.15 || (!onSurface && Math.abs(this.position - Math.round(this.position)) > .12);
    this.canvas.dataset.scale = this.position.toFixed(4);
    this.canvas.dataset.camera = `${camera.x.toFixed(6)},${camera.y.toFixed(6)},${camera.magnification.toFixed(6)}`;
    this.canvas.dataset.leafAge = this.age.toFixed(4);
    this.canvas.dataset.leafIdentity = 'branch-leaf-01';
    this.canvas.dataset.sectionAngle = section.angle.toFixed(6);
    this.canvas.dataset.surfaceField = 'whole-blade';
    this.canvas.dataset.surfaceDetail = section.textureOpacity.toFixed(4);
    this.canvas.dataset.surfaceContext = section.contextOpacity.toFixed(4);
    this.canvas.dataset.anatomyRenderer = 'continuous-canvas';
    this.canvas.dataset.leafPose = this.bladeKey;
  }
  private branch() {
    const c = this.ctx;
    const bark = c.createLinearGradient(0, 235, 0, 269);
    bark.addColorStop(0, '#b29b78'); bark.addColorStop(.32, '#95825e');
    bark.addColorStop(.7, '#72684e'); bark.addColorStop(1, '#504d3d');
    c.beginPath(); c.moveTo(-330, 284); c.bezierCurveTo(-151, 253, 84, 230, 330, 213);
    c.lineTo(330, 234); c.bezierCurveTo(77, 252, -156, 281, -330, 309); c.closePath();
    c.save(); c.fillStyle = bark; c.fill(); c.clip();
    for (let i = 0; i < 53; i++) {
      const x = -324 + (i * 97 % 650), offset = Math.sin(i * 3.7) * 8;
      const y = 252 - x * .112 + offset, length = 12 + (i * 19 % 39);
      c.beginPath(); c.moveTo(x, y);
      c.bezierCurveTo(x + length * .3, y - .5, x + length * .64, y - 3.5, x + length, y - length * .108);
      c.strokeStyle = i % 3 ? '#c7b28d36' : '#45493640'; c.lineWidth = .55 + (i % 4) * .2; c.stroke();
      if (i % 4 === 0) {
        c.beginPath(); c.ellipse(x + 6, y + 2, 2.2 + i % 3, .7, -.1, 0, Math.PI * 2);
        c.fillStyle = '#c6b18c88'; c.fill();
      }
    }
    // A small swollen node and contact shading seat the petiole in the twig.
    const node = c.createRadialGradient(17, 244, 1, 19, 249, 15);
    node.addColorStop(0, '#c2b38b9c'); node.addColorStop(.45, '#6c705c48'); node.addColorStop(1, '#56604700');
    c.fillStyle = node; c.fillRect(3, 234, 34, 30); c.restore();
  }
  private waterOnLeaf(active: number) {
    const c = this.ctx, p = this.waterProgress;
    c.save(); c.globalAlpha *= active;
    c.beginPath(); BLADE_WATER_ROUTE.forEach(([,x,y],i) => i ? c.lineTo(x,y) : c.moveTo(x,y));
    c.strokeStyle = '#388b9c75'; c.lineWidth = 3; c.setLineDash([3, 6]); c.stroke(); c.setLineDash([]);
    // The selected water cohort appears here only when the root-to-leaf model
    // reaches its leaf stage. Hollow markers distinguish vapour from liquid.
    if (p >= .61) {
      const state = waterAt(p), evaporation = state.vapour, x = state.bladeX, y = state.bladeY;
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
    const fontSize = this.width < 600 ? 13 : 14, lineHeight = Math.ceil(fontSize * 1.35);
    c.font = `${fontSize}px -apple-system, BlinkMacSystemFont, sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle';
    const words = text.includes(' ') ? text.split(' ') : [...text]; let line = ''; const lines: string[] = [];
    for (const word of words) { const next = line + (line && text.includes(' ') ? ' ' : '') + word; if (c.measureText(next).width > width && line) { lines.push(line); line = word; } else line = next; }
    if (line) lines.push(line);
    const box = Math.min(width, Math.max(...lines.map(l => c.measureText(l).width))) + 14;
    x=Math.max(12+box/2,Math.min(this.width-12-box/2,x));
    y=Math.max(68,Math.min(this.height-52-lines.length*lineHeight,y));
    if (anchor) { c.beginPath(); c.moveTo(...anchor); c.lineTo(x, y - 5); c.strokeStyle = '#71876b'; c.lineWidth = 1; c.stroke(); this.ellipse(...anchor, 2, 2, '#698365'); }
    c.fillStyle = '#f8faedeb'; c.fillRect(x - box / 2, y - fontSize * .75, box, lines.length * lineHeight + 3);
    c.fillStyle = '#39543b'; lines.forEach((l, i) => c.fillText(l, x, y + i * lineHeight));
  }
  private leaf(p: Pigments) {
    const c = this.ctx, life = leafLifeAt(this.age);
    const pose = this.leafMotion.sample(life.growth, life.fall);
    this.bladeKey = Object.values(pose).map(value => value.toFixed(3)).join(':');
    c.save(); c.rotate(BLADE_ANGLE);
    const micro = smooth(.22,.42,this.position);
    c.fillStyle = rgb(leafRGB(p)); c.fill(this.bladeArt.outline(pose));
    c.save(); c.globalAlpha *= 1-micro;
    this.bladeArt.draw(c, p, pose, life.browning); c.restore();
    const texture = leafSectionAt(this.position).textureOpacity;
    if (texture > 0) {
      c.save(); c.clip(this.bladeArt.outline(pose)); c.globalAlpha *= texture;
      this.surface.draw(c); c.restore();
    }
    const recovery = life.recovery * (1 - life.separation);
    if (recovery > .02 && this.position < .2) {
      // Route markers indicate partial nutrient remobilisation, not molecules.
      c.save(); c.globalAlpha *= recovery;
      for (let i = 0; i < 4; i++) {
        const progress = (this.time * .17 + i / 4) % 1, y = -125 + progress * 355;
        c.beginPath(); c.moveTo(-5, y - 7); c.lineTo(0, y); c.lineTo(5, y - 7);
        c.strokeStyle = '#f7dc87'; c.lineWidth = 2.8; c.lineCap = 'round'; c.stroke();
      }
      c.restore();
      this.label(t('部分养分回到枝条'), -166, -36, [0, 92], 140);
    }
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

  private epidermalRow(edges: readonly number[], color: string) {
    const c = this.ctx;
    // Same surface-wall intersections, continued down the metric cut edge.
    for (let i = 1; i < edges.length; i++) {
      const left = edges[i - 1], right = edges[i];
      const bottom = -113 + 1.5 * Math.sin(i * 2.1), bend = Math.min(2.2, (right - left) * .12);
      c.beginPath(); c.moveTo(left, -148); c.lineTo(right, -148);
      c.bezierCurveTo(right - bend, -139, right + bend, -119, right, bottom);
      c.quadraticCurveTo((left + right) * .5, bottom + 2, left, bottom);
      c.bezierCurveTo(left + bend, -119, left - bend, -139, left, -148); c.closePath();
      c.fillStyle = color; c.fill(); c.strokeStyle = '#9aaf87'; c.lineWidth = .8; c.stroke();
    }
  }
  private tissue(p: Pigments) {
    const c = this.ctx;
    c.save();c.globalAlpha*=1-smooth(1.18,1.92,this.position);
    const body=c.createLinearGradient(0,-145,0,134);body.addColorStop(0,'#e2ead0');body.addColorStop(1,'#f3f3e4');
    c.fillStyle=body;c.fillRect(-217,-145,434,280);
    c.fillStyle = '#c6d8a3'; c.fillRect(-217, -153, 434, 5);
    c.fillStyle = '#f6f7e4'; c.fillRect(-217, -148, 434, 3);
    c.fillStyle = '#c2d0a8'; c.fillRect(-217, 133, 434, 2);
    for (let i = 0; i < 10; i++) {
      c.fillStyle = '#f0f2de'; c.strokeStyle = '#91ab82'; c.lineWidth = 1.1;
      this.cellOutline(-195 + i * 43, 123 + Math.cos(i * 1.5), 19.5, 10.5, i * 2.1 + 4, .7); c.fill(); c.stroke();
    }
    this.epidermalRow(this.upperCellEdges, '#e9eed7');
    for (let i = 0; i < 8; i++) {
      const x = -207 + i * 53, cy = -49 + Math.sin(i * 2.1) * 3, rx = 23.5 + Math.sin(i * 1.7), ry = 54 + Math.cos(i * 2.7) * 4;
      const cellFill=c.createLinearGradient(x,-108,x+48,9);cellFill.addColorStop(0,'#dce8c3');cellFill.addColorStop(1,'#e9efd6'); c.fillStyle = cellFill; c.strokeStyle = '#90aa78';c.lineWidth=1.1;
      this.cellOutline(x + 24, cy, rx, ry, i * 2.3, .72); c.fill(); c.stroke();
      this.cellOutline(x + 24, cy, rx-1.4, ry-1.4, i * 2.3, .72);c.strokeStyle='#fafce8';c.lineWidth=.65;c.stroke();
      this.cellOutline(x + 24, cy, rx * .52, ry * .64, i * 2.3, .72); c.fillStyle = rgb(mix([241,247,231],[224,150,177],p.anthocyanins)); c.fill();
      c.strokeStyle=rgb(mix([157,184,136],[177,123,148],p.anthocyanins),.48);c.lineWidth=.45;c.stroke();
      this.ellipse(x+24+rx*.56,cy+ry*.57,2.8,3.8,'#d0c3db','#a69bb8');
      // Organelles follow the cell's contour within the cytoplasm, outside the liquid compartment.
      this.peripheralPlastids(x + 24, cy, rx, ry, i * 2.3, 6, 5.2, p, .72);
    }
    // Loosely arranged spongy mesophyll leaves connected pale air spaces. The
    // retained cell at SCALE_ENTRIES[1] is deliberately absent from this list.
    const spongy = [
      [-190,37,24,17,-.18],[-123,47,29,19,.16],[-51,31,25,16,-.24],
      [107,36,28,18,.2],[179,50,27,20,-.18],
      [-206,85,23,18,.26],[-153,94,25,16,-.28],[-83,89,28,18,.18],
      [-15,89,24,19,-.2],[57,91,29,18,.13],[133,91,25,17,-.16],[204,94,23,16,.23],
    ];
    spongy.forEach(([x,y,rx,ry,angle], i) => {
      const seed=i*2.2+3;
      c.save();c.translate(x,y);c.rotate(angle);
      const fill=c.createLinearGradient(-rx,-ry,rx,ry);fill.addColorStop(0,'#eaf0d8');fill.addColorStop(1,'#d6e3be');
      this.cellOutline(0,0,rx,ry,seed,.91); c.fillStyle=fill; c.strokeStyle='#8ea879';c.lineWidth=1.1;c.fill();c.stroke();
      this.cellOutline(0,0,rx-1.3,ry-1.3,seed,.91);c.strokeStyle='#fbfce9';c.lineWidth=.65;c.stroke();
      this.cellOutline(0,0,rx*.52,ry*.51,seed,.91);c.fillStyle=rgb(mix([243,248,233],[224,150,177],p.anthocyanins));c.fill();
      c.strokeStyle=rgb(mix([157,184,136],[177,123,148],p.anthocyanins),.4);c.lineWidth=.5;c.stroke();
      this.ellipse(-rx*.49,ry*.33,2.2,2.5,'#d0c3db','#a69bb8');
      this.peripheralPlastids(0,0,rx,ry,seed,4+i%2,3.8,p,.91);c.restore();
    });
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
    const cytoplasm=c.createRadialGradient(-65,-64,4,18,16,205);
    cytoplasm.addColorStop(0,'#f0f4de');cytoplasm.addColorStop(.58,'#e3edce');cytoplasm.addColorStop(1,'#b8cda5');
    c.fillStyle=cytoplasm;c.fill();c.lineWidth=6.5;c.strokeStyle='#c4d3ad';c.stroke();
    c.lineWidth=1.1;c.strokeStyle='#809c70';c.stroke();
    this.cellOutline(0,-2,167,130,1.4,.85);c.strokeStyle='#f7f9ed';c.lineWidth=1.5;c.stroke();
    this.cellOutline(0,-2,163,126,1.4,.85);c.strokeStyle='#8fa778';c.lineWidth=.8;c.stroke();
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
    this.cellOutline(-113,72,22,19,.7);
    const nucleoplasm=c.createRadialGradient(-120,65,2,-111,74,25);
    nucleoplasm.addColorStop(0,'#f1eaf2');nucleoplasm.addColorStop(.6,'#dbd0e4');nucleoplasm.addColorStop(1,'#b2a2c3');
    c.fillStyle=nucleoplasm;c.fill();c.strokeStyle='#a396b3';c.lineWidth=1;c.stroke();
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
    const fill=c.createRadialGradient(-38,-43,3,15,17,150);
    fill.addColorStop(0,rgb(mix([250,253,245],[248,205,218],p.anthocyanins)));
    fill.addColorStop(.65,rgb(mix([238,247,232],[230,158,187],p.anthocyanins)));
    fill.addColorStop(1,rgb(mix([209,229,207],[200,119,155],p.anthocyanins)));
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
    c.save();c.clip(this.vacuolePath);c.translate(-.6,-.8);
    c.strokeStyle='#ffffff80';c.lineWidth=.8;c.stroke(this.vacuolePath);c.restore();
  }
  private chloroplast(p: Pigments, miniature = false) {
    const c = this.ctx;
    const base = leafRGB({ ...p, anthocyanins: 0 });
    const fill = c.createLinearGradient(0, -100, 0, 100); fill.addColorStop(0, rgb(mix(base, [239, 248, 212], .67))); fill.addColorStop(1, rgb(mix(base, [218, 235, 184], .59)));
    this.ellipse(0, 0, 210, 210*.52, fill, '#789359');
    c.strokeStyle='#f5f9da';c.lineWidth=1.5;c.beginPath();c.ellipse(-1,-1,206,105,0,0,Math.PI*2);c.stroke();
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
      c.save();c.globalAlpha=(1-u)*p.chlorophyll;
      c.beginPath();c.moveTo(x-2,y-5);c.lineTo(x+1,y-1);c.lineTo(x-1,y+1);c.lineTo(x+2,y+5);
      c.strokeStyle=i%2?'#d9b957':'#70a8ba';c.lineWidth=1.2;c.stroke();c.restore();
    }
    if(miniature)return;
    this.label(t('叶绿体包膜'), -129, -148, [-172, -66], 135);
    this.label(t('类囊体膜'), 110, -148, [76, -32], 125);
    this.ellipse(-184, 150, 4, 4, '#2f803e'); this.label(t('叶绿素'), -128, 150, undefined, 90);
    this.ellipse(5, 150, 4, 4, '#dca526'); this.label(t('类胡萝卜素'), 88, 150, undefined, 155);
    if (this.kind === 'red' && this.season > .4) this.label(t('红色花青素在液泡，不在这里'), 0, 180, undefined, 360);
  }
  dispose() { this.disposed = true; cancelAnimationFrame(this.frame); this.leafMotion.dispose(); this.surface.dispose(); this.observer.disconnect(); this.intersection.disconnect(); document.removeEventListener('visibilitychange', this.wake); this.motionPreference.removeEventListener('change', this.preferenceChanged); }
}
