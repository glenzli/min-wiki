import { t } from './i18n.ts';
import type { JourneyFrame } from './journeyModel.ts';
import { metalProfile } from './metalGeometry.ts';

type Point = readonly [number, number];
type Project = (point: [number, number, number]) => { x: number; y: number };
export interface JourneyExplanationOptions {
  width: number;
  height: number;
  project?: Project;
  fallback?: boolean;
  /** Supplied by the journey's existing clock; never changes the specimen. */
  motionPhase?: number;
}
type Section = { material: Point[]; envelope: Point[]; color: string; edge: string; metal: boolean };
type Contact = { label: 'A' | 'B'; point: Point; inward: Point; depth: number; wet: boolean; pressure: number };

const teal = '#197e82', copper = '#a45c35', ink = '#324e52', paper = '#f5f7f3';
const clamp = (value: number, low: number, high: number) => Math.max(low, Math.min(high, value));
const finite = (value: number, fallback = 0) => Number.isFinite(value) ? value : fallback;
const n = (value: number) => Number(finite(value).toFixed(3));
const escaped = (value: string) => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const path = (points: readonly Point[]) => points.length ? points.map((p, i) => `${i ? 'L' : 'M'}${n(p[0])} ${n(p[1])}`).join('') + 'Z' : '';
const label = (x: number, y: number, value: string, color = ink, size = 13, anchor = 'middle', halo = false) =>
  `<text x="${n(x)}" y="${n(y)}" fill="${color}" font-size="${size}" text-anchor="${anchor}"${halo ? ' stroke="#fbfcf8" stroke-width="4" paint-order="stroke" stroke-linejoin="round"' : ''}>${escaped(value)}</text>`;
const metalBody = (frame: JourneyFrame) => frame.kind === 'metal' || frame.kind === 'boat';
const cargoCount = (frame: JourneyFrame) => metalBody(frame) && frame.body.form === 1 ? Math.round(clamp(frame.settings.cargo, 0, 8)) : 0;

/** A teaching cutaway, not a mesh area or physical-volume measurement. Metal
 * uses the model's exact radial profile so the same steel is retained while it
 * is flattened and bent. Natural silhouettes retain their specimen identity. */
function section(frame: JourneyFrame): Section {
  const { width: w, height: h, form } = frame.body;
  if (metalBody(frame)) {
    const outer: Point[] = [], inner: Point[] = [];
    for (let i = 0; i <= 48; i++) {
      const x = (i / 48 - .5) * w, profile = metalProfile(form, Math.abs(i / 24 - 1));
      outer.push([x, profile.bottom]); inner.push([x, profile.top]);
    }
    const material = [...outer, ...inner.reverse()];
    const envelope: Point[] = [...outer, [w / 2, h], [-w / 2, h]];
    return { material, envelope, color: '#a5b4b6', edge: '#526c73', metal: true };
  }
  if (frame.kind === 'log') {
    const normalized: Point[] = [[-.5,.14],[-.48,.8],[-.39,.97],[.39,1],[.5,.83],[.49,.16],[.39,.02],[-.38,0]];
    const material = normalized.map(([x, y]) => [x * w, y * h] as Point);
    return { material, envelope: material, color: '#b88c55', edge: '#69513b', metal: false };
  }
  const count = frame.kind === 'stone' ? 20 : 36;
  const material = Array.from({ length: count }, (_, i): Point => {
    const angle = i / count * Math.PI * 2;
    const irregular = frame.kind === 'stone' ? 1 + .06 * Math.sin(angle * 3 + .4) + .035 * Math.cos(angle * 5 - .8) : 1;
    return [Math.cos(angle) * w * .5 * irregular, h * .5 + Math.sin(angle) * h * .5 * irregular];
  });
  const ys = material.map(p => p[1]), low = Math.min(...ys), range = Math.max(...ys) - low;
  const bounded = material.map(([x, y]) => [x, (y - low) / range * h] as Point);
  return frame.kind === 'stone'
    ? { material: bounded, envelope: bounded, color: '#aab6a9', edge: '#667767', metal: false }
    : { material: bounded, envelope: bounded, color: '#b6a176', edge: '#796c51', metal: false };
}

