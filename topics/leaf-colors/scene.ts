import { leafRGB, mix, pigmentsAt, rgb, smooth, scaleCamera, SCALE_ENTRIES, CHLOROPLAST_ENTRY, leafSectionAt, LEAF_SECTION, SECTION_SPAN, sectionContextTiles, cellEdge, mesophyllCellEdge, MESOPHYLL_PLASTIDS, VACUOLE, vacuolePoint, BLADE_ANGLE, LEAF_METRIC, UNITS_PER_UM, SECTION_TURN_END, metricScaleBar } from './model.ts';
import type { LeafKind, Pigments, ScaleEntry } from './model.ts';
import { t } from './i18n.ts';
import { leafLifeAt, leafPoint } from './lifecycle.ts';
import { waterAt, BLADE_WATER_ROUTE } from '../plant-water/model.ts';
import { createLeafMotion } from './leafMotion.ts';
import { BladeArtwork } from './bladeArtwork.ts';
import { EpidermisSurface } from './epidermis.ts';
import { palisadeBand, mesophyllBand, mesophyllContacts, contourPoint, type MesophyllCell } from './mesophyllGeometry.ts';

type Point = [number, number];
interface MesophyllArtwork {
  outlines:Path2D[];
  plastids:Array<{x:number;y:number;angle:number;size:number;opacity:number}>;
  nucleus:readonly[number,number]|null;
  tone:number;
}
// A connected membrane section, with stable variation rather than identical
// columns. Fine membrane spacing and pigment symbols remain illustrative.
const GRANA = [
  [-151,-22,31,9,-.13],[-104,-48,35,11,.08],[-56,-10,41,12,-.08],
  [-6,-50,34,10,.1],[42,-12,37,13,-.06],[94,-43,35,9,.11],[149,-13,30,10,-.12],
  [-139,38,32,8,.12],[-87,54,35,10,-.1],[-25,35,43,11,.06],
  [37,51,36,10,-.06],[99,29,39,12,.07],[153,41,30,8,-.11],
] as const;
const LAMELLAE = [[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[7,8],[8,9],[9,10],[10,11],[11,12],[0,7],[2,8],[3,9],[4,10],[5,11],[6,12]] as const;
export class LeafScene {
  private academic = false;
  private showLabels = true;
  private surface = new EpidermisSurface();
  private rearSurface = document.createElement('canvas');
  private upperCellEdges = new Map<string,readonly number[]>();
  private mesophyllArt = new WeakMap<MesophyllCell['contour'],MesophyllArtwork>();
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
  private vacuolePath = new Path2D();
  private mesophyllWall = new Path2D();
  private mesophyllInnerWall = new Path2D();
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
      const wall=mesophyllCellEdge(i/96*Math.PI*2);
      for(const [path,r] of [[this.mesophyllWall,1],[this.mesophyllInnerWall,.987]] as const) {
        const x=wall[0]*r,y=-2+wall[1]*r;
        if(i)path.lineTo(x,y);else path.moveTo(x,y);
      }
    }
    this.vacuolePath.closePath();
    this.mesophyllWall.closePath();this.mesophyllInnerWall.closePath();
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
    // Keep the vacuole's parent wall in frame on narrow screens. This adjusts
    // camera framing only; no compartment geometry or model length changes.
    return this.kind === 'red' ? { x: VACUOLE.x, y: VACUOLE.y, size: .92, angle: 0 } : CHLOROPLAST_ENTRY;
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
    // The expanded desktop explanation panel can leave a tall, narrow stage.
    // Fit the 420-unit organelle with the same uniform framing at every deeper
    // scale. This does not stretch anatomy or alter the fixed-magnification turn.
    const detailFit=Math.min(1,(this.width-(this.width<480?32:48))/(this.scale*420*(1+detailBoost)));
    const sceneScale = this.scale * camera.magnification * (1 + detailBoost * smooth(SECTION_TURN_END, 2, this.position)) * (1-(1-detailFit)*smooth(1,2,this.position));
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
        c.transform(...section.surfaceTransform);
      }
      const p=pigmentsAt(this.season,this.kind);
      if (depth===0 && section.bladeOpacity>0 && section.surfaceScale>1e-6) {
        // The rear half-plane stays attached to its full-width cut edge.
        // Remove only the foreground that would conceal the tissue; never
        // isolate a rectangular sample or fade all surrounding leaf material.
        if(section.angle>0)this.rearLeaf(p,patch.y);
        else {
          c.save(); c.beginPath(); c.rect(-1000,-1000,2000,1000+patch.y); c.clip();
          this.leaf(p); c.restore();
        }
        if (section.foregroundOpacity>0) {
          c.save(); c.beginPath(); c.rect(-1000,patch.y,2000,1000); c.clip();
          c.globalAlpha*=section.foregroundOpacity; this.leaf(p); c.restore();
        }
        if (section.guideOpacity>0) {
          c.save(); c.rotate(BLADE_ANGLE);
          c.clip(this.bladeArt.outline(this.leafMotion.sample(life.growth,life.fall))); c.rotate(-BLADE_ANGLE);
          const unit=sceneScale*life.size;
          c.globalAlpha*=section.guideOpacity; c.strokeStyle='#f3e9b6'; c.lineWidth=1.3/unit;
          c.setLineDash([5/unit,4/unit]); c.beginPath();c.moveTo(-400,patch.y);c.lineTo(400,patch.y);c.stroke();c.restore();
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
    this.canvas.dataset.surfaceContext = section.bladeOpacity.toFixed(4);
    this.canvas.dataset.foregroundOpacity = section.foregroundOpacity.toFixed(4);
    this.canvas.dataset.sectionContext = 'continuous-leaf';
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
  private rearLeaf(p:Pigments,cutY:number) {
    // A soft viewing window removes distant surface detail before the entire
    // macroscopic blade becomes edge-on. Geometry and magnification are intact;
    // this is an illustrative focus cue, not a calibrated optical depth of field.
    const target=this.ctx, plate=this.rearSurface;
    if(plate.width!==this.canvas.width||plate.height!==this.canvas.height) {
      plate.width=this.canvas.width;plate.height=this.canvas.height;
    }
    const layer=plate.getContext('2d')!;
    layer.setTransform(1,0,0,1,0,0);layer.globalCompositeOperation='source-over';layer.clearRect(0,0,plate.width,plate.height);
    layer.setTransform(target.getTransform());layer.save();layer.beginPath();layer.rect(-1000,-1000,2000,1000+cutY);layer.clip();
    try {this.ctx=layer;this.leaf(p);} finally {this.ctx=target;layer.restore();}
    const weight=smooth(.60,.72,this.position);
    const fade=layer.createLinearGradient(0,cutY-600*UNITS_PER_UM,0,cutY-150*UNITS_PER_UM);
    fade.addColorStop(0,`rgba(0,0,0,${1-weight})`);fade.addColorStop(1,'#000');
    layer.globalCompositeOperation='destination-in';layer.fillStyle=fade;layer.fillRect(-1000,-1000,2000,2000);
    target.save();target.setTransform(1,0,0,1,0,0);target.drawImage(plate,0,0);target.restore();
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
    // Anatomy labels share screen coordinates with the model scale bar. Keep
    // right-hand labels below its reserved box, including long mobile English.
    const barTop=this.width<600?76:59,barBottom=this.width<600?124:107;
    if(x+box/2>this.width-(this.width<600?114:142) && y-fontSize*.75<barBottom && y+lines.length*lineHeight+3>barTop)
      y=barBottom+fontSize*.75+12;
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
  private sectionEdges(first:number,last:number) {
    const key=`${first}:${last}`;
    let edges=this.upperCellEdges.get(key);
    if (!edges) {
      const patch=SCALE_ENTRIES[0];
      const left=LEAF_SECTION.left+first*SECTION_SPAN,right=LEAF_SECTION.right+last*SECTION_SPAN;
      const bladePointAt=(x:number):Point=>{
        const wx=patch.x+x*patch.size,wy=patch.y;
        return [wx*Math.cos(-BLADE_ANGLE)-wy*Math.sin(-BLADE_ANGLE),wx*Math.sin(-BLADE_ANGLE)+wy*Math.cos(-BLADE_ANGLE)];
      };
      edges=this.surface.seam(bladePointAt(left),bladePointAt(right)).map(u=>left+(right-left)*u);
      if(this.upperCellEdges.size>=16)this.upperCellEdges.delete(this.upperCellEdges.keys().next().value!);
      this.upperCellEdges.set(key,edges);
    }
    return edges;
  }
  private tissuePalette(p:Pigments) {
    // A transmitted-light-inspired illustration, not a calibrated microscope
    // image. Green stays in plastids; clear cell sap is not green pigment.
    return {
      light:'#edf0dc',
      body:'#dfe7cd',
      edge:'#d0ddbf',
      liquid:rgb(mix([231,237,215],[232,176,194],p.anthocyanins)),
    };
  }
  private epidermalRow(edges: readonly number[], color: string) {
    const c = this.ctx;
    // Same surface-wall intersections, continued down the metric cut edge.
    for (let i = 1; i < edges.length; i++) {
      const left = edges[i - 1], right = edges[i];
      const seed=Math.round((left+right)*500000)/1000000;
      const bottom = -113 + 1.5 * Math.sin(seed*.127), bend = Math.min(2.2, (right - left) * .12);
      c.beginPath(); c.moveTo(left, -148); c.lineTo(right, -148);
      c.bezierCurveTo(right - bend, -139, right + bend, -119, right, bottom);
      c.quadraticCurveTo((left + right) * .5, bottom + 2, left, bottom);
      c.bezierCurveTo(left + bend, -119, left - bend, -139, left, -148); c.closePath();
      c.fillStyle = color; c.fill(); c.strokeStyle = '#889778'; c.lineWidth = .55; c.stroke();
    }
  }
  private tissue(p: Pigments) {
    const c=this.ctx, inverse=c.getTransform().inverse();
    const xs=[[0,0],[this.canvas.width,0],[0,this.canvas.height],[this.canvas.width,this.canvas.height]]
      .map(([x,y])=>inverse.transformPoint(new DOMPoint(x,y)).x);
    const left=Math.min(...xs)-2,right=Math.max(...xs)+2;
    c.save(); c.beginPath();c.rect(left,LEAF_SECTION.top,right-left,LEAF_SECTION.bottom-LEAF_SECTION.top);c.clip();
    if(this.position<2.15) {
    c.save();c.globalAlpha*=1-smooth(1.45,2.15,this.position);
    // The spaces transmit light rather than looking like deep, opaque trenches.
    // Their shape comes from real contour separation, not a painted gap layer.
    const body=c.createLinearGradient(0,-145,0,134);body.addColorStop(0,'#d5dfc3');body.addColorStop(.55,'#c5d3b5');body.addColorStop(1,'#dce3ce');
    c.fillStyle=body;c.fillRect(left,-145,right-left,280);
    c.fillStyle='#a3b382';c.fillRect(left,-153,right-left,3);
    c.fillStyle='#d8e1bc';c.fillRect(left,-150,right-left,2);
    c.fillStyle='#9eaf83';c.fillRect(left,133,right-left,1);
    const tiles=sectionContextTiles(left-32,right+32);
    // One seam across the complete visible cut: band boundaries cannot invent
    // extra epidermal walls or restart the shape of an already visible cell.
    this.epidermalRow(this.sectionEdges(tiles[0],tiles[tiles.length-1]), '#dce4c7');
    for(const tile of tiles) {
      c.save();c.translate(tile*SECTION_SPAN,0);
      for (let i = 0; i < 10; i++) {
        const id=i+tile*10;
        c.fillStyle = '#dce4c9'; c.strokeStyle = '#8b9d7b'; c.lineWidth = .55;
        this.cellOutline(-195 + i * 43, 123 + Math.cos(id * 1.5), 19.5, 10.5, id * 2.1 + 4, .7); c.fill(); c.stroke();
      }
      for (const cell of palisadeBand(tile)) this.mesophyllCell(cell,p);
      for (const cell of mesophyllBand(tile)) if (!cell.selected) this.mesophyllCell(cell,p);
      c.restore();
    }
    // Both contours own each contact segment. This line identifies their shared
    // wall; it does not paint a connector across an air-filled gap.
    c.strokeStyle='#7f9471';c.lineWidth=.3;
    for(const tile of tiles) {
      c.save();c.translate(tile*SECTION_SPAN,0);
      for(const contact of mesophyllContacts(tile)) {
        c.beginPath();c.moveTo(...contact.points[0]);c.lineTo(...contact.points[1]);c.stroke();
      }
      c.restore();
    }
    this.label(t('上表皮'), -125, -180, [-125, -132], 100);
    this.label(t('叶肉细胞'), 133, -181, [133, -62], 120);
    this.label(t('细胞间隙 · 含空气'), 80, 161, [110, 72], 150);
    this.label(t('下表皮'), -139, 161, [-139, 123], 100);
    c.restore();
    }
    const entry=SCALE_ENTRIES[1], saved=this.labelsVisible;
    c.save();c.translate(entry.x,entry.y);c.scale(entry.size,entry.size);
    this.labelsVisible=Math.abs(this.position-2)<.14;
    this.cell(p);
    c.restore();this.labelsVisible=saved;
    c.restore();
  }
  private mesophyllCell(cell:MesophyllCell,p:Pigments) {
    const c=this.ctx, palette=this.tissuePalette(p);
    let art=this.mesophyllArt.get(cell.contour);
    if(!art) {
      const seed=cell.contour.reduce((sum,[x,y],i)=>sum+(x+y*.71)*Math.sin(i*.39),0);
      const tone=.5+.5*Math.sin(seed*.17);
      const outlines=[1,.987,.73+.055*Math.sin(seed)].map(factor=>{
        const path=new Path2D();cell.contour.forEach(([x,y],i)=>i?path.lineTo(x*factor,y*factor):path.moveTo(x*factor,y*factor));path.closePath();return path;
      });
      const lengths=cell.contour.map(([x,y],i)=>{const next=cell.contour[(i+1)%cell.contour.length];return Math.hypot(next[0]-x,next[1]-y);});
      const perimeter=lengths.reduce((sum,length)=>sum+length,0);
      const count=Math.max(9,Math.min(27,Math.round(perimeter/8.2)));
      const plastids=Array.from({length:count},(_,i)=>{
        // Arc length avoids piling equal-angle samples at a long profile's ends.
        let distance=(((i+.5+.29*Math.sin(seed+i*1.7))/count+tone*.13)%1)*perimeter;
        let segment=0;while(segment<lengths.length-1&&distance>lengths[segment])distance-=lengths[segment++];
        const from=cell.contour[segment],to=cell.contour[(segment+1)%cell.contour.length],u=lengths[segment]?distance/lengths[segment]:0,
          radius=.86+.035*Math.sin(seed+i*2.13),x=(from[0]+(to[0]-from[0])*u)*radius,y=(from[1]+(to[1]-from[1])*u)*radius;
        return {x,y,size:2.4+.48*Math.sin(seed*.7+i*1.9),opacity:.57+.4*(.5+.5*Math.sin(seed+i*2.3)),angle:Math.atan2(to[1]-from[1],to[0]-from[0])};
      });
      // A thin optical section need not pass through every cell's nucleus.
      art={outlines,plastids,tone,nucleus:tone>.94?contourPoint(cell.contour,2.57+.5*Math.sin(seed),.67):null};
      this.mesophyllArt.set(cell.contour,art);
    }
    c.save();c.translate(cell.x,cell.y);
    const fill=c.createLinearGradient(-20,-25,25,28);fill.addColorStop(0,rgb(mix([234,239,216],[218,230,201],art.tone*.32)));fill.addColorStop(1,palette.body);
    c.fillStyle=fill;c.fill(art.outlines[0]);c.strokeStyle='#879a75';c.lineWidth=.42;c.stroke(art.outlines[0]);
    c.strokeStyle='#f2f2db9c';c.lineWidth=.19;c.stroke(art.outlines[1]);
    c.save();c.clip(art.outlines[1]);
    c.fillStyle=palette.liquid;c.globalAlpha*=.36+.5*p.anthocyanins;c.fill(art.outlines[2]);c.restore();
    c.save();c.clip(art.outlines[1]);
    for(const plastid of art.plastids) {
      c.save();c.globalAlpha*=plastid.opacity;this.plastid(plastid.x,plastid.y,plastid.size,p,plastid.angle);c.restore();
    }
    const nucleus=art.nucleus;
    if(nucleus) {
      c.save();c.globalAlpha*=.45;
      this.cellOutline(...nucleus,2.7,2.2,.7);c.fillStyle='#c5cfb8';c.fill();c.lineWidth=.18;c.strokeStyle='#83937e';c.stroke();
      this.ellipse(nucleus[0]-.6,nucleus[1]-.3,.6,.5,'#8f9b85');c.restore();
    }
    c.restore();c.restore();
  }
  private cell(p: Pigments) {
    const c = this.ctx,detail=smooth(1.4,2,this.position);
    c.save();
    if(this.kind==='yellow')c.globalAlpha*=1-smooth(2.32,2.92,this.position);
    const cytoplasm=c.createLinearGradient(-70,-115,80,115);
    const palette=this.tissuePalette(p);
    cytoplasm.addColorStop(0,palette.light);cytoplasm.addColorStop(1,palette.body);
    c.fillStyle=cytoplasm;c.fill(this.mesophyllWall);c.lineWidth=2.2;c.strokeStyle='#8b9e7b';c.stroke(this.mesophyllWall);
    c.strokeStyle='#eef1d8a6';c.lineWidth=.7;c.stroke(this.mesophyllInnerWall);
    c.save();c.clip(this.mesophyllInnerWall);
    this.vacuole(p,detail);
    for (const [i,plastid] of MESOPHYLL_PLASTIDS.entries()) {
      c.save();c.globalAlpha*=.74+.2*(.5+.5*Math.sin(i*2.3));
      this.plastid(plastid.x,plastid.y,plastid.size,p,plastid.angle);c.restore();
    }
    c.save();c.globalAlpha*=detail;
    for (let i=0;i<24;i++) {
      const a=i*2.399,wall=mesophyllCellEdge(a),liquid=vacuolePoint(a);
      const x=liquid[0]+(wall[0]-liquid[0])*.46,y=liquid[1]+(wall[1]-2-liquid[1])*.46;
      if(Math.hypot(x+113,y-72)>26)this.ellipse(x,y,.55+i%2*.2,.5,'#7e937b29');
    }
    c.restore();
    c.save();c.globalAlpha*=.2+.8*detail;
    this.cellOutline(-113,72,22,19,.7);
    const nucleoplasm=c.createLinearGradient(-126,58,-100,88);
    nucleoplasm.addColorStop(0,'#e4e9d6');nucleoplasm.addColorStop(1,'#b6c2aa');
    c.fillStyle=nucleoplasm;c.fill();c.strokeStyle='#8b9d88';c.lineWidth=.8;c.stroke();
    c.save();c.clip();
    c.globalAlpha*=detail;c.strokeStyle='#8e9b8260';c.lineWidth=.55;
    for(let i=0;i<3;i++) {
      c.beginPath();
      for(let j=0;j<=40;j++) {const a=j/40*Math.PI*2,x=-113+Math.cos(a)*(11+Math.sin(a*3+i)*4),y=72+Math.sin(a*2+i)*10;j?c.lineTo(x,y):c.moveTo(x,y);}c.stroke();
    }
    this.ellipse(-119,68,4.7,4,'#8f9f87');this.ellipse(-120,67,2.1,1.7,'#b9c6ab');c.restore();c.restore();
    c.restore();
    this.label(t('液泡'), 5, 0, undefined, 100);
    const wallAnchor=mesophyllCellEdge(-2.45);
    this.label(t('细胞壁'), -137, -175, [wallAnchor[0],wallAnchor[1]-2], 90);
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
    const entry=CHLOROPLAST_ENTRY;
    c.save();c.translate(entry.x,entry.y);c.rotate(entry.angle!);c.scale(entry.size,entry.size);
    const saved=this.labelsVisible;this.labelsVisible=this.kind==='yellow'&&this.position>2.86;
    this.chloroplast(p);this.labelsVisible=saved;c.restore();
  }
  private vacuole(p: Pigments,detail:number) {
    const c = this.ctx;
    const fill=c.createLinearGradient(-45,-70,45,78);
    fill.addColorStop(0,rgb(mix([237,241,220],[243,201,214],p.anthocyanins)));
    fill.addColorStop(1,this.tissuePalette(p).liquid);
    c.save();c.clip(this.vacuolePath);c.fillStyle=fill;c.fill(this.vacuolePath);
    // Stable, distributed solute symbols. Concentration changes throughout the
    // liquid; neither the pigment field nor a reveal mask expands from a centre.
    for(let i=0;i<160;i++) {
      const a=i*2.399963, r=Math.sqrt((i+.5)/160)*.94;
      const [x,y]=vacuolePoint(a,r);
      const visible=smooth(((i*37)%163)/163-.08,((i*37)%163)/163+.08,p.anthocyanins);
      this.ellipse(x+Math.sin(this.time*.24+i)*.65,y+Math.cos(this.time*.19+i*2)*.5,.6+i%3*.15,.6,`rgba(135,49,88,${visible*.27})`);
    }
    c.restore();c.strokeStyle=rgb(mix([143,164,127],[171,114,141],p.anthocyanins),.12+.42*detail);
    c.lineWidth=.8;c.stroke(this.vacuolePath);
  }
  private chloroplast(p: Pigments, miniature = false) {
    const c = this.ctx;
    const base = leafRGB({ ...p, anthocyanins: 0 });
    const fill=c.createRadialGradient(-68,-49,6,18,17,217);
    fill.addColorStop(0,rgb(mix(base,[222,235,181],.67)));
    fill.addColorStop(.62,rgb(mix(base,[185,211,143],.6)));
    fill.addColorStop(1,rgb(mix(base,[120,157,91],.62)));
    this.ellipse(0,0,210,109.2,fill);
    c.save();c.beginPath();c.ellipse(0,0,204,104,0,0,Math.PI*2);c.clip();
    // Stroma texture, nucleoids and starch use the same fixed positions at every
    // scale. They are anatomical illustration, not enumerated real molecules.
    for(let i=0;i<94;i++) {
      const a=i*2.399963,r=Math.sqrt((i+.5)/94);
      this.ellipse(Math.cos(a)*r*201,Math.sin(a)*r*100,.35+i%3*.16,.35,'#496f3c30');
    }
    this.ellipse(-65,12,22,8,'#eeeacaab','#a7b67e6b');
    this.ellipse(123,70,21,8,'#e7e3bcb5','#a7b67e6b');
    c.strokeStyle='#567c4c80';c.lineWidth=.6;
    for(const [cx,cy] of [[-176,8],[170,7],[0,79]]) {
      c.beginPath();
      for(let i=0;i<=50;i++) {
        const a=i/50*Math.PI*2,x=cx+Math.cos(a)*(9+Math.sin(a*3)*3),y=cy+Math.sin(a*2+.3)*4;
        i?c.lineTo(x,y):c.moveTo(x,y);
      }c.stroke();
    }
    const membrane=rgb(mix([56,100,47],[158,132,55],this.season));
    const membraneLight=rgb(mix([139,172,101],[207,180,103],this.season));
    // Stroma lamellae join grana at several heights. The fine paired strokes
    // replace thick separate cartoon links; no membrane flows or grows on zoom.
    for(let i=0;i<LAMELLAE.length;i++) {
      const [a,b]=LAMELLAE[i],from=GRANA[a],to=GRANA[b];
      for(let level=0;level<2;level++) {
        const offset=(level-.5)*7, sx=from[0]+from[2]*.39,sy=from[1]+offset,
          ex=to[0]-to[2]*.39,ey=to[1]+offset, dx=ex-sx;
        c.beginPath();c.moveTo(sx,sy);c.bezierCurveTo(sx+dx*.42,sy+6*Math.sin(i),ex-dx*.38,ey-5*Math.sin(i),ex,ey);
        c.strokeStyle=membrane;c.lineWidth=1.4;c.stroke();
        c.strokeStyle=membraneLight;c.lineWidth=.4;c.stroke();
      }
    }
    for(let i=0;i<GRANA.length;i++) {
      const [x,y,width,count,angle]=GRANA[i];
      c.save();c.translate(x,y);c.rotate(angle);
      c.globalAlpha*=1-.2*smooth(.65,1,this.season);
      for(let j=0;j<count;j++) {
        const w=width*(.94+.06*Math.sin(i*2.1+j*.7)),yy=(j-(count-1)/2)*2.7;
        c.beginPath();c.roundRect(-w/2,yy-1.05,w,2.1,1.05);c.fillStyle=membrane;c.fill();
        c.beginPath();c.moveTo(-w/2+1.5,yy-.35);c.lineTo(w/2-1.5,yy-.35);
        c.strokeStyle=membraneLight;c.lineWidth=.45;c.stroke();
        if(!miniature)for(let k=0;k<5;k++) {
          const threshold=((i*37+j*13+k*19)%97)/97,alpha=smooth(threshold-.09,threshold+.09,p.chlorophyll);
          this.ellipse((k-2)*w*.18,yy,.62,.62,`rgba(27,87,36,${alpha*.85})`);
        }
        if(!miniature)this.ellipse((j%4-1.5)*w*.18,yy+.2,.65,.65,`rgba(222,161,38,${.4+p.carotenoids*.6})`);
      }
      c.restore();
    }
    // Tissue-scale chloroplasts are green profiles, not tiny diagrams exposing
    // resolvable grana. The same outline opens into a registered explanatory
    // cutaway only as we approach; this is not simulated microscope resolution.
    const opening=miniature?0:smooth(2.14,2.78,this.position);
    const cover=c.createLinearGradient(0,-103,0,103);
    cover.addColorStop(0,rgb(mix(base,[154,181,103],.29),.98*(1-opening)));
    cover.addColorStop(.46,rgb(mix(base,[117,153,77],.2),.985*(1-opening)));
    cover.addColorStop(1,rgb(mix(base,[85,121,62],.28),.99*(1-opening)));
    c.fillStyle=cover;c.fillRect(-211,-110,422,220);
    c.restore();
    // Envelope detail belongs to the explanation layer; the ordinary profiles
    // do not pretend to resolve two membranes in a light-microscope section.
    c.beginPath();c.ellipse(0,0,210,109.2,0,0,Math.PI*2);c.strokeStyle='#607d47';c.lineWidth=1.5;c.stroke();
    c.save();c.globalAlpha*=opening;
    c.beginPath();c.ellipse(0,0,205,104.2,0,0,Math.PI*2);c.strokeStyle='#829b58';c.lineWidth=1.1;c.stroke();
    c.beginPath();c.ellipse(-.5,-.8,208,107,0,Math.PI*1.06,Math.PI*1.85);c.strokeStyle='#e2ecbca8';c.lineWidth=1;c.stroke();
    c.restore();
    if(miniature)return;
    this.label(t('叶绿体包膜'), -129, -148, [-172, -66], 135);
    this.label(t('基粒 · 堆叠的类囊体'), 111, -148, [95,-43], 170);
    if(this.academic)this.label(t('基质片层'),0,115,[63,37],150);
    this.label(t('叶绿素 · 绿色'), -109, 150, undefined, 150);
    this.label(t('类胡萝卜素 · 黄色'), 106, 150, undefined, 175);
    if (this.kind === 'red' && this.season > .4) this.label(t('红色花青素在液泡，不在这里'), 0, 180, undefined, 360);
  }
  dispose() {
    this.disposed=true;cancelAnimationFrame(this.frame);this.leafMotion.dispose();this.surface.dispose();
    this.rearSurface.width=this.rearSurface.height=0;this.plastidPlate.width=this.plastidPlate.height=0;
    this.upperCellEdges.clear();this.mesophyllArt=new WeakMap();
    this.observer.disconnect();this.intersection.disconnect();
    document.removeEventListener('visibilitychange',this.wake);this.motionPreference.removeEventListener('change',this.preferenceChanged);
  }
}
