import { LeafMicroScene } from './microScene.ts';
import { leafRGB, mix, pigmentsAt, rgb, smooth, scaleCamera, SCALE_ENTRIES, colorRoute } from './model.ts';
import type { LeafKind, Pigments, ScaleEntry } from './model.ts';
import { t } from './i18n.ts';

type Point = [number, number];
export class LeafScene {
  private micro: LeafMicroScene | undefined;
  private academic = false;
  private epidermalCells: Path2D[] = [];
  private epidermalPlate = document.createElement('canvas');
  private epidermalKey = '';
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
  private organellePoint: Point = [104, -78];
  private organelleAngle = .65;
  private season = 0;
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
    try {
      this.micro = new LeafMicroScene();
      this.micro.render(2, pigmentsAt(0, 'yellow'), 0, 900);
      this.organellePoint = this.micro.anchor('plastid');
      const tip = this.micro.anchor('plastidTip');
      this.organelleAngle = Math.atan2(tip[1] - this.organellePoint[1], tip[0] - this.organellePoint[0]);
      if (Math.abs(this.organelleAngle) > Math.PI / 2) this.organelleAngle += this.organelleAngle < 0 ? Math.PI : -Math.PI;
    } catch { /* Canvas illustrations remain available without WebGL. */ }
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
  setMotion(enabled: boolean) { this.motion = enabled; this.wake(); }
  private wake = () => {
    if (!this.disposed && !document.hidden && this.visible && !this.frame) { this.previous = performance.now(); this.frame = requestAnimationFrame(this.animate); }
  };
  set(position: number, season: number, kind: LeafKind) {
    if (position === this.position && season === this.season && kind === this.kind) return;
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
    if (this.motion && !this.reducedMotion) this.time += delta;
    this.render();
    if (this.motion && !this.reducedMotion) this.frame = requestAnimationFrame(this.animate);
  };
  private resize() {
    this.width = this.canvas.clientWidth;
    this.height = this.canvas.clientHeight;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(this.width * dpr);
    this.canvas.height = Math.round(this.height * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.scale = Math.min((this.width - 24) / 470, (this.height - 175) / 430);
    this.render();
  }
  private destination() {
    return this.kind === 'red' ? { x: 0, y: 0, size: .72, angle: 0 } : { x: this.organellePoint[0], y: this.organellePoint[1], size: .115, angle: this.organelleAngle };
  }
  private render() {
    const c = this.ctx;
    c.clearRect(0, 0, this.width, this.height);
    c.fillStyle = '#edf1df'; c.fillRect(0, 0, this.width, this.height);
    const backdrop = c.createRadialGradient(this.width*.42, this.height*.4, 12, this.width*.5, this.height*.5, this.width*.7);
    backdrop.addColorStop(0, '#fbf9e9'); backdrop.addColorStop(.55, '#e8eed9'); backdrop.addColorStop(1, '#cbd8ba');
    c.fillStyle = backdrop; c.fillRect(0, 0, this.width, this.height);
    const destination = this.destination(), camera = scaleCamera(this.position, destination);
    const entries: ScaleEntry[] = [...SCALE_ENTRIES, destination], route = colorRoute(this.kind);
    this.labels = [];
    c.save(); c.translate(this.width / 2, this.height * .54); c.scale(this.scale * camera.magnification, this.scale * camera.magnification); c.rotate(-camera.angle); c.translate(-camera.x, -camera.y);
    // Every detail stays at the same location in one nested world. Reversing the
    // slider reverses the same camera, rather than starting another dissolve.
    const drawNested = (depth: number) => {
      this.labelsVisible = Math.abs(this.position - depth) < .14;
      c.save();
      if (depth === 0) c.globalAlpha *= 1 - smooth(.55, .98, this.position);
      if (depth === 1) {
        const tilt = smooth(.46, .98, this.position)*Math.PI/2;
        c.scale(1, Math.max(.001, Math.sin(tilt)));
      }
      if(depth !== 0 || this.position < .98) this.layer(route[depth]); c.restore();
      if (depth === 3) return;
      // Reveal existing anatomy only as the camera approaches it. The mask opens
      // over a fixed child; the cells themselves never grow, split, or slide.
      const reveal = depth === 0 ? smooth(.44,.72,this.position) : smooth(depth + .08, depth + .55, this.position);
      if (reveal === 0) return;
      const entry = entries[depth];
      c.save(); c.translate(entry.x, entry.y); c.rotate(entry.angle ?? 0); c.scale(entry.size, entry.size);
      if(depth === 0) {
        c.globalAlpha *= reveal;
        drawNested(1);
        if(this.position < .99) {
          const tilt=smooth(.46,.98,this.position)*Math.PI/2;
          c.save();c.translate(0,-145*Math.sin(tilt));
          c.transform(1,0,-.22*Math.sin(tilt),Math.max(.001,Math.cos(tilt)),0,0);
          c.translate(0,-180*smooth(.46,.72,this.position));
          c.globalAlpha *= 1-smooth(.90,.99,this.position);
          c.beginPath();c.rect(-217,-180,434,360);c.clip();
          this.epidermis(pigmentsAt(this.season,this.kind));c.restore();
        }
        c.restore(); return;
      }
      c.beginPath();
      c.ellipse(0,0,(depth === 2 ? (this.kind === 'yellow' ? 225 : 211) : 241)*reveal,(depth === 2 ? (this.kind === 'yellow' ? 104 : 133) : 157)*reveal,0,0,Math.PI*2);
      c.clip();
      const pigment = pigmentsAt(this.season, this.kind);
      c.globalAlpha *= smooth(0, .3, reveal);
      c.fillStyle = depth === 1 ? '#e5edc4' : this.kind === 'red' ? rgb(mix([226,236,199],[183,69,106],pigment.anthocyanins)) : rgb(mix(leafRGB(pigment),[240,244,218],.83));
      c.fillRect(-270, -190, 540, 380);
      drawNested(depth + 1);
      c.restore();
    };
    drawNested(0); c.restore();
    // Labels belong to the currently visited scale and are not trapped inside a
    // tiny parent clipping mask. Anatomy remains fixed beneath these overlays.
    for (const label of this.labels) {
      c.save(); c.setTransform(label.matrix); this.drawLabel(label.text, label.x, label.y, label.anchor, label.width); c.restore();
    }
    const depth = Math.min(2, Math.round(this.position));
    let x = 0, y = 0, size = 1;
    for (let i = 0; i <= depth; i++) { x += entries[i].x * size; y += entries[i].y * size; size *= entries[i].size; }
    this.hotspot.style.left = `${this.width / 2 + ((x-camera.x)*Math.cos(camera.angle)+(y-camera.y)*Math.sin(camera.angle))*this.scale*camera.magnification}px`;
    this.hotspot.style.top = `${this.height*.54 + (-(x-camera.x)*Math.sin(camera.angle)+(y-camera.y)*Math.cos(camera.angle))*this.scale*camera.magnification}px`;
    this.hotspot.hidden = this.position > 2.15 || Math.abs(this.position - Math.round(this.position)) > .12;
    this.canvas.dataset.scale = this.position.toFixed(4);
    this.canvas.dataset.camera = `${camera.x.toFixed(6)},${camera.y.toFixed(6)},${camera.magnification.toFixed(6)}`;
  }
  private layer(level: number) {
    const p = pigmentsAt(this.season, this.kind);
    if (level === 0) this.leaf(p);
    else if (level === 1) this.tissue(p);
    else if (this.micro) {
      const image=this.micro.render(level,p,this.time,this.width);
      this.ctx.drawImage(image,-265,-161,530,322);
      if(level===2) {
        this.label(t('细胞壁'),-162,-174,this.micro.anchor('wall'),115);
        this.label(t('叶绿体'),150,-174,this.micro.anchor('plastid'),120);
        this.label(t('液泡'),0,5,undefined,90);
        this.label(t('细胞核'),-149,177,this.micro.anchor('nucleus'),110);
        this.label(this.kind==='red'?t('花青素积累在液泡中'):t('叶绿素藏在叶绿体里'),85,177,this.micro.anchor(this.kind==='red'?'vacuole':'pigment'),190);
      } else if (level === 4) {
        this.label(t('液泡膜'),-145,-153,this.micro.anchor('tonoplast'),130);
        this.label(t('水溶性的花青素'),126,-153,this.micro.anchor('vacuolarPigment'),175);
        this.label(t('叶绿体在液泡外'),105,158,this.micro.anchor('outsidePlastid'),180);
        this.label(this.season < .38 ? t('夏天：花青素还很少') : t('红色在液泡内积累'),-95,142,undefined,190);
      } else {
        this.label(t('叶绿体包膜'),-153,-155,this.micro.anchor('envelope'),145);
        this.label(t('类囊体膜'),119,-155,this.micro.anchor('thylakoid'),135);
        if (this.labelsVisible) this.ellipse(-178,154,4,4,'#2f803e');this.label(t('叶绿素'),-120,154,undefined,110);
        if (this.labelsVisible) this.ellipse(15,154,4,4,'#dca526');this.label(t('类胡萝卜素'),98,154,undefined,155);
        if(this.kind==='red'&&this.season>.4)this.label(t('红色花青素在液泡，不在这里'),0,188,undefined,390);
      }
    } else if (level === 2) this.cell(p);
    else if (level === 4) this.vacuole(p);
    else this.chloroplast(p);
  }
  private ellipse(x: number, y: number, rx: number, ry: number, color: string | CanvasGradient, stroke?: string) {
    const c = this.ctx; c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); c.fillStyle = color; c.fill();
    if (stroke) { c.strokeStyle = stroke; c.lineWidth = 1.5; c.stroke(); }
  }
  private label(text: string, x: number, y: number, anchor?: Point, width = 170) {
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
    c.save(); c.translate(0, 0); c.rotate(-.15);
    const shape = new Path2D(); shape.moveTo(0, 164);
    shape.bezierCurveTo(-122, 127, -197, -15, -88, -125);
    shape.bezierCurveTo(-51, -160, -9, -182, 3, -204);
    shape.bezierCurveTo(20, -155, 123, -121, 146, -38);
    shape.bezierCurveTo(181, 73, 74, 148, 0, 164);
    const color = leafRGB(p), grad = c.createLinearGradient(-150, -90, 150, 120);
    grad.addColorStop(0, rgb(mix(color, [242, 217, 111], .24))); grad.addColorStop(.45, rgb(color)); grad.addColorStop(1, rgb(mix(color, [30, 58, 31], .2)));
    c.shadowColor = '#294a3429'; c.shadowBlur = 26; c.shadowOffsetY = 15; c.fillStyle = grad; c.fill(shape); c.shadowColor = 'transparent';
    c.save(); c.clip(shape);
    // The same deterministic mottling survives every season and zoom revisit.
    for (let i = 0; i < 55; i++) {
      const x = Math.sin(i * 7.31) * 155, y = Math.cos(i * 3.79) * 195;
      const patch = c.createRadialGradient(x, y, 0, x, y, 35);
      patch.addColorStop(0, rgb(mix(color, i % 2 ? [249, 213, 75] : [24, 84, 37], .4), .11)); patch.addColorStop(1, rgb(color, 0));
      c.fillStyle = patch; c.fillRect(x - 35, y - 35, 70, 70);
    }
    c.strokeStyle = '#eff5b582'; c.lineCap = 'round';
    for (let i = 0; i < 9; i++) {
      const y = 124 - i * 34, extent = 125 * Math.sin((i + 1) / 11 * Math.PI);
      for (const side of [-1, 1]) {
        c.lineWidth = 1.8 - i * .1; c.beginPath(); c.moveTo(0, y); c.quadraticCurveTo(side * extent * .55, y - 16, side * extent, y - 76); c.stroke();
        for (let j = 1; j < 5; j++) { const x = side * extent * j / 5, yy = y - 60 * j / 5; c.lineWidth = .45; c.beginPath(); c.moveTo(x, yy); c.lineTo(x + side * 25, yy - 43); c.stroke(); }
      }
    }
    for (let i = 0; i < 460; i++) {
      const x = Math.sin(i * 17.23) * 158, y = Math.cos(i * 9.41) * 198;
      c.strokeStyle = i % 2 ? '#e8f6bc18' : '#24472a18'; c.lineWidth = .55;
      c.beginPath(); c.ellipse(x,y,3+i%4,2+i%3,.4,0,Math.PI*2);c.stroke();
    }
    const shine=c.createLinearGradient(-90,-150,140,90);shine.addColorStop(0,'#f9ffca35');shine.addColorStop(.45,'#ffffdf00');shine.addColorStop(1,'#153b2420');c.fillStyle=shine;c.fill(shape);
    c.save(); c.rotate(.15);
    c.translate(SCALE_ENTRIES[0].x, SCALE_ENTRIES[0].y); c.scale(SCALE_ENTRIES[0].size,SCALE_ENTRIES[0].size);
    c.globalAlpha *= .06 + .5*smooth(.08,.4,this.position);
    for(let row=-3;row<=3;row++) for(let col=-3;col<=3;col++) {
      c.save(); c.translate(col*500,row*360); this.epidermis(p); c.restore();
    }
    c.restore();
    c.restore(); c.beginPath(); c.moveTo(-5, 205); c.quadraticCurveTo(10, 135, 2, -185); c.lineWidth = 3; c.strokeStyle = '#d8d695'; c.stroke();
    c.lineWidth = 1; c.strokeStyle = '#35573666'; c.stroke(shape); c.restore();
    this.label(t('叶脉'), -145, 142, [-16, 107], 75);
    this.label(t('叶片'), 147, -125, [94, -86], 75);
  }
  private plastid(x: number, y: number, rx: number, p: Pigments, angle = 0) {
    const c = this.ctx; c.save(); c.translate(x, y); c.rotate(angle);
    const color = leafRGB({ ...p, anthocyanins: 0 });
    const skin = c.createLinearGradient(0,-rx*.52,0,rx*.52); skin.addColorStop(0,rgb(mix(color,[232,245,160],.58)));skin.addColorStop(.4,rgb(color));skin.addColorStop(1,rgb(mix(color,[20,51,32],.35))); this.ellipse(0, 0, rx, rx * .52, skin, '#658a4299');
    c.strokeStyle = rgb(mix(color, [235, 224, 123], .5)); c.lineWidth = .9;
    for (let i = -2; i <= 2; i++) { c.beginPath(); c.moveTo(i * rx * .27, -rx * .24); c.lineTo(i * rx * .27, rx * .24); c.stroke(); }
    c.restore();
  }
  // Fixed per-cell variation: growth contours, not frame-to-frame noise.
  private cellEdge(a: number, rx: number, ry: number, seed: number, power = 1): Point {
    const r = 1 + .065 * Math.sin(3 * a + seed) + .04 * Math.cos(5 * a - seed * .7);
    const ca = Math.cos(a), sa = Math.sin(a);
    return [rx * Math.sign(ca) * Math.abs(ca) ** power * r + ry * .035 * Math.sin(a * 2 + seed), ry * Math.sign(sa) * Math.abs(sa) ** power * r];
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
      this.plastid(x + dx * .77, y + dy * .77, size, p, Math.atan2(after[1] - before[1], after[0] - before[0]));
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
      if(polygon.length){const path=new Path2D();polygon.forEach(([x,y],i)=>i?path.lineTo(x,y):path.moveTo(x,y));path.closePath();this.epidermalCells.push(path);}
    }
  }
  private epidermis(p: Pigments) {
    const key=Object.values(p).map(v=>v.toFixed(2)).join(':');
    if(key!==this.epidermalKey){
      this.epidermalKey=key;
      const plate=this.epidermalPlate;plate.width=1000;plate.height=720;
      const c=plate.getContext('2d')!,base=leafRGB(p);c.scale(2,2);c.translate(250,180);
      this.epidermalCells.forEach((path,i)=>{
        c.fillStyle=rgb(mix(base,[239,242,193],.38+(Math.sin(i*3.1)+1)*.08));c.fill(path);
        c.strokeStyle='#ecf0c6';c.lineWidth=1.4;c.stroke(path);
        c.strokeStyle='#53723e66';c.lineWidth=.4;c.stroke(path);
      });
    }
    this.ctx.drawImage(this.epidermalPlate,-250,-180,500,360);
  }

  private tissue(p: Pigments) {
    const c = this.ctx;
    const body=c.createLinearGradient(0,-145,0,134);body.addColorStop(0,'#d9e5b6');body.addColorStop(1,'#edf0d3');
    c.fillStyle=body;c.fillRect(-217,-145,434,280);
    c.fillStyle = '#c6d8a3'; c.fillRect(-217, -153, 434, 8);
    for (let i = 0; i < 10; i++) {
      c.fillStyle = '#e5eac4'; c.strokeStyle = '#8fa779'; c.lineWidth = 1.8;
      this.cellOutline(-195 + i * 43, -127 + Math.sin(i * 1.9), 19.5, 13, i * 1.8, .7); c.fill(); c.stroke();
      this.cellOutline(-195 + i * 43, 123 + Math.cos(i * 1.5), 19.5, 10.5, i * 2.1 + 4, .7); c.fill(); c.stroke();
    }
    for (let i = 0; i < 8; i++) {
      const x = -207 + i * 53, cy = -49 + Math.sin(i * 2.1) * 3, rx = 21.5 + Math.sin(i * 1.7), ry = 54 + Math.cos(i * 2.7) * 4;
      const cellFill=c.createLinearGradient(x,-108,x+48,9);cellFill.addColorStop(0,'#cadb9d');cellFill.addColorStop(.4,'#edf1d0');cellFill.addColorStop(1,'#adc286'); c.fillStyle = cellFill; c.strokeStyle = '#93ac70';
      this.cellOutline(x + 24, cy, rx, ry, i * 2.3, .72); c.fill(); c.stroke();
      this.cellOutline(x + 24, cy, rx * .52, ry * .64, i * 2.3, .72); c.fillStyle = rgb(mix([233,239,208],[209,104,135],p.anthocyanins*.85)); c.fill();
      // Organelles follow the cell's contour within the cytoplasm, outside the liquid compartment.
      this.peripheralPlastids(x + 24, cy, rx, ry, i * 2.3, 6, 5.2, p, .72);
    }
    for (let row = 0; row < 2; row++) for (let i = 0; i < 6; i++) {
      const x = -181 + i * 70 + (row % 2 ? 15 : 0) + Math.sin(i * 2.7 + row) * 5, y = 40 + row * 43 + Math.cos(i * 1.8 + row) * 4;
      const rx = 25 + Math.sin(i * 2 + row) * 3, ry = 17 + Math.cos(i + row) * 2, seed = i * 2.2 + row * 4;
      this.cellOutline(x, y, rx, ry, seed); c.fillStyle = '#e5edc4'; c.strokeStyle = '#93ac70'; c.fill(); c.stroke();
      this.cellOutline(x, y, rx * .5, ry * .48, seed); c.fillStyle = rgb(mix([233,239,208],[209,104,135],p.anthocyanins*.85)); c.fill();
      this.peripheralPlastids(x, y, rx, ry, seed, 4, 3.8, p);
    }
    // Air-space tracers remain outside the cells; motion is deliberately magnified.
    for(let i=0;i<24;i++){const x=-190+(i*43%380), y=17+((i*29+this.time*4)%85); if (Math.abs(Math.sin(x*.045))>.65) this.ellipse(x,y,1.5,1.5,'#eef9dcaa');}
    this.label(t('上表皮'), -125, -180, [-125, -132], 100);
    this.label(t('叶肉细胞'), 133, -181, [133, -62], 120);
    this.label(t('细胞间隙'), 80, 161, [68, 64], 125);
    this.label(t('下表皮'), -139, 161, [-139, 123], 100);
  }
  private cell(p: Pigments) {
    const c = this.ctx;
    this.cellOutline(0, -2, 171, 134, 1.4, .85); const cytoplasm=c.createRadialGradient(-45,-80,10,0,0,210);cytoplasm.addColorStop(0,'#f1f5d4');cytoplasm.addColorStop(.7,'#d5e4a7');cytoplasm.addColorStop(1,'#8ca567');c.fillStyle=cytoplasm; c.fill(); c.lineWidth = 8; c.strokeStyle = '#a5b87b'; c.stroke();
    c.lineWidth = 2; c.strokeStyle = '#6f975c'; c.stroke();
    const vac = c.createRadialGradient(-30, -35, 5, 0, 0, 170);
    vac.addColorStop(0, rgb(mix([244, 246, 212], [231, 112, 141], p.anthocyanins)));
    vac.addColorStop(1, rgb(mix([220, 232, 183], [171, 51, 87], p.anthocyanins)));
    this.cellOutline(4, -2, 115, 87, 2.6); c.fillStyle = vac; c.strokeStyle = '#b2bb8499'; c.fill(); c.stroke();
    for (let i = 0; i < 16; i++) { if (i === 6) continue; const a = i * Math.PI * 2 / 16 + Math.sin(this.time * .12 + i * .7) * .035; this.plastid(Math.cos(a) * 146, Math.sin(a) * 110, 18, p, a + Math.PI / 2); }
    for (let i=0;i<85;i++) {
      const a=i*2.399+this.time*.025, r=1+(i%5)*.028;
      this.ellipse(Math.cos(a)*130*r,Math.sin(a)*94*r,1+i%2*.5,1,'#719a5c48');
    }
    this.ellipse(-113, 72, 22, 19, '#c6bcca99', '#928497');
    this.ellipse(-113, 72, 19, 16, '#dacfd355', '#b0a0b1');
    this.ellipse(-119, 68, 4.5, 4, '#95839e');
    c.strokeStyle = '#8c7995'; c.lineWidth = .8;
    for (let i = 0; i < 4; i++) { c.beginPath(); c.moveTo(-127, 62 + i * 5); c.bezierCurveTo(-115, 55 + i * 5, -115, 73 + i * 4, -99, 65 + i * 4); c.stroke(); }
    // Red is confined to the vacuole, never recolors chloroplasts.
    for (let i = 0; i < 45; i++) { const a = i * 2.4, r = Math.sqrt((i + .5) / 45); this.ellipse(4 + Math.cos(a) * r * 100, -2 + Math.sin(a) * r * 74, 2.2, 2.2, `rgba(163,38,76,${p.anthocyanins * .38})`); }
    this.label(t('液泡'), 5, 0, undefined, 100);
    this.label(t('细胞壁'), -137, -175, [-159, -118], 90);
    this.label(t('叶绿体'), 130, -175, [104, -78], 105);
    this.label(t('细胞核'), -118, 170, [-113, 74], 100);
    this.label(this.kind === 'red' && this.season > .4 ? t('花青素积累在液泡中') : t('叶绿素藏在叶绿体里'), 68, 170, [56, this.kind === 'red' && this.season > .4 ? 58 : 103], 180);
  }
  private vacuole(p: Pigments) {
    const c = this.ctx;
    const fill = c.createRadialGradient(-48,-55,4,0,0,190);
    fill.addColorStop(0,rgb(mix([249,247,222],[237,153,174],p.anthocyanins)));
    fill.addColorStop(1,rgb(mix([220,230,187],[176,55,98],p.anthocyanins)));
    this.cellOutline(0,-8,184,122,1.4);c.fillStyle=fill;c.fill();c.lineWidth=3;c.strokeStyle='#a39770';c.stroke();
    for(let i=0;i<120;i++) {
      const a=i*2.399+this.time*.018,r=Math.sqrt((i+.5)/120),visible=smooth(((i*37)%119)/119-.06,((i*37)%119)/119+.06,p.anthocyanins);
      this.ellipse(Math.cos(a)*r*160,Math.sin(a)*r*101-8,2.6,2.6,`rgba(157,36,79,${visible*.65})`);
    }
    for(let i=0;i<3;i++)this.plastid(-142+i*139,135+Math.sin(i*2)*6,24,p,-.35+i*.4);
    this.label(t('液泡膜'),-145,-163,[-151,-71],120);
    this.label(t('水溶性的花青素'),118,-163,[65,-58],170);
    this.label(t('叶绿体在液泡外'),100,176,[139,129],185);
    this.label(this.season<.38?t('夏天：花青素还很少'):t('红色在液泡内积累'),-90,168,undefined,180);
  }
  private chloroplast(p: Pigments) {
    const c = this.ctx;
    const base = leafRGB({ ...p, anthocyanins: 0 });
    const fill = c.createLinearGradient(0, -100, 0, 100); fill.addColorStop(0, rgb(mix(base, [255, 255, 212], .78))); fill.addColorStop(1, rgb(mix(base, [227, 230, 145], .65)));
    c.save();c.shadowColor='#31592d35';c.shadowBlur=20;c.shadowOffsetY=10;
    this.ellipse(0, 0, 210, 112, fill, '#668644');c.restore();
    for(let i=0;i<110;i++){const a=i*2.399+this.time*.006,r=Math.sqrt((i+.5)/110);this.ellipse(Math.cos(a)*r*195,Math.sin(a)*r*97,1+i%3*.4,1,'#678c4240');}
    this.ellipse(120,58,26,12,'#f7efd4aa','#bac58988');
    c.strokeStyle='#719d5f88';c.lineWidth=1;c.beginPath();for(let i=0;i<=50;i++){const a=i/50*Math.PI*2,x=-117+Math.cos(a)*(17+Math.sin(a*3)*5),y=65+Math.sin(a)*10;i?c.lineTo(x,y):c.moveTo(x,y);}c.stroke();
    c.lineWidth = 1; c.strokeStyle = '#8dac6366'; c.beginPath(); c.ellipse(0, 0, 200, 102, 0, 0, Math.PI * 2); c.stroke();
    const membrane = rgb(mix([124, 149, 83], [200, 182, 107], this.season));
    for (let i = 0; i < 5; i++) {
      const x = -144 + i * 70, y = Math.sin(i * 1.7) * 13;
      if (i < 4) { c.strokeStyle = membrane; c.lineWidth = 3; c.beginPath(); c.moveTo(x, y + 13); c.bezierCurveTo(x + 30, y + 22, x + 48, y - 18, x + 70, Math.sin((i + 1) * 1.7) * 13); c.stroke(); }
      c.save(); c.globalAlpha *= 1 - .2 * smooth(.65, 1, this.season);
      for (let j = 0; j < 6; j++) {
        const disk=c.createLinearGradient(0,y+23-j*11,0,y+39-j*11);disk.addColorStop(0,'#d6de9c');disk.addColorStop(.3,membrane);disk.addColorStop(1,'#64773d');
        this.ellipse(x, y + 31 - j * 11, 26, 8, disk, '#708c49');
        for (let k = 0; k < 6; k++) {
          const threshold = ((i * 37 + j * 13 + k * 19) % 97) / 97;
          const alpha = smooth(threshold - .09, threshold + .09, p.chlorophyll);
          this.ellipse(x - 20 + k * 8, y + 30 - j * 11, 2.4, 2.4, `rgba(33,108,45,${alpha})`);
        }
        this.ellipse(x - 13 + (j % 3) * 13, y + 34 - j * 11, 2.6, 2.6, `rgba(237,170,27,${.4 + p.carotenoids * .8})`);
      }
      c.restore();
    }
    // Light/energy markers end at pigment-bearing membranes; pigments remain bound there.
    if(this.season<.94) for(let i=0;i<5;i++){
      const u=(this.time*.28+i*.2)%1, x=-144+i*70, targetY=Math.sin(i*1.7)*13-24;
      const y=-105+(targetY+105)*u;
      const glow=c.createRadialGradient(x,y,0,x,y,9);glow.addColorStop(0,i%2?'#fff4a9cc':'#a7d9ffbb');glow.addColorStop(1,'#fffbd000');
      c.save();c.globalAlpha=(1-u)*p.chlorophyll;this.ellipse(x,y,9,9,glow);c.restore();
    }
    this.label(t('叶绿体包膜'), -129, -148, [-172, -66], 135);
    this.label(t('类囊体膜'), 110, -148, [76, -32], 125);
    this.ellipse(-184, 150, 4, 4, '#2f803e'); this.label(t('叶绿素'), -128, 150, undefined, 90);
    this.ellipse(5, 150, 4, 4, '#dca526'); this.label(t('类胡萝卜素'), 88, 150, undefined, 155);
    if (this.kind === 'red' && this.season > .4) this.label(t('红色花青素在液泡，不在这里'), 0, 180, undefined, 360);
  }
  dispose() { this.disposed = true; cancelAnimationFrame(this.frame); this.micro?.dispose(); this.observer.disconnect(); this.intersection.disconnect(); document.removeEventListener('visibilitychange', this.wake); }
}