function worldPoint(frame: JourneyFrame, point: Point): Point {
  const angle = finite(frame.body.tilt), c = Math.cos(angle), s = Math.sin(angle);
  return [point[0] * c - point[1] * s, frame.body.bottom + point[0] * s + point[1] * c];
}
function worldSection(frame: JourneyFrame, points: readonly Point[]) { return points.map(p => worldPoint(frame, p)); }
function submerged(points: readonly Point[], water: number): Point[] {
  const result: Point[] = [];
  for (let i = 0; i < points.length; i++) {
    const a = points[i], b = points[(i + 1) % points.length], aWet = a[1] <= water, bWet = b[1] <= water;
    if (aWet) result.push(a);
    if (aWet !== bWet) {
      const amount = (water - a[1]) / (b[1] - a[1]);
      result.push([a[0] + (b[0] - a[0]) * amount, water]);
    }
  }
  return result;
}
function projected(points: readonly Point[], project: Project): Point[] {
  return points.map(([x, y]) => { const p = project([x, y, 0]); return [p.x, p.y]; });
}
function arrow(x: number, y: number, dx: number, dy: number, color: string, id: string, attributes = '', width = 3.2) {
  const endX = x + dx, endY = y + dy;
  return `<g ${attributes}><path d="M${n(x)} ${n(y)}L${n(endX)} ${n(endY)}" fill="none" stroke="#fbfcf8" stroke-opacity=".88" stroke-width="${width + 3.5}" stroke-linecap="round"/>
    <path d="M${n(x)} ${n(y)}L${n(endX)} ${n(endY)}" fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="round" marker-end="url(#journey-${id}-head)"/></g>`;
}

function cargo(frame: JourneyFrame, s: Section, project: Project): string {
  const count = cargoCount(frame);
  if (!count) return '';
  const size = Math.min(frame.body.width * .15, frame.body.height * .27);
  const innerBottom = metalProfile(frame.body.form, 0).top;
  return Array.from({ length: count }, (_, i) => {
    const x = (i % 2 - .5) * size * 1.12, y = innerBottom + Math.floor(i / 2) * size * 1.02;
    const corners: Point[] = [[x-size*.49,y],[x+size*.49,y],[x+size*.49,y+size*.98],[x-size*.49,y+size*.98]];
    return `<path data-journey-cargo="${i}" d="${path(projected(worldSection(frame, corners), project))}" fill="#bd9c6b" stroke="#89714f" stroke-width=".8" opacity="${n(frame.body.opacity)}"/>`;
  }).join('');
}

function specimen(frame: JourneyFrame, s: Section, project: Project, prefix: string): string {
  const material = path(projected(worldSection(frame, s.material), project));
  const envelope = path(projected(worldSection(frame, s.envelope), project));
  const parcelPoints = submerged(worldSection(frame, frame.hydro.flooded ? s.material : s.envelope), frame.waterY);
  const parcel = path(projected(parcelPoints, project));
  const visibleParcel = frame.parcel.opacity > .001 && frame.hydro.displacedMl > .000001;
  const bodyOpacity = clamp(frame.body.opacity, 0, 1);
  return `<g data-journey-specimen="${frame.kind}" data-journey-form="${n(frame.body.form)}" data-journey-cabin="${s.metal && frame.body.form > .8 ? frame.hydro.flooded ? 'flooded' : 'dry' : 'none'}">
    ${s.metal && frame.body.form > .8 ? `<path data-journey-cavity="${frame.hydro.flooded ? 'flooded' : 'dry'}" d="${envelope}" fill="${frame.hydro.flooded ? '#dae9e9' : paper}" opacity="${n(bodyOpacity)}"/>` : ''}
    <defs><clipPath id="journey-${prefix}-body"><path d="${material}"/></clipPath></defs>
    <path data-journey-material="${frame.kind}" d="${material}" fill="${s.metal ? 'url(#journey-steel)' : s.color}" stroke="${s.edge}" stroke-width="1.8" stroke-linejoin="round" opacity="${n(bodyOpacity)}"/>
    ${frame.kind === 'log' ? `<g clip-path="url(#journey-${prefix}-body)" opacity="${n(bodyOpacity * .4)}">${Array.from({length:6}, (_, i) => {
      const a = project([-frame.body.width, frame.body.bottom + frame.body.height * (i + .5) / 6, 0]);
      const b = project([frame.body.width, frame.body.bottom + frame.body.height * (i + .5) / 6, 0]);
      return `<path d="M${n(a.x)} ${n(a.y)}Q${n((a.x+b.x)/2)} ${n((a.y+b.y)/2-3)} ${n(b.x)} ${n(b.y)}" fill="none" stroke="#6c4a29" stroke-width=".9"/>`;
    }).join('')}</g>` : ''}
    ${cargo(frame, s, project)}
    ${visibleParcel ? `<path data-journey-parcel="water" data-parcel-mass-g="${frame.parcel.massG}" data-parcel-weight-n="${frame.parcel.weightN}" d="${parcel}" fill="#60b7c5" fill-opacity="${n(frame.parcel.opacity*.32)}" stroke="#3b94a5" stroke-width="1.8" stroke-dasharray="5 4" opacity="${n(frame.parcel.opacity)}"/>` : ''}
  </g>`;
}

