export interface Settings { distanceKm:number; temperature:number; }
export const clamp=(x:number)=>Math.max(0,Math.min(1,x));
export const soundSpeed=(temperature:number)=>331.3+.606*temperature;
export const thunderDelay=(distanceKm:number,temperature=20)=>Math.max(0,distanceKm)*1000*(1/soundSpeed(temperature)-1/299792458);
export function lightningState(progress:number,settings:Settings){
 const p=clamp(progress),separation=clamp(p/.28),field=clamp((p-.16)/.18),leader=p>=.59?1:clamp((p-.32)/.27),returnStroke=clamp((p-.59)/.085),soundSeconds=Math.max(0,(p-.70)/.30*30);
 const connector=clamp((leader-.7)/.3),connected=leader===1&&connector===1;
 return {stage:p<.28?0:p<.50?1:p<.70?2:3,separation,field,leader,connector,connected,returnStroke:connected?returnStroke:0,soundSeconds,delay:thunderDelay(settings.distanceKm,settings.temperature),soundRadiusKm:soundSeconds*soundSpeed(settings.temperature)/1000,heard:p>=.70&&soundSeconds>=thunderDelay(settings.distanceKm,settings.temperature)};
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
