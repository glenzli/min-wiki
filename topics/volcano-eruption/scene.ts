import { CanvasSurface } from '../../src/visuals/canvasSurface.ts';
import { terrain as baseTerrain, ventPositions, explosivity, activity, smooth } from './model.ts';
import type { Settings } from './model.ts';
import { t } from './i18n.ts';
const seed = (i: number) => (Math.sin(i * 127.1 + 311.7) * 43758.5453 % 1 + 1) % 1;
type Point = [number, number];


// Fixed spatial variation: rock shapes remain stable while the teaching time changes.
const roughness = (x: number) => 3.4 * Math.sin(x * .073 + .8) + 1.9 * Math.sin(x * .177 + 2.1) + .9 * Math.sin(x * .39);
const outline = (cx: number, cy: number, rx: number, ry: number, phase = 0): Point[] => Array.from({ length: 97 }, (_, i) => {
  const a = i / 96 * Math.PI * 2, r = 1 + .13 * Math.sin(3 * a + phase) + .07 * Math.cos(5 * a + .6 + phase) + .035 * Math.sin(9 * a + 1.3);
  return [cx + Math.cos(a) * rx * r + Math.sin(a) * rx * .08, cy + Math.sin(a) * ry * r];
});
const terrain = (x: number) => baseTerrain(x) + roughness(x) + 8 * Math.sin(x * .012 + .4) * Math.exp(-((x / 270) ** 2));