function fallbackScene(frame: JourneyFrame, s: Section, width: number, height: number, project: Project) {
  const surface = project([0, frame.waterY, 0]).y, bed = project([0, frame.floorY, 0]).y;
  return `<g data-journey-fallback="shore">
    <rect width="${width}" height="${height}" fill="#f1f4ee"/>
    <path d="M0 ${n(surface)}H${width}V${height}H0Z" fill="url(#journey-lake)"/>
    <path d="M0 ${n(bed+7)}Q${n(width*.25)} ${n(bed-8)} ${width} ${n(bed+14)}V${height}H0Z" fill="#d3d7c6"/>
    <path d="M0 ${n(surface-38)}Q${n(width*.1)} ${n(surface-30)} ${n(width*.13)} ${n(surface+5)}L${n(width*.06)} ${n(bed+1)}H0Z" fill="#c2c8ae"/>
    <path d="M0 ${n(surface)}H${width}" fill="none" stroke="#75aab1" stroke-width="1.3"/>
    ${[.24,.67,.86].map((x, i) => `<path d="M${n(width*x-15)} ${n(surface-3+i*3)}q15 -2 30 0" fill="none" stroke="#c7e0dd" stroke-width="1.2"/>`).join('')}
    ${specimen(frame, s, project, 'fallback')}
    ${label(18, height-17, t('同一岸边的简化剖面'), '#667d79', 12, 'start')}
  </g>`;
}

