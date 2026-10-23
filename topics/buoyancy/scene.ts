import type { Settings } from './model.ts';
import { buoyancy } from './model.ts';
import { t } from './i18n.ts';
import { TankScene, type TankGeometry } from './tankScene.ts';
import { drawPressureSection } from './pressureView.ts';
import { drawMolecularPressure } from './molecularView.ts';

export type Observation = 'tank' | 'pressure' | 'replacement' | 'displacement';

type Result = ReturnType<typeof buoyancy>;
type Geometry = TankGeometry;
const escape = (value: string) => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const text = (x: number, y: number, value: string, size = 15, color = '#3c5560', caption = false) => `<text x="${x}" y="${y}" fill="${color}" font-size="${size}" text-anchor="middle"${caption ? ' data-caption="true"' : ''}>${escape(value)}</text>`;
const definitions = (g:Geometry) => `<defs>
 <linearGradient id="buoy-room" x2=".2" y2="1"><stop stop-color="#f4f6f5"/><stop offset=".65" stop-color="#edf1f0"/><stop offset="1" stop-color="#e3eaea"/></linearGradient>
 <linearGradient id="buoy-glass" x2="1" y2=".12"><stop stop-color="#9eb9c5" stop-opacity=".17"/><stop offset=".07" stop-color="#fff" stop-opacity=".35"/><stop offset=".26" stop-color="#fff" stop-opacity=".07"/><stop offset=".86" stop-color="#e2edf1" stop-opacity=".12"/><stop offset="1" stop-color="#799ba9" stop-opacity=".2"/></linearGradient>
 <linearGradient id="buoy-water-fill" x2=".15" y2="1"><stop stop-color="#c1e3e8"/><stop offset=".45" stop-color="#a3cdd7"/><stop offset="1" stop-color="#719eaf"/></linearGradient>
 <linearGradient id="buoy-water-front" x2="0" y2="1"><stop stop-color="#acd6e0" stop-opacity=".12"/><stop offset="1" stop-color="#537f98" stop-opacity=".22"/></linearGradient>
 <linearGradient id="buoy-water-edge" x2="1" y2="0"><stop stop-color="#6c9eac"/><stop offset=".28" stop-color="#b9e4eb"/><stop offset=".7" stop-color="#d8eff1"/><stop offset="1" stop-color="#6b9cad"/></linearGradient>
 <linearGradient id="buoy-rim" x2="1" y2="0"><stop stop-color="#587b8b"/><stop offset=".12" stop-color="#acc4cd"/><stop offset=".5" stop-color="#dce9ec"/><stop offset=".87" stop-color="#8baab6"/><stop offset="1" stop-color="#506f80"/></linearGradient>
 <linearGradient id="buoy-wood" x1="0" y1="0" x2=".2" y2="1"><stop stop-color="#bba482"/><stop offset=".35" stop-color="#ad9371"/><stop offset=".8" stop-color="#9e8362"/><stop offset="1" stop-color="#8b7256"/></linearGradient>
 <linearGradient id="buoy-wood-top" x2="0" y2="1"><stop stop-color="#d5c2a2"/><stop offset="1" stop-color="#bca583"/></linearGradient>
 <linearGradient id="buoy-wood-end" x2="1" y2=".25"><stop stop-color="#927858"/><stop offset=".65" stop-color="#a28a67"/><stop offset="1" stop-color="#7e684f"/></linearGradient>
 <pattern id="buoy-wood-pores" width="19" height="13" patternUnits="userSpaceOnUse" patternTransform="translate(${365-g.width/2} ${g.bottom-g.height})"><path d="M2 3h3m7 5h5M4 11h1" stroke="#503d2b" stroke-width=".35" opacity=".3"/><path d="M9 1h3m-9 6h4" stroke="#eadbc2" stroke-width=".45" opacity=".4"/></pattern>
 <linearGradient id="buoy-cup-glass" x2="1" y2="0"><stop stop-color="#486d7e" stop-opacity=".32"/><stop offset=".035" stop-color="#fff" stop-opacity=".78"/><stop offset=".09" stop-color="#c1d5de" stop-opacity=".13"/><stop offset=".36" stop-color="#fff" stop-opacity=".025"/><stop offset=".78" stop-color="#dceaf0" stop-opacity=".09"/><stop offset=".95" stop-color="#7193a5" stop-opacity=".23"/><stop offset="1" stop-color="#3d657b" stop-opacity=".47"/></linearGradient>
 <linearGradient id="buoy-clay" x2=".35" y2="1"><stop stop-color="#e1ad91"/><stop offset=".28" stop-color="#cc9178"/><stop offset=".74" stop-color="#b57962"/><stop offset="1" stop-color="#8e5948"/></linearGradient>
 <radialGradient id="buoy-clay-ball" cx="30%" cy="22%" r="85%"><stop stop-color="#edc2a8"/><stop offset=".45" stop-color="#d49b80"/><stop offset=".78" stop-color="#b67760"/><stop offset="1" stop-color="#86503e"/></radialGradient>
 <linearGradient id="buoy-air" x2="0" y2="1"><stop stop-color="#f3f5f3"/><stop offset=".7" stop-color="#e8edeb"/><stop offset="1" stop-color="#d4dcd8"/></linearGradient>
 <pattern id="buoy-clay-grain" width="27" height="23" patternUnits="userSpaceOnUse" patternTransform="translate(${365-g.width/2} ${g.bottom-g.height})"><path d="M3 5l4 1m12 8l3-1M7 19h2" stroke="#613b30" stroke-width=".65" opacity=".4"/><path d="M13 4l3-.3m-12 10l2 1" stroke="#ffe6cd" stroke-width=".7" opacity=".5"/><circle cx="15" cy="19" r=".7" fill="#613b30" opacity=".25"/></pattern>
 <linearGradient id="buoy-stone" x2=".7" y2="1"><stop stop-color="#c7d0bf"/><stop offset=".46" stop-color="#9fae9a"/><stop offset="1" stop-color="#667b72"/></linearGradient>
 <linearGradient id="buoy-steel" x2="1" y2=".25"><stop stop-color="#607d88"/><stop offset=".13" stop-color="#d1e1e4"/><stop offset=".3" stop-color="#9fb9c0"/><stop offset=".54" stop-color="#edf7f5"/><stop offset=".73" stop-color="#afc7cd"/><stop offset="1" stop-color="#607e8a"/></linearGradient>
 <linearGradient id="buoy-cargo" x2=".5" y2="1"><stop stop-color="#e8ce98"/><stop offset=".6" stop-color="#c8a768"/><stop offset="1" stop-color="#99763f"/></linearGradient>
 <linearGradient id="buoy-table" x2="0" y2="1"><stop stop-color="#d7cbb8"/><stop offset=".13" stop-color="#cfc0a8"/><stop offset="1" stop-color="#b7a78c"/></linearGradient>
 <radialGradient id="buoy-shadow"><stop stop-color="#315151" stop-opacity=".22"/><stop offset="1" stop-color="#315151" stop-opacity="0"/></radialGradient>
 <clipPath id="buoy-tank-clip"><rect x="81" y="89" width="530" height="353" rx="20"/></clipPath>
 <marker id="buoy-up" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="2.3" markerHeight="2.3" orient="auto"><path d="M0 0L10 5L0 10Z" fill="#178b70"/></marker>
 <marker id="buoy-down" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="2.3" markerHeight="2.3" orient="auto"><path d="M0 0L10 5L0 10Z" fill="#b77c3e"/></marker>
 <marker id="buoy-cord" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="2.3" markerHeight="2.3" orient="auto"><path d="M0 0L10 5L0 10Z" fill="#647782"/></marker>
 <marker id="buoy-floor" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="2.3" markerHeight="2.3" orient="auto"><path d="M0 0L10 5L0 10Z" fill="#71807a"/></marker>
 </defs>`;

