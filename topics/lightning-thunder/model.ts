import { chargeState, type ChargingCondition } from './cloudModel.ts';
export interface Settings { distanceKm:number; temperature:number; charging?:ChargingCondition; labels?:boolean; }
export const clamp=(x:number)=>Math.max(0,Math.min(1,x));
export const soundSpeed=(temperature:number)=>331.3+.606*temperature;
export const thunderDelay=(distanceKm:number,temperature=20)=>Math.max(0,distanceKm)*1000*(1/soundSpeed(temperature)-1/299792458);
export function lightningState(progress:number,settings:Settings){
 const p=clamp(progress),charges=chargeState(p,settings.charging),{separation,field,flashEnabled}=charges;
 const leader=flashEnabled?(p>=.59?1:clamp((p-.32)/.27)):0,returnStroke=clamp((p-.59)/.085),soundSeconds=flashEnabled?Math.max(0,(p-.70)/.30*30):0;
 const connector=clamp((leader-.7)/.3),connected=leader===1&&connector===1;
 return {stage:p<.14?0:p<.32?1:p<.59?2:p<.70?3:4,separation,field,flashEnabled,leader,connector,connected,returnStroke:connected?returnStroke:0,soundSeconds,delay:thunderDelay(settings.distanceKm,settings.temperature),soundRadiusKm:soundSeconds*soundSpeed(settings.temperature)/1000,heard:flashEnabled&&p>=.70&&soundSeconds>=thunderDelay(settings.distanceKm,settings.temperature)};
}
export const stagePositions = [0, .25, .48, .64, .82] as const;
export type Lens = 'follow' | 'cloud' | 'storm';
export function parseLightningRoute(search:string){
 const query=new URLSearchParams(search),p=Number(query.get('p')??0),distance=Number(query.get('distance')??3),temperature=Number(query.get('temperature')??20);
 return {progress:Number.isFinite(p)?clamp(p):0,lens:(['follow','cloud','storm'].includes(query.get('lens')??'')?query.get('lens'):'follow') as Lens,
  settings:{distanceKm:Number.isFinite(distance)?Math.max(.5,Math.min(8,distance)):3,temperature:Number.isFinite(temperature)?Math.max(0,Math.min(35,temperature)):20,
   charging:query.get('charging')==='limited'?'limited':'sustained'} as Settings};
}
export type Point = [number,number];
/** The mast and both channels share their attachment site; not a field solution. */
export const groundPoint:Point=[15,141],mastTip:Point=[15,91],attachmentPoint:Point=[13,56];
export function leaderPath():Point[]{return Array.from({length:30},(_,i)=>{const u=i/29;return[-67+80*u+(i===0||i===29?0:(Math.sin(i*12.9898)*17+Math.sin(i*5.2)*8)*Math.min(1,(1-u)*4)),-94+u*150];});}
export function connectorPath():Point[]{return [mastTip,[21,73],attachmentPoint];}
/** Clip along the existing polyline, retaining its actual tip at each progress. */
export function pathThrough(points:Point[],progress:number):Point[]{
 const position=clamp(progress)*(points.length-1),index=Math.floor(position),fraction=position-index;
 const visible=points.slice(0,index+1);if(index<points.length-1){const a=points[index],b=points[index+1];visible.push([a[0]+(b[0]-a[0])*fraction,a[1]+(b[1]-a[1])*fraction]);}return visible;
}