function forceExplanation(frame: JourneyFrame, s: Section, width: number, height: number, project: Project) {
  const chapter = frame.settings.chapter;
  if (chapter === 'shore' && frame.beat === 'shore.observe') return '';
  if (chapter === 'metal' && !['metal.solid', 'metal.lower', 'metal.settle'].includes(frame.beat)) return '';
  const inReplacement = chapter === 'water' || chapter === 'pressure';
  const mix = inReplacement ? clamp(frame.comparison, 0, 1) : 1;
  const down = inReplacement ? frame.parcel.weightN * (1-mix) + frame.forces.weight * mix : frame.forces.weight;
  const up = frame.hydro.displacedMl > .000001 ? frame.forces.buoyancy : 0;
  const support = mix >= .999 ? frame.forces.support : 0;
  if (Math.max(up, down, support) < .000001) return '';
  const points = projected(worldSection(frame, s.envelope), project), xs = points.map(p=>p[0]), ys = points.map(p=>p[1]);
  const center = project([0, frame.body.bottom + frame.body.height*.5, 0]);
  const left = clamp(Math.min(...xs) - 31, 58, width*.43), right = clamp(Math.max(...xs) + 31, width*.57, width-58);
  const centerY = clamp(center.y, 92, height-103), maximum = Math.min(106, height*.25);
  // Both arrows use the same scale. No minimum visible length invents a
  // nonzero force, and the water parcel has exactly equal up/down arrows.
  const scale = maximum / Math.max(frame.forces.weight,frame.parcel.weightN,up,support,.000001), upLength = up*scale, downLength = down*scale;
  const downLabel = mix < .001 ? t('这团水的重量') : mix < .999 ? t('替换中的重量') : t('物体的重量');
  const marks: string[] = [];
  if (up > .000001) {
    const tail = centerY + 26;
    marks.push(arrow(left, tail, 0, -upLength, teal, 'up', `data-journey-force="buoyancy" data-force-n="${up}" data-force-length="${n(upLength)}" data-force-subject="${mix < .001 ? 'parcel' : 'object'}"`));
    marks.push(label(Math.max(18,left-20), clamp(tail-upLength-14, 25,height-35), t('水的托力'), teal, 13, 'start', true));
  }
  if (down > .000001) {
    const tail = centerY - 26;
    marks.push(arrow(right, tail, 0, downLength, copper, 'down', `data-journey-force="weight" data-force-n="${down}" data-force-length="${n(downLength)}" data-force-subject="${mix < .001 ? 'parcel' : mix < .999 ? 'replacement' : 'object'}"`));
    marks.push(label(Math.min(width-18,right+20), clamp(tail+downLength+22, 35,height-26), downLabel, copper, 13, 'end', true));
  }
  if (support > .000001) {
    const x = clamp(center.x, 28,width-28), y = clamp(Math.max(...ys)+12, 45,height-45), length = support*scale;
    marks.push(arrow(x,y,0,-length,'#798557','support',`data-journey-force="support" data-force-n="${support}" data-force-length="${n(length)}"`,2.8));
    marks.push(label(x,y+21,t('湖底支持'),'#667345',12,'middle',true));
  }
  if (inReplacement && mix < .001 && frame.parcel.opacity > .99 && up > 0) {
    marks.push(label(width/2,height-42,t('一样大，水团留在原处'), '#426f72',13,'middle',true));
  }
  return `<g data-journey-forces="${mix < .001 ? 'parcel' : mix < .999 ? 'replacement' : 'object'}">${marks.join('')}</g>`;
}

function metalNote(frame: JourneyFrame, width: number, height: number, project: Project) {
  if (frame.settings.chapter !== 'metal') return '';
  const moving = ['metal.lift','metal.flatten','metal.bend'].includes(frame.beat);
  if (moving) {
    const p = project([0,frame.body.bottom+frame.body.height,0]);
    return `<g data-journey-metal-identity="retained" data-metal-mass-g="${frame.hydro.massG}">${label(clamp(p.x,80,width-80),clamp(p.y-27,30,height-30),t('同一份金属，质量不变'),ink,13,'middle',true)}</g>`;
  }
  if (frame.body.form < .999 || frame.beat !== 'metal.settle') return '';
  const p = project([frame.body.width*.45,frame.body.bottom+frame.body.height,0]);
  const x = clamp(p.x+29,120,width-18), y = clamp(p.y-32,28,height-28);
  return `<g data-journey-dry-callout="${frame.hydro.flooded ? 'flooded' : 'dry'}">
    <path d="M${n(p.x)} ${n(p.y)}L${n(x-12)} ${n(y+7)}" fill="none" stroke="#7b9090" stroke-width="1.1"/>
    ${label(x,y,frame.hydro.flooded ? t('水已漫过船沿') : t('船内保持干燥'),frame.hydro.flooded ? copper : ink,13,'end',true)}</g>`;
}

