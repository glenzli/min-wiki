import {clamp,EARTH_RADIUS_KM,SUN_RADIUS_KM} from './model.ts';
export type Chapter='compare'|'homes'|'zoom';
export const bodies=[{id:'earth',radius:EARTH_RADIUS_KM},{id:'jupiter',radius:69911},{id:'sun',radius:SUN_RADIUS_KM},{id:'arcturus',radius:25.4*SUN_RADIUS_KM},{id:'antares',radius:700*SUN_RADIUS_KM}] as const;
export const lastPair=bodies.length-2;
export function readExploration(query:string){const p=new URLSearchParams(query),mode=p.get('mode');return {chapter:(['compare','homes','zoom'].includes(mode??'')?mode:p.has('scale')||p.has('origin')?'zoom':'compare') as Chapter,pair:clamp(Number(p.get('pair')??0),0,lastPair),home:Math.round(clamp(Number(p.get('home')??0),0,2))};}
/** One common linear diameter scale at every intermediate frame. Positions are a comparison layout, not orbital distances. */
export function comparisonFrame(progress:number,width:number){const q=clamp(progress,0,lastPair),i=Math.min(lastPair-1,Math.floor(q)),t=q-i,maxRadius=bodies[i+1]!.radius*(bodies[i+2]!.radius/bodies[i+1]!.radius)**t,unit=Math.min(155,width*.23)/maxRadius;return bodies.map((b,j)=>{let x=width*(.25+.49*(j-q));if(j>q+1&&j>0)x=Math.max(x,width*(.25+.49*(j-1-q))+(bodies[j-1]!.radius+b.radius)*unit+width*.04);return {id:b.id,x,radius:b.radius*unit,opacity:clamp(1-Math.max(0,Math.abs(j-q-.5)-.5))};});}
