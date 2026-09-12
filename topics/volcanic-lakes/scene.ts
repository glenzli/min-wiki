import { CanvasSurface } from '../../src/visuals/canvasSurface.ts';
import { terrain as baseTerrain, basinDimensions, waterFraction, calderaState, formationProgress, smooth } from './model.ts';
import type { Settings } from './model.ts';
import { t } from './i18n.ts';
type Point = [number, number];
const seed = (i: number) => (Math.sin(i * 127.1 + 311.7) * 43758.5453 % 1 + 1) % 1;


// Fixed spatial variation: rock shapes remain stable while the teaching time changes.
const roughness = (x: number) => 3.4 * Math.sin(x * .073 + .8) + 1.9 * Math.sin(x * .177 + 2.1) + .9 * Math.sin(x * .39);
const outline = (cx: number, cy: number, rx: number, ry: number, phase = 0): Point[] => Array.from({ length: 97 }, (_, i) => {
  const a = i / 96 * Math.PI * 2, r = 1 + .13 * Math.sin(3 * a + phase) + .07 * Math.cos(5 * a + .6 + phase) + .035 * Math.sin(9 * a + 1.3);
  return [cx + Math.cos(a) * rx * r + Math.sin(a) * rx * .08, cy + Math.sin(a) * ry * r];
});
const terrain = (x: number, p: number, kind: Settings['basin']) => baseTerrain(x, p, kind) + roughness(x) + 6 * Math.sin(x * .015 + .3) * Math.exp(-((x / 300) ** 2));