function contacts(frame: JourneyFrame, s: Section): Contact[] {
  // Use actual upper/lower material faces. Opposing vertical components make
  // the pressure difference traceable, instead of comparing two side pushes.
  // In a dry hull the upper face belongs to the cabin: the external waterline
  // does not make this interior face wet, even if it is below that line.
  const boundary = s.material;
  const winding = Math.sign(boundary.reduce((sum,a,i)=>{const b=boundary[(i+1)%boundary.length];return sum+a[0]*b[1]-b[0]*a[1];},0)) || 1;
  return [0,1].map((index): Contact => {
    const target = -frame.body.width*(s.metal&&index===0?.44:.1);
    const hits: { point: Point; inward: Point }[] = [];
    boundary.forEach((a,i)=>{
      const b=boundary[(i+1)%boundary.length],dx=b[0]-a[0],dy=b[1]-a[1],length=Math.hypot(dx,dy);
      if (length < 1e-10 || Math.abs(dx)<1e-10 || target < Math.min(a[0],b[0])-1e-10 || target > Math.max(a[0],b[0])+1e-10) return;
      const amount=(target-a[0])/dx;
      hits.push({point:[target,a[1]+dy*amount],inward:[-dy/length*winding,dx/length*winding]});
    });
    hits.sort((a,b)=>b.point[1]-a.point[1]);
    const hit=(index===0?hits[0]:hits.at(-1)) ?? {point:boundary[0],inward:[0,index===0?-1:1] as Point};
    const point=worldPoint(frame,hit.point),angle=frame.body.tilt,c=Math.cos(angle),sn=Math.sin(angle);
    const inward: Point=[hit.inward[0]*c-hit.inward[1]*sn,hit.inward[0]*sn+hit.inward[1]*c];
    const dryCabin=s.metal&&frame.body.form===1&&!frame.hydro.flooded&&index===0;
    const depth = !dryCabin&&frame.hydro.displacedMl > .000001 ? Math.max(0,frame.waterY-point[1]) : 0;
    return {label:index===0?'A':'B',point,inward,depth,wet:depth>1e-8,pressure:depth*Math.max(0,frame.hydro.density)};
  });
}

// One stable irregular liquid neighbourhood is shared by A and B. Depth is not
// an input: the deeper window never becomes denser, faster, or more agitated.
const sites: Point[] = (()=>{
  let seed=440916; const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)|0;return (seed>>>0)/4294967296;};
  const points: Point[]=[];
  for(let attempt=0;attempt<18000&&points.length<850;attempt++){
    const point:Point=[-240+random()*480,-8-random()*230];
    if(points.some(p=>(p[0]-point[0])**2+(p[1]-point[1])**2<8.2**2))continue;
    points.push(point);
  }
  return points;
})();