export class TopicScene {
  private surface: CanvasSurface;
  private p = 0;
  private settings: Settings = { vents: 3, gas: .65, viscosity: .55 };
  constructor(canvas: HTMLCanvasElement) { this.surface = new CanvasSurface(canvas); this.surface.onResize(() => this.draw(this.p, this.settings)); }
  draw(progress: number, settings: Settings, _view = 'overview') {
    this.p = progress; this.settings = settings;
    const s = this.surface, c = s.begin('#172535', '#b18b73');
    const vents = ventPositions(settings.vents), intensity = activity(progress), explosive = explosivity(settings);
    const profile: Point[] = Array.from({ length: 181 }, (_, i) => { const x = -378 + i * 4.2; return [x, terrain(x)]; });
    // Atmospheric ridges and a warm horizon keep the cutaway in a landscape.
    const haze = c.createRadialGradient(220, -130, 2, 220, -130, 280);
    haze.addColorStop(0, '#efd7a549'); haze.addColorStop(1, '#e5b27d00'); s.ellipse(220, -130, 280, 210, haze);
    for (let layer = 0; layer < 4; layer++) {
      const ridge: Point[] = Array.from({ length: 90 }, (_, i) => { const x = -410 + i * 9.4; return [x, 54 + layer * 13 - Math.abs(Math.sin(x * .008 + layer * 1.9)) * (65 - layer * 8) + Math.sin(x * .033) * 7]; });
      s.path([...ridge, [430, 220], [-420, 220]], ['#777e83', '#677278', '#535f63', '#434f51'][layer]);
    }
    // The rear flank is lit; the front face is a geological section.
    s.path([...profile.map(([x, y]) => [x + 24, y - 24] as Point), ...profile.slice().reverse()], '#817464', '#b69a76', 1);
    for (let i = 0; i < 38; i++) {
      const x = -365 + i * 19 + (seed(i + 22) - .5) * 13;
      s.path([[x, terrain(x)], [x + 24, terrain(x) - 24]], undefined, i % 3 ? '#d3b38a33' : '#342d3338', 1);
    }
    const ground = c.createLinearGradient(-210, -50, 160, 230);
    ground.addColorStop(0, '#a88a6f'); ground.addColorStop(.38, '#716052'); ground.addColorStop(1, '#342c32');
    s.path([...profile, [378, 223], [-378, 223]], ground, '#c4a082', 1.4);
    c.save(); c.beginPath(); profile.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.lineTo(378, 223); c.lineTo(-378, 223); c.closePath(); c.clip();
    // Filled strata, fine laminae and fractures have different spatial scales.
    for (let j = 0; j < 12; j++) {
      const line: Point[] = Array.from({ length: 90 }, (_, i) => { const x = -390 + i * 9; return [x, 10 + j * 21 + Math.sin(x * (.009 + seed(j + 20) * .006) + j * .43) * (4 + seed(j + 50) * 6) + roughness(x + j * 21) * .42 + seed(j + 90) * 8 - Math.exp(-((x / 150) ** 2)) * 16]; });
      s.path([...line, ...line.slice().reverse().map(([x, y]) => [x, y + 5 + seed(j + 140) * 9 + Math.sin(x * .027 + j) * 2] as Point)], ['#c6a78322', '#332f3430', '#e9c09a18'][j % 3]);
      s.path(line, undefined, '#e0c5a244', .8);
    }
    for (let i = 0; i < 1300; i++) {
      const x = -380 + seed(i) * 760, y = -75 + seed(i + 1700) * 300;
      s.path([[x, y], [x + 1 + seed(i + 3000) * 4, y - .6]], undefined, i % 3 ? '#f8d8b221' : '#191e2730', .6);
    }
    for (let i = 0; i < 22; i++) {
      const x = -350 + i * 33 + seed(i + 32) * 19, y = 55 + seed(i + 600) * 85;
      s.path([[x, y], [x + 5, y + 13], [x + 1, y + 23], [x + 8, y + 38]], undefined, '#25272e50', .8);
    }
    const glow = c.createRadialGradient(0, 162, 5, 0, 162, 120);
    glow.addColorStop(0, '#f89d453e'); glow.addColorStop(1, '#e2633000'); s.ellipse(0, 162, 130, 82, glow);
    const reach = smooth(.02, .30, progress), cooling = smooth(.84, 1, progress);
    for (const vx of vents) {
      const bendA = vx < 0 ? -30 : 17, bendB = vx * .42 + (vx < 0 ? 19 : -22);
      const conduit = (width: number, color: string | CanvasGradient) => {
        const edges: Point[][] = [-1, 1].map(side => Array.from({ length: 61 }, (_, i) => {
          const u = i / 60, v = 1 - u;
          const x = 3 * v * v * u * bendA + 3 * v * u * u * bendB + u ** 3 * vx;
          const y = v ** 3 * 163 + 3 * v * v * u * 105 + 3 * v * u * u * 72 + u ** 3 * terrain(vx);
          const dx = 3 * v * v * bendA + 6 * v * u * (bendB - bendA) + 3 * u * u * (vx - bendB);
          const dy = 3 * v * v * (105 - 163) + 6 * v * u * (72 - 105) + 3 * u * u * (terrain(vx) - 72);
          const radius = width * .5 * (1 + .18 * Math.sin(u * 21 + vx) + .1 * Math.sin(u * 43 + .7));
          const length = Math.hypot(dx, dy);
          return [x - side * dy / length * radius, y + side * dx / length * radius];
        }));
        s.path([...edges[0], ...edges[1].reverse()], color);
      };
      conduit(19, '#30252b');
      conduit(13, '#945039');
      c.save(); c.beginPath(); c.rect(-400, 165 - reach * 230, 800, 240); c.clip();
      const lava = c.createLinearGradient(0, 160, vx, terrain(vx));
      lava.addColorStop(0, '#ffb95d'); lava.addColorStop(.55, '#f37534'); lava.addColorStop(1, cooling > .6 ? '#9e4b38' : '#ffca70');
      conduit(9, lava);
      conduit(2, '#ffe6a177');
      for (let i = 0; i < 17; i++) {
        const u = (i / 17 + progress * 2.6) % 1, v = 1 - u;
        if (u > reach) continue;
        const x = 3 * v * v * u * bendA + 3 * v * u * u * bendB + u ** 3 * vx;
        const y = v ** 3 * 163 + 3 * v * v * u * 105 + 3 * v * u * u * 72 + u ** 3 * terrain(vx);
        s.ellipse(x, y, (.7 + u * 2.5) * settings.gas, (1 + u * 3.7) * settings.gas, '#552c2499', '#ffdf9699');
      }
      c.restore();
    }
    const magma = c.createRadialGradient(-25, 157, 1, 0, 165, 85);
    magma.addColorStop(0, '#ffe29b'); magma.addColorStop(.4, '#ef9a46'); magma.addColorStop(.8, '#b14c2f'); magma.addColorStop(1, '#5e3030');
    const chamber = outline(0, 166, 82, 30, .4);
    s.path(chamber, magma, '#da8c54');
    c.save(); s.path(chamber); c.clip();
    for (let i = 0; i < 14; i++) {
      const line: Point[] = Array.from({ length: 40 }, (_, j) => { const x = -85 + j * 4.4; return [x, 143 + i * 3.7 + Math.sin(x * .038 + i * .48 + progress * 5) * 3]; });
      s.path(line, undefined, i % 3 ? '#ffcc742f' : '#78322f45', 1.3);
    }
    for (let i = 0; i < 35; i++) {
      const x = (seed(i + 3500) - .5) * 140, y = 143 + seed(i + 4500) * 47;
      s.ellipse(x, y, 1 + seed(i + 5500), 1.1, '#7e3a2b70');
    }
    c.restore(); c.restore();
    // Soft entraining ash rises separately from ballistic incandescent clasts.
    vents.forEach((vx, vi) => {
      const vy = terrain(vx), count = Math.round(190 / vents.length);
      if (explosive > .25 && intensity > .01) {
        for (let i = 0; i < 70; i++) {
          const age = (seed(i + vi * 103) + progress * 2.3) % 1;
          const x = vx + Math.sin(i * 4.8) * (5 + age * 42) + age * age * (39 + seed(i + 60) * 35);
          const y = vy - 8 - intensity * (12 + age * 190), r = (4 + age * 26) * (.7 + seed(i + 330) * .65);
          const ash = c.createRadialGradient(x - r * .3, y - r * .35, 0, x, y, r);
          ash.addColorStop(0, '#d3c1ac'); ash.addColorStop(.5, '#8b8884'); ash.addColorStop(1, '#555b6600');
          c.save(); c.globalAlpha = intensity * explosive * Math.sin(Math.PI * age) * .42; s.path(outline(x, y, r * 1.25, r, i * 1.7), ash); c.restore();
        }
      }
      for (let i = 0; i < count; i++) {
        const age = (i / count + progress * (6.5 + vi * .09)) % 1, side = seed(i + vi * 500) - .5;
        const h = intensity * (12 + settings.gas * (90 + explosive * 90)) * (.65 + seed(i + vi * 41 + 990) * .7);
        const x = vx + side * age * (80 + explosive * 180) * (.7 + seed(i + 920) * .6), y = vy - h * 4 * age * (1 - age);
        if (settings.gas < .06 || intensity < .01 || y > vy - 1) continue;
        const r = .9 + seed(i + 200) * 1.2;
        s.path([[x - side * 2, y + h * (1 - 2 * age) * .025], [x, y]], undefined, '#fa9c4855', r * 2);
        s.ellipse(x, y, r, r * 1.2, i % 5 ? '#ffb768' : '#ffe6aa');
      }
      const growth = smooth(.38, .78, progress), extent = growth * (110 + (1 - settings.viscosity) * 130);
      for (const direction of vx === 0 ? [-1, 1] : [Math.sign(vx)]) {
        const path: Point[] = Array.from({ length: 61 }, (_, j) => { const x = vx + direction * extent * j / 60; return [x, terrain(x) - 2 - Math.sin(j * .6) * .7]; });
        if (growth > .001) {
          s.path(path, undefined, '#e4783830', 18 - cooling * 9);
          s.path(path, undefined, '#542f2d', 10);
          s.path(path, undefined, cooling > .65 ? '#72524a' : '#d96330', 7);
          c.save(); c.globalAlpha = 1 - cooling * .92;
          s.path(path, undefined, '#ffb754', 2.4 + (1 - settings.viscosity) * 1.8);
          for (let j = 3; j < path.length - 2; j += 5) {
            const [x, y] = path[j]; s.path([[x - 2, y - 3], [x, y - 1], [x + 3, y + 2]], undefined, '#ffe39a', .8);
          }
          c.restore();
        }
      }
      s.path(outline(vx, vy, 12, 4.5, vi * 2), '#392b2b', '#ae7655');
      s.path(outline(vx, vy - .5, 7.5, 2.4, vi * 2), intensity > .03 ? '#ffc671' : '#654033');
    });
    s.label(t('岩浆储存区'), -231, 184, { anchor: [-66, 170], width: 170 });
    s.label(t('山顶喷口'), -5, -108, { anchor: [0, terrain(0)], width: 155 });
    if (vents.length > 1) s.label(t('侧喷口'), 254, 40, { anchor: [126, terrain(126)], width: 140 });
    if (intensity > .15) s.label(explosive > .45 ? t('火山灰与气体') : settings.gas < .06 ? t('熔岩流') : t('熔岩喷泉与熔岩流'), 220, -184, { width: 200 });
    s.end();
  }
  dispose() { this.surface.dispose(); }
}