export function experimentGeometry(state: Settings, result: Result): Geometry {
 const boat = state.experiment === 'boat' && state.boat, held = state.experiment === 'depth';
 const size = 150 * Math.cbrt(result.solidVolume / 600);
 const wood = state.experiment === 'objects' && state.object === 'wood';
 const width = boat ? 260 * result.capacity / 1400 : held ? 120 : wood ? 150 : size;
 const height = boat ? 94 : held ? 120 : wood ? 94 : size;
 // A shared empty-tank datum makes different displacements comparable; the rise is enlarged for teaching.
 const water = 245 - result.displaced / 20;
 // Keep the existing trapezoidal hull's draft-volume relation.
 const draft = boat ? (-160 + Math.sqrt(25600 + 42000 * result.fraction))*height/100 : height * result.fraction;
 return { water, width, height, bottom: held ? water + height * state.depth / 100 : result.floating ? water + draft : 440, cup: 438 - result.displaced / 9 };
}

const between = (a: number, b: number, amount: number) => a + (b - a) * amount;
function blendGeometry(a: Geometry, b: Geometry, amount: number): Geometry {
 return { water: between(a.water,b.water,amount), bottom: between(a.bottom,b.bottom,amount), width: between(a.width,b.width,amount), height: between(a.height,b.height,amount), cup: between(a.cup,b.cup,amount) };
}
function clayOutline(g: Geometry, open: number) {
 const x=365-g.width/2,y=g.bottom-g.height,w=g.width,h=g.height;
 const thickness=20*260/w;
 // Ten cubic segments share identity. At open=1 they are the exact original
 // straight/rounded trapezoidal hull, avoiding a different outline on settling.
 const ends=[[0,0],[w*.108,h-12],[w*.192,h],[w*.808,h],[w*.892,h-12],[w,0],[w-thickness*.75,0],[w*.892-thickness*.7,h-thickness],[w*.108+thickness*.7,h-thickness],[thickness*.75,0],[0,0]];
 const ballPoint=(angle:number)=>[w/2+w/2*Math.cos(angle),h/2+h/2*Math.sin(angle)];
 const start=[between(0,ends[0][0],open),between(h/2,ends[0][1],open)];
 let path=`M${x+start[0]} ${y+start[1]}`;
 for(let i=0;i<10;i++){
  const a=Math.PI-i*Math.PI/5,b=a-Math.PI/5,k=4/3*Math.tan(Math.PI/20),p=ballPoint(a),q=ballPoint(b);
  const ball=[[p[0]+k*w/2*Math.sin(a),p[1]-k*h/2*Math.cos(a)],[q[0]-k*w/2*Math.sin(b),q[1]+k*h/2*Math.cos(b)],q];
  const from=ends[i],to=ends[i+1],control=i===1?[w*.123,h]:i===3?[w*.877,h]:undefined;
  const shell=control?[[from[0]+(control[0]-from[0])*2/3,from[1]+(control[1]-from[1])*2/3],[to[0]+(control[0]-to[0])*2/3,to[1]+(control[1]-to[1])*2/3],to]:[[between(from[0],to[0],1/3),between(from[1],to[1],1/3)],[between(from[0],to[0],2/3),between(from[1],to[1],2/3)],to];
  path+=`C${ball.map((point,j)=>`${x+between(point[0],shell[j][0],open)} ${y+between(point[1],shell[j][1],open)}`).join(' ')}`;
 }
 return path+'Z';
}
function clayReshape(g: Geometry, open: number) {
 const path=clayOutline(g,open);
 return `<path d="${path}" fill="url(#buoy-clay-ball)"/><path d="${path}" fill="url(#buoy-clay)" opacity="${open}"/><path d="${path}" fill="url(#buoy-clay-grain)" opacity=".55"/><path d="${path}" fill="none" stroke="#895c4b" stroke-width="1.6"/>`;
}

