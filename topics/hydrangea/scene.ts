import { CanvasSurface } from '../../src/visuals/canvasSurface.ts';
import { bloomState, type GardenConditions } from './model.ts';
import { t } from './i18n.ts';
const noise = (n: number) => { const x = Math.sin(n * 92.73 + 34.7) * 47586.3; return x - Math.floor(x); };
export class HydrangeaScene extends CanvasSurface {
  private p = 1;
  private planted: GardenConditions = { ph: 5.3, aluminum: .8, cultivar: 'pigmented' };
  private view = 'plant';
  constructor(canvas: HTMLCanvasElement) { super(canvas); this.onResize(() => this.draw(this.p, this.planted, this.view)); }
  draw(p: number, planted: GardenConditions, view: string) {
    this.p = p; this.planted = planted; this.view = view;
    const c = this.begin('#e5eada', '#f7f4eb');
    for (let i = 0; i < 26; i++) {
      const x = (noise(i) - .5) * 850, y = (noise(i + 51) - .5) * 540, r = 30 + noise(i + 120) * 105;
      const g = c.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, i % 3 ? '#7ea77d20' : '#fffefac5'); g.addColorStop(1, '#d5e4d000'); this.ellipse(x, y, r, r, g);
    }
    if (view === 'plant') this.plant(p, planted); else this.cell(p, planted);
    this.end();
  }
  private leaf(x: number, y: number, angle: number, length: number, width: number, seed: number) {
    const c = this.context; c.save(); c.translate(x, y); c.rotate(angle);
    const g = c.createLinearGradient(0, -width, length, width); g.addColorStop(0, '#315c48'); g.addColorStop(.45, '#568467'); g.addColorStop(1, '#254f3d');
    c.beginPath(); c.moveTo(0, 0);
    for (let side = -1; side <= 1; side += 2) for (let j = 0; j <= 26; j++) {
      const a = side < 0 ? j / 26 : 1 - j / 26;
      const edge = Math.sin(a * Math.PI) ** .83 * width * (1 + (j % 2 ? -.06 : .04) + noise(j + seed) * .06);
      c.lineTo(a * length, side * edge * (side < 0 ? 1 : .91));
    }
    c.closePath(); c.fillStyle = g; c.shadowColor = '#20433328'; c.shadowBlur = 8; c.shadowOffsetY = 5; c.fill(); c.shadowColor = 'transparent'; c.strokeStyle = '#325c4580'; c.lineWidth = 1; c.stroke();
    c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(length * .62, 4, length, 0); c.strokeStyle = '#a5be7caa'; c.lineWidth = 1.7; c.stroke();
    for (let v = 1; v < 8; v++) for (const side of [-1, 1]) {
      const xx = length * v / 9, yy = side * width * Math.sin((v + .5) / 9 * Math.PI) * .92;
      c.beginPath(); c.moveTo(xx * .78, 1); c.quadraticCurveTo(xx + 9, yy * .38, xx + 10, yy); c.strokeStyle = '#a3bd7d65'; c.lineWidth = .8; c.stroke();
      for (let k = 1; k < 3; k++) { c.beginPath(); c.moveTo(xx + k, yy * k / 3); c.lineTo(xx + length / 10, yy * (k + .4) / 3); c.strokeStyle = '#adc89427'; c.lineWidth = .5; c.stroke(); }
    }
    c.restore();
  }
  private floret(x: number, y: number, size: number, hue: number, saturation: number, light: number, seed: number, rotation: number) {
    const c = this.context; c.save(); c.translate(x, y); c.rotate(rotation);
    for (let petal = 0; petal < 4; petal++) {
      c.save(); c.rotate(petal * Math.PI / 2 + (noise(seed + petal) - .5) * .19);
      const len = size * (1.05 + noise(seed + petal + 30) * .35), width = size * (.77 + noise(seed + petal + 9) * .16);
      const h = hue + (noise(seed + petal * 30) - .5) * 16;
      const g = c.createLinearGradient(0, 0, len, -width); g.addColorStop(0, `hsl(${h} ${saturation}% ${light - 13}%)`); g.addColorStop(.57, `hsl(${h} ${saturation}% ${light}%)`); g.addColorStop(1, `hsl(${h - 4} ${saturation - 8}% ${Math.min(97, light + 16)}%)`);
      c.beginPath(); c.moveTo(-2, 1); c.bezierCurveTo(len * .24, -width * .69, len * .84, -width, len, -width * .21); c.bezierCurveTo(len * 1.17, width * .28, len * .74, width * .81, len * .45, width * .64); c.bezierCurveTo(len * .22, width * .6, len * .14, width * .17, -2, 1);
      c.fillStyle = g; c.shadowColor = `hsla(${h} 28% 27% / .22)`; c.shadowBlur = 3; c.shadowOffsetY = 2; c.fill(); c.shadowColor = 'transparent'; c.strokeStyle = `hsla(${h} 28% 46% / .15)`; c.lineWidth = .55; c.stroke();
      for (let j = -1; j <= 1; j++) { c.beginPath(); c.moveTo(1, 1); c.quadraticCurveTo(len * .51, width * j * .14, len * .86, width * j * .28); c.strokeStyle = `hsla(${h + 4} 30% ${light - 16}% / .22)`; c.lineWidth = .55; c.stroke(); }
      c.restore();
    }
    this.ellipse(0, 0, size * .15, size * .13, '#e4dec1'); this.ellipse(-.7, -.6, size * .07, size * .06, '#f7f1d5'); c.restore();
  }
  private plant(p: number, planted: GardenConditions) {
    const c = this.context, s = bloomState(p, planted);
    c.beginPath(); c.moveTo(66, 213); c.bezierCurveTo(47, 156, 32, 66, 7, -24); c.strokeStyle = '#657c4a'; c.lineWidth = 8; c.stroke(); c.strokeStyle = '#9eae70'; c.lineWidth = 2; c.stroke();
    this.leaf(49, 128, -2.55, 212, 63, 41); this.leaf(26, 80, -.55, 209, 62, 84);
    this.leaf(17, 59, -2.95, 211, 58, 231); this.leaf(61, 162, .13, 157, 43, 333);
    this.leaf(-24, 19, -2.09, 136, 44, 562); this.leaf(45, 86, -1.11, 119, 42, 781);
    const florets: { x: number; y: number; size: number; z: number; seed: number }[] = [];
    for (let i = 0; i < 98; i++) {
      const r = Math.sqrt((i + .5) / 98), a = i * 2.39996 + (noise(i + 18) - .5) * .25;
      const x = Math.cos(a) * r * 160 + (noise(i + 64) - .5) * 14;
      const y = Math.sin(a) * r * 120 - 51 + (noise(i + 555) - .5) * 12;
      const z = Math.sqrt(1 - r * r);
      florets.push({ x, y, size: (12 + 8 * z) * (.79 + noise(i + 378) * .39), z, seed: i * 63 });
    }
    florets.sort((a, b) => a.z - b.z || a.y - b.y);
    for (const f of florets) {
      const grow = .18 + .82 * s.maturity, radial = .56 + .44 * s.maturity;
      this.floret(f.x * radial, -51 + (f.y + 51) * radial, f.size * grow, s.hue + (noise(f.seed + 16) - .5) * 14,
        s.saturation, s.lightness - 8 + f.z * 10 + (noise(f.seed + 3) - .5) * 7, f.seed, noise(f.seed + 8) * 6.28);
    }
    this.label(t('一团花序，许多小花'), -194, 157, { color: '#516253', background: '#fffef3df', width: 245 });
    this.label(t('显眼的彩色部分是萼片'), 228, -132, { color: '#516253', background: '#fffef3df', anchor: [122, -104], width: 166 });
  }
  private cell(p: number, planted: GardenConditions) {
    const c = this.context, s = bloomState(p, planted), color = `hsl(${s.hue} ${s.saturation}% ${s.lightness}%)`;
    c.beginPath(); c.moveTo(-208, -124); c.bezierCurveTo(-117, -179, 40, -165, 134, -106); c.bezierCurveTo(225, -83, 199, 53, 120, 95); c.bezierCurveTo(3, 167, -151, 127, -211, 65); c.bezierCurveTo(-243, 5, -254, -72, -208, -124); c.closePath(); c.fillStyle = '#e3ead1'; c.fill(); c.strokeStyle = '#8c9a73'; c.lineWidth = 6; c.stroke();
    c.beginPath(); c.moveTo(-181, -102); c.bezierCurveTo(-81, -146, 36, -136, 122, -85); c.bezierCurveTo(187, -58, 161, 50, 99, 72); c.bezierCurveTo(-20, 133, -152, 101, -185, 46); c.bezierCurveTo(-221, -1, -211, -61, -181, -102); c.closePath();
    const g = c.createLinearGradient(-170, -130, 160, 90); g.addColorStop(0, color); g.addColorStop(1, `hsl(${s.hue + 9} ${s.saturation - 9}% ${Math.max(45, s.lightness - 10)}%)`); c.fillStyle = g; c.fill(); c.strokeStyle = '#ffffffad'; c.lineWidth = 3; c.stroke();
    this.ellipse(-201, 63, 17, 24, '#c4b995', '#99906b');
    if (planted.cultivar !== 'white') for (let i = 0; i < 13; i++) {
      const x = -148 + noise(i + 70) * 278, y = -73 + noise(i + 170) * 134;
      const bound = i / 13 < s.blue * s.maturity;
      c.save(); c.translate(x, y); c.rotate(noise(i) * 6.28);
      this.ellipse(0, 0, 8, 6, bound ? '#6e77cd' : '#c64f8d', '#fff9');
      if (bound) { this.path([[-15, 3], [-8, 1], [0, 0], [12, -8]], undefined, '#f3ead5', 1.4); this.ellipse(-17, 3, 4, 4, '#e5b662'); this.ellipse(14, -9, 6, 4, '#bccf9a'); }
      c.restore();
    }
    this.label(t('萼片细胞'), -257, -161, { background: '#fffef5e6', color: '#546052', anchor: [-202, -122], width: 140 });
    this.label(t('液泡：花青素的主要位置'), 19, 171, { background: '#fffef5e6', color: '#546052', anchor: [17, 100], width: 320 });
    this.label(planted.cultivar === 'white' ? t('缺少这一路显色色素') : s.maturity < .3 ? t('显色结构正在形成') : s.blue > .4 ? t('花青素 + 铝 + 辅色素') : t('缺少可形成蓝色复合物的铝'), 6, -189, { background: '#fffef5e6', color: '#546052', width: 355 });
  }
}
