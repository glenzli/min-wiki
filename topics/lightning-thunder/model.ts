export interface Settings { distanceKm:number; temperature:number; }
export const clamp=(x:number)=>Math.max(0,Math.min(1,x));
export const soundSpeed=(temperature:number)=>331.3+.606*temperature;
export const thunderDelay=(distanceKm:number,temperature=20)=>Math.max(0,distanceKm)*1000*(1/soundSpeed(temperature)-1/299792458);
export function lightningState(progress:number,settings:Settings){
 const p=clamp(progress),separation=clamp(p/.28),field=clamp((p-.16)/.18),leader=clamp((p-.32)/.27),returnStroke=clamp((p-.59)/.085),soundSeconds=Math.max(0,(p-.70)/.30*30);
 return {stage:p<.28?0:p<.50?1:p<.70?2:3,separation,field,leader,returnStroke,soundSeconds,delay:thunderDelay(settings.distanceKm,settings.temperature),soundRadiusKm:soundSeconds*soundSpeed(settings.temperature)/1000,heard:p>=.70&&soundSeconds>=thunderDelay(settings.distanceKm,settings.temperature)};
}
/** A stable branching channel supports reversible scrubbing; points are teaching geometry, not electric-field solutions. */
export function leaderPath(){return Array.from({length:30},(_,i)=>{const u=i/29;return[-67+82*u+(i===0||i===29?0:Math.sin(i*12.9898)*17+Math.sin(i*5.2)*8),-94+u*235] as [number,number];});}