function objectMarkup(state: Settings, g: Geometry, flooded: boolean, reshaping?: number) {
 const x = 365 - g.width / 2, y = g.bottom - g.height, w = g.width, h = g.height, b = g.bottom;
 if (state.experiment === 'boat' && reshaping !== undefined && reshaping<.999999) return { body: clayReshape(g,reshaping), air: '', cargo: '', floodedInterior: '' };
 if (state.experiment === 'boat' && (state.boat || reshaping!==undefined)) {
  const thickness=20*260/w;
  const hull = clayOutline(g,1);
  const inside = `M${x+thickness*.75} ${y}L${x+w*.108+thickness*.7} ${b-thickness}H${x+w*.892-thickness*.7}L${x+w-thickness*.75} ${y}Z`;
  const shell = `<path d="${hull}" fill="url(#buoy-clay)" stroke="#895c4b" stroke-width="1.6"/><path d="${hull}" fill="url(#buoy-clay-grain)" opacity=".55"/><path d="M${x+3} ${y+1.5}h${thickness*.75-6}M${x+w-thickness*.75+3} ${y+1.5}h${thickness*.75-6}" stroke="#f4cfb6" stroke-width="2" stroke-linecap="round"/><path d="M${x+thickness*.42} ${y+9}L${x+w*.108+thickness*.26} ${b-15}Q${x+w*.14} ${b-5} ${x+w*.2} ${b-5}H${x+w*.8}" fill="none" stroke="#ebbea3" stroke-width="1.5" opacity=".7"/><path d="M${x+w*.108+thickness*.7} ${b-thickness+2}H${x+w*.892-thickness*.7}" stroke="#744b3c" stroke-width="2" opacity=".32"/>`;
  const wet=flooded||g.water<y;
  const interior = `<path d="${inside}" fill="${wet ? 'url(#buoy-water-fill)' : 'url(#buoy-air)'}"/><path d="M${x+thickness*.75} ${y+2}L${x+w*.108+thickness*.7} ${b-thickness}H${x+w*.892-thickness*.7}" fill="none" stroke="${wet?'#739eac':'#aa7b63'}" stroke-width="1.5" opacity=".45"/>`;
  const columns=Math.max(1,Math.min(6,Math.floor((w*.784-thickness*1.4)/26)));
  const cargo = Array.from({ length: state.cargo }, (_, i) => {
   const cx=365-columns*26/2+(i%columns)*26, cy=b-thickness-24-Math.floor(i/columns)*26;
   return `<g><rect x="${cx+1}" y="${cy+2}" width="24" height="24" rx="4" fill="#6d5d42" opacity=".15"/><rect x="${cx}" y="${cy}" width="24" height="24" rx="4" fill="url(#buoy-cargo)" stroke="#b18545" stroke-width="1.2"/><path d="M${cx+4} ${cy+3}H${cx+20}M${cx+4} ${cy+5}V${cy+20}" stroke="#ffe8ad" opacity=".7" fill="none" stroke-width="1.3"/><path d="M${cx+10} ${cy+4}V${cy+19}" stroke="#bc8d45" opacity=".4"/></g>`;
  }).join('');
  return { body: shell, air: wet ? '' : interior, cargo, floodedInterior: wet ? interior : '' };
 }
 let body = '';
 if (state.experiment === 'depth') {
  body = `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="10" fill="url(#buoy-stone)" stroke="#6b8075" stroke-width="2.5"/><path d="M${x+8} ${b-12}V${y+14}Q${x+8} ${y+7} ${x+17} ${y+7}H${x+w-12}" stroke="#edf0dd" stroke-width="3" opacity=".68" fill="none"/><circle cx="365" cy="${y+5}" r="5" fill="#738277"/><circle cx="365" cy="${y+4}" r="2" fill="#dbe4d6"/>`;
 } else if (state.experiment === 'objects' && state.object === 'wood') {
  const d=12;
  body=`<defs><clipPath id="buoy-wood-face"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="2"/></clipPath><clipPath id="buoy-wood-end-clip"><rect width="${d}" height="${h}"/></clipPath></defs>
   <g transform="matrix(1 0 1 -1 ${x} ${y})"><rect width="${w}" height="${d}" fill="url(#buoy-wood-top)"/>${Array.from({length:6},(_,i)=>`<path d="M0 ${1+i*1.8}Q${w*.4} ${.4+i*1.9} ${w} ${1.5+i*1.7}" fill="none" stroke="#816b4e" opacity=".22" stroke-width=".45"/>`).join('')}</g>
   <g transform="matrix(1 -1 0 1 ${x+w} ${y})"><rect width="${d}" height="${h}" fill="url(#buoy-wood-end)"/><g clip-path="url(#buoy-wood-end-clip)">${Array.from({length:11},(_,i)=>`<ellipse cx="-12" cy="${h*.48}" rx="${17+i*4.8}" ry="${18+i*6}" fill="none" stroke="${i%3?'#55422f':'#d5c19f'}" opacity="${i%3?.28:.4}" stroke-width=".55"/>`).join('')}</g></g>
   <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="2" fill="url(#buoy-wood)" stroke="#715e46" stroke-width="1"/>
   <g clip-path="url(#buoy-wood-face)">${Array.from({length:28},(_,i)=>{
    const v=(i+.5)/28,level=y+v*h,bend=5*Math.exp(-(((v-.45)/.14)**2)),offset=Math.sin(i*2.3)*.8;
    return `<path d="M${x-2} ${level}C${x+w*.25} ${level-1+offset} ${x+w*.42} ${level-bend} ${x+w*.59} ${level-bend*.7}S${x+w*.82} ${level+2+offset} ${x+w+2} ${level+.5}" stroke="${i%4?'#614b34':'#e3d1b1'}" opacity="${i%4?.2:.4}" stroke-width="${i%4?.45:.55}" fill="none"/>`;
   }).join('')}<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#buoy-wood-pores)"/><path d="M${x+w*.56} ${y+h*.45}q4-2 8 .4q-3 2.5-8-.4" fill="#685039" opacity=".24"/></g>
   <path d="M${x+.6} ${b-2}V${y+2}Q${x+.6} ${y+.6} ${x+2} ${y+.6}H${x+w-.8}L${x+w+d-1} ${y-d+.8}" fill="none" stroke="#e5d6ba" stroke-width=".85" opacity=".7"/><path d="M${x+w} ${y+1}V${b-.5}" stroke="#574735" stroke-width=".7" opacity=".55"/>`;
 } else if (state.object === 'steel' && state.experiment === 'objects') {
  body = `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="7" fill="url(#buoy-steel)" stroke="#6e8791" stroke-width="2.5"/><rect x="${x+5}" y="${y+5}" width="${w-10}" height="${h-10}" rx="4" fill="none" stroke="#fff" opacity=".45"/><path d="M${x+11} ${b-9}V${y+11}H${x+w-11}" fill="none" stroke="#f6ffff" opacity=".7" stroke-width="2"/>`;
  for(let i=0;i<13;i++)body+=`<path d="M${x+8} ${y+10+i*(h-20)/13}H${x+w-8}" stroke="#e7f1ef" opacity=".24" stroke-width=".7"/>`;
 } else if (state.experiment === 'boat' || state.object === 'clay') {
  body = `<ellipse cx="365" cy="${y+h/2}" rx="${w/2}" ry="${h/2}" fill="url(#buoy-clay-ball)" stroke="#895c4b" stroke-width="1.6"/><ellipse cx="365" cy="${y+h/2}" rx="${w/2}" ry="${h/2}" fill="url(#buoy-clay-grain)" opacity=".55"/><path d="M${x+w*.18} ${y+h*.27}Q${x+w*.34} ${y+h*.07} ${x+w*.63} ${y+h*.15}" stroke="#ffe0c4" stroke-width="2" opacity=".35" fill="none"/><path d="M${x+w*.24} ${y+h*.73}Q365 ${y+h*.89} ${x+w*.75} ${y+h*.7}" stroke="#aa654c" stroke-width="1" opacity=".25" fill="none"/>`;
 } else {
  body = `<g transform="translate(${x} ${y}) scale(${w/100})"><path d="M0 76L8 30L44 0L86 16L100 75L72 100L21 100Z" fill="url(#buoy-stone)" stroke="#6c8073" stroke-width="2"/><path d="M8 30L44 0L60 58Z" fill="#e0e4d0" opacity=".25"/><path d="M60 58L86 16L100 75L72 100Z" fill="#435f53" opacity=".18"/><path d="M10 30L43 3L84 18M44 4L61 58L9 32" stroke="#ecedda" opacity=".5" fill="none" stroke-width="1.5"/>${Array.from({length:12},(_,i)=>`<ellipse cx="${17+(i*19)%68}" cy="${27+(i*13)%58}" rx="${1+i%3}" ry=".9" fill="${i%2?'#e4e6d4':'#6e8176'}" opacity=".4"/>`).join('')}</g>`;
 }
 return { body, air: '', cargo: '', floodedInterior: '' };
}

