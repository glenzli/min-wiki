import {nebulaCloudCoordinates,nebulaCloudPoint} from './nebulaCloud.ts';
import type {NebulaReference,Illumination} from './nebulaModel.ts';

/** Distant context, inspired by the wider Eagle/Orion fields, not a star catalogue
 * or a measured extension of the foreground volume. All directions are fixed in
 * object space. Illumination recolours the same field; there is no environment
 * clock, animation, image download or per-case cache.
 * https://esahubble.org/images/heic1501e/ */
export const NEBULA_SKY_WIDTH=768,NEBULA_SKY_HEIGHT=384,NEBULA_SKY_STARS=760;
const clamp=(v:number)=>Math.max(0,Math.min(1,v));
const smooth=(a:number,b:number,v:number)=>{const t=clamp((v-a)/(b-a));return t*t*(3-2*t);};
const bell=(v:number)=>Math.exp(-v*v);
function random(seed:number){let n=Math.imul(seed+271,1597334677);n=Math.imul(n^(n>>>16),2246822519);return ((n^(n>>>13))>>>0)/4294967295;}
function noise(x:number,y:number,z:number){
  const ix=Math.floor(x),iy=Math.floor(y),iz=Math.floor(z),a=smooth(0,1,x-ix),b=smooth(0,1,y-iy),c=smooth(0,1,z-iz);
  const at=(dx:number,dy:number,dz:number)=>random(Math.imul(ix+dx,73856093)^Math.imul(iy+dy,19349663)^Math.imul(iz+dz,83492791));
  const row=(dy:number,dz:number)=>at(0,dy,dz)*(1-a)+at(1,dy,dz)*a;
  return (row(0,0)*(1-b)+row(1,0)*b)*(1-c)+(row(0,1)*(1-b)+row(1,1)*b)*c;
}
export function nebulaEnvironmentField(reference:NebulaReference,x:number,y:number,z:number):readonly [number,number,number,number]{
  const length=Math.hypot(x,y,z)||1,[r,h,f]=nebulaCloudCoordinates(x/length,y/length,z/length);
  const u=r*3.8,v=h*3.8,w=f*3.8,shift=reference==='pillars'?0:reference==='horsehead'?13:29;
  const broad=noise(u*1.7+shift,v*1.7-6,w*1.7+8),medium=noise(u*4.8+3,v*4.8+shift,w*4.8-7);
  const fine=noise(u*12.5-5,v*12.5+2,w*12.5+shift),warp=(broad-.5)*1.1+(medium-.5)*.24;
  const quiet=1-.58*bell(u/.85)*bell(v/.9);
  const bank=bell((v+.72+.32*u+warp)/.68),high=bell((v-1.25+.20*u-warp)/1.2);
  const broken=smooth(.24,.80,broad*.55+medium*.32+fine*.13);
  const gas=clamp((.14+.66*bank+.24*high)*(.18+.82*broken)*quiet);
  const cavity=bell((u-.85)/1.4)*bell((v-.85)/1.5)*(.65+.35*broad);
  const dust=bell((v+.95+.44*u+warp*.8)/.19)*smooth(-.1,.8,-u)*(.25+.75*medium);
  return [gas,cavity,dust,clamp(.5+v*.16+(broad-.5)*.65)];
}
/** Equirectangular field in sphere UV orientation; RGB are optical weights,
 * not colour data. Refill the caller's one current array only on case changes. */
export function writeNebulaEnvironment(reference:NebulaReference,data:Uint8Array,width=NEBULA_SKY_WIDTH,height=NEBULA_SKY_HEIGHT){
  if(!Number.isInteger(width)||!Number.isInteger(height)||data.length!==width*height*4||width<2||height<2)throw new Error('Invalid nebula environment buffer');
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    const phi=(x+.5)/width*Math.PI*2,theta=(1-(y+.5)/height)*Math.PI;
    const field=nebulaEnvironmentField(reference,-Math.cos(phi)*Math.sin(theta),Math.cos(theta),Math.sin(phi)*Math.sin(theta)),index=(y*width+x)*4;
    for(let channel=0;channel<4;channel++)data[index+channel]=Math.round(field[channel]!*255);
  }
}
export function nebulaEnvironmentPalette(reference:NebulaReference,illumination:Illumination){
  if(illumination==='dark')return {bottom:'#253442',top:'#3a5060',warm:'#526472',cool:'#8babbc',strength:.42};
  if(illumination==='reflection')return {bottom:'#050a14',top:'#0a1929',warm:'#24384c',cool:'#3d6685',strength:.10};
  return reference==='pillars'?{bottom:'#33372b',top:'#1c3b4c',warm:'#9d8d60',cool:'#508c9d',strength:.34}
    :reference==='horsehead'?{bottom:'#291c26',top:'#46252f',warm:'#b36a65',cool:'#985c70',strength:.26}
    :{bottom:'#101a28',top:'#1f3340',warm:'#87655e',cool:'#588991',strength:.22};
}
const linear=(v:number)=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4;
const rgb=(hex:string)=>[1,3,5].map(i=>linear(parseInt(hex.slice(i,i+2),16)/255));
/** Same sky response as the retained WebGL backdrop, for the flat fallback. */
export function nebulaEnvironmentSampler(reference:NebulaReference,illumination:Illumination){
  const p=nebulaEnvironmentPalette(reference,illumination),[bottom,top,warm,cool]=[p.bottom,p.top,p.warm,p.cool].map(rgb);
  return (x:number,y:number,z:number):[number,number,number]=>{
    const field=nebulaEnvironmentField(reference,x,y,z),band=smooth(-.20,.20,y/Math.max(.001,Math.hypot(x,y,z)));
    return [0,1,2].map(i=>((bottom![i]!*(1-band)+top![i]!*band)*(1-field[2]*.40)+(warm![i]!*(1-field[3])+cool![i]!*field[3])*field[0]*p.strength+cool![i]!*field[1]*.025)) as [number,number,number];
  };
}
export type NebulaEnvironmentStar={position:readonly [number,number,number];size:number;brightness:number;warmth:number};
export function nebulaEnvironmentStars(reference:NebulaReference):NebulaEnvironmentStar[]{
  return Array.from({length:NEBULA_SKY_STARS},(_,i)=>{
    const seed=i+(reference==='pillars'?0:reference==='horsehead'?113:239);
    let position:[number,number,number];
    if(i<540){const a=random(seed+61)*Math.PI*2,h=random(seed+168)*2-1,r=Math.sqrt(1-h*h);position=[Math.cos(a)*r,h,Math.sin(a)*r];}
    else{
      // A loose off-centre group gives local context without inventing the
      // measured membership/positions of M16's illuminating cluster.
      const cluster=i>724,u=cluster?.43+(random(seed+31)-.5)*.30:(random(seed+73)-.5)*1.9;
      const v=cluster?.42+(random(seed+87)-.5)*.20:(random(seed+97)-.5)*1.25;
      position=nebulaCloudPoint(u,v,-1);
    }
    const length=Math.hypot(...position),bright=random(seed+519)**7;
    return {position:position.map(v=>v/length*24) as [number,number,number],size:1.6+bright*7,brightness:.20+bright*.75,warmth:random(seed+119)};
  });
}
/** Fixed perspective of the same distant directions for Canvas fallback. */
export function nebulaEnvironmentDirection(px:number,py:number):[number,number,number]{return nebulaCloudPoint((px-520)/860,(280-py)/860,-1);}
