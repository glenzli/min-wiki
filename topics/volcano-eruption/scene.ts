import { magmaState } from './magmaSystem.ts';
import { drawMagma } from './magmaScene.ts';
import { landSurface } from './projectModel.ts';
import { animateValue } from '../../src/visuals/transition.ts';
import { observationCamera, lavaThermalState, eruptionAppearance, type ObservationView, type ObservationCamera } from './model.ts';
import { CanvasSurface } from '../../src/visuals/canvasSurface.ts';
import { terrain as baseTerrain, ventPositions, supplyPerVent, activity, smooth, clastTrajectory, clastPosition, flowBranches, emissionSlot, CLAST_BUDGET } from './model.ts';
import type { Settings, ClastTrajectory } from './model.ts';
const seed = (i: number) => (Math.sin(i * 127.1 + 311.7) * 43758.5453 % 1 + 1) % 1;
type Point = [number, number];


// Fixed spatial variation: rock shapes remain stable while the teaching time changes.
const roughness = (x: number) => 3.4 * Math.sin(x * .073 + .8) + 1.9 * Math.sin(x * .177 + 2.1) + .9 * Math.sin(x * .39);
const outline = (cx: number, cy: number, rx: number, ry: number, phase = 0): Point[] => Array.from({ length: 97 }, (_, i) => {
  const a = i / 96 * Math.PI * 2, r = 1 + .13 * Math.sin(3 * a + phase) + .07 * Math.cos(5 * a + .6 + phase) + .035 * Math.sin(9 * a + 1.3);
  return [cx + Math.cos(a) * rx * r + Math.sin(a) * rx * .08, cy + Math.sin(a) * ry * r];
});
const defaultTerrain = (x: number) => baseTerrain(x) + roughness(x) + 8 * Math.sin(x * .012 + .4) * Math.exp(-((x / 270) ** 2));
type Clast = { birth: number; radius: number; phase: number; trajectory: ClastTrajectory };

