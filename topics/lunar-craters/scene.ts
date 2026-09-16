import { CanvasSurface } from '../../src/visuals/canvasSurface.ts';
import { terrain as baseTerrain, craterRadius, ejectaPosition, smooth, energyRatio } from './model.ts';
import type { Settings } from './model.ts';
import { t } from './i18n.ts';
type Point = [number, number];
const seed = (i: number) => { const n = Math.sin(i * 127.1 + 81.2) * 43758.54; return n - Math.floor(n); };
const terrain = (x: number, p: number, settings: Settings) => baseTerrain(x, p, settings) + 1.6 * Math.sin(x * .13 + .3) + .8 * Math.sin(x * .33);
const rimPath = (x: number, y: number, rx: number, ry: number, phase: number): Point[] => Array.from({ length: 121 }, (_, i) => {
  const a = i / 120 * Math.PI * 2, r = 1 + .045 * Math.sin(a * 5 + phase) + .03 * Math.sin(a * 9 + 1.4) + .017 * Math.sin(a * 17 + .8);
  return [x + Math.cos(a) * rx * r, y + Math.sin(a) * ry * r];
});
export class TopicScene {
  private surface: CanvasSurface;
  private progress = 0;
  private settings: Settings = { diameter: 100, speed: 20 };
  constructor(canvas: HTMLCanvasElement) { this.surface = new CanvasSurface(canvas); this.surface.onResize(() => this.draw(this.progress, this.settings)); }
  draw(progress: number, settings: Settings, _view = 'overview') {
    this.progress = progress; this.settings = settings;
    const s = this.surface, c = s.begin('#080f1c', '#202b38'), r = craterRadius(settings);
    for (let i = 0; i < 70; i++) { const x = Math.sin(i * 7.33) * 360, y = -220 + (Math.cos(i * 4.7) * .5 + .5) * 260; s.ellipse(x, y, .8, .8, '#b9cfe35a'); }
    const profile = Array.from({ length: 151 }, (_, i) => { const x = -375 + i * 5; return [x, terrain(x, progress, settings)] as [number, number]; });
    const earth = c.createLinearGradient(0, 60, 0, 230); earth.addColorStop(0, '#8a8984'); earth.addColorStop(.16, '#747775'); earth.addColorStop(1, '#353e46');
    s.path([...profile, [375, 230], [-375, 230]], earth, '#bac0bb', 2);
    c.save(); c.beginPath(); profile.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.lineTo(375, 230); c.lineTo(-375, 230); c.closePath(); c.clip();
    for (let j = 0; j < 8; j++) s.path(Array.from({ length: 76 }, (_, i) => { const x = -375 + i * 10; return [x, 80 + j * 22 + seed(j + 50) * 7 + Math.sin(x * (.013 + seed(j) * .008) + j) * 3] as [number, number]; }), undefined, '#c2bfb514', 2);
    for (let i = 0; i < 650; i++) { const x = (seed(i + 500) - .5) * 750, y = 60 + seed(i + 1400) * 180; s.ellipse(x, y, 1 + i % 3 * .35, .7, i % 2 ? '#282f3955' : '#d0c5b327'); }
    if (progress > .345 && progress < .59) { const u = (progress - .345) / .245; c.globalAlpha = 1 - u; c.strokeStyle = '#eecb8e'; c.lineWidth = 2; c.beginPath(); c.arc(0, 64, 12 + u * r * 2, 0, Math.PI); c.stroke(); }
    c.restore();
    if (progress < .345) {
      // Accelerated presentation time, not a calibrated free-fall trajectory.
      const u = Math.min(1, progress / .345), travel = .12*u + .88*u*u*u;
      const radius = 5 + settings.diameter / 35, x = 0, y = -180 + (244-radius)*travel;
      // Short motion echoes communicate speed without suggesting an atmospheric flame.
      for (let i = 3; i >= 1; i--) {
        const earlier = Math.max(0, u - i*.018);
        const ey = -180 + (244-radius)*(.12*earlier + .88*earlier**3);
        c.save(); c.globalAlpha = u*u*.12/i;
        s.ellipse(x, ey, radius*.8, radius*.85, '#c0beb9'); c.restore();
      }
      s.path([[0, -195], [0, 64]], undefined, '#b2c1d22e', 1);
      c.save(); c.translate(x, y); c.rotate(u * 2); const points = Array.from({ length: 10 }, (_, i) => { const a = i / 10 * Math.PI * 2, rr = radius * (1 + .16 * Math.sin(i * 8)); return [Math.cos(a) * rr, Math.sin(a) * rr] as [number, number]; }); s.path(points, '#a5a19a', '#e1dacf', 1.5); c.restore();
      s.label(t('撞击体'), -150, -178, { anchor: [x - 5, y - 8], width: 170 });
    }
    if (progress >= .345 && progress < .40) {
      const u = (progress - .345) / .055, flash = c.createRadialGradient(0, 64, 0, 0, 64, 10 + u * 95);
      flash.addColorStop(0, `rgba(255,237,174,${(1 - u) * .85})`); flash.addColorStop(1, '#f7b46b00'); s.ellipse(0, 64, 10 + u * 95, 10 + u * 95, flash);
    }
    if (progress > .36) {
      const time = (progress - .36) * 72, size = Math.min(1.8, energyRatio(settings) ** .055);
      for (let i = 0; i < 200; i++) {
        const born = i % 11 * .17, age = time - born; if (age < 0) continue;
        const angle = (.25 + ((i * 37) % 101) / 101 * .9), speed = (12 + i % 29 * .42) * size, [dx, height] = ejectaPosition(speed, angle, age);
        const x = (i % 2 ? 1 : -1) * dx * .37, y = 64 - height * .37;
        if (height < 0 || y > terrain(x, progress, settings)) continue;
        s.ellipse(x, y, 1.2 + i % 4 * .45, 1.1 + i % 3 * .4, i % 5 ? '#c7c7bf' : '#e1c698');
      }
    }
    if (progress > .55) {
      const a = smooth(.55, .72, progress); c.save(); c.globalAlpha = a;
      s.label(t('抬高的坑缘'), -215, 0, { anchor: [-r * 1.04, terrain(-r * 1.04, progress, settings)], width: 190 });
      s.label(t('碗状坑底'), 190, 165, { anchor: [0, terrain(0, progress, settings)], width: 160 });
      c.restore();
    }
    if (progress > .8) {
      c.save(); c.globalAlpha = smooth(.8, .9, progress);
      const x = 245, y = -104; const rim=c.createRadialGradient(x-14,y-17,5,x,y,63);rim.addColorStop(0,'#292e34');rim.addColorStop(.52,'#404951');rim.addColorStop(.7,'#9b9c94');rim.addColorStop(.83,'#727970');rim.addColorStop(1,'#3c4751');s.path(rimPath(x,y,63,57,.4),rim,'#919994',1);
      for (let i = 0; i < 28; i++) { const a = i * 2.4 + seed(i) * .25, rr = 49 + seed(i + 64) * 30; s.path([[x + Math.cos(a) * 36, y + Math.sin(a) * 33], [x + Math.cos(a) * rr, y + Math.sin(a) * rr * .9]], undefined, '#ced0c260', 1.5); }
      const bowl=c.createLinearGradient(x-35,y-30,x+35,y+30);bowl.addColorStop(0,'#202934');bowl.addColorStop(.6,'#5c6365');bowl.addColorStop(1,'#a5a69b');s.path(rimPath(x,y,37,33,1.1),bowl,'#c0c3b7',.7);
      for (let i = 0; i < 31; i++) { const a = seed(i + 802) * Math.PI * 2, r = 30 + seed(i + 170) * 32, xx = x + Math.cos(a) * r, yy = y + Math.sin(a) * r * .9, size = .6 + seed(i + 129) * 1.9; s.path([[xx - size, yy], [xx - size * .4, yy - size], [xx + size, yy + .2], [xx, yy + size]], '#aaa99b', '#30384255', .4); } s.label(t('俯视坑形'), x, -180, { width: 170 }); c.restore();
    }
    s.label(t('月面剖面'), -275, 183, { width: 170 }); s.end();
  }
  dispose() { this.surface.dispose(); }
}
