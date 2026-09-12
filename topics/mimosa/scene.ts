import { CanvasSurface } from '../../src/visuals/canvasSurface.ts';
import { leafletFold, response, signalArrival, type TouchSettings } from './model.ts';
import { t } from './i18n.ts';

const noise = (n: number) => { const x = Math.sin(n * 127.13 + 31.17) * 43758.5453; return x - Math.floor(x); };
export class MimosaScene extends CanvasSurface {
  private p = 0;
  private settings: TouchSettings = { pinna: 1, extent: 'local' };
  private view = 'plant';
  constructor(canvas: HTMLCanvasElement) { super(canvas); this.onResize(() => this.draw(this.p, this.settings, this.view)); }
  draw(p: number, settings: TouchSettings, view: string) {
    this.p = p; this.settings = settings; this.view = view;
    const c = this.begin('#e2e9d9', '#f5f3e7');
    for (let i = 0; i < 22; i++) {
      const x = (noise(i) - .5) * 850, y = (noise(i + 50) - .5) * 570, r = 24 + noise(i + 100) * 110;
      const g = c.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, i % 3 ? '#9bb77a22' : '#fffefca0'); g.addColorStop(1, '#d1dfbc00');
      this.ellipse(x, y, r, r, g);
    }
    if (view === 'plant') this.plant(p, settings); else this.pulvinus(p, settings);
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
  private pulvinus(p: number, settings: TouchSettings) {
    const c = this.context, s = response(p, settings), bend = s.fold * .49;
    c.save(); c.translate(0, -5);
    c.beginPath(); c.moveTo(-340, -16); c.bezierCurveTo(-246, -19, -203, -28, -144, -21); c.lineTo(-145, 23); c.bezierCurveTo(-233, 29, -280, 20, -340, 22); c.fillStyle = '#829c64'; c.fill();
    c.save(); c.rotate(-bend); c.beginPath(); c.moveTo(115, -29); c.quadraticCurveTo(220, -40, 329, -29); c.lineTo(327, -1); c.quadraticCurveTo(218, 13, 113, 28); c.closePath(); c.fillStyle = '#829c64'; c.fill();
    this.leaflet(188, -29, -.3, 152, 33, 512); c.restore();
    const outline = c.createLinearGradient(0, -105, 0, 110); outline.addColorStop(0, '#c8d39c'); outline.addColorStop(.5, '#e5ead0'); outline.addColorStop(1, '#879c57');
    c.beginPath(); c.moveTo(-145, -24); c.bezierCurveTo(-126, -106, 45, -110, 125, -28); c.bezierCurveTo(141, 7, 83, 105 - s.fold * 44, -42, 103 - s.fold * 35); c.bezierCurveTo(-124, 93 - s.fold * 30, -150, 58, -145, -24); c.fillStyle = outline; c.fill(); c.strokeStyle = '#6e8559'; c.lineWidth = 2; c.stroke();
    for (const side of [-1, 1]) for (let i = 0; i < 8; i++) {
      const seed = i + (side > 0 ? 58 : 103), x = -114 + (i % 4) * 59 + noise(seed) * 8, row = Math.floor(i / 4);
      const water = side > 0 ? s.water : .92, y = side * (27 + row * 29 + (noise(seed + 3) - .5) * 8) * (side > 0 ? 1 - s.fold * .22 : 1);
      c.beginPath(); c.ellipse(x, y, 23 + noise(seed + 4) * 4, (12 + noise(seed + 9) * 4) * (.6 + water * .4), .15 * (noise(i) - .5), 0, Math.PI * 2); c.fillStyle = '#eef2d7'; c.fill(); c.strokeStyle = '#849756'; c.lineWidth = 1; c.stroke();
      c.beginPath(); c.ellipse(x + 1, y, 20 * (.62 + water * .38), 10.8 * (.32 + water * .68), 0, 0, Math.PI * 2); c.fillStyle = `rgba(96,178,198,${.25 + water * .38})`; c.fill();
      for (let d = 0; d < 3; d++) this.ellipse(x - 10 + d * 8, y + (noise(i + d * 7) - .5) * 7, 1.3, 1.3, '#e9fcfa');
    }
    c.beginPath(); c.moveTo(-155, 0); c.bezierCurveTo(-60, -4, 20, 7, 129, -6); c.strokeStyle = '#d5b075'; c.lineWidth = 8; c.stroke();
    if (s.fold > .05) for (let i = 0; i < 5; i++) {
      const x = -106 + i * 49, y = 63 + noise(i + 330) * 10;
      this.arrow(x, s.recovering ? y + 54 : y, x - 8, s.recovering ? y : y + 54, '#579aaf', 1.7);
      this.ellipse(x + 7, y + 29, 3.5, 3.5, '#e4b250');
    }
    c.restore();
    this.label(t('叶枕两侧的运动细胞'), 0, -153, { background: '#fffef4e3', color: '#405944', width: 300 });
    this.label(t('水分重新分配，膨压产生差异'), 0, 168, { background: '#fffef4e3', color: '#405944', width: 340 });
    this.label(t('维管组织'), -252, 81, { background: '#fffef4e3', color: '#766344', anchor: [-185, 0], width: 145 });
  }
}