// A shallow perspective ribbon sits on the flank, with a visible near-side thickness.
// Its footprint remains after supply wanes: cooling changes its surface, not its history.
function drawFlow(s: CanvasSurface, progress: number, settings: Settings, terrain: (x: number) => number) {
  const appearance=eruptionAppearance(settings);
  const c = s.context, growth = smooth(.34, .80, progress), cooling = smooth(.84, 1, progress), thermal=lavaThermalState(progress);
  if (growth < .001) return;
  for (const [branchIndex, branch] of flowBranches(settings.vents).entries()) {
    const extent = growth * (142 + (1 - settings.viscosity) * 185) * Math.sqrt(branch.share) * (.24+.76*appearance.lava) * (.5+.65*appearance.supply);
    const breadth = (52 + settings.viscosity * 22) * Math.sqrt(branch.share) * (.5+.5*appearance.lava) * (.6+.4*appearance.supply);
    const widthAt = (u: number) => breadth * (.79 + .06 * Math.sin(u * 12 + branchIndex) + .025 * Math.sin(u * 29)) * (1 - .82 * smooth(.86, 1, u));
    const at = (u: number, across: number): Point => {
      const x = branch.x + branch.direction * extent * u, w = widthAt(u);
      return [x + w * across * .66, terrain(x) - 1.2 - w * across * .66];
    };
    const near = Array.from({ length: 81 }, (_, i) => at(i / 80, 0));
    const far = Array.from({ length: 81 }, (_, i) => at(i / 80, 1));
    const top = [...near, ...far.slice().reverse()];
    const thickness = 4 + settings.viscosity * 5;
    s.path([...near, ...near.slice().reverse().map(([x, y]) => [x, y + thickness] as Point)], '#3c2c30', '#654132', .8);
    // Exposed seams cool less rapidly than the skin; dark rock can retain heat.
    c.save();c.globalAlpha=thermal.interiorGlow*.8;
    const seam=near.slice(2,-3).map(([x,y],i)=>[x,y+thickness*(.4+.12*Math.sin(i*.63))] as Point);
    s.path(seam,undefined,'#dc6028',thickness*.36);
    c.restore();
    s.path(top, '#402c2c', '#a24b32', 1.4);
    c.save(); s.path(top); c.clip();
    // Incandescence comes from exposed melt between rafts of cooling crust.
    c.globalAlpha = thermal.surfaceGlow;
    s.path(top, '#d95324');
    const channel = Array.from({ length: 81 }, (_, i) => at(i / 80, .48 + Math.sin(i * .16 + branchIndex) * .1));
    s.path(channel, undefined, '#ffad38', breadth * .22);
    s.path(channel, undefined, '#ffd580', breadth * .045);
    const travel = Math.min(progress, .84) * 4.3;
    for (let i = 0; i < 8; i++) {
      const u = (i / 8 + travel) % 1;
      const tongue = Array.from({ length: 11 }, (_, j) => at(Math.min(1, u + j / 10 * .046), .2 + seed(i + branchIndex * 51) * .55));
      s.path(tongue, undefined, i % 3 ? '#ffbd50' : '#ffe6a0', 1 + seed(i + 9) * 1.2);
    }
    c.globalAlpha = 1;
    // Offset, unequal crust rafts replace repeated crosswise ribs. They are
    // carried by the same expanding ribbon and do not flash in/out between views.
    for (let i = 0; i < 34; i++) {
      const key=i+branchIndex*130,u=.03+seed(key+35)*.92,across=.12+seed(key+56)*.76;
      const length=.023+seed(key+81)*.036,spread=.09+seed(key+89)*.14;
      const plate:Point[]=Array.from({length:15},(_,j)=>{
        const angle=j/14*Math.PI*2,uneven=1+.17*Math.sin(angle*3+i)+.08*Math.sin(angle*5+key);
        return at(u+Math.cos(angle)*length*uneven,across+Math.sin(angle)*spread*uneven);
      });
      s.path(plate,i%3?'#393537':'#54483f','#29292d',.7);
      s.path(plate,undefined,'#88705b55',.3);
      if(i%3===0){
        c.globalAlpha=thermal.surfaceGlow*.7;
        s.path([at(u-length*.3,across-spread*.8),at(u,across),at(u+length*.45,across+spread*.65)],undefined,'#ea9247',.7);
        c.globalAlpha=1;
      }
    }
    // The leading lobe bulges; the front edge remains rough and dark as it cools.
    const nose = at(.985, .45), w = widthAt(.94);
    s.ellipse(nose[0], nose[1], w * .43, 2.6 + settings.viscosity * 1.7, '#60382e');
    c.globalAlpha = thermal.surfaceGlow;
    s.ellipse(nose[0], nose[1] - .8, w * .31, 1.1, '#ffc461');
    c.restore();
    c.save(); c.globalAlpha = .65 - cooling * .5;
    s.path(near, undefined, '#ff9847', 1.1); c.restore();
  }
}

