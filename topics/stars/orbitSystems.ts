import {binaryState, massCenter, type Point} from './model.ts';

export type OrbitCase='circumbinary'|'circumprimary'|'hierarchical';
export const ORBIT_CASES:readonly OrbitCase[]=['circumbinary','circumprimary','hierarchical'];
export interface OrbitObject extends Point { id:string; around?:string }
export interface OrbitSystemState { stars:OrbitObject[]; planets:OrbitObject[]; center:{x:number;y:number} }

const circle=(radius:number,turns:number,phase=0)=>({x:radius*Math.cos(2*Math.PI*turns+phase),y:radius*Math.sin(2*Math.PI*turns+phase)});

/** Curated circular teaching geometries. Planet paths and drawn distances are schematic, not ephemerides or stability solutions. */
export function orbitSystemState(kind:OrbitCase,time:number):OrbitSystemState {
 const t=Number.isFinite(time)?time:0;
 if(kind==='circumbinary'){
  const stars=binaryState(t,.36).map((point,i)=>({...point,id:i?'B':'A'}));
  // Kepler-47 has three circumbinary planets. Their drawing radii compress the real distance ratios.
  const planets=[['b',2.15,6.6],['d',3.15,25],['c',4.2,41]].map(([id,r,period],i)=>({...circle(Number(r),t/Number(period),i*.9),mass:0,id:String(id),around:'AB'}));
  return {stars,planets,center:massCenter(stars)};
 }
 if(kind==='circumprimary'){
  const stars=binaryState(t/12,.45,4.5).map((point,i)=>({...point,id:i?'B':'A'}));
  const planet={...circle(.78,t*1.6,.7),mass:0,id:'p',around:'A'};
  planet.x+=stars[0]!.x;planet.y+=stars[0]!.y;
  return {stars,planets:[planet],center:massCenter(stars)};
 }
 const innerMass=1.7,outerMass=.45,outerPeriod=Math.sqrt(12**3*innerMass/(innerMass+outerMass));
 const outer=binaryState(t/outerPeriod,outerMass/innerMass,12);
 const inner=binaryState(t,.7).map((point,i)=>({...point,x:point.x+outer[0]!.x,y:point.y+outer[0]!.y,id:i?'B':'A'}));
 const stars=[...inner,{...outer[1]!,mass:outerMass,id:'C'}];
 // A close-in S-type planet, as observed in KOI-5. It needs a separate detail scale on screen.
 const planet={...circle(.12,t*4,1.1),mass:0,id:'p',around:'A'};
 planet.x+=stars[0]!.x;planet.y+=stars[0]!.y;
 return {stars,planets:[planet],center:massCenter(stars)};
}
