import { CanvasSurface } from '../../src/visuals/canvasSurface.ts';
import { leafletFold, response, signalArrival, type TouchSettings } from './model.ts';
import { t } from './i18n.ts';
import { createMotorTissue, primaryPulvinus, tissuePoint, type Point, type TissueCell } from './anatomy.ts';

const noise = (n: number) => { const x = Math.sin(n * 127.13 + 31.17) * 43758.5453; return x - Math.floor(x); };
export class MimosaScene extends CanvasSurface {
  private p = 0;
  private settings: TouchSettings = { pinna: 1, extent: 'local' };
  private view = 'plant';
  private depth = 0;
  private cells = createMotorTissue();
  private focusCell = this.cells.reduce((a, b) => Math.hypot(b.center[0] - 20, b.center[1] - 54) < Math.hypot(a.center[0] - 20, a.center[1] - 54) ? b : a);
  constructor(canvas: HTMLCanvasElement) { super(canvas); this.onResize(() => this.draw(this.p, this.settings, this.view, this.depth)); }
  draw(p: number, settings: TouchSettings, view: string, depth = view === 'plant' ? 0 : view === 'cell' ? 2 : 1) {
    this.p = p; this.settings = settings; this.view = view; this.depth = depth;
    const c = this.begin('#e2e9d9', '#f5f3e7');
    for (let i = 0; i < 22; i++) {
      const x = (noise(i) - .5) * 850, y = (noise(i + 50) - .5) * 570, r = 24 + noise(i + 100) * 110;
      const g = c.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, i % 3 ? '#9bb77a22' : '#fffefca0'); g.addColorStop(1, '#d1dfbc00');
      this.ellipse(x, y, r, r, g);
    }
    if (depth < 1) {
      c.save(); c.globalAlpha = 1 - depth; c.scale(1 + depth * .7, 1 + depth * .7); c.translate(0, -depth * 50);
      this.plant(p, settings); c.restore();
    }
    if (depth > 0) { c.save(); c.globalAlpha = Math.min(1, depth); this.pulvinus(p, settings, Math.max(0, depth - 1)); c.restore(); }
    this.end();
  }
  private leaflet(x: number, y: number, angle: number, length: number, width: number, seed: number, fold = 0) {
    const c = this.context;
    c.save(); c.translate(x, y); c.rotate(angle); c.scale(1, 1 - fold * .66);
    const g = c.createLinearGradient(0, -width, length, width);
    g.addColorStop(0, `hsl(${107 + noise(seed) * 15} 35% 24%)`);
    g.addColorStop(.42, `hsl(${94 + noise(seed + 3) * 15} 43% ${38 + noise(seed + 4) * 9}%)`);
    g.addColorStop(1, '#6c9348');
    c.beginPath(); c.moveTo(0, 0);
    c.bezierCurveTo(length * .23, -width * .9, length * .76, -width * (1 + noise(seed + 2) * .23), length, -.7);
    c.bezierCurveTo(length * .87, width * .67, length * .34, width * 1.12, 0, 0);
    c.fillStyle = g; c.shadowColor = '#2947262a'; c.shadowBlur = 2.5; c.shadowOffsetY = 2; c.fill(); c.shadowColor = 'transparent';
    c.strokeStyle = '#41633877'; c.lineWidth = .5; c.stroke();
    c.beginPath(); c.moveTo(1, 0); c.quadraticCurveTo(length * .54, 1.3, length * .96, 0); c.strokeStyle = '#b8ce797d'; c.lineWidth = .7; c.stroke();
    for (let v = 1; v < 6; v++) {
      const xx = length * v / 7;
      c.beginPath(); c.moveTo(xx, .4); c.quadraticCurveTo(xx + 2, -width * .3, xx + length * .14, -width * .64 * Math.sin(v / 7 * Math.PI));
      c.moveTo(xx + 1, .4); c.quadraticCurveTo(xx + 3, width * .3, xx + length * .14, width * .59 * Math.sin(v / 7 * Math.PI));
      c.strokeStyle = '#bed09336'; c.lineWidth = .4; c.stroke();
    }
    c.restore();
  }
  private plant(p: number, settings: TouchSettings) {
    const c = this.context, state = response(p, settings), origin: [number, number] = [-8, 50 + state.droop * 28];
    c.lineCap = 'round'; c.beginPath(); c.moveTo(80, 250); c.bezierCurveTo(25, 181, 66, 97, ...origin);
    c.lineWidth = 8; c.strokeStyle = '#718650'; c.stroke(); c.lineWidth = 2; c.strokeStyle = '#bbc387'; c.stroke();
    c.beginPath(); c.moveTo(58, 177); c.quadraticCurveTo(190, 130, 221, 55); c.strokeStyle = '#7e9362'; c.lineWidth = 3; c.stroke();
    for (let i = 0; i < 84; i++) {
      const a = noise(i + 432) * Math.PI * 2, r = Math.sqrt(noise(i + 820)) * 18;
      const x = 220 + Math.cos(a) * r, y = 54 + Math.sin(a) * r;
      c.beginPath(); c.moveTo(219, 54); c.lineTo(x, y); c.strokeStyle = '#c287a56e'; c.lineWidth = .6; c.stroke();
      this.ellipse(x, y, .7 + noise(i + 930), 1, noise(i + 20) > .5 ? '#d8a0c0' : '#eec8dc');
    }
    const angles = [-2.95, -2.12, -1.37, -.52], lengths = [223, 257, 245, 213];
    for (let pinna = 0; pinna < 4; pinna++) {
      const angle = angles[pinna] + state.droop * (pinna < 2 ? -.29 : .34), length = lengths[pinna];
      c.save(); c.translate(...origin); c.rotate(angle);
      c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(length * .55, -7 + pinna * 3, length, 0); c.strokeStyle = '#759051'; c.lineWidth = 2.4; c.stroke();
      for (let pair = 0; pair < 12; pair++) {
        const xx = 25 + pair * (length - 33) / 12, bend = Math.sin(xx / length * Math.PI) * (-3 + pinna * 2);
        const fold = leafletFold(p, pinna, pair, settings), seed = pinna * 120 + pair * 3;
        const ll = (28 + 18 * Math.sin((pair + 1) / 13 * Math.PI)) * (.9 + noise(seed) * .2);
        for (const side of [-1, 1]) {
          const angle = side * (1.14 - .81 * fold) + (noise(seed + side + 29) - .5) * .14;
          this.leaflet(xx + side * 1.2, bend + side * 1.5, angle, ll * (side > 0 ? 1 : .94), 5.5 + 1.7 * Math.sin(pair / 12 * Math.PI), seed + side, fold);
          this.ellipse(xx, bend + side * 2, 2.2, 1.2, '#829d4d');
        }
        const arrival = signalArrival(pinna, pair, settings), glow = Math.max(0, 1 - Math.abs(p - arrival) / .035);
        if (glow > 0) { const g = c.createRadialGradient(xx, bend, 0, xx, bend, 19); g.addColorStop(0, `rgba(238,188,54,${glow * .9})`); g.addColorStop(1, '#f2bf2b00'); this.ellipse(xx, bend, 19, 19, g); }
      }
      if (pinna === settings.pinna && p < .12) {
        c.beginPath(); c.arc(length - 6, -6, 19, 0, Math.PI * 2); c.strokeStyle = '#b88f38bb'; c.lineWidth = 1.4; c.setLineDash([3, 4]); c.stroke(); c.setLineDash([]);
      }
      c.restore();
    }
    this.ellipse(origin[0], origin[1] + 4, 11, 6.5, '#8a9e5e', '#647844');
    this.label(t('主叶枕'), 165, 126, { background: '#fcfbf1db', color: '#405941', anchor: [origin[0] + 4, origin[1] + 7], width: 110 });
    this.label(t('点一下，观察收拢'), -184, 165, { background: '#fcfbf1db', color: '#58663e', width: 230 });
  }
  private roundedPath(points: Point[]) {
    const c = this.context, last = points[points.length - 1]!, first = points[0]!;
    c.beginPath(); c.moveTo((last[0] + first[0]) / 2, (last[1] + first[1]) / 2);
    points.forEach((point, i) => {
      const next = points[(i + 1) % points.length]!;
      c.quadraticCurveTo(point[0], point[1], (point[0] + next[0]) / 2, (point[1] + next[1]) / 2);
    });
    c.closePath();
  }
  private cellContour(cell: TissueCell, bend: number, sx = 1, sy = sx, dx = 0, dy = 0) {
    this.roundedPath(cell.outline.map(([x, y]) => tissuePoint(cell.center[0] + (x - cell.center[0]) * sx + dx, cell.center[1] + (y - cell.center[1]) * sy + dy, bend)));
  }
  private motorCell(cell: TissueCell, bend: number, water: number, detailed: boolean) {
    const c = this.context, [x, y] = tissuePoint(...cell.center, bend);
    const light = c.createLinearGradient(x - 19, y - 24, x + 23, y + 21);
    light.addColorStop(0, '#fcf8df'); light.addColorStop(.45, '#dfe5ba'); light.addColorStop(1, '#a4bb83');
    this.cellContour(cell, bend); c.fillStyle = light; c.fill();
    c.lineWidth = 3.4; c.strokeStyle = '#64825b88'; c.stroke();
    c.lineWidth = 1.5; c.strokeStyle = '#f6f2ce'; c.stroke();
    c.save(); this.cellContour(cell, bend, .94); c.clip();
    const cytoplasm = c.createRadialGradient(x - 8, y - 11, 0, x, y, 31);
    cytoplasm.addColorStop(0, '#f5f1c4'); cytoplasm.addColorStop(1, '#b8c993');
    this.cellContour(cell, bend, .93); c.fillStyle = cytoplasm; c.fill();
    // The plasma membrane stays close to the flexible wall: this is turgor change,
    // not a cartoon of a ruptured cell or severe plasmolysis.
    this.cellContour(cell, bend, .90); c.lineWidth = .95; c.strokeStyle = '#4d87818c'; c.stroke();
    const vacuole = c.createRadialGradient(x - 8, y - 8, 1, x + 5, y + 6, 31);
    vacuole.addColorStop(0, '#e0f1e7'); vacuole.addColorStop(.25, '#abd9d4'); vacuole.addColorStop(.68, '#64b1b5'); vacuole.addColorStop(1, '#418a9e');
    const vx = .57 + .15 * water, vy = .34 + .39 * water;
    this.cellContour(cell, bend, vx, vy, 2, 1);
    c.fillStyle = vacuole; c.fill(); c.lineWidth = .85; c.strokeStyle = '#377e8e9c'; c.stroke();
    c.save(); this.cellContour(cell, bend, vx, vy, 2, 1); c.clip();
    const glint = c.createRadialGradient(x - 10, y - 10, 0, x - 7, y - 4, 25);
    glint.addColorStop(0, '#fffef5bd'); glint.addColorStop(.5, '#ebffff23'); glint.addColorStop(1, '#ebffff00');
    this.ellipse(x, y, 30, 28, glint);
    for (let i = 0; i < (detailed ? 27 : 6); i++) {
      const px = cell.center[0] + (noise(cell.id * 20 + i) - .5) * 33;
      const py = cell.center[1] + (noise(cell.id * 30 + i + 3) - .5) * 25;
      const q = tissuePoint(px, py, bend);
      this.ellipse(...q, .26 + noise(i + cell.id) * .23, .32, '#f3fff889');
    }
    c.restore();
    const nucleus = tissuePoint(cell.center[0] - 12, cell.center[1] - 5, bend);
    const nuclearLight = c.createRadialGradient(nucleus[0] - 1, nucleus[1] - 2, 0, ...nucleus, 5.5);
    nuclearLight.addColorStop(0, '#dad0be'); nuclearLight.addColorStop(.5, '#a79e91'); nuclearLight.addColorStop(1, '#7c887e');
    this.ellipse(...nucleus, 4.5, 3.4, nuclearLight, '#74857770');
    this.ellipse(nucleus[0] - .6, nucleus[1] + .2, 1.1, 1.2, '#728379');
    const tannin = tissuePoint(cell.center[0] - 9, cell.center[1] + 7, bend);
    const tanninLight = c.createRadialGradient(tannin[0] - 1, tannin[1] - 1, 0, ...tannin, 5);
    tanninLight.addColorStop(0, '#e0cc9b'); tanninLight.addColorStop(.55, '#b29b66'); tanninLight.addColorStop(1, '#887947');
    this.ellipse(...tannin, 4.6, 3.4, tanninLight, '#8c805a9c');
    if (detailed) {
      // Small cytoplasmic inclusions provide depth without claiming a complete organelle inventory.
      for (let i = 0; i < 18; i++) {
        const a = i / 18 * Math.PI * 2, q = tissuePoint(cell.center[0] + Math.cos(a) * 19, cell.center[1] + Math.sin(a) * 13, bend);
        this.ellipse(...q, .8, .45, i % 3 ? '#b8a76c9a' : '#6f9a867c');
      }
    }
    c.restore();
    // Soft rim light follows the same material boundary as the cell wall.
    this.cellContour(cell, bend, .985); c.lineWidth = .55; c.strokeStyle = '#ffffedb3'; c.stroke();
  }
  private organOutline(bend: number) {
    const points: Point[] = [];
    for (let i = 0; i <= 40; i++) {
      const u = i / 40, height = 16 + 82 * Math.pow(Math.sin(u * Math.PI), .62);
      points.push(tissuePoint(-190 + 380 * u, -height, bend));
    }
    for (let i = 40; i >= 0; i--) {
      const u = i / 40, height = 16 + 82 * Math.pow(Math.sin(u * Math.PI), .62);
      points.push(tissuePoint(-190 + 380 * u, height, bend));
    }
    this.roundedPath(points);
  }
  private longitudinalPath(y: number, bend: number, from = -335, to = 335) {
    const c = this.context; c.beginPath();
    for (let i = 0; i <= 70; i++) {
      const point = tissuePoint(from + (to - from) * i / 70, y, bend);
      if (i) c.lineTo(...point); else c.moveTo(...point);
    }
  }
  private pulvinus(p: number, settings: TouchSettings, detail: number) {
    const c = this.context, state = primaryPulvinus(p, settings), bend = state.contraction;
    const focus = tissuePoint(...this.focusCell.center, bend), zoom = 1 + detail * 4.7;
    // Zoom into the same lower-side cell. Its wall, vacuole and neighbours never swap identities.
    const tx = (-45 - focus[0] * zoom) * detail, ty = -37 * (1 - detail) - focus[1] * zoom * detail;
    const screenPoint = (x: number, y: number): Point => {
      const point = tissuePoint(x, y, bend); return [point[0] * zoom + tx, point[1] * zoom + ty];
    };
    c.save(); c.translate(tx, ty); c.scale(zoom, zoom);
    c.save(); c.globalAlpha *= 1 - detail * .87;
    // Continuous petiole and vascular core share the organ's bent centreline.
    this.longitudinalPath(0, bend); c.lineWidth = 28; c.strokeStyle = '#688855'; c.lineCap = 'round'; c.stroke();
    this.longitudinalPath(-5, bend); c.lineWidth = 7; c.strokeStyle = '#b9c991'; c.stroke();
    this.longitudinalPath(7, bend); c.lineWidth = 5; c.strokeStyle = '#436d4775'; c.stroke();
    const tissue = c.createLinearGradient(-100, -112, 40, 138);
    tissue.addColorStop(0, '#c5d4a3'); tissue.addColorStop(.3, '#ecedc9'); tissue.addColorStop(.76, '#bdd09c'); tissue.addColorStop(1, '#789564');
    this.organOutline(bend); c.shadowColor = '#294b332b'; c.shadowBlur = 12; c.shadowOffsetY = 8;
    c.fillStyle = tissue; c.fill(); c.shadowColor = 'transparent'; c.shadowOffsetY = 0;
    c.lineWidth = 5; c.strokeStyle = '#789660'; c.stroke(); c.lineWidth = 2; c.strokeStyle = '#d9dfb3'; c.stroke();
    c.restore();
    c.save(); this.organOutline(bend); c.clip();
    for (const cell of this.cells) {
      if (cell.id === this.focusCell.id) continue;
      c.save(); c.globalAlpha *= 1 - detail * .92;
      this.motorCell(cell, bend, cell.lower ? state.lowerWater : state.upperWater, false); c.restore();
    }
    c.save(); c.globalAlpha *= 1 - detail * .94;
    const core = c.createLinearGradient(0, -16, 0, 17);
    core.addColorStop(0, '#bba875'); core.addColorStop(.36, '#f5e1ac'); core.addColorStop(.6, '#d4bd87'); core.addColorStop(1, '#8f9260');
    this.longitudinalPath(0, bend); c.lineWidth = 20; c.strokeStyle = core; c.stroke();
    for (const offset of [-5, 0, 5]) {
      this.longitudinalPath(offset, bend); c.lineWidth = 2.3; c.strokeStyle = offset ? '#f3e4b9' : '#9a9864'; c.stroke();
      for (let i = 0; i < 23; i++) {
        const a = tissuePoint(-188 + i * 17, offset - 1.7, bend), b = tissuePoint(-185 + i * 17, offset + 1.7, bend);
        this.path([a, b], undefined, '#98845782', .75);
      }
    }
    if (settings.extent === 'whole' && p > .23 && p < .36) {
      const q = tissuePoint(185 - (p - .23) / .13 * 340, 0, bend);
      const glow = c.createRadialGradient(...q, 0, ...q, 30);
      glow.addColorStop(0, '#f5d78cab'); glow.addColorStop(1, '#edc35400'); this.ellipse(...q, 30, 22, glow);
    }
    c.restore();
    this.motorCell(this.focusCell, bend, state.lowerWater, detail > .5);
    if (detail < 1 && state.flux > .005) {
      c.save(); c.globalAlpha *= (1 - detail) * state.flux * .8;
      // Dashed guides summarize redistribution through neighbouring tissue;
      // they are annotations, not three invented anatomical water pipes.
      for (const x of [-104, -13, 82]) {
        const start = tissuePoint(x, 49, bend), control = tissuePoint(x - 43, 4, bend), end = tissuePoint(x - 7, -48, bend);
        c.beginPath(); c.moveTo(...start); c.quadraticCurveTo(...control, ...end);
        c.lineWidth = 1.2; c.strokeStyle = '#468e9c'; c.setLineDash([2, 4]); c.stroke(); c.setLineDash([]);
        const f = bend, q: Point = [(1-f)**2*start[0]+2*(1-f)*f*control[0]+f*f*end[0], (1-f)**2*start[1]+2*(1-f)*f*control[1]+f*f*end[1]];
        this.ellipse(...q, 2.7, 3.5, '#d8f6ed', '#4b9caa');
        const tip = state.recovering ? start : end, base = control;
        const angle = Math.atan2(tip[1] - base[1], tip[0] - base[0]);
        this.path([[tip[0]-Math.cos(angle-.45)*6,tip[1]-Math.sin(angle-.45)*6], tip, [tip[0]-Math.cos(angle+.45)*6,tip[1]-Math.sin(angle+.45)*6]], undefined, '#468e9c', 1.3);
      }
      c.restore();
    }
    if (detail < .95) {
      this.cellContour(this.focusCell, bend, 1.06); c.strokeStyle = '#bd984b'; c.lineWidth = 1.5; c.setLineDash([3, 3]); c.stroke(); c.setLineDash([]);
    }
    c.restore(); c.restore();

    if (detail < 1) {
      c.save(); c.globalAlpha *= 1 - detail;
      this.label(t('上侧运动组织'), -145, -179, { width: 205, background: '#fffef2e8', color: '#50634a', anchor: screenPoint(-73, -64) });
      this.label(t('下侧：失水后支撑减弱'), -155, 174, { width: 245, background: '#fffef2e8', color: '#456866', anchor: screenPoint(-64, 59) });
      this.label(t('中央维管束'), 223, -104, { width: 170, background: '#fffef2e8', color: '#7c714e', anchor: screenPoint(74, 0) });
      this.label(t('叶柄'), 285, 179, { width: 105, background: '#fffef2e8', color: '#50634a', anchor: screenPoint(284, 0) });
      const q = screenPoint(...this.focusCell.center);
      this.label(t('继续放大这一个细胞'), 68, 231, { width: 280, background: '#fffef2e8', color: '#866d36', anchor: q });
      c.restore();
    }
    if (detail > 0) {
      c.save(); c.globalAlpha *= detail;
      const [cx, cy] = this.focusCell.center;
      this.label(t('细胞壁'), 237, -143, { width: 150, color: '#647d50', background: '#fffef2ef', anchor: screenPoint(cx + 21, cy - 9) });
      this.label(t('贴近壁的细胞膜'), 248, -36, { width: 166, color: '#4d8781', background: '#fffef2ef', anchor: screenPoint(cx + 18, cy + 4) });
      this.label(t('液泡与液泡膜'), 233, 90, { width: 175, color: '#377e8e', background: '#fffef2ef', anchor: screenPoint(cx + 3, cy + 1) });
      this.label(t('细胞核'), -268, -137, { width: 150, color: '#6f746b', background: '#fffef2ef', anchor: screenPoint(cx - 12, cy - 5) });
      this.label(t('含单宁液泡'), -244, 124, { width: 178, color: '#887344', background: '#fffef2ef', anchor: screenPoint(cx - 9, cy + 7) });
      if (state.flux > .005) {
        // Short paths end in the adjoining intercellular space, never outside the plant.
        c.save(); c.globalAlpha *= state.flux;
        for (let i = 0; i < 3; i++) {
          const from = screenPoint(cx + 3 + i * 5, cy + 6), to = screenPoint(cx + 8 + i * 6, cy + 22);
          this.arrow(...(state.recovering ? to : from), ...(state.recovering ? from : to), '#3d95a6', 1.6);
          const f = state.contraction, ion = [from[0] + (to[0] - from[0]) * f, from[1] + (to[1] - from[1]) * f] as Point;
          this.ellipse(...ion, 3, 3, '#cea451', '#aa8644');
        }
        c.restore();
      }
      this.label(state.recovering ? t('水分与膨压逐步恢复') : bend > .08 ? t('液泡体积减小，细胞仍完整') : t('水分充足，膨压支撑细胞'), 0, 225, { width: 430, background: '#fffef2ef', color: '#436c68' });
      c.restore();
    }
  }
}