/** Contact with the mean water plane, in the same front section as the hull.
 * These intersections only place the drawn edge; buoyancy stays model-owned. */
function waterContact(state:Settings,g:Geometry,reshaping?:number):[number,number]|undefined {
 const y=g.bottom-g.height,depth=g.water-y,w=g.width,h=g.height,x=365-w/2;
 if(depth<0||depth>h)return;
 if(state.experiment==='boat'&&(reshaping===undefined?state.boat:reshaping>=.999999)){
  const inset=w*.108*Math.min(1,depth/(h-12));return [x+inset,x+w-inset];
 }
 if(state.experiment==='boat'||state.object==='clay'&&state.experiment==='objects'){
  const reach=w/2*Math.sqrt(Math.max(0,1-((depth-h/2)/(h/2))**2));return [365-reach,365+reach];
 }
 if(state.experiment==='objects'&&state.object==='wood'){
  // The front section is unchanged; include its shallow right end face when
  // hiding the water edge, so the line cannot cut across the projected wood.
  return [x,x+w+Math.min(12,Math.max(0,g.bottom-g.water))];
 }
 if(state.experiment==='objects'&&state.object==='stone'){
  const points=[[0,.76],[.08,.3],[.44,0],[.86,.16],[1,.75],[.72,1],[.21,1]],hits:number[]=[];
  for(let i=0;i<points.length;i++){
   const a=points[i],b=points[(i+1)%points.length],v=depth/h;
   if(a[1]!==b[1]&&v>=Math.min(a[1],b[1])&&v<=Math.max(a[1],b[1]))hits.push(x+w*between(a[0],b[0],(v-a[1])/(b[1]-a[1])));
  }
  if(hits.length)return [Math.min(...hits),Math.max(...hits)];return;
 }
 const radius=state.experiment==='depth'?10:state.object==='wood'?13:7,edge=Math.min(depth,h-depth);
 const inset=edge<radius?radius-Math.sqrt(Math.max(0,radius*radius-(radius-edge)**2)):0;
 return [x+inset,x+w-inset];
}