export class TopicScene {
  private surface: CanvasSurface;
  private p = 0;
  private view:ObservationView='overview';
  private camera:ObservationCamera=observationCamera('overview',3);
  private cameraKey='overview:3';private cancelCamera=()=>{};
  setView(view:ObservationView,vents=this.settings.vents){
    const key=`${view}:${vents}`;if(key===this.cameraKey)return;this.cameraKey=key;this.view=view;this.cancelCamera();
    const from={...this.camera},to=observationCamera(view,vents);
    this.cancelCamera=animateValue({from:0,to:1,duration:850,onUpdate:p=>{
      this.camera={x:from.x+(to.x-from.x)*p,y:from.y+(to.y-from.y)*p,zoom:Math.exp(Math.log(from.zoom)+(Math.log(to.zoom)-Math.log(from.zoom))*p)};
      this.draw(this.p,this.settings);
    }});
  }
  private settings: Settings = { vents: 3, gas: .65, viscosity: .55 };
  private clastKey = '';
  private clasts: Clast[] = [];
  private prepareClasts(settings: Settings, terrain: (x: number) => number) {
    const key = `${settings.vents}|${settings.gas}|${settings.viscosity}|${settings.supply}|${settings.landform}`;
    if (key === this.clastKey) return;
    this.clastKey = key;
    this.clasts = [];
    if (settings.gas < .06) return;
    const appearance=eruptionAppearance(settings);
    for (let i = 0; i < CLAST_BUDGET; i++) {
      // The same seeded population is divided among vents, never multiplied by them.
      if (seed(i + 12000) > settings.gas * (.4+.6*appearance.supply)) continue;
      const slot = emissionSlot(i, settings.vents), launchActivity = activity(slot.birth);
      const direction = slot.x && seed(i + 2600) > .19 ? Math.sign(slot.x) : seed(i + 81) > .5 ? 1 : -1;
      const speed = direction * (10 + seed(i + 820) * (47 + settings.viscosity * 16));
      const rise = (13 + settings.gas * (140 - settings.viscosity * 55)) * (.45+.55*appearance.supply) * (.45 + seed(i + 980) * .58) * launchActivity;
      const radius = 1.35 + seed(i + 200) * 2.6 + (seed(i + 700) > .9 ? 2.2 + settings.viscosity * 2 : 0);
      this.clasts.push({ birth: slot.birth, radius, phase: seed(i + 1300) * Math.PI * 2, trajectory: clastTrajectory(slot.x, speed, rise, terrain) });
    }
  }
  constructor(canvas: HTMLCanvasElement) { this.surface = new CanvasSurface(canvas); this.surface.onResize(() => this.draw(this.p, this.settings)); }
  draw(progress: number, settings: Settings) {
    this.p = progress; this.settings = settings;
    const mechanism = magmaState(progress, settings);
    progress = mechanism.surfaceClock;
    const terrain = settings.landform ? (x: number) => 115 - (426 - landSurface(x + 500, settings.landform!, 1)) * .75 + roughness(x) : defaultTerrain;
    const s = this.surface, c = s.begin('#172535', '#b18b73');
    c.save();c.scale(this.camera.zoom,this.camera.zoom);c.translate(-this.camera.x,-this.camera.y);
    const vents = ventPositions(settings.vents), intensity = activity(progress), appearance=eruptionAppearance(settings);
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
    const cooling = smooth(.84, 1, progress);
    drawMagma(s, mechanism, vents, terrain);
    c.restore();
    // Gas-entrained ash drifts upward on its own clock; a weakening vent cannot
    // pull an already emitted cloud back down. One ash schedule is shared by all vents.
    // Unequal parcels rise from the same vent, entrain air and widen into a drifting
    // ash cloud. Material already aloft keeps travelling after the source weakens.
    if (appearance.ash > .005) {
      for (let i = 0; i < 132; i++) {
        const birth = .27 + i / 131 * .59, age = (progress - birth) * 24 / 10.5;
        if (age <= 0 || age >= 1) continue;
        const vx = vents[i % vents.length], vy = terrain(vx);
        const spread=smooth(.24,.78,age),rise=(125+135*appearance.supply)*Math.pow(age,.73);
        const x=vx+(seed(i+86)-.5)*(10+spread*132)+age*age*(58+seed(i+61)*64);
        const y=vy-8-rise+(seed(i+53)-.5)*spread*22;
        const r=(4+Math.pow(age,.8)*42)*(.65+seed(i+330)*.65)*(.6+.4*appearance.supply);
        c.save();c.globalAlpha=activity(birth)*appearance.ash*smooth(0,.05,age)*(1-smooth(.76,1,age))*.74;
        // Three offset billows share one parcel clock. Overlap creates a dense
        // cauliflower core and a pale entraining rim instead of flat grey ovals.
        for(let l=0;l<3;l++){
          const lr=r*(.58+l*.18),lx=x+(seed(i+l*503)-.5)*r*.64,ly=y-r*.18*l+(seed(i+l*733)-.5)*r*.22;
          const ash=c.createRadialGradient(lx-lr*.28,ly-lr*.34,lr*.06,lx,ly,lr*1.18);
          ash.addColorStop(0,l===0?'#d4c8b7':'#a7a198');ash.addColorStop(.38,l===0?'#8d8984':'#777a7d');ash.addColorStop(.72,'#555e67b8');ash.addColorStop(1,'#46515b00');
          s.path(outline(lx,ly,lr*1.18,lr*.78,i*1.7+l*.9),ash);
        }
        c.restore();
      }
      // Fine ash falls beyond the lava footprint; it is fragmented rock, not smoke.
      for(let i=0;i<80;i++){
        const birth=.29+i/80*.55,age=(progress-birth)*24/(7+seed(i+210)*3.5);
        if(age<=0)continue;
        const u=Math.min(1,age),vx=vents[i%vents.length],end=vx+65+seed(i+500)*220;
        const x=vx+(end-vx)*u,y=terrain(vx)-2-(135+seed(i+511)*85)*Math.sin(Math.PI*u)+(terrain(end)-terrain(vx)+2)*u*u;
        c.save();c.globalAlpha=appearance.ash*(.2+appearance.supply*.4)*smooth(0,.06,age);
        s.ellipse(x,y,1+seed(i+777),.7,'#b5aaa0');c.restore();
      }
    }
    drawFlow(s, progress, settings, terrain);
    this.prepareClasts(settings, terrain);
    // Deposits retain their landing positions. Brief flattened spatter, then a
    // dark rind, makes the air-to-ground transition visible without flame or sparks.
    for (const clast of this.clasts) {
      if (progress < clast.birth) continue;
      const position = clastPosition(clast.trajectory, (progress - clast.birth) * 24);
      if (!position.landed) continue;
      const r = clast.radius, fresh = 1 - smooth(.15, 2.4, position.afterImpact);
      const settle = smooth(0, .18, position.afterImpact), x = position.x, y = position.y;
      const slope = Math.atan2(terrain(x + 2) - terrain(x - 2), 4);
      c.save(); c.translate(x, y - .8); c.rotate(slope);
      s.path(outline(0, -.8, r * (1.15 + settle * .35), r * .38, clast.phase), '#4a3030', '#82432d', .7);
      if (fresh > .005) {
        c.globalAlpha = fresh * (1 - cooling * .7) * (1-appearance.ash*.88);
        s.path(outline(0, -1.2, r * (1 + settle * .27), r * .23, clast.phase), '#f68b35');
        s.path([[-r * .8, -1.2], [-r * .1, -1.8], [r * .4, -.6]], undefined, '#ffe497', .9);
        if (position.afterImpact < .23) {
          const spread = position.afterImpact / .23;
          for (const side of [-1, 1]) s.ellipse(side * r * (1 + spread * 1.7), -r * Math.sin(Math.PI * spread) * .45, r * .3, r * .19, '#ffc463');
        }
      }
      c.restore();
    }
    // Dense material near the opening divides into rounded molten strands. Their
    // width reflects source share; low gas gives quiet effusion, not a fire plume.
    vents.forEach((vx, vi) => {
      const vy = terrain(vx), share = supplyPerVent(settings.vents);
      const opening = smooth(.25, .37, progress), heat = opening * (1 - cooling * .9);
      const coreWidth = 11 * Math.sqrt(share) + 2;
      if (heat > .01) {
        const halo = c.createRadialGradient(vx, vy - 3, 2, vx, vy - 3, 40 * Math.sqrt(share));
        halo.addColorStop(0, '#ffb24680'); halo.addColorStop(.4, '#ff75223d'); halo.addColorStop(1, '#f7551600');
        c.save(); c.globalAlpha = heat; s.ellipse(vx, vy - 3, 42 * Math.sqrt(share), 28 * Math.sqrt(share), halo); c.restore();
      }
      s.path(outline(vx, vy + 1, coreWidth + 3, 4.8, vi * 2), '#35262b', '#a26544');
      if (opening > .001) {
        c.save(); c.globalAlpha = opening;
        s.path(outline(vx, vy -.5, coreWidth, 3.1, vi * 2), cooling > .7 ? '#87412d' : '#f87828');
        c.globalAlpha *= 1 - cooling * .92;
        s.ellipse(vx, vy - 1, coreWidth * .77, 2, '#ffe096');
        s.ellipse(vx - 1, vy - 1.5, coreWidth * .42, 1.1, '#fff4cd'); c.restore();
      }
      if (settings.gas >= .06 && intensity > .015) {
        const jetHeight = intensity * appearance.fountain * (145 - settings.viscosity * 60) * (.45+.55*appearance.supply);
        const streamWidth = (3.6 - settings.viscosity * 1.1) * Math.sqrt(share) * (.45+.55*appearance.supply);
        c.save(); c.globalAlpha = Math.min(1, intensity * 2);
        for (let j = 0; j < 7; j++) {
          const side = (j - 3) / 3;
          const height = jetHeight * (.65 + seed(j + vi * 7) * .45);
          const points: Point[] = Array.from({ length: 27 }, (_, k) => {
            const u = k / 26 * .68;
            return [vx + side * (2 + 29 * u * u) * Math.sqrt(share) + Math.sin(u * 16 + progress * 97 + j) * u * .7, vy - 2 - height * 4 * u * (1 - u)];
          });
          s.path(points, undefined, '#c34b22', streamWidth * 2.2);
          s.path(points, undefined, '#ff9b35', streamWidth * 1.3);
          s.path(points.slice(0, 22), undefined, '#ffdf86', streamWidth * .46);
          for (let k = 0; k < 4; k++) {
            const u = (k / 4 + progress * 12 + j * .13) % 1, index = Math.floor(u * 26), point = points[index];
            s.ellipse(point[0], point[1], streamWidth * .65, streamWidth * (1 + u), '#ffd375');
          }
        }
        c.restore();
      }
    });
    // Flight uses each fragment's launch conditions, not the current vent strength.
    // Larger bombs develop dark rind patches; the orange/yellow body is hot rock.
    for (const clast of this.clasts) {
      const elapsed = (progress - clast.birth) * 24;
      if (elapsed < 0) continue;
      const position = clastPosition(clast.trajectory, elapsed);
      if (position.landed) continue;
      const { x, y } = position, r = clast.radius;
      const dy = clast.trajectory.vy + clast.trajectory.gravity * elapsed;
      const angle = Math.atan2(dy, clast.trajectory.vx), trailLength = Math.min(12, Math.hypot(dy, clast.trajectory.vx) * .035);
      s.path([[x - Math.cos(angle) * trailLength, y - Math.sin(angle) * trailLength], [x, y]], undefined, appearance.ash>.62?'#8e8a8555':'#e76b2855', r * 1.65);
      c.save(); c.translate(x, y); c.rotate(angle);
      const polygon: Point[] = Array.from({ length: 19 }, (_, i) => {
        const a = i / 18 * Math.PI * 2, ripple = 1 + .10 * Math.sin(a * 3 + clast.phase) + .045 * Math.sin(a * 5 + clast.phase);
        return [Math.cos(a) * r * 1.15 * ripple, Math.sin(a) * r * ripple];
      });
      const melt=c.createRadialGradient(-r*.22,-r*.18,0,0,0,r*1.22);
      melt.addColorStop(0,'#fff0b0');melt.addColorStop(.37,'#ffcc68');melt.addColorStop(.72,'#ed7e2c');melt.addColorStop(1,'#9b3923');
      s.path(polygon,appearance.ash>.62?'#766658':melt,'#bd5029',.45);
      s.ellipse(-r*.22,-r*.2,r*.33,r*.2,'#fff4c133');
      if (r > 3.5) {
        s.path([[-r * .7, -r * .5], [r * .4, -r * .8], [r * .75, -r * .2], [r * .05, -.1]], '#693b2c');
        s.path([[-r * .45, -r * .5], [-r * .12, -r * .35], [r * .1, -r * .64]], undefined, '#ffa23a', .8);
      }
      c.restore();
    }
    c.restore();
    // Labels belong to the external legend; zooming never enlarges prose over a vent.
    s.end();
  }
  stopMotion() { this.cancelCamera(); }
  dispose() { this.stopMotion();this.surface.dispose(); }
}
