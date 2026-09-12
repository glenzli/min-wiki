import { CanvasSurface } from '../../src/visuals/canvasSurface.ts';
import { noise, type World } from './model.ts';
import { t } from './i18n.ts';
type Point = [number, number];
const seed = (i: number) => { const v = Math.sin(i * 134.1 + 217.8) * 41947; return v - Math.floor(v); };
export class TopicScene {
  private s: CanvasSurface;
  private world?: World;
  private view = 'landscape';
  private progress = 0;
  private globes = new Map<string, HTMLCanvasElement>();
  constructor(canvas: HTMLCanvasElement) { this.s = new CanvasSurface(canvas); this.s.onResize(() => { if (this.world) this.draw(this.world, this.view, this.progress); }); }
  private globe(world: World) {
    if (this.globes.has(world.id)) return this.globes.get(world.id)!;
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 360;
    const c = canvas.getContext('2d')!, pixels = c.createImageData(360, 360);
    const base = [1, 3, 5].map(i => parseInt(world.color.slice(i, i + 2), 16));
    for (let y = 0; y < 360; y++) for (let x = 0; x < 360; x++) {
      const nx = (x - 180) / 175, ny = (y - 180) / 175, d = nx * nx + ny * ny;
      if (d > 1) continue;
      const z = Math.sqrt(1 - d), lon = Math.atan2(nx, z) * 170, lat = Math.asin(ny) * 170;
      const n = noise(lon + 113, lat - 17), detail = noise(lon * 4, lat * 4);
      let col = base.map(v => v * (.84 + n * .25 + detail * .07));
      if (world.id === 'earth') {
        col = n > .04 ? [89 + detail * 35, 109 + detail * 28, 67 + detail * 20] : [25, 75 + detail * 14, 107 + detail * 19];
        const cloud = noise(lon * 1.5 + lat * .4 + 270, lat * 2) > .5;
        if (cloud || Math.abs(ny) > .92) col = col.map(v => v * .28 + 170);
      } else if (!world.surface || world.id === 'venus') {
        const subtle = world.id === 'neptune' ? .25 : 1;
        const band = (Math.sin(lat * .19 + noise(lon * 1.3, lat * 2) * 1.6) * .11 + detail * .07) * subtle;
        col = base.map(v => v * (.93 + band));
        if (world.id === 'jupiter') {
          const r = Math.hypot((lon - 36) / 33, (lat - 52) / 16);
          if (r < 1) col = [169 + r * 30, 104 + r * 35, 70 + r * 25];
        }
      }
      const light = .16 + .84 * Math.max(0, -nx * .55 - ny * .33 + z * .72);
      const i = (y * 360 + x) * 4;
      col.forEach((v, k) => pixels.data[i + k] = v * light); pixels.data[i + 3] = 255;
    }
    c.putImageData(pixels, 0, 0); this.globes.set(world.id, canvas); return canvas;
  }
  draw(world: World, view: string, progress: number) {
    this.world = world; this.view = view; this.progress = progress;
    const s = this.s, top = world.id === 'mercury' ? '#080e19' : world.id === 'venus' ? '#8d713e' : world.id === 'mars' ? '#997764' : '#a2c4d2';
    const c = s.begin(top, world.id === 'mars' ? '#deb292' : '#edf0de');
    if (view === 'section') {
      const giant = !world.surface;
      const g = c.createLinearGradient(0, -220, 0, 230);
      if (giant) { g.addColorStop(0, world.color); g.addColorStop(.45, world.id === 'jupiter' ? '#886b63' : '#648f9a'); g.addColorStop(1, '#23303d'); }
      else { g.addColorStop(0, world.id === 'mercury' ? '#080e19' : world.id === 'venus' ? '#8d713e' : world.id === 'mars' ? '#997764' : '#cbdde3'); g.addColorStop(.37, world.id === 'mercury' ? '#171b23' : world.id === 'venus' ? '#c2a15e' : world.id === 'mars' ? '#deb292' : '#a6c9d5'); g.addColorStop(.39, world.ocean ? '#408ca8' : '#baa284'); g.addColorStop(.76, world.ocean ? '#194863' : '#766454'); g.addColorStop(.78, '#665444'); g.addColorStop(1, '#453b39'); }
      c.fillStyle = g; c.fillRect(-2000, -2000, 4000, 4000);
      for (let i = 0; i < 40; i++) {
        const y = -210 + i * 12;
        if (!giant && y < -220 + 450 * .39) continue;
        const points: Point[] = Array.from({ length: 80 }, (_, j) => { const x = -400 + j * 10; return [x, y + noise(x, i * 31) * (giant ? 13 : 4)]; });
        s.path(points, undefined, i % 3 ? '#f1e0be19' : '#13263321', giant ? 6 : 2);
      }
      c.drawImage(this.globe(world), -354, -204, 175, 175);
      const surfaceY = -220 + 450 * .39, seabedY = -220 + 450 * .78;
      const y = giant ? -184 + progress * 370 : world.ocean
        ? progress < .38 ? -184 + progress / .38 * (surfaceY + 184) : surfaceY + Math.min(1, (progress - .38) / .4) * (seabedY - surfaceY)
        : -184 + Math.min(1, progress / .62) * (surfaceY + 184);
      s.path([[10, -194], [10, y]], undefined, '#eff8f199', 1.3);
      s.path([[0, y - 8], [14, y], [0, y + 8], [-9, y]], '#f1e7c5', '#fff8dd', 1);
      const labels = giant ? [t('云层'), t('向下逐渐变稠'), t('没有可着陆的地面')] : world.ocean ? [t('大气'), t('液态海水'), t('岩石海床')] : [t('大气或极稀薄外逸层'), t('固体岩石表面'), t('地下岩石')];
      labels.forEach((v, i) => s.label(v, 222, -145 + i * 142, { width: 205 }));
      s.label(t('层次与深度不按比例'), -233, 197, { width: 260 });
    } else {
      c.save(); c.scale(Math.max(1, s.width / (830 * s.scale)), 1);
      if (!world.surface) this.cloudscape(world, progress);
      else this.landscape(world, progress);
      c.restore();
      c.drawImage(this.globe(world), -356, -229, 126, 126);
      s.label(world.surface ? world.ocean ? t('海面下面仍是岩石') : t('岩石地面') : t('眼前是云顶，不是地面'), 202, -184, { width: 270 });
    }
    s.end();
  }
  private landscape(world: World, progress: number) {
    const s = this.s, c = s.context, earth = world.id === 'earth';
    const rock = world.id === 'mercury' ? [122, 119, 112] : world.id === 'venus' ? [145, 111, 65] : [164, 103, 71];
    for (let layer = 0; layer < 6; layer++) {
      const points: Point[] = Array.from({ length: 160 }, (_, j) => {
        const x = -430 + j * 5.5, h = 34 + layer * 28 + noise(x + layer * 234, layer * 90) * (35 - layer * 5);
        return [x, earth ? h + 24 : h];
      });
      const col = earth ? `rgb(${68 + layer * 7},${109 + layer * 3},${102 - layer * 6})` : `rgb(${rock.map(v => Math.round(v + (3 - layer) * 9)).join(',')})`;
      s.path([...points, [440, 1000], [-440, 1000]], col);
      s.path(points, undefined, '#edd0a336', 1.4);
    }
    if (earth) {
      const water = c.createLinearGradient(0, 55, 0, 240); water.addColorStop(0, '#608f9d'); water.addColorStop(1, '#225066');
      s.path([[-430, 87], [-260, 102], [-170, 127], [-85, 136], [10, 153], [75, 190], [90, 1000], [-430, 1000]], water);
      for (let i = 0; i < 200; i++) {
        const y = 103 + seed(i + 14) * 155, x = -420 + seed(i) * (300 + (y - 100));
        if (x > -280 + (y - 100) * 2.2) continue;
        const w = 2 + (y - 90) * .08 * seed(i + 400);
        s.path([[x, y], [x + w, y + .2 * Math.sin(progress * 9 + i)]], undefined, '#d6edf63e', .8);
      }
    }
    for (let i = 0; i < 390; i++) {
      const y = 90 + seed(i + 40) * 175, x = -420 + seed(i + 230) * 840;
      if (earth && x < -265 + (y - 100) * 2.2) continue;
      const r = (1 + seed(i + 400) ** 3 * 12) * ((y - 60) / 160);
      const points: Point[] = Array.from({ length: 7 }, (_, j) => { const a = j / 6 * Math.PI * 2; return [x + Math.cos(a) * r * (1 + seed(i * 7 + j) * .6), y + Math.sin(a) * r * .45]; });
      s.ellipse(x + r * .6, y + r * .3, r * 1.6, r * .36, '#15202d30');
      s.path(points, earth ? '#647667' : `rgb(${rock.map(v => Math.round(v * (.57 + seed(i + 55) * .6))).join(',')})`, '#f0cc991b', .5);
    }
    if (world.id === 'mercury') for (let i = 0; i < 20; i++) {
      const x = (seed(i + 620) - .5) * 720, y = 80 + seed(i + 750) * 125, r = 4 + seed(i + 290) * 32;
      s.ellipse(x, y, r, r * .3, '#33353b', '#b0aaa0'); s.ellipse(x + r * .12, y + 1.5, r * .79, r * .2, '#736e66');
    }
    if (world.id !== 'mercury') {
      const haze = c.createLinearGradient(0, -40, 0, 100); haze.addColorStop(0, '#edd9b800'); haze.addColorStop(.5, '#edd9b81c'); haze.addColorStop(1, '#edd9b800');
      c.fillStyle = haze; c.fillRect(-440, -40, 880, 140);
    }
  }
  private cloudscape(world: World, progress: number) {
    const s = this.s, c = s.context, blue = world.id === 'neptune';
    c.fillStyle = blue ? '#679aaa' : '#b09c88'; c.fillRect(-2000, -2000, 4000, 4000);
    for (let layer = 0; layer < 16; layer++) {
      for (let i = 0; i < 70; i++) {
        const x = -470 + i * 14 + noise(i * 41, layer * 83) * 25, y = -175 + layer * 27 + noise(x + progress * 16, layer * 39) * 17;
        const r = 13 + seed(i + layer * 73) * 28;
        const g = c.createRadialGradient(x - 7, y - 8, 0, x, y, r);
        g.addColorStop(0, blue ? '#dcf0eb80' : '#fff1ce80'); g.addColorStop(.45, blue ? '#98c4ce70' : '#ddc8aa60'); g.addColorStop(1, '#d2ccbf00');
        s.ellipse(x, y, r * 1.8, r * .75, g);
      }
    }
    if (!blue) {
      c.save(); c.translate(115, 56); c.rotate(-.17);
      for (let i = 22; i > 0; i--) {
        const a = i / 22, points: Point[] = Array.from({ length: 120 }, (_, j) => { const t = j / 119 * Math.PI * 2, rough = 1 + .05 * Math.sin(t * 7 + a * 7); return [Math.cos(t) * 130 * a * rough, Math.sin(t) * 64 * a * rough]; });
        s.path(points, `rgba(${164 + i * 2},${107 + i * 3},${82 + i * 3},.65)`, '#f0d2a333', .8);
      }
      c.restore();
    }
  }
  dispose() { this.s.dispose(); this.globes.clear(); }
}