function molecularWindow(frame: JourneyFrame, s: Section, contact: Contact, x: number, y: number, width: number, height: number, phase: number) {
  const inner={x:x+9,y:y+31,width:width-18,height:height-58};
  // Screen-space normal mirrors the actual boundary's x/up-y orientation.
  const nx=contact.inward[0],ny=-contact.inward[1],tx=-ny,ty=nx;
  const span=Math.min(Math.abs(nx)>.001?inner.width/Math.abs(nx):Infinity,Math.abs(ny)>.001?inner.height/Math.abs(ny):Infinity);
  const cx=inner.x+inner.width*.5+nx*span*.16,cy=inner.y+inner.height*.5+ny*span*.16;
  const convert=(a:number,b:number):Point=>[cx+tx*a+nx*b,cy+ty*a+ny*b];
  const reach=Math.hypot(inner.width,inner.height),faceA=convert(-reach,0),faceB=convert(reach,0);
  const outside=[convert(-reach,0),convert(reach,0),convert(reach,-reach),convert(-reach,-reach)];
  const inside=[convert(-reach,0),convert(reach,0),convert(reach,reach),convert(-reach,reach)];
  const rendered: {index:number; point:Point; local:Point}[]=[];
  if(contact.wet) sites.forEach(([a,b],index)=>{
    const seed=index*2.399963;
    const u=a+3.4*(Math.sin(phase*Math.PI*2+seed)-Math.sin(seed))+.8*(Math.cos(phase*Math.PI*4+seed*.61)-Math.cos(seed*.61));
    const v=b+2.0*(Math.cos(phase*Math.PI*2+seed*.79)-Math.cos(seed*.79));
    const base=convert(a,b),point=convert(u,v);
    if(base[0]<inner.x-6||base[0]>inner.x+inner.width+6||base[1]<inner.y-6||base[1]>inner.y+inner.height+6)return;
    rendered.push({index,point,local:[u,v]});
  });
  const interactions: string[]=[];
  rendered.forEach((a,i)=>{
    if(i%7!==0)return;
    let best=Infinity,nearest:typeof a|undefined;
    rendered.forEach((b,j)=>{const distance=Math.hypot(a.point[0]-b.point[0],a.point[1]-b.point[1]);if(i!==j&&distance<best){best=distance;nearest=b;}});
    if(nearest&&best<15.5)interactions.push(`<path data-molecular-neighbour="${a.index}" d="M${n(a.point[0])} ${n(a.point[1])}L${n(nearest.point[0])} ${n(nearest.point[1])}" fill="none" stroke="#4c8b96" stroke-width="1.2" stroke-opacity="${n(.08+.14*(.5+.5*Math.sin(phase*Math.PI*4+a.index)))}"/>`);
  });
  const particleMarkup=rendered.map(p=>`<circle data-journey-molecule="${p.index}" data-s="${n(p.local[0])}" data-u="${n(p.local[1])}" cx="${n(p.point[0])}" cy="${n(p.point[1])}" r="2.2" fill="#3e8998" fill-opacity=".8"/>`).join('');
  const contactCues=contact.wet?[-1,0,1].map((i)=>{
    const a=convert(i*21-2.5,-3),b=convert(i*21+2.5,-3),opacity=.15+.25*(.5+.5*Math.sin(phase*Math.PI*4+i*2.1));
    return `<path data-molecular-contact="${i}" d="M${n(a[0])} ${n(a[1])}L${n(b[0])} ${n(b[1])}" stroke="#4c8b96" stroke-width="1.6" stroke-linecap="round" opacity="${n(opacity)}"/>`;
  }).join(''):'';
  const length=Math.min(span*.64,contact.pressure*span*.47),start=convert(0,-length*.75);
  const mean=contact.wet&&length>1e-8?arrow(start[0],start[1],nx*length,ny*length,teal,'up',`data-journey-mean-pressure="${contact.pressure}" data-pressure-length="${n(length)}"`,3):'';
  const parcelOnly=frame.comparison<.001;
  const subjectFill=parcelOnly?'#d3e8e9':s.color;
  return `<g data-journey-window="${contact.label}" data-wet="${contact.wet}" data-depth="${contact.depth}" data-source-x="${contact.point[0]}" data-source-y="${contact.point[1]}" data-nx="${nx}" data-ny="${ny}" data-interface-x="${n(cx)}" data-interface-y="${n(cy)}" data-window-x="${x}" data-window-y="${y}" data-window-width="${width}" data-window-height="${height}">
    <defs><clipPath id="journey-window-${contact.label}"><rect x="${n(inner.x)}" y="${n(inner.y)}" width="${n(inner.width)}" height="${n(inner.height)}" rx="3"/></clipPath></defs>
    <rect x="${n(x)}" y="${n(y)}" width="${n(width)}" height="${n(height)}" rx="11" fill="#fbfcf8" stroke="#bccdcc" stroke-width="1.1"/>
    <circle cx="${n(x+17)}" cy="${n(y+16)}" r="9" fill="#e5ece5"/>
    ${label(x+17,y+20,contact.label,ink,12.5)}${label(x+33,y+20,contact.label==='A'?t('上方接触处'):t('下方接触处'),ink,12.5,'start')}
    <g clip-path="url(#journey-window-${contact.label})"><path d="${path(outside)}" fill="${contact.wet?'#e1eff0':'#f8faf6'}"/>
      <path d="${path(inside)}" fill="${subjectFill}"/>
      <path d="M${n(faceA[0])} ${n(faceA[1])}L${n(faceB[0])} ${n(faceB[1])}" stroke="${s.edge}" stroke-width="2"${parcelOnly?' stroke-dasharray="4 3"':''}/>
      ${interactions.join('')}${particleMarkup}${contactCues}${mean}</g>
    ${label(x+width/2,y+height-9,contact.wet?t('水的平均推力'):t('此处没有水作用'),contact.wet?teal:'#77827c',12.5)}
  </g>`;
}