export class TopicScene {
  private surface: CanvasSurface;
  private p = 0;
  private settings: Settings = { basin: 'caldera', supply: .75, leak: 'low' };
  constructor(canvas: HTMLCanvasElement) { this.surface = new CanvasSurface(canvas); this.surface.onResize(() => this.draw(this.p, this.settings)); }
  draw(progress: number, settings: Settings, _view = 'overview') {
    this.p = progress; this.settings = settings;
    const s = this.surface, c = s.begin('#7ca7bd', '#edf0dd');
    const dimensions = basinDimensions(settings.basin), formed = formationProgress(progress, settings.basin), state = calderaState(progress);
    const isCaldera = settings.basin === 'caldera';
    const label = (text: string, x: number, y: number, anchor?: Point, width = 180) => s.label(text, x, y, { color: '#344f51', background: '#f1f2e6ed', anchor, width });
    const glow = c.createRadialGradient(-235, -180, 0, -235, -180, 220);
    glow.addColorStop(0, '#fff8d78c'); glow.addColorStop(1, '#fff8d700'); s.ellipse(-235, -180, 220, 200, glow);
    for (let layer = 0; layer < 4; layer++) {
      const ridge: Point[] = Array.from({ length: 92 }, (_, i) => { const x = -420 + i * 9.5; return [x, 25 + layer * 19 - Math.abs(Math.sin(x * .009 + layer * 1.7)) * (68 - layer * 8) + Math.sin(x * .035) * 6]; });
      s.path([...ridge, [440, 220], [-420, 220]], ['#9bb6b4', '#8fa8a3', '#78958a', '#678476'][layer]);
    }
    const profile: Point[] = Array.from({ length: 181 }, (_, i) => { const x = -378 + i * 4.2; return [x, terrain(x, progress, settings.basin)]; });
    // Rear rim gives depth while the front cut remains an explicit section.
    s.path([...profile.map(([x, y]) => [x + 19, y - 28] as Point), ...profile.slice().reverse()], '#888d6e', '#bac19b', 1.3);
    for (let i = 0; i < 45; i++) {
      const x = -365 + i * 16.5 + (seed(i + 22) - .5) * 12;
      s.path([[x, terrain(x, progress, settings.basin)], [x + 19, terrain(x, progress, settings.basin) - 28]], undefined, '#d8c99b3b', .8);
    }
    const ground = c.createLinearGradient(-200, -80, 180, 230);
    ground.addColorStop(0, '#c3ad89'); ground.addColorStop(.42, '#9b8162'); ground.addColorStop(1, '#625348');
    s.path([...profile, [378, 223], [-378, 223]], ground, '#6b6855', 1.4);
    c.save(); c.beginPath(); profile.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.lineTo(378, 223); c.lineTo(-378, 223); c.closePath(); c.clip();
    for (let j = 0; j < 16; j++) {
      const line: Point[] = Array.from({ length: 110 }, (_, i) => {
        const x = -400 + i * 7.4, drop = isCaldera ? formed * (dimensions.floor - terrain(0, 0, 'caldera')) * (1 - smooth(100, 180, Math.abs(x))) : 0;
        return [x, -88 + j * 20 + Math.sin(x * (.01 + seed(j + 20) * .007) + j * .5) * 5 + roughness(x + j * 17) * .5 + seed(j + 90) * 8 + drop];
      });
      s.path([...line, ...line.slice().reverse().map(([x, y]) => [x, y + 4 + seed(j + 140) * 10 + Math.sin(x * .031 + j) * 2] as Point)], ['#f0d6a83b', '#574e3c35', '#b6644327'][j % 3]);
      s.path(line, undefined, '#f2d9ae55', .9);
    }
    for (let i = 0; i < 1500; i++) {
      const x = -380 + seed(i) * 760, y = -105 + seed(i + 3000) * 335;
      s.path([[x, y], [x + 1 + seed(i + 5000) * 4, y - .8]], undefined, i % 3 ? '#ffefd72b' : '#302e262c', .7);
    }
    if (isCaldera) {
      // The reservoir remains a rock/magma region, never a long-lived empty cave.
      const chamber = c.createRadialGradient(-20, 179, 2, 0, 179, 101);
      chamber.addColorStop(0, '#946b50'); chamber.addColorStop(1, '#605044');
      const chamberEdge = outline(0, 182, 100, 27, .7);
      s.path(chamberEdge, chamber);
      const remaining = 1 - state.withdrawal * .68;
      const magma = c.createLinearGradient(0, 157, 0, 211);
      magma.addColorStop(0, '#ffc779'); magma.addColorStop(.5, '#dc8951'); magma.addColorStop(1, '#96583e');
      s.path(outline(0, 201 - 19 * remaining, 89 - state.subsidence * 12, 19 * remaining, .7), magma);
      c.save(); s.path(chamberEdge); c.clip();
      for (let i = 0; i < 83; i++) {
        const x = (seed(i + 80) - .5) * 204, y = 154 + seed(i + 300) * 56;
        const r = 3 + seed(i + 800) * 9;
        if (y > 194 && i % 3) continue;
        s.path([[x-r, y], [x-r*.3, y-r*.7], [x+r*.6, y-r*.5], [x+r, y+r*.3], [x, y+r*.6]], ['#aa8b64a6','#756650bc','#c1a07a99'][i%3], '#5d514744', .6);
      }
      c.restore();
      // An outward magma path explains withdrawal before any roof motion.
      c.beginPath(); c.moveTo(78, 181); c.bezierCurveTo(138, 180, 203, 174, 254, 111); c.lineTo(270, terrain(270, progress, settings.basin));
      c.strokeStyle = '#5c4b3f'; c.lineWidth = 8; c.stroke();
      c.save(); c.globalAlpha = .25 + .75 * state.withdrawal * (1 - state.subsidence);
      c.strokeStyle = '#dd9155'; c.lineWidth = 4; c.stroke();
      if (progress > .04 && progress < .29) for (let i = 0; i < 10; i++) {
        const u = (i / 10 + progress * 4) % 1, v = 1 - u;
        const x = v ** 3 * 78 + 3 * v * v * u * 138 + 3 * v * u * u * 203 + u ** 3 * 254;
        const y = v ** 3 * 181 + 3 * v * v * u * 180 + 3 * v * u * u * 174 + u ** 3 * 111;
        s.ellipse(x, y, 3, 1.6, '#ffdf9b');
      }
      c.restore();
      for (const side of [-1, 1]) {
        c.save(); c.globalAlpha = state.fracture;
        s.path([[side * 175, -75], [side * (side < 0 ? 151 : 164), 15], [side * (side < 0 ? 143 : 152), 67], [side * (side < 0 ? 117 : 131), 156], [side * 99, 201]], undefined, '#453e33', 2.4);
        s.path([[side * (side < 0 ? 151 : 164), 15], [side * 169, 8], [side * 180, -10]], undefined, '#5b5141', 1.1);
        s.path([[side * 142, 91], [side * 162, 104]], undefined, '#5b5141', 1.1);
        c.restore();
      }
    }
    c.restore();
    if (isCaldera && state.subsidence > 0 && state.subsidence < 1) {
      c.save(); c.globalAlpha = (1 - state.subsidence) * .6; c.setLineDash([4, 5]);
      s.path(profile.filter(([x]) => Math.abs(x) < 185).map(([x]) => [x, terrain(x, 0, 'caldera')]), undefined, '#6e7164', 1.2);
      c.restore();
      for (const x of [-74, 74]) s.arrow(x, terrain(x, 0, 'caldera') - 10, x, terrain(x, progress, 'caldera') - 9, '#a66b42', 2.3);
    }
    // Talus at the foot of newly exposed walls; no trees inside the new basin.
    if (formed > .05) for (let i = 0; i < 52; i++) {
      const side = i % 2 ? -1 : 1, x = side * dimensions.radius * (.66 + seed(i) * .23);
      const y = terrain(x, progress, settings.basin) - 2, r = 1.5 + seed(i + 88) * 3.8;
      c.save(); c.globalAlpha = formed;
      s.path([[x - r, y], [x - r * .25, y - r], [x + r, y - r * .3], [x + r * .7, y + 1]], i % 3 ? '#82725b' : '#baaa83', '#5d59452b', .5); c.restore();
    }
    for (let i = 0; i < 85; i++) {
      const x = -371 + i * 8.8 + (seed(i + 49) - .5) * 7;
      if (Math.abs(x) < dimensions.radius + 17) continue;
      const y = terrain(x, progress, settings.basin) - 1, h = 4 + seed(i + 360) * 9;
      s.path([[x + 1, y], [x + h * .7, y + 2]], undefined, '#424c4133', 2);
      s.path(outline(x, y - h * .5, h * (.29 + seed(i + 43) * .13), h * .54, i * 1.9), i % 3 ? '#45694e' : '#64805a');
    }
    const fraction = waterFraction(progress, settings), waterY = dimensions.floor - dimensions.maxDepth * fraction;
    if (fraction > 0) {
      const bed = profile.filter(([x, y]) => Math.abs(x) < dimensions.radius && y >= waterY);
      if (bed.length > 1) {
        const left = bed[0][0], right = bed[bed.length - 1][0], half = (right - left) / 2, mid = (right + left) / 2;
        const water = c.createLinearGradient(0, waterY - 20, 0, dimensions.floor);
        water.addColorStop(0, '#85d5cf'); water.addColorStop(.18, '#439fba'); water.addColorStop(1, '#1d506c');
        s.path([...bed, [right, waterY], [left, waterY]], water);
        // The uneven rear shoreline encloses a horizontal lake surface; the front is the section cut.
        const sky = c.createLinearGradient(left, waterY - 26, right, waterY + 3);
        sky.addColorStop(0, '#95dace'); sky.addColorStop(.43, '#4eaabd'); sky.addColorStop(1, '#307e9e');
        const shoreline: Point[] = Array.from({ length: 65 }, (_, i) => {
          const a = Math.PI + i / 64 * Math.PI, depth = Math.min(23, half * .15) * formed;
          return [mid + Math.cos(a) * half, waterY + Math.sin(a) * depth * (1 + .22 * Math.sin(a * 5 + .4) + .12 * Math.sin(a * 9))];
        });
        s.path(shoreline, sky, '#96b9a377', .8);
        s.path([[left, waterY], [right, waterY]], undefined, '#d6f1d8', 1.6);
        for (let i = 0; i < 27; i++) {
          const x = mid + (seed(i + 100) - .5) * half * 1.65, y = waterY - seed(i + 700) * Math.min(18, half * .11);
          const w = 3 + seed(i + 230) * 19;
          s.path([[x - w, y], [x + w, y + Math.sin(progress * 8 + i) * .6]], undefined, i % 3 ? '#d9f2df55' : '#ffffe991', .7);
        }
        c.save(); c.beginPath(); s.path([...bed, [right, waterY], [left, waterY]]); c.clip();
        for (let i = 0; i < 14; i++) {
          const x = (i - 6.5) * half / 7;
          s.path([[x, waterY + 1], [x * .75 + 9, dimensions.floor]], undefined, '#b0e6d512', 2.5);
        }
        c.restore();
        if (fraction > .18) label(t('湖水'), 0, waterY + Math.min(39, (dimensions.floor - waterY) * .56), undefined, 130);
      }
    }
    if (progress > .48 && settings.supply > 0) {
      c.save(); c.globalAlpha = smooth(.48, .56, progress);
      for (const cx of [-167, 135]) for (let i = 0; i < 8; i++) {
        const x = cx - 54 + i * 16 + seed(i + 44) * 9, y = -157 + Math.sin(i * 2.1 + cx) * 12, r = 14 + seed(i + cx) * 18;
        const cloud = c.createRadialGradient(x, y - 3, 0, x, y, r);
        cloud.addColorStop(0, '#ffffffcf'); cloud.addColorStop(.6, '#f1f4e9b0'); cloud.addColorStop(1, '#e6efe400');
        s.path(outline(x, y, r * 1.3, r * .7, i + cx), cloud);
      }
      for (let i = 0; i < Math.round(78 * settings.supply); i++) {
        const age = (seed(i + 70) + progress * 4) % 1, x = (seed(i + 250) - .5) * 410, y = -145 + age * 260;
        const end = Math.min(terrain(x, progress, settings.basin), fraction > 0 && Math.abs(x) < dimensions.radius * .85 ? waterY - 4 : 200);
        if (y < end) s.path([[x, y], [x - 2, y + 7]], undefined, '#51889785', 1.1);
      }
      c.restore(); label(t('降水与融雪汇入'), 0, -202, undefined, 235);
    }
    if (!isCaldera && progress > .14 && progress < .43) {
      const u = (progress - .14) / .29;
      for (let i = 0; i < 35; i++) { const x = (seed(i + 81) - .5) * u * 240, y = -94 - Math.sin(Math.PI * u) * (10 + seed(i + 999) * 90); s.ellipse(x, y, 1.4, 1.8, '#807a64'); }
      label(t('喷口周围留下凹地'), 0, -184, undefined, 230);
    }
    if (isCaldera && progress < .48) {
      if (progress < .18) label(t('岩浆沿通道撤出'), 233, 159, [159, 166], 185);
      else if (progress < .27) label(t('支撑减弱，裂隙扩展'), 0, -187, [154, 12], 255);
      else label(t('岩体沿断裂向下沉'), 0, -187, [75, terrain(75, progress, 'caldera')], 245);
      label(t('仍有岩石与岩浆'), -235, 180, [-75, 185], 190);
    } else if (progress > .5 && settings.supply > 0) {
      const count = settings.leak === 'high' ? 6 : 2;
      for (let i = 0; i < count; i++) { const x = (i - (count - 1) / 2) * 18, y = dimensions.floor + 17; s.arrow(x, y, x + 8, y + 33, '#55a8b2', 1.8); }
      label(t('渗漏到地下'), 246, 176, [40, dimensions.floor + 34], 170);
      if (fraction > .15) { s.arrow(dimensions.radius * .45, waterY - 8, dimensions.radius * .5, waterY - 47, '#62959c', 1.8); label(t('蒸发'), 266, -61, [dimensions.radius * .5, waterY - 47], 110); }
    }
    if (formed > .75) label(isCaldera ? t('破火山口') : t('火山口'), -265, -81, [-dimensions.radius, terrain(-dimensions.radius, progress, settings.basin)], 165);
    s.end();
  }
  dispose() { this.surface.dispose(); }
}