function measuringCup(g:Geometry,displaced:number){
 const water=displaced>0?`<path d="M670 ${g.cup}V436A53 10 0 0 0 776 436V${g.cup}A53 10 0 0 1 670 ${g.cup}Z" fill="url(#buoy-water-fill)"/><ellipse cx="723" cy="${g.cup}" rx="53" ry="10" fill="#c3e1e6" stroke="#7aa6b5" stroke-width=".8"/><path d="M670 ${g.cup}A53 10 0 0 0 776 ${g.cup}" fill="none" stroke="#d7eff2" stroke-width="1"/>`:'';
 return `<g id="buoy-measuring-cup">
  <path d="M666 204A57 11 0 0 1 780 204" fill="none" stroke="#9ab5c2" stroke-width="1.4"/>
  <path d="M670 436A53 10.2 0 0 1 776 436" fill="none" stroke="#9fb9c4" stroke-width="1" opacity=".5"/>
  ${water}
  <path d="M666 204V438A57 11 0 0 0 780 438V204A57 11 0 0 1 666 204Z" fill="url(#buoy-cup-glass)"/>
  <path d="M666 204V438A57 11 0 0 0 780 438V204" fill="none" stroke="#7393a4" stroke-width="1.3"/>
  <path d="M666 435A57 11 0 0 0 780 435V441A57 11 0 0 1 666 441Z" fill="#9cb6c2" opacity=".32"/>
  <path d="M670 435A53 10.2 0 0 0 776 435" fill="none" stroke="#eef8fa" stroke-width="1.2" opacity=".8"/>
  <path d="M667 440A56 10.5 0 0 0 779 440" fill="none" stroke="#5e7d90" stroke-width="1.2" opacity=".65"/>
  <path d="M672 217V431C672 442 687 444 698 444" fill="none" stroke="#fff" stroke-width="2.2" opacity=".72"/>
  <path d="M678 218V429" stroke="#fff" stroke-width=".65" opacity=".6"/>
  <path d="M756 220V432" stroke="#f4fbfc" stroke-width="5" opacity=".09"/>
  ${Array.from({length:10},(_,i)=>`<path d="M${i%2?766:755} ${426-i*21}Q770 ${428-i*21} 777 ${426.5-i*21}" stroke="#668694" stroke-width="${i%2?.8:1}" fill="none" opacity=".65"/>`).join('')}
  <ellipse cx="723" cy="204" rx="57" ry="11" fill="none" stroke="url(#buoy-rim)" stroke-width="1.8"/>
  <ellipse cx="723" cy="204" rx="53" ry="10.2" fill="none" stroke="#edf6f8" stroke-width=".9"/>
  <path d="M666 204A57 11 0 0 0 780 204" fill="none" stroke="#638495" stroke-width="1.2" opacity=".85"/>
  ${text(723,176,t('排开的水'))}${text(723,477,`${displaced.toFixed(0)} mL`,17)}
 </g>`;
}