function microscopic(frame: JourneyFrame, s: Section, width: number, height: number, phase: number) {
  const compact=width<650,inset=16,gap=compact?17:34;
  const overviewWidth=compact?Math.max(100,width*.31):Math.min(330,width*.39);
  const panelWidth=Math.min(compact?380:440,width-inset*2-overviewWidth-gap),panelX=width-inset-panelWidth;
  const top=44,panelGap=14,footer=47,panelHeight=(height-top-footer-panelGap)/2;
  const all=worldSection(frame,s.envelope),maxY=Math.max(frame.waterY+.24,...all.map(p=>p[1]));
  const lower=Math.min(frame.waterY-.28,...all.map(p=>p[1]));
  const minX=Math.min(-frame.body.width*.65,...all.map(p=>p[0])),maxX=Math.max(frame.body.width*.65,...all.map(p=>p[0]));
  const availableHeight=height-133,scale=Math.min((overviewWidth-16)/(maxX-minX),availableHeight/Math.max(.6,maxY-lower));
  const centerX=inset+overviewWidth/2,centerY=height*.48;
  const project:Project=([x,y])=>({x:centerX+x*scale,y:centerY-(y-(maxY+lower)*.5)*scale});
  const surface=project([0,frame.waterY,0]).y,overviewBottom=height-75,contactPoints=contacts(frame,s);
  const leaders=contactPoints.map((contact,i)=>{
    const p=project([contact.point[0],contact.point[1],0]),endY=top+i*(panelHeight+panelGap)+panelHeight/2;
    return `<path data-journey-leader="${contact.label}" d="M${n(p.x)} ${n(p.y)}L${n(inset+overviewWidth+6)} ${n(p.y)}L${n(panelX-5)} ${n(endY)}" fill="none" stroke="#9cadaa" stroke-width="1.1" stroke-dasharray="3 4"/>`;
  }).join('');
  const marks=contactPoints.map(contact=>{
    const p=project([contact.point[0],contact.point[1],0]);
    return `<g data-journey-anchor="${contact.label}" data-source-x="${contact.point[0]}" data-source-y="${contact.point[1]}"><circle cx="${n(p.x)}" cy="${n(p.y)}" r="4.2" fill="#fcfdf8" stroke="#536f6e" stroke-width="1.7"/>${label(p.x+(contact.label==='A'?10:-10),p.y+(contact.label==='A'?-10:18),contact.label,ink,13,contact.label==='A'?'start':'end')}</g>`;
  }).join('');
  const net=frame.hydro.displacedMl>.000001&&frame.forces.buoyancy>0?arrow(inset+8,overviewBottom,0,-Math.min(48,frame.forces.buoyancy*6),teal,'up',`data-journey-force="buoyancy" data-force-n="${frame.forces.buoyancy}"`,2.6):'';
  return `<g data-journey-micro="same-specimen" data-motion-phase="${n(phase)}">
    <rect width="${width}" height="${height}" fill="${paper}"/>
    ${label(width/2,23,t('同一物体的两个接触位置'),ink,13.5)}
    <rect x="${inset}" y="${n(surface)}" width="${n(overviewWidth)}" height="${n(Math.max(0,overviewBottom-surface))}" fill="#dcebed"/>
    <path d="M${inset} ${n(surface)}H${n(inset+overviewWidth)}" stroke="#80aeb4" stroke-width="1.1"/>
    ${label(inset+3,clamp(surface-9,63,height-100),t('水面'),'#5b858d',12,'start')}
    ${leaders}${specimen(frame,s,project,'micro')}${marks}${net}
    ${label(centerX,height-57,t('简化剖面'),'#718580',12.5)}
    ${molecularWindow(frame,s,contactPoints[0],panelX,top,panelWidth,panelHeight,phase)}
    ${molecularWindow(frame,s,contactPoints[1],panelX,top+panelHeight+panelGap,panelWidth,panelHeight,phase)}
    ${label(width/2,height-27,t('箭头表示额外水压，省略共同大气压'),'#6c807a',12)}
    ${label(width/2,height-10,t('分子大小与轨迹仅为示意'),'#6c807a',12)}
  </g>`;
}

