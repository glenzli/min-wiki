import { CanvasSurface } from '../../src/visuals/canvasSurface.ts';
import { organization, favorability } from './model.ts';
import type { Settings } from './model.ts';
import { t } from './i18n.ts';
const noise = (seed: number) => { const v = Math.sin(seed * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v); };
/** A soft lit cloud stamp is reused; time moves a fixed population, never regenerates noise. */
function cloudStamp(shadow = false) {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 96;
  const c = canvas.getContext('2d')!;
  for (let j = 0; j < 8; j++) {
    const x = 30 + noise(j + 70) * 35, y = 30 + noise(j + 80) * 30, r = 17 + noise(j) * 14;
    const g = c.createRadialGradient(x - 5, y - 7, 0, x, y, r);
    g.addColorStop(0, shadow ? '#244f6a42' : '#fffef8d9'); g.addColorStop(.4, shadow ? '#244f6a22' : '#edf3ef91'); g.addColorStop(1, '#c4d8dc00');
    c.fillStyle = g; c.fillRect(0, 0, 96, 96);
  }
  return canvas;
}
export class TopicScene {
  private surface: CanvasSurface; private p = 0; private view = 'annotated';
  private settings: Settings = { temperature: 29, shear: 5, hemisphere: 'north' };
  private cloud = cloudStamp(); private shadow = cloudStamp(true);
  constructor(canvas: HTMLCanvasElement) { this.surface = new CanvasSurface(canvas); this.surface.onResize(() => this.draw(this.p, this.settings, this.view)); }
  draw(progress: number, settings: Settings, view = 'annotated') {
    this.p = progress; this.settings = settings; this.view = view;
    const s = this.surface, c = s.begin('#abcbd0', '#487f92'), org = organization(progress, settings), dir = settings.hemisphere === 'north' ? -1 : 1;
    const natural = view === 'natural', cx = natural ? 0 : -116, cy = 1, zoom = natural ? 1.08 : 1;
    const label = (text: string, x: number, y: number, width = 200, anchor?: [number, number]) => s.label(text, x, y, { width, anchor, color: '#294f5b', background: '#f4f7f0eb' });
    // Ocean light, faint wave packets and an irregular coastal shelf give a sense of scale.
    const light = c.createRadialGradient(-280, -200, 0, -120, -50, 580); light.addColorStop(0, '#e9efe27a'); light.addColorStop(1, '#a2c7c900'); s.ellipse(-120, -50, 580, 470, light);
    for (let i = 0; i < 145; i++) { const x = -460 + noise(i + 451) * 930, y = -300 + noise(i + 905) * 640, r = 3 + noise(i) * 22; s.path([[x, y], [x + r, y + Math.sin(i) * 1.4]], undefined, '#f1f4e813', .65); }
    const coast: [number, number][] = [[-460,-310],[-348,-286],[-357,-251],[-322,-211],[-339,-177],[-307,-147],[-325,-107],[-311,-79],[-332,-24],[-322,15],[-359,53],[-357,96],[-393,118],[-403,154],[-460,171]];
    s.path(coast, '#abc3a1', '#bbd7c588', 14); s.path(coast, '#8fab92', '#d1d6b3', 2);
    for(let i=0;i<50;i++){const x=-432+noise(i+800)*82,y=-286+noise(i+550)*426;s.ellipse(x,y,3+noise(i)*15,2+noise(i+2)*5,'#637f7a22');}
    c.save(); c.translate(cx, cy); c.scale(zoom, zoom);
    // A dense, off-centre overcast joins unequal rainbands. Stable parcels retain
    // their identity while the same organization model gathers and rotates them.
    const puffs: {x:number;y:number;r:number;a:number}[] = [];
    for (let i = 0; i < 2150; i++) {
      const n = noise(i + 81), core = i < 1100, eyeWall = i < 145;
      const band = noise(i + 814) < .51 ? 0 : noise(i + 814) < .82 ? 1 : 2;
      const start = [62, 88, 109][band], span = [137, 105, 71][band];
      const r = eyeWall ? 20 + n * 14 : core ? 31 + Math.sqrt(n) * 73 : start + n * span;
      const phase = dir * progress * 5;
      const localAngle = core ? i * 2.399963 : [0, 2.45, 4.75][band] + r * [.019, .016, .025][band]
        + (noise(i + 181) - .5) * (.3 + .65 * Math.sin(n * Math.PI) ** 2)
        + .15 * Math.sin(n * 11 + band * 2);
      const theta = -dir * localAngle + phase;
      const edge = 1 + .13 * Math.sin(localAngle + .8) + .08 * Math.sin(localAngle * 3 + 1.7);
      const a0 = noise(i + 91) * Math.PI * 2, r0 = Math.sqrt(noise(i + 191)) * 193;
      const drift = settings.shear / 30 * (1 - org) * (r / 190) * 47;
      const x = Math.cos(a0) * r0 * (1 - org) + (Math.cos(theta) * r * edge + (core && !eyeWall ? 6 : 0)) * org + drift;
      const y = -dir * Math.sin(a0) * r0 * (1 - org) + Math.sin(theta) * r * (1 + .06 * Math.sin(localAngle * 5)) * org;
      const broken = core ? 1 : .45 + .55 * Math.sin(n * 13 + band * 4.3) ** 2;
      const taper = core ? 1 : .18 + .82 * Math.sin(n * Math.PI) ** .6;
      puffs.push({x, y, r: (eyeWall ? 7 : core ? 8 : 7) + noise(i + 323) * (core ? 11 : 15),
        a: (.10 + org * .27) * broken * taper});
    }
    for (const p of puffs) { c.globalAlpha = p.a * .65; c.drawImage(this.shadow, p.x - p.r + 2, p.y - p.r + 4, p.r * 2.2, p.r * 2); }
    for (const p of puffs) { c.globalAlpha = p.a; c.drawImage(this.cloud, p.x - p.r, p.y - p.r, p.r * 2.1, p.r * 1.9); }
    // Short curved cirrus streaks fade into the outer shield without forming spokes.
    for (let i = 0; i < 105; i++) {
      const r = 110 + noise(i + 77) * 95, a = -dir * noise(i + 176) * 6.28 + dir * progress * 5;
      const points: [number, number][] = [];
      for (let j = 0; j < 11; j++) {
        const u = j / 10, angle = a + dir * u * (.12 + noise(i + 26) * .16);
        const radius = r + u * (5 + noise(i + 573) * 12) + Math.sin(u * 4 + i) * 1.5;
        points.push([Math.cos(angle) * radius, Math.sin(angle) * radius]);
      }
      c.globalAlpha = org * (.015 + noise(i + 671) * .04);
      s.path(points, undefined, '#f5f6ee', .5 + noise(i + 985) * 1.4);
    }
    c.globalAlpha = 1;
    if (org > .58) {
      const eye = c.createRadialGradient(-2, -3, 1, 0, 0, 20);
      eye.addColorStop(0, '#305c74cf'); eye.addColorStop(.45, '#4e8598b0'); eye.addColorStop(1, '#d2e7e200');
      s.ellipse(0, 0, 20, 20, eye);
    }
    c.restore();
    if (natural) { s.end(); return; }
    if (org > .58) { label(t('眼'),cx,cy,70); label(t('眼墙'),cx+92,cy-71,110,[cx+25,cy-15]); label(t('螺旋雨带'),cx-117,cy+139,150,[cx-76,cy+96]); }
    if(favorability(settings)>.1) for(let j=0;j<3;j++){const a=j*2.1+dir*progress*.8,r=208,pts=Array.from({length:22},(_,k)=>{const aa=a+dir*k*.029,rr=r-k*1.4;return[cx+Math.cos(aa)*rr,cy+Math.sin(aa)*rr] as [number,number];});s.path(pts,undefined,'#24627680',1.6);s.arrow(...pts[18],...pts[21],'#286d7e',1.7);}
    label(settings.hemisphere==='equator'?t('赤道附近：旋转难组织'):settings.hemisphere==='north'?t('北半球：逆时针'):t('南半球：顺时针'),cx,-221,370);
    // A distinct side section: two uneven cloud towers, low-level inflow, upper outflow.
    c.fillStyle='#f4f6efeb';c.beginPath();c.roundRect(142,-179,217,350,14);c.fill();c.strokeStyle='#53788733';c.stroke();
    const sea=c.createLinearGradient(0,112,0,159);sea.addColorStop(0,'#76b1b8');sea.addColorStop(1,'#467d98');c.fillStyle=sea;c.fillRect(151,113,199,46);
    for(let i=0;i<65;i++){const side=i%2?-1:1,x=248+side*(37+noise(i+150)*15),y=-93+noise(i+700)*170,r=16+noise(i+400)*23;c.globalAlpha=.65;c.drawImage(this.cloud,x-r,y-r,r*2,r*1.8);}c.globalAlpha=1;
    for(const x of [198,301]){s.arrow(x,104,x+(x<248?10:-11),-62,'#b87936',2.4);for(let i=0;i<7;i++){const u=(i/7+progress*2)%1;s.ellipse(x+Math.sin(i+u*5)*4,100-u*168,2,3,'#b87936a0');}}
    if(org>.4)s.arrow(248,-51,248,85,'#397a9c',2.4);
    s.arrow(207,-104,159,-126,'#5f8ba0',2);s.arrow(286,-98,341,-122,'#5f8ba0',2);
    s.arrow(155,105,193,105,'#3c8297',2);s.arrow(346,105,309,105,'#3c8297',2);
    label(t('凝结放热'),250,-154,205);label(t('水汽与热量'),249,138,205);label(t('空气升降剖面'),250,197,220);
    if(settings.shear>18){s.arrow(-285,-140,42,-140,'#ad733c',2.8);label(t('强风切变扰乱云团'),cx,194,305);}
    s.end();
  }
  dispose() { this.surface.dispose(); }
}