/** Topic-local presentation only. The model always supplies the settled readings. */
export class BuoyancyScene {
 private tank?:TankScene;
 private frame=0;
 private current?:Geometry;
 private target?:Geometry;
 private state?:Settings;
 private result?:Result;
 private forces=true;
 private identity='';
 private form=0;
 private observation:Observation='tank';
 private microscopic=false;
 private molecularProgress=0;
 private molecularRunning=false;
 private academic=false;
 private settled=true;
 private disposed=false;
 private readonly reduced=matchMedia('(prefers-reduced-motion: reduce)');
 constructor(private readonly svg:SVGSVGElement,private readonly status:HTMLElement,private readonly onMolecularMotion?:(running:boolean)=>void) {
  const holder=document.createElement('div');holder.className='buoyancy-stage';holder.dataset.view='tank';svg.before(holder);holder.append(svg);
  try{this.tank=TankScene.create(svg,()=>{this.svg.dataset.renderer='section';this.redraw();},()=>this.redraw());this.svg.dataset.renderer='webgl';}
  catch{this.svg.dataset.renderer='section';}
  document.addEventListener('visibilitychange',this.onVisibility);
  window.addEventListener('pagehide',this.onPageHide);
  this.reduced.addEventListener('change',this.onMotionPreference);
 }
 observe(observation:Observation,academic:boolean,microscopic=false){
  const changed=this.observation!==observation;
  if(changed||this.microscopic!==microscopic)this.stopMolecularMotion();
  this.microscopic=microscopic;
  this.observation=observation;this.academic=academic;this.svg.parentElement!.dataset.view=observation;
  this.svg.parentElement!.dataset.pressureScale=microscopic?'molecules':'whole';
  if(changed)this.tank?.setView(observation==='displacement'?'displacement':'tank',observation!=='pressure'&&observation!=='replacement');
  this.redraw();
 }
 /** A short observation, sharing the scene's single animation frame owner. */
 toggleMolecularMotion(){
  if(this.observation!=='pressure'||!this.microscopic||this.disposed)return;
  if(this.molecularRunning){this.stopMolecularMotion();return;}
  if(!this.settled)this.settle();
  if(this.reduced.matches){this.molecularProgress=.35;this.redraw();return;}
  this.molecularProgress=0;this.molecularRunning=true;this.onMolecularMotion?.(true);
  const start=performance.now();
  const tick=(now:number)=>{
   if(this.disposed||document.hidden||this.reduced.matches){this.stopMolecularMotion();return;}
   this.molecularProgress=Math.min(1,(now-start)/4000);this.redraw();
   if(this.molecularProgress<1)this.frame=requestAnimationFrame(tick);else this.stopMolecularMotion();
  };
  this.frame=requestAnimationFrame(tick);
 }
 private stopMolecularMotion(){
  if(!this.molecularRunning)return;
  cancelAnimationFrame(this.frame);this.frame=0;this.molecularRunning=false;this.onMolecularMotion?.(false);
 }
 private redraw(){if(this.current)this.draw(this.current,0,this.settled,this.settled?undefined:this.form);}
 set(state:Settings,result:Result,forces:boolean,instant=false) {
  const previous=this.state;
  // A lens, explanation, or vector toggle is not a new physical transition.
  if(previous&&Object.keys(state).every(key=>state[key as keyof Settings]===previous[key as keyof Settings])){
   this.forces=forces;this.redraw();return;
  }
  this.stopMolecularMotion();this.molecularProgress=0;
  const fromForm=this.form;
  const next=experimentGeometry(state,result), identity=state.experiment==='boat'?(state.boat?'boat':'clay'):state.experiment==='depth'?'held':state.object;
  const changed=this.identity!==identity;
  const from=this.current?{...this.current}:next;
  const reshaping=previous?.experiment==='boat'&&state.experiment==='boat'&&(previous.boat!==state.boat||Math.abs(this.form-(state.boat?1:0))>.000001);
  if(!reshaping)this.form=state.experiment==='boat'&&state.boat?1:0;
  if(changed&&this.current&&identity!=='held'&&!reshaping)Object.assign(from,{...next,bottom:next.water-8,water:245,cup:438});
  this.state={...state};this.result=result;this.target=next;this.forces=forces;this.identity=identity;
  this.svg.dataset.sample=identity;this.svg.dataset.cargo=String(state.cargo);this.svg.dataset.depth=String(state.depth);this.svg.dataset.water=state.salt?'salt':'fresh';
  cancelAnimationFrame(this.frame);this.frame=0;
  const moved=reshaping||!this.current||Object.keys(next).some(key=>Math.abs(next[key as keyof Geometry]-this.current![key as keyof Geometry])>.001);
  if(!this.current||!moved||instant||this.reduced.matches||document.hidden){this.settle();return;}
  const start=performance.now(),duration=reshaping?1450:changed?760:520;
  this.svg.setAttribute('aria-busy','true');this.status.textContent=reshaping?(state.boat?t('同一团泥：取出、捏出空心，再放回水里。'):t('同一团泥：取出、捏回实心，再放回水里。')):t('轻轻放入，看看它停在哪里。');
  const tick=(now:number)=>{
   if(this.disposed||document.hidden){this.settle();return;}
   const progress=Math.min(1,(now-start)/duration),ease=1-(1-progress)**3;
   if(reshaping){
    const lifted={...from,bottom:235,water:245,cup:438},molded={...next,bottom:235,water:245,cup:438};
    const segment=progress<.3?progress/.3:progress<.68?(progress-.3)/.38:(progress-.68)/.32;
    const u=Math.min(1,segment),phaseEase=u*u*(3-2*u);
    const g=progress<.3?blendGeometry(from,lifted,phaseEase):progress<.68?blendGeometry(lifted,molded,phaseEase):blendGeometry(molded,next,phaseEase);
    const opening=between(fromForm,state.boat?1:0,progress<.3?0:progress<.68?phaseEase:1);
    this.form=opening;this.current=g;this.draw(g,progress>.68?Math.sin(segment*Math.PI)*.4:0,false,opening);
   }else{
    const g=blendGeometry(from,next,ease);
    this.current=g;this.draw(g,progress<1?Math.sin(progress*Math.PI)*(1-progress):0,progress>=1);
   }
   if(progress<1)this.frame=requestAnimationFrame(tick);else this.settle();
  };
  this.frame=requestAnimationFrame(tick);
 }
 private settle(){this.stopMolecularMotion();cancelAnimationFrame(this.frame);this.frame=0;if(this.target){this.current={...this.target};this.form=this.state?.experiment==='boat'&&this.state.boat?1:0;this.draw(this.current,0,true);}this.svg.setAttribute('aria-busy','false');this.status.textContent='';}
 private draw(g:Geometry,ripple:number,settled:boolean,reshaping?:number){
  if(!this.state||!this.result)return;
  this.settled=settled;
  const s=this.state,r=this.result;
  if(this.observation==='pressure'&&this.microscopic&&settled){drawMolecularPressure(this.svg,s,g,r,this.molecularProgress);return;}
  if(this.observation==='pressure'||this.observation==='replacement'){drawPressureSection(this.svg,s,g,r,settled,reshaping,this.observation==='replacement');return;}
  if(this.tank?.available){this.tank.draw({state:s,geometry:g,form:s.experiment==='boat'?(reshaping??this.form):0,flooded:r.flooded,displaced:r.displaced,ripple});this.drawSpatial(g,settled);return;}
  this.svg.setAttribute('viewBox',this.observation==='displacement'?'0 0 850 540':'50 35 600 485');this.svg.setAttribute('preserveAspectRatio','xMidYMid meet');
  const {body,air,cargo,floodedInterior}=objectMarkup(s,g,r.flooded,reshaping);
  const x=365-g.width/2,y=g.bottom-g.height,amplitude=ripple*5;
  const surface=`M82 ${g.water}Q170 ${g.water-amplitude} 260 ${g.water}T440 ${g.water}T610 ${g.water}`;
  const contact=waterContact(s,g,reshaping),waterEdge=contact?`M82 ${g.water}H${contact[0]-.6}M${contact[1]+.6} ${g.water}H610`:surface;
  const support=s.experiment==='depth'?`<g id="taut-cord"><path d="M320 56H410" stroke="#7c8f86" stroke-width="10" stroke-linecap="round"/><path d="M324 53H406" stroke="#e0e8d8" stroke-width="3" stroke-linecap="round"/><path d="M365 56V${y+3}" stroke="#647782" stroke-width="3"/><path d="M364 59V${y}" stroke="#f6f7e9" stroke-width=".8"/></g>`:'';
  // All three vectors share one scale (8 diagram units per newton). They show
  // settled forces, not the uncomputed acceleration of the visual transition.
  const forceScale=8,upStart=Math.min(g.bottom+9,427),downStart=Math.min(y-8,427-r.weight*forceScale);
  const supportForce = this.forces && settled && r.floorSupport>0 ? `<path id="floor-force" data-newtons="${r.floorSupport}" d="M365 481V${481-r.floorSupport*forceScale}" stroke="#71807a" stroke-width="5" marker-end="url(#buoy-floor)"/>${text(455,477,t('箱底也在托住'),14,'#586c62')}` : '';
  const cordEnd=y-4-r.tension*forceScale;
  const cordForce=this.forces&&settled&&r.held?`<path id="cord-force" data-newtons="${r.tension}" d="M365 ${y-4}V${cordEnd}" stroke="#647782" stroke-width="5" stroke-linecap="round" marker-end="url(#buoy-cord)"/>${text(480,48,t('绳的张力'),18,'#526975')}`:'';
  const arrows=this.forces&&settled?`${r.force>0?`<path id="buoyancy-force" data-newtons="${r.force}" d="M${x-48} ${upStart}V${upStart-r.force*forceScale}" stroke="#178b70" stroke-width="6" stroke-linecap="round" marker-end="url(#buoy-up)"/>`:''}${text(x-48,upStart>405?477:upStart+35,t('浮力'),15,'#147b64')}<path id="weight-force" data-newtons="${r.weight}" d="M${x+g.width+46} ${downStart}V${downStart+r.weight*forceScale}" stroke="#b77c3e" stroke-width="6" stroke-linecap="round" marker-end="url(#buoy-down)"/>${text(x+g.width+46,downStart-17,t('重力'),15,'#946230')}`:'';
  const compact=window.matchMedia('(max-width:750px)').matches;
  const rimX=Math.min(570,365+g.width/2+15);
  const rimLabel=r.flooded?(compact?t('进水'):t('水越过船沿')):(compact?t('船沿'):t('船沿到水面'));
  const datumLabel=compact?t('基准水位'):t('空箱水位');
  const rim= s.experiment==='boat'&&s.boat&&reshaping===undefined&&settled?`<g stroke="${r.flooded?'#a54b3f':'#a66d35'}" stroke-width="3" fill="none"><path d="M${rimX} ${y}h10M${rimX+5} ${y}V${g.water}M${rimX} ${g.water}h10"/></g>${text(rimX-(compact?50:60),Math.max(115,Math.min(y,g.water)-20),rimLabel,18,r.flooded?'#913f35':'#8a602f')}`:'';
  this.svg.innerHTML=`${definitions(g)}<rect width="850" height="540" fill="url(#buoy-room)"/>
  <path d="M26 8L186 8L77 451H0Z" fill="#fff" opacity=".18"/><path d="M226 0H245L135 451H116Z" fill="#fff" opacity=".1"/>
  <path d="M0 464Q425 451 850 465V540H0Z" fill="url(#buoy-table)"/>
  ${[0,1,2,3].map(i=>`<path d="M0 ${480+i*17}Q280 ${472+i*17} 850 ${479+i*17}" stroke="#8b7962" opacity=".14" fill="none"/>`).join('')}
  <ellipse cx="349" cy="464" rx="299" ry="21" fill="url(#buoy-shadow)"/><ellipse cx="723" cy="453" rx="79" ry="13" fill="url(#buoy-shadow)"/>
  <path d="M614 89L623 80V437L614 450Z" fill="#8ba9b9" opacity=".18" stroke="#93afbd" stroke-width=".8"/>
  <rect x="78" y="89" width="537" height="359" rx="19" fill="url(#buoy-glass)"/>
  ${support}<g clip-path="url(#buoy-tank-clip)">
  <path d="${surface}V444H82Z" fill="url(#buoy-water-fill)"/>
  <path d="M82 245H610" stroke="#648896" stroke-dasharray="3 6" stroke-width=".8" opacity=".43"/>
  <ellipse cx="365" cy="440" rx="${g.width*.65}" ry="12" fill="url(#buoy-shadow)" opacity="${Math.max(.08,1-(440-g.bottom)/220)}"/>
  ${body}${floodedInterior}${r.flooded?cargo:''}<path d="${surface}V444H82Z" fill="url(#buoy-water-front)"/>
  <path d="${waterEdge}" fill="none" stroke="#5e8a9d" stroke-width="2"/>
  <path d="${waterEdge}" fill="none" stroke="url(#buoy-water-edge)" stroke-width="1.1"/>
  ${contact?`<path d="M${contact[0]-12} ${g.water-.6}h10M${contact[1]+2} ${g.water-.6}h10" stroke="#effbfc" stroke-width="1.2" opacity=".85"/>`:''}
  <path d="M98 426Q203 419 276 426T486 425M136 437Q230 428 343 436T578 433" stroke="#d9eff0" stroke-width="1.3" opacity=".2" fill="none"/>
  <path d="M97 ${g.water+15}V417Q97 432 111 433" stroke="#eef9fb" stroke-width="3" opacity=".35" fill="none"/>
  ${ripple>0?`<ellipse cx="365" cy="${g.water}" rx="${g.width*.55+35*(1-ripple)}" ry="${5+ripple*8}" fill="none" stroke="#e8ffec" stroke-width="2" opacity="${ripple*.65}"/>`:''}
  </g>${air}${r.flooded?'':cargo}${arrows}${supportForce}${cordForce}${rim}
  <g class="water-datum"><path d="M94 53H124" stroke="#648896" stroke-dasharray="3 6" stroke-width="1"/>${text(200,58,datumLabel,13,'#506f7d')}</g>
  <path d="M79 89V428Q79 450 102 450H588Q614 450 614 428V89" fill="none" stroke="url(#buoy-rim)" stroke-width="4"/>
  <path d="M86 94V426Q86 442 104 442H584" fill="none" stroke="#f8fcfd" stroke-width="1.6" opacity=".9"/>
  <path d="M608 102V427Q608 440 591 442" fill="none" stroke="#568a98" stroke-width="2" opacity=".4"/>
  <path d="M79 89L88 80H623L614 89Z" fill="#dbe7ec" fill-opacity=".3" stroke="#a3bbc5" stroke-width="1.1"/>
  <path d="M81 89H612" stroke="#f9fcfd" stroke-width="1.4" fill="none"/>
  <path d="M101 99V${Math.max(114,g.water-24)}" stroke="#fff" stroke-width="5" stroke-linecap="round" opacity=".55"/>
  <path d="M110 110V${Math.max(123,g.water-45)}" stroke="#fff" stroke-width="1" stroke-linecap="round" opacity=".65"/>
  ${this.observation==='displacement'?measuringCup(g,r.displaced):''}${text(345,501,s.experiment==='boat'?t('同一团泥 · 600 g，水位变化已放大'):t('水位变化已放大'),14,'#5d5e58',true)}`;
 }
 private drawSpatial(g:Geometry,settled:boolean){
  const s=this.state!,r=this.result!,tank=this.tank!,compact=matchMedia('(max-width:750px)').matches;
  const {width,height}=tank.size;this.svg.setAttribute('viewBox',`0 0 ${width} ${height}`);this.svg.setAttribute('preserveAspectRatio','none');
  const project=(x:number,y:number,z=0)=>tank.project(x,y,z),label=(p:[number,number],value:string,size=15,color='#435963')=>text(p[0],p[1],value,size,color);
  const arrow=(id:string,point:[number,number],newtons:number,up:boolean,color:string,marker:string)=>`<path id="${id}" data-newtons="${newtons}" d="M${point[0]} ${point[1]}v${(up?-1:1)*newtons*8}" stroke="${color}" stroke-width="4.5" stroke-linecap="round" marker-end="url(#${marker})"/>`;
  let forces='';
  if(this.forces&&settled){
   const buoy=project(365-g.width/2-42,Math.min(g.bottom+8,427),.8),weight=project(365+g.width/2+45,g.bottom-g.height-14,.35);
   if(r.force>0)forces+=arrow('buoyancy-force',buoy,r.force,true,'#178b70','buoy-up')+label([buoy[0],buoy[1]+25],t('浮力'),15,'#147b64');
   forces+=arrow('weight-force',weight,r.weight,false,'#aa773e','buoy-down')+label([weight[0]+38,weight[1]-15],t('重力'),15,'#8d6237');
   if(r.floorSupport>0){const p=project(365,456,.5);forces+=arrow('floor-force',p,r.floorSupport,true,'#71807a','buoy-floor')+label([p[0]+25,p[1]+24],t('箱底也在托住'),13,'#586c62');}
   if(r.held){const p=project(365,g.bottom-g.height-5,0);forces+=arrow('cord-force',p,r.tension,true,'#647782','buoy-cord')+label([p[0]+83,p[1]-r.tension*8+4],t('绳的张力'),14,'#526975');}
  }
  let rim='';
  if(s.experiment==='boat'&&s.boat&&settled){
   const x=365-g.width/2-16,a=project(x,g.bottom-g.height,0),b=project(x,g.water,0),color=r.flooded?'#a54b3f':'#936d44';
   rim=`<path d="M${a[0]} ${a[1]}h8m-4 0V${b[1]}m-4 0h8" stroke="${color}" stroke-width="1.7" fill="none"/>`+label([a[0]-20,Math.min(a[1],b[1])-15],r.flooded?(compact?t('进水'):t('水越过船沿')):(compact?t('船沿'):t('船沿到水面')),14,color);
  }
  const cup=tank.project(725,180),amount=tank.project(725,465);
  const comparison=this.observation==='displacement'?`${label([cup[0],cup[1]-10],t('等量水的对照'))}${label([amount[0],amount[1]+20],`${r.displaced.toFixed(0)} mL`,17)}`:'';
  const caption=this.academic?(s.experiment==='boat'?t('同一团泥 · 600 g，水位变化已放大'):t('水位变化已放大')):'';
  this.svg.innerHTML=`${definitions(g)}${forces}${rim}${comparison}${caption?text(width/2,height-12,caption,12,'#66716e',true):''}`;
 }
 private onVisibility=()=>{if(document.hidden)this.settle();};
 private onPageHide=(event:PageTransitionEvent)=>{if(event.persisted)this.settle();else this.dispose();};
 private onMotionPreference=()=>{if(this.reduced.matches)this.settle();this.onMolecularMotion?.(false);};
 dispose(){this.disposed=true;this.stopMolecularMotion();cancelAnimationFrame(this.frame);this.tank?.dispose();document.removeEventListener('visibilitychange',this.onVisibility);window.removeEventListener('pagehide',this.onPageHide);this.reduced.removeEventListener('change',this.onMotionPreference);}
}