function wholePressure(frame: JourneyFrame, s: Section, project: Project) {
  if(frame.hydro.displacedMl<=.000001)return '';
  const boundary=worldSection(frame,frame.hydro.flooded?s.material:s.envelope);
  const winding=Math.sign(boundary.reduce((sum,a,i)=>{const b=boundary[(i+1)%boundary.length];return sum+a[0]*b[1]-b[0]*a[1];},0))||1;
  const arrows:string[]=[];
  boundary.forEach((a,i)=>{
    const b=boundary[(i+1)%boundary.length],dx=b[0]-a[0],dy=b[1]-a[1],length=Math.hypot(dx,dy);
    if(length<1e-8)return;
    const nx=-dy/length*winding,ny=dx/length*winding,count=Math.max(1,Math.round(length/.25));
    for(let j=0;j<count;j++){
      const amount=(j+.5)/count,x=a[0]+dx*amount,y=a[1]+dy*amount,depth=Math.max(0,frame.waterY-y);
      if(depth<.015)continue;
      const reach=Math.min(.36,depth*.22),start=project([x-nx*reach,y-ny*reach,0]),end=project([x+nx*.045,y+ny*.045,0]);
      arrows.push(arrow(start.x,start.y,end.x-start.x,end.y-start.y,teal,'up',`data-journey-pressure="${depth*frame.hydro.density}" data-pressure-depth="${depth}" data-pressure-nx="${nx}" data-pressure-ny="${ny}" data-source-x="${x}" data-source-y="${y}"`,2.2));
    }
  });
  return `<g data-journey-pressure-section="illustrative">${arrows.join('')}</g>`;
}

/** Pure supplied-frame renderer. The journey owns all state, clocks, pause,
 * resize and disposal; rendering mutates only the supplied SVG element. */
export function drawJourneyExplanation(svg: SVGSVGElement, frame: JourneyFrame, options: JourneyExplanationOptions): void {
  const width=Math.max(280,finite(options.width,390)),height=Math.max(260,finite(options.height,400));
  const phase=clamp(finite(options.motionPhase??frame.settings.progress),0,1);
  const s=section(frame), fallback=options.fallback===true||!options.project;
  const scale=Math.min(width*.27,height*.24),centerY=height*.43;
  const project:Project=fallback?([x,y])=>({x:width*.51+x*scale,y:centerY-y*scale}):options.project!;
  svg.setAttribute('viewBox',`0 0 ${width} ${height}`);
  svg.setAttribute('preserveAspectRatio','xMidYMid meet');
  svg.setAttribute('data-journey-chapter',frame.settings.chapter);
  svg.setAttribute('data-journey-kind',frame.kind);
  svg.setAttribute('data-journey-beat',frame.beat);
  svg.setAttribute('data-journey-cargo',String(cargoCount(frame)));
  svg.setAttribute('data-journey-parcel-opacity',String(frame.parcel.opacity));
  svg.setAttribute('data-journey-flooded',String(frame.hydro.flooded));
  const defs=`<defs>
    <linearGradient id="journey-steel" x1="0" y1="0" x2=".8" y2="1"><stop stop-color="#d5dfe0"/><stop offset=".37" stop-color="#91a7ac"/><stop offset=".56" stop-color="#b7c7ca"/><stop offset="1" stop-color="#6b858c"/></linearGradient>
    <linearGradient id="journey-lake" x2="0" y2="1"><stop stop-color="#d5e8e7"/><stop offset="1" stop-color="#97b8bb"/></linearGradient>
    ${[['up',teal],['down',copper],['support','#798557']].map(([id,color])=>`<marker id="journey-${id}-head" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="4" markerHeight="4" orient="auto"><path d="M0 0L10 5L0 10Z" fill="${color}"/></marker>`).join('')}
  </defs>`;
  const isMicro=frame.settings.chapter==='pressure'&&frame.settings.lens==='micro';
  svg.innerHTML=`<title>${escaped(t('同一物体、同一片水的受力解释'))}</title>${defs}<g font-family="ui-sans-serif,system-ui,sans-serif">
    ${isMicro?microscopic(frame,s,width,height,phase):`${fallback?fallbackScene(frame,s,width,height,project):''}${frame.settings.chapter==='pressure'?wholePressure(frame,s,project):''}${forceExplanation(frame,s,width,height,project)}${metalNote(frame,width,height,project)}`}
  </g>`;
}
